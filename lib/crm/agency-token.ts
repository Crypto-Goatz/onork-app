/**
 * Agency-OAuth token cache — the keystone of automated multi-location auth.
 *
 * Mike's CRM agency app (clientId 69c762225a31e1cd2f28dd4c-mnu5pazi) was
 * installed via marketplace once. That install issued an
 * agency-level access_token + refresh_token stored in `crm_installations`
 * with location_id=''. With those credentials, we can:
 *
 *   - Refresh the agency token any time it expires (no human consent)
 *   - Call POST /oauth/locationToken to mint scoped tokens for ANY sub-account
 *
 * Both operations live here. Every other CRM helper goes through
 * getValidAgencyToken() instead of touching the row directly.
 *
 * If the refresh_token itself becomes invalid (CRM revoked the app, agency
 * uninstalled, etc.), this returns null and the caller should fail with a
 * "reinstall the marketplace app at https://0ncore.com/api/oauth/install"
 * message. There is no programmatic recovery for that — agency app install
 * is the one human step in the entire pipeline.
 */

import { createClient } from '@supabase/supabase-js'

const CRM_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token'
const AGENCY_APP_ID = '69c762225a31e1cd2f28dd4c'
const REFRESH_BUFFER_MS = 60_000 // refresh 1 min before expiry to avoid race

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

interface AgencyInstallRow {
  app_id?: string | null
  id: string
  access_token: string
  refresh_token: string | null
  expires_at: string | null
  company_id: string | null
  scopes: string | null
  status: string | null
}

/**
 * The canonical agency app — provisioning, snapshots and SaaS.
 *
 * PREFERRED OVER THE LEGACY APP, with fallback. The older install
 * (AGENCY_APP_ID) still holds live tokens and still powers contacts, locations
 * and every executor write, so it is NOT removed — ripping it out would break
 * working features for a migration nobody asked to happen today.
 *
 * But it was never granted saas/company.read, snapshots.readonly or
 * companies.readonly, and scopes cannot be added to an existing install. So the
 * new install is tried FIRST: when it exists, SaaS and snapshots work; when it
 * does not, everything falls back exactly as before.
 */
const AGENCY_V2_APP_ID = process.env.CRM_AGENCY_V2_APP_ID || '6a71919be8d7c3c038df0839'

async function readAgencyInstall(companyId?: string, needsScope?: string): Promise<AgencyInstallRow | null> {
  // Newest app first, then the legacy one. Ordering by app rather than by
  // updated_at is deliberate: a legacy row refreshed five minutes ago is still
  // the wrong token for a SaaS call, however recent it is.
  //
  // BUT THE APPS HOLD DIFFERENT SCOPES, so "newest" is not always "correct".
  // The V2 agency app has snapshots and SaaS; it does NOT have oauth.write,
  // because that scope is only offered on a sub-account target. Preferring it
  // blindly broke location-token minting — every per-client call silently fell
  // back to a PIT. When a caller names the scope it needs, an install that
  // lacks it is skipped rather than handed over.
  const candidates: AgencyInstallRow[] = []
  for (const appId of [AGENCY_V2_APP_ID, AGENCY_APP_ID]) {
    const row = await readAgencyInstallForApp(appId, companyId)
    if (row?.access_token) candidates.push(row)
  }
  if (!candidates.length) return null
  if (!needsScope) return candidates[0]

  const withScope = candidates.find((c) => (c.scopes ?? '').split(/\s+/).includes(needsScope))
  if (withScope) return withScope

  // Nothing holds it. Return the best token anyway so the caller produces a
  // real API error rather than a confusing "not connected" — but say so, since
  // this means an install is missing a scope somebody assumed it had.
  console.warn(`[crm/agency-token] no agency install holds "${needsScope}"; falling back to ${candidates[0].app_id}`)
  return candidates[0]
}

async function readAgencyInstallForApp(appId: string, companyId?: string): Promise<AgencyInstallRow | null> {
  const sb = admin()
  let q = sb
    .from('crm_installations')
    .select('id, app_id, access_token, refresh_token, expires_at, company_id, scopes, status')
    .eq('app_id', appId)
    .or('location_id.is.null,location_id.eq.')

  // Scoping to the asking agency is what makes this safe with more than one
  // install. Without it the newest row wins, which is harmless while we are the
  // only install and is a cross-tenant token hand-off the day we are not.
  if (companyId) q = q.eq('company_id', companyId)

  const { data } = await q
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<AgencyInstallRow>()
  return data
}

async function writeRefreshedAgencyToken(
  id: string,
  tokens: { access_token: string; refresh_token?: string; expires_in?: number; scope?: string },
): Promise<void> {
  const sb = admin()
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null
  await sb
    .from('crm_installations')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || undefined,
      expires_at: expiresAt,
      scopes: tokens.scope || undefined,
      status: 'active',
      health_status: 'healthy',
      consecutive_failures: 0,
      last_health_check: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
}

async function refreshAgencyToken(install: AgencyInstallRow): Promise<string | null> {
  if (!install.refresh_token) return null
  /**
   * Refresh with the credentials of the app that ISSUED this token.
   *
   * The old code always used the marketplace app's client id and secret. That
   * happened to be right while there was only one agency install; the moment a
   * second app issued a token, its refresh would be attempted with another
   * app's credentials and fail — quietly, a day later, when the access token
   * expired and nobody was watching.
   */
  const isV2 = install.app_id === AGENCY_V2_APP_ID
  const clientId = isV2
    ? (process.env.CRM_AGENCY_APP_CLIENT_ID || process.env.AGENCY_CLIENT_ID || '')
    : (process.env.CRM_MARKETPLACE_APP_CLIENT_ID || process.env.CRM_MARKETPLACE_CLIENT_ID || '')
  const clientSecret = isV2
    ? (process.env.CRM_AGENCY_APP_CLIENT_SECRET || process.env.AGENCY_CLIENT_SECRET || '')
    : (process.env.CRM_MARKETPLACE_CLIENT_SECRET || '')
  if (!clientId || !clientSecret) {
    console.error(`[crm/agency-token] client credentials missing for app ${install.app_id}`)
    return null
  }

  try {
    const res = await fetch(CRM_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: install.refresh_token,
        user_type: 'Company',
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error(`[crm/agency-token] refresh failed ${res.status}: ${errText.slice(0, 220)}`)
      // Mark unhealthy
      const sb = admin()
      await sb
        .from('crm_installations')
        .update({
          health_status: 'unhealthy',
          last_error: `refresh ${res.status}: ${errText.slice(0, 220)}`,
          consecutive_failures: 1,
        })
        .eq('id', install.id)
      return null
    }
    const tokens = (await res.json()) as {
      access_token: string
      refresh_token?: string
      expires_in?: number
      scope?: string
    }
    await writeRefreshedAgencyToken(install.id, tokens)
    return tokens.access_token
  } catch (err) {
    console.error('[crm/agency-token] refresh threw:', err)
    return null
  }
}

/**
 * Returns a valid agency-level access token. Refreshes transparently if
 * the cached one expired. Returns null if no install exists OR refresh
 * has permanently failed.
 */
export async function getValidAgencyToken(
  companyId?: string,
  /** Pick an install that actually holds this scope, e.g. 'oauth.write'. */
  needsScope?: string,
): Promise<{
  token: string | null
  companyId: string | null
  error?: string
}> {
  const install = await readAgencyInstall(companyId, needsScope)
  if (!install) {
    return {
      token: null,
      companyId: companyId ?? null,
      error: companyId
        ? 'This agency has not connected 0nCORE yet.'
        : 'No agency-level marketplace install found. Install the agency app once at /api/oauth/install.',
    }
  }

  const expiresAt = install.expires_at ? new Date(install.expires_at).getTime() : 0
  if (expiresAt > Date.now() + REFRESH_BUFFER_MS) {
    return { token: install.access_token, companyId: install.company_id }
  }

  const refreshed = await refreshAgencyToken(install)
  if (!refreshed) {
    return {
      token: null,
      companyId: install.company_id,
      error: 'Agency token refresh failed — reinstall the marketplace app at /api/oauth/install.',
    }
  }
  return { token: refreshed, companyId: install.company_id }
}
