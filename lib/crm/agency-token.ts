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
  id: string
  access_token: string
  refresh_token: string | null
  expires_at: string | null
  company_id: string | null
  scopes: string | null
  status: string | null
}

async function readAgencyInstall(companyId?: string): Promise<AgencyInstallRow | null> {
  const sb = admin()
  let q = sb
    .from('crm_installations')
    .select('id, access_token, refresh_token, expires_at, company_id, scopes, status')
    .eq('app_id', AGENCY_APP_ID)
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
  const clientId =
    process.env.CRM_MARKETPLACE_APP_CLIENT_ID ||
    process.env.CRM_MARKETPLACE_CLIENT_ID ||
    ''
  const clientSecret = process.env.CRM_MARKETPLACE_CLIENT_SECRET || ''
  if (!clientId || !clientSecret) {
    console.error('[crm/agency-token] CRM_MARKETPLACE_APP_CLIENT_ID/CLIENT_SECRET missing')
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
export async function getValidAgencyToken(companyId?: string): Promise<{
  token: string | null
  companyId: string | null
  error?: string
}> {
  const install = await readAgencyInstall(companyId)
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
