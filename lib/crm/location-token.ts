/**
 * Location-scoped token minter.
 *
 * Given a CRM sub-location id, ensures `crm_installations` has an active,
 * non-expired access token with full agency-app scope. Mints one if needed
 * via POST /oauth/locationToken using the agency-level OAuth token.
 *
 * This is what makes auto-provisioning fully hands-off — every new
 * sub-location gets a fully-scoped token without manual PIT generation.
 *
 * Call sites:
 *   - provisionSubLocation()    — after a brand-new sub-account is created
 *   - signup family-link branch — after profile.crm_location_id is set
 *   - getPitForLocation()       — falls through to this when env PITs miss
 *   - re-verify wizard          — explicit user-triggered top-up
 */

import { createClient } from '@supabase/supabase-js'
import { getValidAgencyToken } from './agency-token'

const CRM_BASE = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'
const AGENCY_APP_ID = '69c762225a31e1cd2f28dd4c'
const REFRESH_BUFFER_MS = 60_000

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export interface LocationTokenResult {
  token: string | null
  source: 'cache' | 'minted' | 'failed'
  expiresAt?: string
  scope?: string
  error?: string
}

interface LocationInstallRow {
  id: string
  access_token: string
  expires_at: string | null
  scopes: string | null
  status: string | null
}

async function readLocationInstall(locationId: string): Promise<LocationInstallRow | null> {
  const sb = admin()
  const { data } = await sb
    .from('crm_installations')
    .select('id, access_token, expires_at, scopes, status')
    .eq('app_id', AGENCY_APP_ID)
    .eq('location_id', locationId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<LocationInstallRow>()
  return data
}

async function upsertLocationInstall(args: {
  locationId: string
  companyId: string | null
  accessToken: string
  expiresIn?: number
  scope?: string
  metadata?: Record<string, unknown>
}): Promise<string> {
  const sb = admin()
  const expiresAt = args.expiresIn
    ? new Date(Date.now() + args.expiresIn * 1000).toISOString()
    : null

  // Look for an existing row — upsert by (app_id, location_id), WHICH IS THE
  // UNIQUE KEY, so this lookup must not filter on status. readLocationInstall()
  // is status-scoped on purpose (a cache read should only ever return a live
  // install), and reusing it here quietly made the write path narrower than the
  // constraint it has to satisfy: an archived or expired row is invisible to
  // the read, so this fell through to INSERT and hit
  // `crm_installations_location_id_app_id_key`. The throw below then landed in
  // ensureLocationInstall's catch, which reports `source: 'failed'` — a
  // SUCCESSFUL mint discarded because the bookkeeping row already existed.
  // Match the constraint, and a mint revives whatever row is already there.
  const { data: existing } = await sb
    .from('crm_installations')
    .select('id, scopes, status, metadata')
    .eq('app_id', AGENCY_APP_ID)
    .eq('location_id', args.locationId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; scopes: string | null; status: string | null; metadata: Record<string, unknown> | null }>()
  if (existing) {
    await sb
      .from('crm_installations')
      .update({
        access_token: args.accessToken,
        expires_at: expiresAt,
        scopes: args.scope || existing.scopes,
        status: 'active',
        health_status: 'healthy',
        consecutive_failures: 0,
        last_health_check: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
        // MERGED, never replaced. The archived rows carry their verdicts on the
        // row — `last_refresh_error`, `unrecoverable_reason`, the status that
        // retired them — and that history is the whole reason they were archived
        // rather than deleted. A successful mint should add to that record, not
        // erase the evidence of why the row was ever in doubt.
        metadata: {
          ...(existing.metadata || {}),
          ...(args.metadata || {}),
          ...(existing.status && existing.status !== 'active'
            ? { revived_from_status: existing.status, revived_at: new Date().toISOString() }
            : {}),
        },
      })
      .eq('id', existing.id)
    return existing.id
  }

  const { data, error } = await sb
    .from('crm_installations')
    .insert({
      location_id: args.locationId,
      company_id: args.companyId,
      app_id: AGENCY_APP_ID,
      access_token: args.accessToken,
      token_type: 'Bearer',
      expires_at: expiresAt,
      scopes: args.scope || null,
      status: 'active',
      health_status: 'healthy',
      consecutive_failures: 0,
      metadata: args.metadata || {},
    })
    .select('id')
    .single()
  if (error) throw new Error(`crm_installations insert failed: ${error.message}`)
  return data.id as string
}

/**
 * Make sure the given location has a usable scoped token, refreshing or
 * minting on demand. Idempotent + safe to call repeatedly.
 */
export async function ensureLocationInstall(locationId: string): Promise<LocationTokenResult> {
  if (!locationId) {
    return { token: null, source: 'failed', error: 'locationId required' }
  }

  // 1. Cached + still fresh?
  const cached = await readLocationInstall(locationId)
  if (cached) {
    const expiresAtMs = cached.expires_at ? new Date(cached.expires_at).getTime() : 0
    if (expiresAtMs > Date.now() + REFRESH_BUFFER_MS) {
      return {
        token: cached.access_token,
        source: 'cache',
        expiresAt: cached.expires_at || undefined,
        scope: cached.scopes || undefined,
      }
    }
  }

  // 2. Need to mint — and minting REQUIRES oauth.write.
  //
  // Naming the scope matters: the newer agency app carries snapshots and SaaS
  // but not oauth.write (that scope is sub-account-only), so asking for "an
  // agency token" would hand back one that cannot mint. The failure is quiet —
  // the mint 400s and every per-client call drops to a PIT.
  const agency = await getValidAgencyToken(undefined, 'oauth.write')
  if (!agency.token || !agency.companyId) {
    return {
      token: null,
      source: 'failed',
      error: agency.error || 'no agency token available',
    }
  }

  // 3. Mint location-scoped token
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
    })
    if (!res.ok) {
      const text = await res.text()
      return {
        token: null,
        source: 'failed',
        error: `mint ${res.status}: ${text.slice(0, 200)}`,
      }
    }
    const tokens = (await res.json()) as {
      access_token: string
      expires_in?: number
      scope?: string
    }
    if (!tokens.access_token) {
      return { token: null, source: 'failed', error: 'mint returned no access_token' }
    }
    // THE TOKEN IS THE RESULT; THE ROW IS BOOKKEEPING. These are caught
    // separately because they fail for unrelated reasons and deserve unrelated
    // answers: the CRM minting a valid token and our own table refusing the
    // write is not a credential failure, and returning `source: 'failed'` for it
    // sends every caller down the reinstall path while a working token sits in
    // this variable. Record the write failure loudly, hand back the token.
    await upsertLocationInstall({
      locationId,
      companyId: agency.companyId,
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope,
      metadata: {
        minted_at: new Date().toISOString(),
        installed_via: 'agency-token-mint',
      },
    }).catch((err: unknown) => {
      console.error(
        `[location-token] mint SUCCEEDED for ${locationId} but the crm_installations write failed:`,
        err instanceof Error ? err.message : err
      )
    })
    return {
      token: tokens.access_token,
      source: 'minted',
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : undefined,
      scope: tokens.scope,
    }
  } catch (err) {
    return {
      token: null,
      source: 'failed',
      error: err instanceof Error ? err.message : 'mint threw',
    }
  }
}

/**
 * Read-only — does this location currently have an active, non-expired
 * install token? Used by /verify endpoints to surface state cleanly.
 */
export async function getLocationInstallStatus(locationId: string): Promise<{
  installed: boolean
  expiresAt: string | null
  expired: boolean
  scope: string | null
}> {
  const cached = await readLocationInstall(locationId)
  if (!cached) return { installed: false, expiresAt: null, expired: true, scope: null }
  const expiresAtMs = cached.expires_at ? new Date(cached.expires_at).getTime() : 0
  return {
    installed: true,
    expiresAt: cached.expires_at,
    expired: expiresAtMs <= Date.now(),
    scope: cached.scopes,
  }
}
