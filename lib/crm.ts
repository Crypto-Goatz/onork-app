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
import { AGENCY_APP as AGENCY_APP_DEF, SUB_LOCATION_APP } from './crm-apps'

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

export function getPitForLocation(locationId: string): string {
  // Prefer 0nCore-named env vars; fall back to legacy names during transition.
  const onCorePit = validatePit('CRM_PIT_ONCORE', process.env.CRM_PIT_ONCORE)
    || validatePit('CRM_PIT_RAW', process.env.CRM_PIT_RAW)
  const pits: Record<string, string> = {
    '6MSqx0trfxgLxeHBJE1k': validatePit('CRM_PIT_ROCKETOPP', process.env.CRM_PIT_ROCKETOPP),
    'nphConTwfHcVE1oA0uep': onCorePit,
    'AZLSL7r6X2tDV1A48Yrb': validatePit('CRM_PIT_FAIRICE', process.env.CRM_PIT_FAIRICE)
      || validatePit('CRM_AGENCY_PIT_NEW', process.env.CRM_AGENCY_PIT_NEW),
    'F76MNKOMQCMruMrumtdf': validatePit('CRM_PIT_SPA', process.env.CRM_PIT_SPA),
  }
  const specific = pits[locationId]
  if (specific) return specific

  // Fallback chain — each validated
  return validatePit('CRM_AGENCY_PIT_NEW', process.env.CRM_AGENCY_PIT_NEW)
    || onCorePit
    || validatePit('CRM_PIT_ROCKETOPP', process.env.CRM_PIT_ROCKETOPP)
    || validatePit('CRM_PIT', process.env.CRM_PIT)
    || ''
}

type Auth = { token: string; source: 'oauth' | 'pit'; installId?: string; locationId: string }

/**
 * Refresh an OAuth install's access token via the stored refresh_token,
 * then write the new tokens back to crm_installations.
 */
async function refreshInstall(installId: string, refreshToken: string): Promise<string | null> {
  const clientId = MARKETPLACE_APP.clientId
  const clientSecret = MARKETPLACE_APP.clientSecret || process.env.CRM_MARKETPLACE_CLIENT_SECRET || ''
  if (!clientSecret || !refreshToken) return null

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
      user_type: 'Location',
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
 *   1. Active, non-expiring OAuth install in crm_installations (refresh if within 60s)
 *   2. Auto-mint via the agency app — POST /oauth/locationToken using the
 *      cached agency-OAuth token. This is what makes auto-provisioning
 *      hands-off: every sub-location gets a scoped token without per-location
 *      OAuth consent.
 *   3. Env PIT (CRM_PIT_<LOCATION_ID>, then fallback chain)
 */
export async function getAuthForLocation(locationId: string): Promise<Auth> {
  try {
    const { data } = await getAdmin()
      .from('crm_installations')
      .select('id, access_token, refresh_token, expires_at, status')
      .eq('location_id', locationId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data?.access_token) {
      const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0
      const expiringSoon = expiresAt && expiresAt - Date.now() < 60_000
      if (expiringSoon && data.refresh_token) {
        const fresh = await refreshInstall(data.id, data.refresh_token)
        if (fresh) return { token: fresh, source: 'oauth', installId: data.id, locationId }
      }
      // If expired AND no refresh token (location-token mints don't return one),
      // fall through to ensureLocationInstall which will re-mint from agency token.
      if (!expiringSoon || data.refresh_token) {
        return { token: data.access_token, source: 'oauth', installId: data.id, locationId }
      }
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

  return { token: getPitForLocation(locationId), source: 'pit', locationId }
}

/**
 * Send a fetch with the resolved auth. On 401 with an OAuth install,
 * refresh the token once and retry.
 */
async function authedFetch(url: string, init: RequestInit, auth: Auth): Promise<Response> {
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
        .select('refresh_token')
        .eq('id', auth.installId)
        .maybeSingle()
      if (data?.refresh_token) {
        const fresh = await refreshInstall(auth.installId, data.refresh_token)
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
  }

  return res
}

export async function crmGet(path: string, locationId: string): Promise<Response> {
  const auth = await getAuthForLocation(locationId)
  const sep = path.includes('?') ? '&' : '?'
  const url = `${CRM_API}${path}${sep}locationId=${locationId}`
  return authedFetch(url, { method: 'GET' }, auth)
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
