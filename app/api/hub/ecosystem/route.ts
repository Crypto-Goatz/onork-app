/**
 * GET /api/hub/ecosystem — the live overlay for the Ecosystem map.
 *
 * The map's STRUCTURE is written down (lib/ecosystem/graph.ts) because this app
 * cannot read the machine where the repos live. Everything that can be measured
 * at request time is measured here instead and drawn on top, so the page
 * corrects itself instead of drifting.
 *
 * WHY THAT DISTINCTION IS THE WHOLE POINT. `/api/dispatch/ecosystem` is the
 * existing inventory and it still serves entries last written 2026-06-17 — a
 * snapshot that looks current, names 28 things against a codebase of roughly
 * twice that, and carries no indication it is stale. A diagram that cannot tell
 * you when it was last true is worse than no diagram, because it gets shown to
 * people. Every number returned below is either measured in this request or
 * absent, and every measurement carries its own failure mode.
 *
 * OWNER ONLY. This exposes internal architecture, health and row counts.
 *
 * NOTHING HERE THROWS. A probe that cannot answer returns `null` with a reason,
 * never 0 — reporting "0 live installs" because a query failed would be the
 * same class of lie as the appointments card that told someone their day was
 * clear on the strength of a failed request.
 */
import { NextResponse } from 'next/server'
import { isOwner } from '@/lib/owner'
import { NODES } from '@/lib/ecosystem/graph'
import { createServiceClient } from '@/lib/connect/service-client'
import { probe } from '@/lib/hub/probe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Probe budget. A map that hangs is a map nobody opens twice. */
const TIMEOUT_MS = 6000


export async function GET() {
  if (!(await isOwner())) {
    // Deliberately indistinguishable from a route that does not exist.
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  const targets = NODES.filter((n) => n.healthUrl)
  const health: Record<string, Awaited<ReturnType<typeof probe>>> = {}
  const results = await Promise.all(targets.map((n) => probe(n.healthUrl!, TIMEOUT_MS)))
  targets.forEach((n, i) => { health[n.id] = results[i] })

  // ── Live counts, each with its own honest failure ────────────────────
  const db = createServiceClient()
  const metrics: Record<string, { value: number | null; label: string; note?: string }> = {}

  if (!db) {
    metrics.storage = { value: null, label: 'Database', note: 'Storage client unavailable — every count below is unknown, not zero.' }
  } else {
    try {
      // coalesce, not `is not null`: 27 of these rows hold an EMPTY STRING
      // refresh token. Counting them as present is how this table was
      // misread once already.
      const { data: installs } = await db
        .from('crm_installations')
        .select('expires_at, refresh_token, health_status')
        .limit(1000)
      if (installs) {
        const now = Date.now()
        const live = installs.filter((r) => r.expires_at && new Date(r.expires_at).getTime() > now).length
        // A minted row has no refresh token and needs none — the mint lane
        // re-issues it. Counting it under "need a reinstall" is the same lie
        // the verdict ladder used to tell (see lib/crm/install-verdict.ts).
        const recoverable = installs.filter((r) =>
          r.health_status === 'expired-remintable' ||
          ((r.refresh_token || '') !== '' && r.health_status !== 'revoked'),
        ).length
        metrics.installsTotal = { value: installs.length, label: 'CRM installs on file' }
        metrics.installsLive = { value: live, label: 'Holding a live token' }
        metrics.installsRecoverable = { value: recoverable, label: 'Recoverable by refresh' }
        metrics.installsNeedReinstall = {
          value: installs.length - recoverable,
          label: 'Need a reinstall',
          note: 'No refresh token and not re-mintable, or an authorization the CRM has revoked and whose access token is also refused. Retrying cannot move this number.',
        }
      }
    } catch (e) {
      metrics.installsTotal = { value: null, label: 'CRM installs on file', note: `Query failed: ${(e as Error).message}` }
    }

    try {
      const { count } = await db.from('profiles').select('id', { count: 'exact', head: true })
      metrics.profiles = { value: count ?? null, label: 'Accounts' }
    } catch {
      metrics.profiles = { value: null, label: 'Accounts', note: 'Query failed.' }
    }

    try {
      const { count } = await db.from('api_tokens').select('id', { count: 'exact', head: true }).eq('revoked', false)
      metrics.tokens = { value: count ?? null, label: 'Live 0n keys' }
    } catch {
      metrics.tokens = { value: null, label: 'Live 0n keys', note: 'Query failed.' }
    }
  }

  // ── 0n3: what the runtime says about itself, at request time ───────────
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
    const r = await fetch('https://0n3.app/api/handler', { signal: ctl.signal, cache: 'no-store', headers: { 'user-agent': '0n-ecosystem-probe' } })
    clearTimeout(timer)
    const j = (await r.json()) as { version?: string; tools?: number; crmTools?: number; services?: number }
    metrics.on3Tools = { value: typeof j.tools === 'number' ? j.tools : null, label: `0n3 tools (v${j.version || '?'})`, note: typeof j.tools === 'number' ? undefined : '0n3 answered without a count.' }
    metrics.on3Services = { value: typeof j.services === 'number' ? j.services : null, label: 'Catalog services' }
  } catch (e) {
    metrics.on3Tools = { value: null, label: '0n3 tools', note: `0n3 did not answer: ${(e as Error).message}` }
  }
  if (db) {
    try {
      // THE CANARY: an account older than an hour with no CRM contact id means the drain is not running. Zero is the only acceptable number.
      const hourAgo = new Date(Date.now() - 3600_000).toISOString()
      const { count: unsynced } = await db.from('profiles').select('id', { count: 'exact', head: true }).is('crm_contact_id', null).lt('created_at', hourAgo).not('email', 'ilike', '%+test%').not('email', 'ilike', '%e2e%')
      metrics.accountsUnsynced = { value: unsynced ?? null, label: 'Accounts with no CRM contact (>1h old)', note: unsynced ? 'The sync-contacts cron should drive this to zero; if it stays, read its response for the CRM\'s own error.' : undefined }
    } catch (e) {
      metrics.accountsUnsynced = { value: null, label: 'Accounts with no CRM contact (>1h old)', note: `Query failed: ${(e as Error).message}` }
    }
    try {
      const { count } = await db.from('vault_records').select('id', { count: 'exact', head: true }).neq('status', 'revoked')
      metrics.vaultRecords = { value: count ?? null, label: 'Vault records' }
      const { data: accts } = await db.from('vault_records').select('account_id').neq('status', 'revoked').limit(5000)
      metrics.vaultAccounts = { value: accts ? new Set(accts.map((r) => r.account_id)).size : null, label: 'Accounts with a vault' }
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      const { count: uses } = await db.from('vault_audit').select('id', { count: 'exact', head: true }).gte('at', since).neq('action', 'put')
      metrics.vaultUses24h = { value: uses ?? null, label: 'Credential uses · 24h' }
      const { count: scoped } = await db.from('access_tokens').select('id', { count: 'exact', head: true }).eq('is_active', true)
      metrics.scopedTokens = { value: scoped ?? null, label: 'Scoped 0n tokens' }
    } catch (e) {
      metrics.vaultRecords = { value: null, label: 'Vault records', note: `Query failed: ${(e as Error).message}` }
    }
  }

  const reachable = Object.values(health).filter((h) => h.ok).length

  return NextResponse.json({
    measuredAt: new Date().toISOString(),
    health,
    metrics,
    summary: {
      surfacesProbed: targets.length,
      surfacesReachable: reachable,
      // Said out loud rather than left to be inferred by comparing two numbers.
      allReachable: reachable === targets.length,
    },
    // The bridge runs on Mike's machine and this app is on Vercel, so its state
    // genuinely cannot be probed from here. Saying so beats rendering a stale
    // "connected" badge that nothing checks.
    notProbed: [
      { id: 'bridge', why: 'Runs on the local machine. This server has no access to it — status shown is structural, not measured.' },
      { id: 'cli', why: 'Runs on the user\'s machine. Its tool count is the same code as 0n3.app, measured there.' },
    ],
  })
}
