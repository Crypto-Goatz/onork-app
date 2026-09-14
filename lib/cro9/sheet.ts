/**
 * ensureCro9Sheet — every provisioned sub-location gets its CRO9 Google Sheet.
 *
 * Mike, 2026-09-14: "at provision, we ensure that every sub-location gets a
 * dedicated CRO9 google sheet" / "Automatically create the sheet as part of
 * the sub-location setup from now on."
 *
 * CRO9 owns the sheet machinery (master engine copy into its Shared Drive,
 * Apps Script binding, sharing, mirror row). This is the one call 0nCore makes
 * into it, right after a sub-location exists. It never throws and never fails
 * provisioning: the result is recorded on the profile's provisioning_state
 * under `cro9_sheet` so a missing sheet is visible and retryable, not silent.
 *
 * Needs a domain. A sub-location with no website has nothing for the tracking
 * script to track and nothing to name a sheet after, so it is recorded as
 * `skipped` with the reason, and re-runs once a website is known.
 */
import { createClient } from '@supabase/supabase-js'

const CRO9_URL = (process.env.CRO9_URL || 'https://www.cro9.com').replace(/\/$/, '')

export type Cro9SheetOutcome = {
  status: 'ok' | 'partial' | 'existing' | 'skipped' | 'failed'
  at: string
  domain?: string | null
  spreadsheetId?: string
  spreadsheetUrl?: string
  reason?: string
  failures?: string[]
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
}

export function domainOf(...candidates: Array<string | null | undefined>): string | null {
  for (const c of candidates) {
    const raw = String(c || '').trim().toLowerCase()
    if (!raw) continue
    const host = raw.replace(/^https?:\/\//, '').split(/[/?#]/)[0].replace(/^www\./, '').replace(/:\d+$/, '').replace(/\.$/, '')
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return host
  }
  return null
}

async function recordOnProfile(userId: string | null | undefined, outcome: Cro9SheetOutcome) {
  if (!userId) return
  try {
    const sb = admin()
    const { data } = await sb.from('profiles').select('provisioning_state').eq('id', userId).maybeSingle()
    const state = ((data as { provisioning_state?: Record<string, unknown> } | null)?.provisioning_state) ?? {}
    await sb.from('profiles').update({ provisioning_state: { ...state, cro9_sheet: outcome } }).eq('id', userId)
  } catch (e) {
    console.error('[cro9-sheet] could not record outcome:', e instanceof Error ? e.message : e)
  }
}

export async function ensureCro9Sheet(args: {
  userId?: string | null
  email: string
  fullName?: string | null
  locationId: string
  website?: string | null
  source?: string
}): Promise<Cro9SheetOutcome> {
  const at = new Date().toISOString()
  const domain = domainOf(args.website)
  if (!domain) {
    const o: Cro9SheetOutcome = { status: 'skipped', at, domain: null, reason: 'No website on the account yet — the sheet is created as soon as one is added.' }
    await recordOnProfile(args.userId, o)
    return o
  }
  const key = process.env.CRO9_ADMIN_KEY
  if (!key) {
    const o: Cro9SheetOutcome = { status: 'failed', at, domain, reason: 'CRO9_ADMIN_KEY is not set on this project, so 0nCore cannot ask CRO9 for a sheet.' }
    console.error('[cro9-sheet]', o.reason)
    await recordOnProfile(args.userId, o)
    return o
  }

  let o: Cro9SheetOutcome
  try {
    const res = await fetch(`${CRO9_URL}/api/admin/provision-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cro9-admin': key },
      body: JSON.stringify({ domain, ownerEmail: args.email, ownerName: args.fullName || undefined, crmLocationId: args.locationId, source: args.source || 'oncore-provision' }),
      signal: AbortSignal.timeout(55_000),
    })
    const text = await res.text()
    let j: { ok?: boolean; existing?: boolean; spreadsheetId?: string; spreadsheetUrl?: string; steps?: Array<{ step: string; ok: boolean; detail: string }>; error?: string } = {}
    try { j = JSON.parse(text) } catch { /* non-JSON body: reported below */ }
    const failures = (j.steps || []).filter((s) => !s.ok).map((s) => `${s.step}: ${s.detail}`)
    if (j.spreadsheetId) {
      o = { status: j.existing ? 'existing' : failures.length ? 'partial' : 'ok', at, domain, spreadsheetId: j.spreadsheetId, spreadsheetUrl: j.spreadsheetUrl, ...(failures.length ? { failures } : {}) }
    } else {
      o = { status: 'failed', at, domain, reason: j.error || (failures.length ? failures.join(' | ') : `CRO9 answered ${res.status}: ${text.slice(0, 200)}`) }
    }
  } catch (e) {
    o = { status: 'failed', at, domain, reason: e instanceof Error ? e.message : String(e) }
  }
  if (o.status === 'failed') console.error(`[cro9-sheet] ${args.locationId} ${domain}: ${o.reason}`)
  else console.log(`[cro9-sheet] ${args.locationId} ${domain}: ${o.status} ${o.spreadsheetUrl || ''}`)
  await recordOnProfile(args.userId, o)
  return o
}
