/**
 * The canary for POST /oauth/locationToken.
 *
 * WHAT THIS WATCHES, AND WHY A PROBE RATHER THAN A CHANGELOG. That endpoint was
 * removed from the platform's documentation on 2026-06-11 with no deprecation
 * period, and it still answers. See lib/crm/deprecations.ts: the dangerous state
 * is not 404, it is *undocumented but working* — there is no clock to consult,
 * no announcement to re-read, and nothing that fires the day it stops. Every
 * location that has no pasted key and no live install resolves credentials
 * through this call, so the day it goes we lose those locations silently, and we
 * find out from a customer.
 *
 * So we call it on a schedule, on purpose, and we say so out loud when the
 * answer changes. We learn the day it dies, not the week after.
 *
 * DELIBERATELY NOT ensureLocationInstall(). That function is the production
 * resolution path: it returns a cached token without ever touching the network
 * — which is exactly the wrong behaviour for a canary, since a cache hit would
 * report "healthy" about an endpoint that has been dead for a month. This mints
 * directly, every run, and throws the token away. Nothing is written to
 * crm_installations: a probe that mutates state is a probe you stop trusting.
 */

import { createClient } from '@supabase/supabase-js'
import { getValidAgencyToken } from './agency-token'
import { recordMintOutcome } from './pasted-key-fallback'

const CRM_BASE = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'
const AGENCY_APP_ID = '69c762225a31e1cd2f28dd4c'

export interface CanaryResult {
  ran: boolean
  /** true only for a 2xx that actually carried a token. */
  alive: boolean
  status: number | null
  locationId: string | null
  latencyMs: number
  /** Present whenever the canary could not report on the endpoint itself. */
  skipped?: string
  error?: string
  alert?: string
}

/**
 * A location to probe with. Env first so the probe target is a decision rather
 * than whatever the query happened to return today; otherwise the most recently
 * updated active install under the agency app.
 */
async function pickCanaryLocation(): Promise<string | null> {
  const fromEnv = process.env.CANARY_LOCATION_ID?.trim()
  if (fromEnv) return fromEnv

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data } = await db
    .from('crm_installations')
    .select('location_id')
    .eq('app_id', AGENCY_APP_ID)
    // NO STATUS FILTER, AND THAT IS DELIBERATE. What this probe needs is a
    // location id the agency owns — not a working install. Minting is precisely
    // the path that still works when the install is dead, which is the fact the
    // canary exists to measure. Scoping this to status='active' tied the
    // monitor's survival to the health of the rows it monitors: the day the 29
    // retired installs were archived, the pool would have gone empty and the
    // canary would have reported "no canary location" forever — green by
    // silence, the same failure mode as its first run, from the other end.
    // EMPTY STRING, NOT NULL — and the difference cost this canary its first
    // run. The agency-level install stores location_id as '' (it is company
    // scoped, it has no location), and it is also the most recently updated row
    // in the table, so `.not(is null)` happily returned it, `if (!locationId)`
    // saw a falsy value, and the probe reported "no canary location" while 27
    // usable locations sat in the same table. A monitor that skips itself is
    // worse than no monitor: it reports green.
    .not('location_id', 'is', null)
    .neq('location_id', '')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ location_id: string }>()

  return data?.location_id ?? null
}

export async function runLocationTokenCanary(): Promise<CanaryResult> {
  const started = Date.now()
  const base: CanaryResult = { ran: false, alive: false, status: null, locationId: null, latencyMs: 0 }

  const locationId = await pickCanaryLocation()
  if (!locationId) {
    // NOT a failure of the endpoint, and it must never be reported as one.
    // "We could not ask" and "we asked and it is dead" are different facts, and
    // collapsing them is how a monitor starts crying wolf and gets ignored.
    return { ...base, skipped: 'no canary location — set CANARY_LOCATION_ID or install the agency app on one sub-account' }
  }

  const agency = await getValidAgencyToken(undefined, 'oauth.write')
  if (!agency.token || !agency.companyId) {
    return {
      ...base,
      locationId,
      skipped: `no agency token with oauth.write (${agency.error || 'none on file'}) — the canary cannot reach the endpoint`,
    }
  }

  try {
    const res = await fetch(`${CRM_BASE}/oauth/locationToken`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${agency.token}`,
        Version: CRM_VERSION,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ companyId: agency.companyId, locationId }),
      signal: AbortSignal.timeout(15_000),
    })
    const latencyMs = Date.now() - started
    const text = await res.text()

    // The documented success is 201. 200 is accepted because a body-carrying
    // 200 is the same fact: the endpoint answered and minted. What we refuse to
    // accept is a 2xx with no token — the shape of a soft removal.
    let hasToken = false
    try { hasToken = Boolean(JSON.parse(text)?.access_token) } catch { hasToken = false }
    const alive = res.ok && hasToken

    // The probe's verdict, written where resolution can read it. A console
    // alert is only useful to whoever is reading the console; the row is what
    // lets credential resolution stop calling a dead endpoint on its own.
    await recordMintOutcome({
      status: res.status,
      alive,
      error: alive ? undefined : text.slice(0, 200),
      observedBy: 'runLocationTokenCanary',
      // The one caller allowed to arm. The location id came from our own table,
      // so a 404 here is about the endpoint and cannot be about the location.
      mayArm: true,
    })

    if (alive) {
      return { ran: true, alive: true, status: res.status, locationId, latencyMs }
    }

    // The token is never logged. The status and the body's first 200 chars are
    // what a person needs to tell "removed" from "our scope lapsed".
    const alert =
      `[canary] POST /oauth/locationToken answered ${res.status}` +
      (res.ok && !hasToken ? ' with NO access_token' : '') +
      ` for location ${locationId}. This endpoint has been undocumented since 2026-06-11. ` +
      'If this is a 404 or 410 it is GONE: every location without a pasted per-location key ' +
      'has just lost credential resolution. Paste keys now — see /api/admin/deprecation-check ' +
      'for exactly which locations are exposed.'
    console.error(alert, text.slice(0, 200))

    return {
      ran: true,
      alive: false,
      status: res.status,
      locationId,
      latencyMs,
      error: text.slice(0, 200),
      alert,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'canary threw'
    const alert = `[canary] POST /oauth/locationToken did not answer at all for location ${locationId}: ${message}`
    console.error(alert)
    // Recorded, never armed on. A timeout is what a live endpoint having a bad
    // day looks like, and disarming a working credential path over one would be
    // us causing the outage.
    await recordMintOutcome({ status: null, alive: false, error: message, observedBy: 'runLocationTokenCanary', mayArm: true })
    return { ran: true, alive: false, status: null, locationId, latencyMs: Date.now() - started, error: message, alert }
  }
}
