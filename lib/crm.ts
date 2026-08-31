/**
 * CRM API helper — resolves the right credential per location:
 *   1. Active OAuth install in crm_installations (auto-refreshes on expiry/401)
 *   2. Per-location PIT token from env
 *   3. Agency PIT fallback
 */

import { createClient } from '@supabase/supabase-js'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'
const CRM_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token'

/**
 * CRM Marketplace Apps — canonical definitions live in lib/crm-apps.ts.
 * The exports below stay for back-compat (oauth/callback + a few callers)
 * and read from the same env vars.
 *
 * Operation routing → see lib/crm-apps.ts pickApp() and categoryForPath().
 *   sub-location ops (contacts, conversations, etc.) → 0nCORE Marketplace
 *   agency ops (sub-accounts, snapshots, billing)    → 0nAGENCY
 */
import { AGENCY_APP as AGENCY_APP_DEF, SUB_LOCATION_APP, AGENCY_V2_APP } from './crm-apps'

export const AGENCY_APP = {
  appId: AGENCY_APP_DEF.appId,
  clientId: process.env.CRM_AGENCY_CLIENT_ID || '69cf4d25a74f834803470537-mnsazpwc',
  clientSecret: process.env.CRM_AGENCY_CLIENT_SECRET || '',
  redirectUri: AGENCY_APP_DEF.redirectUri,
}

export const MARKETPLACE_APP = {
  appId: SUB_LOCATION_APP.appId,
  // Rotated 2026-05-17 — new credentials issued in the marketplace dashboard.
  // The two older client IDs are kept as alt fallbacks in case existing installs
  // are still pinned to them; new installs use the current credentials.
  clientId: process.env.CRM_MARKETPLACE_APP_CLIENT_ID || process.env.CRM_MARKETPLACE_CLIENT_ID || '69c762225a31e1cd2f28dd4c-mpa19g2x',
  altClientId: '69c762225a31e1cd2f28dd4c-mnsa16jo',
  legacyClientId: '69c762225a31e1cd2f28dd4c-mnu5pazi',
  clientSecret: process.env.CRM_MARKETPLACE_CLIENT_SECRET || '',
  sharedSecret: process.env.CRM_MARKETPLACE_SHARED_SECRET || '',
  redirectUri: SUB_LOCATION_APP.redirectUri,
  scopes: `${SUB_LOCATION_APP.scopes.length}+ scopes (see crm-apps.ts)`,
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Validate that a PIT token looks correct (starts with "pit-").
 * If it's encrypted/double-wrapped by Vercel, it will be a long Base64 blob.
 * Log a CRITICAL warning so we catch this immediately.
 */
function validatePit(name: string, value: string | undefined): string {
  if (!value) return ''
  if (value.startsWith('pit-')) return value
  // BROKEN — this token is encrypted/double-wrapped by Vercel
  console.error(`[CRM] CRITICAL: ${name} is NOT a valid PIT token (starts with "${value.substring(0, 20)}..."). It must be type:plain on Vercel, not encrypted. THIS BREAKS ALL CRM CALLS.`)
  return '' // Return empty so we fall through to a working token
}

/**
 * DEPRECATED — 0n-owned keys for four hardcoded location ids.
 *
 * Kept only so a legacy caller does not crash mid-migration. It must not be
 * used to resolve a client's credential, and getAuthForLocation no longer
 * calls it.
 *
 * WHY IT WAS DANGEROUS. The old fallback chain returned SOME key for ANY
 * location — ask for a client we hold nothing for and it handed back the
 * agency PIT or 0nCORE's own PIT. A credential for a different account is not
 * a fallback; it is a write into the wrong client waiting to happen. It also
 * masked failures: a scope refusal on one key silently succeeded on another,
 * so an operation looked healthy on our accounts and failed for every real
 * agency, who has none of these env vars.
 *
 * THE MODEL IS TWO KEYS, BOTH SUPPLIED BY THE AGENCY:
 *   agency key  → lists their sub-accounts        (agency_connections.agency_pit)
 *   client key  → acts inside ONE sub-account     (location_connections.location_pit)
 * Neither is ours, neither is hardcoded, and a missing one is an error to
 * report rather than a gap to paper over.
 */
export function getPitForLocation(locationId: string): string {
  const legacy: Record<string, string> = {
    '6MSqx0trfxgLxeHBJE1k': validatePit('CRM_PIT_ROCKETOPP', process.env.CRM_PIT_ROCKETOPP),
    'nphConTwfHcVE1oA0uep': validatePit('CRM_PIT_ONCORE', process.env.CRM_PIT_ONCORE),
    'F76MNKOMQCMruMrumtdf': validatePit('CRM_PIT_SPA', process.env.CRM_PIT_SPA),
  }
  // Exact match only. No cross-account fallback, ever.
  return legacy[locationId] || ''
}


/**
 * `unresolved` is set when NOTHING produced a credential — every position in the
 * chain missed. It exists because the honest value of `token` in that case is
 * '', and an empty string is indistinguishable at every call site from a token
 * that simply has the wrong scope: we send `Bearer ` to the CRM, it answers 401,
 * and nothing anywhere says which account has no key. Carrying the reason on the
 * Auth means the failure can name the location and the fix all the way out.
 */
export type Auth = {
  token: string
  source: 'oauth' | 'pit'
  installId?: string
  locationId: string
  unresolved?: string
}

/**
 * The client credentials that can refresh a token depend on WHICH app issued
 * it. A refresh_token minted by App A (the lean sub-account app, 6a7178a4) is
 * rejected by the CRM if presented with the legacy marketplace app's client_id
 * — the platform binds a refresh_token to its issuing client. Hardcoding one
 * app here is the bug that silently kills every external install ~24h after it
 * lands: the first token works, the refresh fails, and (for a location that is
 * NOT under our agency) there is no minting fallback to hide it.
 *
 * `user_type` must also match how the app installs: Location for a sub-account
 * app, Company for an agency app — the CRM will not return a rotated token
 * otherwise.
 *
 * AND THE HARDCODE THIS DOCSTRING WARNS ABOUT WAS SITTING TWO LINES BELOW IT,
 * INVERTED. The App A arm matched `appId === SUB_LOCATION_APP.appId` as well as
 * App A's own id, and SUB_LOCATION_APP is NOT App A — it is the legacy
 * marketplace app, appId `CRM_MARKETPLACE_APP_ID || 69c762225a31e1cd2f28dd4c`.
 * So every 69c762 install was refreshed with App A's client id and App A's
 * secret, and the `return` at the bottom of this function labelled "Legacy
 * marketplace (69c762) … → sub-account default" was unreachable for the one
 * app it names. Harmless while CRM_SUBACCT_CLIENT_ID was unset (the arm fell
 * through to the marketplace pair); live from the moment it was set on
 * 2026-08-12.
 *
 * MEASURED ON THE LIVE INSTALL, 2026-08-31, before the fix was written. The
 * agency install 25151350 (app 69c762, the row that mints every location token
 * this estate uses) had been failing its 6-hourly refresh with 401 "Invalid
 * client credentials!" — while the identical grant, sent by hand with
 * CRM_MARKETPLACE_APP_CLIENT_ID + CRM_MARKETPLACE_CLIENT_SECRET, answered 200
 * and rotated. Same token, same user_type, same minute; only the pair differed.
 * The mismatch is legible in the values themselves: the CRM issues client ids
 * as `<appId>-<suffix>`, the token's own sourceId is
 * `69c762225a31e1cd2f28dd4c-mpa19g2x`, and CRM_SUBACCT_CLIENT_ID is
 * `6a7178a4e8d7c3c038c593b3-msebefqb`.
 *
 * IT LOOKED INTERMITTENT, WHICH IS WHY IT SURVIVED TWO TRIAGES. Nothing here
 * is the only refresher: lib/crm/agency-token.ts refreshAgencyToken() uses the
 * marketplace pair directly and rides the same cron, but only fires inside
 * REFRESH_BUFFER_MS of expiry. So one cycle in four repaired the row for free
 * and reset consecutive_failures to 0, and the other three marked it degraded.
 * A sawtooth reads as a flaky platform, not as a constant credential mismatch.
 *
 * THE OWNER OF A CREDENTIAL PAIR IS DERIVED FROM THE PAIR, not asserted beside
 * it. `<appId>-<suffix>` means CRM_SUBACCT_CLIENT_ID already says which app it
 * belongs to; reading that is what stops this arm from ever again claiming an
 * app whose tokens its secret cannot sign. The literal stays as the fallback
 * for a deployment that sets no subacct client id.
 */
function appIdOfClientId(clientId: string | undefined): string {
  return (clientId || '').split('-')[0] || ''
}

export function credsForApp(appId: string): { clientId: string; clientSecret: string; userType: 'Location' | 'Company' } {
  // App A — the lean sub-account marketplace app going for approval.
  const subacctAppId = appIdOfClientId(process.env.CRM_SUBACCT_CLIENT_ID) || '6a7178a4e8d7c3c038c593b3'
  if (appId === '6a7178a4e8d7c3c038c593b3' || appId === subacctAppId) {
    return {
      clientId: process.env.CRM_SUBACCT_CLIENT_ID || process.env.CRM_MARKETPLACE_APP_CLIENT_ID || MARKETPLACE_APP.clientId,
      clientSecret: process.env.CRM_SUBACCT_CLIENT_SECRET || process.env.CRM_MARKETPLACE_CLIENT_SECRET || MARKETPLACE_APP.clientSecret,
      userType: 'Location',
    }
  }
  // Agency v2 (6a71919b) — company-level install.
  if (appId === '6a71919be8d7c3c038df0839' || appId === AGENCY_V2_APP.appId) {
    return {
      clientId: process.env[AGENCY_V2_APP.clientIdEnv] || '',
      clientSecret: process.env[AGENCY_V2_APP.clientSecretEnv] || '',
      userType: 'Company',
    }
  }
  // Legacy 0nAGENCY (69cf4d25) — company-level install.
  if (appId === AGENCY_APP.appId) {
    return {
      clientId: AGENCY_APP.clientId,
      clientSecret: AGENCY_APP.clientSecret || process.env.CRM_AGENCY_CLIENT_SECRET || '',
      userType: 'Company',
    }
  }
  /**
   * 0n Course Builder (69801f7a) — installs COMPANY-level, not per location.
   *
   * Missing here it fell through to the sub-account default below and would
   * have been refreshed with the LEGACY MARKETPLACE app's client id against a
   * refresh_token owned by 69801f7a…-mt0s9dyk. That fails as "Invalid client
   * credentials" — the exact string that cost a full day on 2026-08-19 — and it
   * fails in the cron, twelve hours before anyone would look.
   *
   * userType is 'Company' because that is what the platform ISSUED, not what we
   * asked for. The install request sends user_type=Location; the returned JWT
   * carries authClass=Company / authClassId=<companyId> and the token response
   * comes back with an empty locationId. Refresh must send the type the token
   * actually has, so a wrong guess here breaks renewal even with the right app.
   */
  if (appId === '69801f7a533633818a22921c' || appId === process.env.CRM_COURSE_APP_ID) {
    return {
      clientId: process.env.CRM_COURSE_APP_CLIENT_ID || '',
      clientSecret: process.env.CRM_COURSE_APP_CLIENT_SECRET || '',
      userType: 'Company',
    }
  }
  // Legacy marketplace (69c762) and any unknown app → sub-account default.
  return {
    clientId: MARKETPLACE_APP.clientId,
    clientSecret: MARKETPLACE_APP.clientSecret || process.env.CRM_MARKETPLACE_CLIENT_SECRET || '',
    userType: 'Location',
  }
}

/**
 * Refresh an OAuth install's access token via the stored refresh_token,
 * then write the new tokens back to crm_installations. Credentials are chosen
 * from the install's own `appId` — see credsForApp above for why that matters.
 */
/**
 * Exported so the scheduled worker can reuse it instead of writing a second
 * refresh. Two implementations of "renew a token" is how one of them quietly
 * stops rotating the refresh credential.
 *
 * `storedUserType` is the user_type that ACTUALLY produced the token, recorded
 * on the install by the callback. It wins over the app's configured value:
 * Location and Company are not interchangeable here, and refreshing with the
 * wrong one fails in a way that looks like a bad credential.
 */
export async function refreshInstall(
  installId: string,
  refreshToken: string,
  appId: string,
  storedUserType?: string,
): Promise<string | null> {
  const { clientId, clientSecret, userType: configuredType } = credsForApp(appId)
  const userType = storedUserType || configuredType
  if (!clientId || !clientSecret || !refreshToken) return null

  const res = await fetch(CRM_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      user_type: userType,
    }),
  })

  if (!res.ok) {
    console.error('[crm.refreshInstall] failed:', res.status, await res.text())
    await getAdmin().from('crm_installations').update({ status: 'expired' }).eq('id', installId)
    return null
  }

  const data = await res.json()
  if (!data.access_token) return null

  await getAdmin().from('crm_installations').update({
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken, // never wipe; rotate or keep
    expires_at: new Date(Date.now() + (data.expires_in || 86400) * 1000).toISOString(),
    status: 'active',
    updated_at: new Date().toISOString(),
  }).eq('id', installId)

  return data.access_token
}

/**
 * Resolve the auth credential for a given location.
 *
 * Resolution order:
 *   1. The key the AGENCY PASTED for this account (location_connections).
 *   2. Active, non-expiring OAuth install in crm_installations (refresh if within 60s)
 *   3. Auto-mint via the agency app — POST /oauth/locationToken using the
 *      cached agency-OAuth token, so a sub-location can get a scoped token
 *      without per-location OAuth consent.
 *   4. Env PIT (CRM_PIT_<LOCATION_ID>, then fallback chain) — 0n-owned only.
 *
 * WHY THE PASTED KEY IS FIRST. It used to sit at position 3, and that was
 * wrong in a way that hid itself: proven on 2026-08-11 by storing a
 * deliberately invalid key for a location and watching the write SUCCEED
 * anyway, because refresh/mint resolved first. An agency who pastes a key,
 * sees "connected", and rotates it in the CRM would keep running on a stale
 * minted token — and the day the inferred credentials stop working, the thing
 * they explicitly configured has never actually been exercised.
 *
 * Everything below position 1 is inherited or inferred. Position 1 is the only
 * credential a customer chose, can see in Clients, and can revoke. It wins.
 */
export async function getAuthForLocation(locationId: string): Promise<Auth> {
  // 1 — what the agency actually configured for this account.
  try {
    const { getStoredLocationPit } = await import('./connect/pit')
    const stored = await getStoredLocationPit(locationId)
    if (stored) return { token: stored, source: 'pit', locationId }
  } catch (err) {
    console.warn('[crm.getAuthForLocation] stored key lookup threw:', err)
  }

  try {
    const { data } = await getAdmin()
      .from('crm_installations')
      .select('id, access_token, refresh_token, expires_at, status, app_id')
      .eq('location_id', locationId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data?.access_token) {
      const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0
      const stillValid = expiresAt && expiresAt - Date.now() > 60_000
      if (stillValid) {
        return { token: data.access_token, source: 'oauth', installId: data.id, locationId }
      }
      // Expired or within 60s of expiry — refresh via the install's OWN app
      // credentials (App A tokens can't be refreshed with the legacy app's).
      if (data.refresh_token) {
        const fresh = await refreshInstall(data.id, data.refresh_token, data.app_id)
        if (fresh) return { token: fresh, source: 'oauth', installId: data.id, locationId }
      }
      // No refresh_token, or the refresh failed → fall through to mint / PIT.
      // Never return a known-expired access_token: it can only 401, and for a
      // location under our agency the mint below is the correct recovery.
    }
  } catch (err) {
    console.error('[crm.getAuthForLocation] lookup failed:', err)
  }

  // Auto-mint via agency-token. Lazy-imported to avoid a circular dep.
  try {
    const { ensureLocationInstall } = await import('./crm/location-token')
    const minted = await ensureLocationInstall(locationId)
    if (minted.token) {
      return { token: minted.token, source: 'oauth', locationId }
    }
    if (minted.error) {
      console.warn(`[crm.getAuthForLocation] mint failed for ${locationId}: ${minted.error}`)
    }
  } catch (err) {
    console.warn('[crm.getAuthForLocation] mint threw:', err)
  }

  // 4 — the legacy env key, for the three 0n-owned locations that still have one.
  const env = getPitForLocation(locationId)
  if (env) return { token: env, source: 'pit', locationId }

  // NOTHING. Every position missed. Say which account and what to do about it,
  // here, where we still know — rather than emitting `Bearer ` and letting the
  // CRM's 401 be the only record that this location has no credential at all.
  let unresolved = `No credential for location ${locationId}. Paste that account's key at /connect.`
  try {
    const { requirePastedKey } = await import('./crm/pasted-key-fallback')
    const need = await requirePastedKey(locationId)
    if (need.instruction) unresolved = need.instruction
  } catch { /* the message above is already actionable */ }
  console.error(`[crm.getAuthForLocation] UNRESOLVED — ${unresolved}`)
  return { token: '', source: 'pit', locationId, unresolved }
}

/**
 * Send a fetch with the resolved auth. On 401 with an OAuth install,
 * refresh the token once and retry.
 */
/**
 * Credentials to try after a scope refusal, in order, excluding the one that
 * just failed.
 *
 * A location can legitimately have SEVERAL credentials, all agency-granted:
 * the client key they pasted, and any of our apps they installed. Those apps
 * carry very different grants — the marketplace app has 142 scopes including
 * courses and oauth.write; the sub-account app has 12 and neither. Verified
 * 2026-08-12.
 *
 * getAuthForLocation picks ONE install, ordered by updated_at — the freshest,
 * not the one that can do the job. It cannot know which is right, because
 * scope is only discoverable by being refused. So on refusal, walk the rest,
 * widest grants first.
 *
 * SAME LOCATION ONLY. Never another account's key: a credential for a
 * different client is not a fallback, it is a write into the wrong account.
 */
export async function fallbackCredentials(failed: Auth): Promise<{ label: string; token: string }[]> {
  const out: { label: string; token: string }[] = []

  // 1 — the key the agency pasted for THIS client.
  try {
    const { getStoredLocationPit } = await import('./connect/pit')
    const stored = await getStoredLocationPit(failed.locationId)
    if (stored && stored !== failed.token) out.push({ label: 'the client key', token: stored })
  } catch { /* not fatal */ }

  // 2 — our other installs on THIS location, widest grants first.
  try {
    const { data } = await getAdmin()
      .from('crm_installations')
      .select('access_token, app_id, scopes, expires_at')
      .eq('location_id', failed.locationId)
      .eq('status', 'active')
    for (const row of (data ?? [])
      .filter((r) => r.access_token && r.access_token !== failed.token)
      .filter((r) => !r.expires_at || new Date(r.expires_at).getTime() > Date.now())
      .sort((a, b) => (b.scopes?.split(' ').length ?? 0) - (a.scopes?.split(' ').length ?? 0))) {
      out.push({ label: `app ${String(row.app_id).slice(0, 8)} (${row.scopes?.split(' ').length ?? 0} scopes)`, token: row.access_token })
    }
  } catch { /* not fatal */ }

  // 3 — the legacy env key for THIS location, if one was configured.
  const env = getPitForLocation(failed.locationId)
  if (env && env !== failed.token && !out.some((c) => c.token === env)) {
    out.push({ label: 'the legacy env key', token: env })
  }
  return out
}

async function authedFetch(url: string, init: RequestInit, auth: Auth): Promise<Response> {
  /**
   * DO NOT SEND `Bearer `. A resolution that produced nothing can only ever get
   * a 401 back, so the round trip buys no information — it just launders "this
   * account has no key" into the same opaque rejection a revoked token gives,
   * one layer further from the code that knows the difference. Same status the
   * CRM would have returned, so every caller behaves exactly as before; the body
   * now names the account and the fix.
   */
  if (!auth.token) {
    const detail = auth.unresolved || `No credential resolved for location ${auth.locationId}.`
    console.error(`[CRM] REFUSING ${init.method || 'GET'} ${url.replace(CRM_API, '')} — ${detail}`)
    return new Response(
      JSON.stringify({ message: detail, locationId: auth.locationId, unresolved: true }),
      { status: 401, headers: { 'content-type': 'application/json' } },
    )
  }

  const headers = {
    ...(init.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${auth.token}`,
    Version: CRM_VERSION,
    'Content-Type': 'application/json',
  }

  const startMs = Date.now()
  let res = await fetch(url, { ...init, headers, cache: 'no-store' })
  const durationMs = Date.now() - startMs

  // Detailed logging on any error
  if (!res.ok) {
    const cloned = res.clone()
    let errorBody = ''
    try { errorBody = await cloned.text() } catch {}
    console.error(`[CRM] ${res.status} ${init.method || 'GET'} ${url.replace(CRM_API, '')} (${durationMs}ms)`)
    console.error(`[CRM] Auth: ${auth.source} | Token: ${auth.token.substring(0, 15)}... | Location: ${auth.locationId}`)
    console.error(`[CRM] Response: ${errorBody.substring(0, 500)}`)

    if (res.status === 401 && auth.source === 'oauth' && auth.installId) {
      console.log(`[CRM] 401 on OAuth — attempting token refresh for install ${auth.installId}`)
      const { data } = await getAdmin()
        .from('crm_installations')
        .select('refresh_token, app_id')
        .eq('id', auth.installId)
        .maybeSingle()
      if (data?.refresh_token) {
        const fresh = await refreshInstall(auth.installId, data.refresh_token, data.app_id)
        if (fresh) {
          console.log(`[CRM] Token refreshed — retrying request`)
          res = await fetch(url, {
            ...init,
            headers: { ...headers, Authorization: `Bearer ${fresh}` },
            cache: 'no-store',
          })
          if (!res.ok) {
            const retryBody = await res.clone().text().catch(() => '')
            console.error(`[CRM] Retry also failed: ${res.status} — ${retryBody.substring(0, 300)}`)
          }
        } else {
          console.error(`[CRM] Token refresh failed — install ${auth.installId} marked expired`)
        }
      }
    } else if (res.status === 401 && auth.source === 'pit') {
      console.error(`[CRM] 401 on PIT token — token may be expired or invalid. PIT: ${auth.token.substring(0, 20)}...`)
    }

    /**
     * SCOPE 401 — try the NEXT credential, not the same one again.
     *
     * Refreshing an OAuth token cannot fix a missing scope: the fresh token
     * carries exactly the same grants. Proven on 2026-08-12 — publishing a
     * course to nphConTwfHcVE1oA0uep failed 401 "not authorized for this
     * scope" on the OAuth install (12 scopes, none for courses) while the env
     * PIT returned 201 for the identical payload. A working credential was
     * sitting one position further down the chain and was never tried.
     *
     * getAuthForLocation returns the FIRST credential, not one that works for
     * this particular operation — and it cannot know, because scope is only
     * discoverable by being refused. So discovering it here and falling
     * through is the fix, and it serves every capability rather than courses
     * alone.
     */
    if (res.status === 401 && /scope/i.test(errorBody)) {
      for (const next of await fallbackCredentials(auth)) {
        console.log(`[CRM] scope 401 on ${auth.source} — retrying with ${next.label}`)
        const retry = await fetch(url, {
          ...init,
          headers: { ...headers, Authorization: `Bearer ${next.token}` },
          cache: 'no-store',
        })
        if (retry.ok) return retry
        console.error(`[CRM] ${next.label} also refused: ${retry.status}`)
      }
    }
  }

  return res
}

export async function crmGet(path: string, locationId: string): Promise<Response> {
  const auth = await getAuthForLocation(locationId)
  const sep = path.includes('?') ? '&' : '?'
  const url = `${CRM_API}${path}${sep}locationId=${locationId}`
  return authedFetch(url, { method: 'GET' }, auth)
}

/**
 * GET with the query string EXACTLY as given — no locationId appended.
 *
 * crmGet appends `locationId=` to every URL, which is right for most reads and
 * wrong for two shapes, both of which fail in ways that look like an auth
 * problem rather than a URL problem:
 *
 *   · a path that ALREADY carries locationId gets it twice, and
 *     /conversations/search answers 400 "Invalid locationId format" — the
 *     value is fine, there are simply two of them.
 *   · /opportunities/search takes `location_id`, so the appended camelCase one
 *     is an unknown property and it answers 422 "property locationId should
 *     not exist".
 *
 * Same reasoning as crmPostRaw, and kept as a separate function for the same
 * reason: no existing caller changes behaviour.
 */
export async function crmGetRaw(path: string, locationId: string): Promise<Response> {
  const auth = await getAuthForLocation(locationId)
  return authedFetch(`${CRM_API}${path}`, { method: 'GET' }, auth)
}

export async function crmPost(path: string, locationId: string, body: Record<string, unknown>): Promise<Response> {
  const auth = await getAuthForLocation(locationId)
  return authedFetch(`${CRM_API}${path}`, {
    method: 'POST',
    body: JSON.stringify({ ...body, locationId }),
  }, auth)
}

/**
 * POST with the body EXACTLY as given — no locationId injected.
 *
 * crmPost merges `locationId` into every body, which is right for collection
 * endpoints like POST /contacts/ and wrong for sub-resources: POST
 * /contacts/{id}/notes and /contacts/{id}/tags reject it outright with 422
 * "property locationId should not exist". The location is already implied by
 * the contact in the path.
 *
 * Kept as a separate function rather than a flag on crmPost so no existing
 * caller changes behaviour — several rely on the injection.
 */
export async function crmPostRaw(path: string, locationId: string, body: Record<string, unknown>): Promise<Response> {
  const auth = await getAuthForLocation(locationId)
  return authedFetch(`${CRM_API}${path}`, { method: 'POST', body: JSON.stringify(body) }, auth)
}

/**
 * Add a contact to an EXISTING workflow.
 *
 * THE MISSING LINK BETWEEN "DEPLOYED" AND "DYNAMIC". Native workflows cannot be
 * created or edited through the API — workflows-v3 exposes exactly one path,
 * GET /workflows/. But a contact CAN be enrolled into one, and that is what
 * makes a snapshot-shipped workflow feel like something we built on demand:
 * the workflow arrives with the client, and we decide who enters it and when.
 *
 * Needs only contacts.write, which every location token already carries.
 */
export async function enrollInWorkflow(
  locationId: string,
  contactId: string,
  workflowId: string,
  eventStartTime?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await crmPostRaw(
      `/contacts/${encodeURIComponent(contactId)}/workflow/${encodeURIComponent(workflowId)}`,
      locationId,
      eventStartTime ? { eventStartTime } : {},
    )
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      return { ok: false, error: `Could not start that workflow (${res.status}). ${t.slice(0, 140)}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not start that workflow.' }
  }
}

/** PATCH with the body exactly as given — see crmPostRaw for why. */
export async function crmPatchRaw(path: string, locationId: string, body: Record<string, unknown>): Promise<Response> {
  const auth = await getAuthForLocation(locationId)
  return authedFetch(`${CRM_API}${path}`, { method: 'PATCH', body: JSON.stringify(body) }, auth)
}

export async function crmPut(path: string, locationId: string, body: Record<string, unknown>): Promise<Response> {
  const auth = await getAuthForLocation(locationId)
  return authedFetch(`${CRM_API}${path}`, {
    method: 'PUT',
    body: JSON.stringify({ ...body, locationId }),
  }, auth)
}

export async function crmDelete(path: string, locationId: string): Promise<Response> {
  const auth = await getAuthForLocation(locationId)
  return authedFetch(`${CRM_API}${path}`, { method: 'DELETE' }, auth)
}
