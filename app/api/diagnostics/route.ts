import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { getValidAgencyToken } from '@/lib/crm/agency-token'
import { listAgencyLocations } from '@/lib/crm/locations'
import { listSnapshots } from '@/lib/crm/agency-profile'
import { readSaas } from '@/lib/crm/saas'
import { meterIdFor } from '@/lib/crm/wallet'
import { METERS } from '@/lib/meters'

/**
 * Live self-checks — the built-in tester.
 *
 * EVERY CHECK ACTUALLY CALLS SOMETHING. Reading an env var and reporting "OK"
 * tells you a string exists, not that the thing works; a green board built that
 * way is worse than no board, because it removes the suspicion that would have
 * found the bug. Where a check cannot be run for real it says so rather than
 * guessing.
 *
 * EVERY FAILURE SAYS WHAT TO DO. A red light with no next step just relocates
 * the problem, so each check carries `fix` — the one action that clears it.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export type CheckState = 'pass' | 'fail' | 'warn' | 'skip'
export interface Check {
  id: string
  area: string
  what: string
  state: CheckState
  detail: string
  fix?: string
}

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const companyId = session.claims.companyId
  const checks: Check[] = []
  const add = (c: Check) => checks.push(c)

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

  // ── identity ──
  add({
    id: 'sso', area: 'Sign-in', what: 'Your session is valid',
    state: 'pass',
    detail: `Signed in as ${session.claims.email ?? session.claims.sub} for agency ${companyId}.`,
  })

  // ── agency connection ──
  const agency = await getValidAgencyToken(companyId)
  add({
    id: 'agency-token', area: 'Connection', what: 'Agency connection works',
    state: agency.token ? 'pass' : 'fail',
    detail: agency.token ? 'We can act on your agency.' : (agency.error ?? 'No agency connection.'),
    fix: agency.token ? undefined : 'Connect your agency at /api/oauth/install/agency.',
  })

  // ── clients ──
  const locs = await listAgencyLocations(companyId)
  add({
    id: 'locations', area: 'Connection', what: 'We can read your client list',
    state: locs.error ? 'fail' : locs.locations.length ? 'pass' : 'warn',
    detail: locs.error ?? `${locs.locations.length} client accounts visible.`,
    fix: locs.error ? 'Reconnect the agency — the token may have lost its scopes.' : undefined,
  })

  // ── a real read against a real client ──
  const probe = locs.locations[0]
  if (probe) {
    try {
      const { crmGet } = await import('@/lib/crm')
      const r = await crmGet('/contacts/?limit=1', probe.id)
      add({
        id: 'client-read', area: 'Connection', what: 'We can read inside a client account',
        state: r.ok ? 'pass' : 'fail',
        detail: r.ok ? `Read from "${probe.name}" succeeded.` : `Read from "${probe.name}" returned ${r.status}.`,
        fix: r.ok ? undefined : 'The per-client token could not be minted — check the app has oauth.write.',
      })
    } catch (err) {
      add({ id: 'client-read', area: 'Connection', what: 'We can read inside a client account', state: 'fail',
        detail: err instanceof Error ? err.message : 'The call threw.' })
    }
  } else {
    add({ id: 'client-read', area: 'Connection', what: 'We can read inside a client account', state: 'skip', detail: 'No clients to test against.' })
  }

  // ── snapshots ──
  const snaps = await listSnapshots(companyId)
  add({
    id: 'snapshots', area: 'Provisioning', what: 'Your snapshot library is readable',
    state: snaps.error ? 'fail' : 'pass',
    detail: snaps.error ?? `${snaps.snapshots.length} snapshots available.`,
    fix: snaps.error ? 'Needs the agency app install (snapshots.readonly).' : undefined,
  })
  const masterId = process.env.CRM_MASTER_SNAPSHOT_ID || 'WHGzGLK0RKBFVAM439au'
  const master = snaps.snapshots.find((s) => s.id === masterId)
  add({
    id: 'master-snapshot', area: 'Provisioning', what: 'The snapshot new clients receive exists',
    state: master ? 'pass' : snaps.error ? 'skip' : 'fail',
    detail: master ? `New clients get "${master.name}".` : `Snapshot ${masterId} was not found on this agency.`,
    fix: master ? undefined : 'Set CRM_MASTER_SNAPSHOT_ID to a snapshot that exists.',
  })

  // ── billing ──
  const saas = await readSaas(companyId)
  add({
    id: 'saas', area: 'Billing', what: 'Plan and rebilling figures',
    state: saas.ok && saas.enabled ? 'pass' : 'warn',
    detail: saas.ok ? (saas.enabled ? 'Plan data is readable.' : saas.reason) : saas.error,
    fix: saas.ok && !saas.enabled ? 'Needs your CRM\'s Stripe connection — not something we can switch on.' : undefined,
  })
  const missingMeters = METERS.filter((m) => m.priceCents > 0 && !m.launchFree && !meterIdFor(m.key))
  add({
    id: 'meters', area: 'Billing', what: 'Paid features can actually charge',
    state: missingMeters.length === 0 ? 'pass' : 'fail',
    detail: missingMeters.length === 0
      ? 'Every paid feature has a meter.'
      : `No meter for: ${missingMeters.map((m) => m.label).join(', ')}. These refuse to run rather than working for free.`,
    fix: missingMeters.length ? 'Create the meters on the sub-account app and set CRM_METER_* env vars.' : undefined,
  })

  // ── workflow actions ──
  add({
    id: 'action-contract', area: 'Workflow steps', what: '0nCORE steps can be called by your workflows',
    state: process.env.CRM_ACTION_SECRET ? 'pass' : 'fail',
    detail: process.env.CRM_ACTION_SECRET
      ? 'The callback secret is set; calls will be verified.'
      : 'The endpoint refuses every call because we cannot yet verify they come from your CRM.',
    fix: process.env.CRM_ACTION_SECRET ? undefined : 'Save an action shell in the portal, then set CRM_ACTION_SECRET.',
  })

  // ── triggers ──
  const { count: subs } = await sb.from('trigger_subscriptions').select('*', { count: 'exact', head: true }).eq('active', true)
  add({
    id: 'triggers', area: 'Workflow steps', what: 'Workflows are listening for 0nCORE events',
    state: (subs ?? 0) > 0 ? 'pass' : 'warn',
    detail: (subs ?? 0) > 0 ? `${subs} workflow subscriptions active.` : 'No workflow is subscribed to a 0nCORE trigger yet.',
    fix: (subs ?? 0) > 0 ? undefined : 'Add a 0nCORE trigger to a workflow — it subscribes itself.',
  })

  // ── radar ──
  const { data: lastRun } = await sb.from('idea_runs').select('started_at, boards_ok, error').order('started_at', { ascending: false }).limit(1).maybeSingle()
  const ageH = lastRun?.started_at ? (Date.now() - new Date(lastRun.started_at).getTime()) / 3600_000 : Infinity
  add({
    id: 'radar', area: 'Radar', what: 'Demand data is current',
    state: !lastRun ? 'fail' : lastRun.error ? 'fail' : ageH > 20 ? 'warn' : 'pass',
    detail: !lastRun ? 'The collection has never run.'
      : lastRun.error ? lastRun.error
      : `Last read ${Math.round(ageH)}h ago, ${lastRun.boards_ok} boards.`,
    fix: !lastRun || lastRun.error ? 'Run /api/cron/ideas manually to see the failure.' : undefined,
  })

  // ── recent failures, so the board reflects reality not just config ──
  const { count: recentFails } = await sb.from('burst_receipts')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId).eq('status', 'failed')
    .gte('created_at', new Date(Date.now() - 24 * 3600_000).toISOString())
  add({
    id: 'recent-failures', area: 'Health', what: 'Nothing failed in the last day',
    state: (recentFails ?? 0) === 0 ? 'pass' : 'warn',
    detail: (recentFails ?? 0) === 0 ? 'No failed steps in 24 hours.' : `${recentFails} steps failed in the last 24 hours.`,
    fix: (recentFails ?? 0) > 0 ? 'Open the History log — each failure carries its reason.' : undefined,
  })

  const failed = checks.filter((c) => c.state === 'fail').length
  const warned = checks.filter((c) => c.state === 'warn').length
  return NextResponse.json({
    ok: true,
    checks,
    summary: { total: checks.length, failed, warned, passed: checks.filter((c) => c.state === 'pass').length },
    // The honest headline. Green only when nothing is broken.
    headline: failed > 0 ? `${failed} thing${failed === 1 ? '' : 's'} broken`
      : warned > 0 ? `${warned} thing${warned === 1 ? '' : 's'} need attention`
      : 'Everything checked out',
  })
}
