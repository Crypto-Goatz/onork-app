/**
 * CRM credential router (S3 layer in plain TS).
 *
 * Picks the right CRM credential per operation type. Public surface always
 * sees a single 0n token + locationId. Internal calls translate that to
 * whichever CRM token is correct for the operation:
 *
 *   sub_location_op  → marketplace OAuth access_token (auto-refreshing)
 *   agency_op        → CRM_AGENCY_PIT_NEW (Company-level PIT)
 *   fallback         → per-location PIT
 */

import { getAuthForLocation, getPitForLocation } from '@/lib/crm'

export type OperationType = 'sub_location' | 'agency' | 'auto'

export interface RoutedAuth {
  token: string
  source: 'oauth' | 'agency_pit' | 'pit_fallback'
  locationId: string
  installId?: string
  warning?: string
}

export interface RouteArgs {
  locationId: string
  operation?: OperationType // 'auto' picks based on best available
}

/**
 * Operation-aware credential resolution.
 *
 * - 'sub_location': prefer OAuth install for this location, then per-location PIT
 * - 'agency': use agency PIT (sub-account creation, billing, snapshot deploy)
 * - 'auto' (default): try OAuth → location PIT → agency PIT
 */
export async function routeAuth({ locationId, operation = 'auto' }: RouteArgs): Promise<RoutedAuth> {
  if (operation === 'agency') {
    const agencyPit = process.env.CRM_AGENCY_PIT_NEW || process.env.CRM_AGENCY_PIT || ''
    if (!agencyPit.startsWith('pit-')) {
      return {
        token: '',
        source: 'agency_pit',
        locationId,
        warning: 'CRM_AGENCY_PIT_NEW missing or malformed (must start with pit-, type:plain on Vercel).',
      }
    }
    return { token: agencyPit, source: 'agency_pit', locationId }
  }

  // sub_location or auto: prefer OAuth install, else PIT
  const auth = await getAuthForLocation(locationId)

  if (auth.source === 'oauth') {
    return { token: auth.token, source: 'oauth', locationId, installId: auth.installId }
  }

  if (auth.token) {
    return { token: auth.token, source: 'pit_fallback', locationId }
  }

  // Last resort — agency PIT (works for sub-account ops too, with caveats)
  if (operation === 'auto') {
    const agencyPit = process.env.CRM_AGENCY_PIT_NEW || process.env.CRM_AGENCY_PIT || ''
    if (agencyPit.startsWith('pit-')) {
      return {
        token: agencyPit,
        source: 'agency_pit',
        locationId,
        warning: 'No location-specific credential; falling back to agency PIT.',
      }
    }
  }

  return {
    token: '',
    source: 'pit_fallback',
    locationId,
    warning: 'No working credential found for this location. Reconnect required.',
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Health check — for /api/crm/installation-status and reauth banner
// ─────────────────────────────────────────────────────────────────────────

export interface InstallationHealth {
  locationId: string
  status: 'healthy' | 'expired' | 'no_refresh' | 'no_install' | 'unknown'
  source: RoutedAuth['source']
  tokenPresent: boolean
  refreshTokenPresent: boolean
  expiresAt: string | null
  expiresInMinutes: number | null
  needsReauth: boolean
  message: string
}

export async function checkInstallationHealth(locationId: string): Promise<InstallationHealth> {
  // Look at the actual install row (not just the resolved auth) so we can
  // report on refresh_token presence and expiry in plain English.
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: install } = await sb
    .from('crm_installations')
    .select('id, access_token, refresh_token, expires_at, status')
    .eq('location_id', locationId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const auth = await routeAuth({ locationId, operation: 'auto' })

  if (!install) {
    // No marketplace install row — but we may still have a PIT
    if (auth.token) {
      return {
        locationId,
        status: 'no_install',
        source: auth.source,
        tokenPresent: true,
        refreshTokenPresent: false,
        expiresAt: null,
        expiresInMinutes: null,
        needsReauth: true,
        message:
          'No marketplace app install found for this location. Reconnecting will install the app and unlock auto-refresh.',
      }
    }
    return {
      locationId,
      status: 'no_install',
      source: 'pit_fallback',
      tokenPresent: false,
      refreshTokenPresent: false,
      expiresAt: null,
      expiresInMinutes: null,
      needsReauth: true,
      message: 'No CRM credential on file. Connect your CRM to continue.',
    }
  }

  const expiresAt = install.expires_at ? new Date(install.expires_at) : null
  const minutesUntilExpiry = expiresAt
    ? Math.floor((expiresAt.getTime() - Date.now()) / 60_000)
    : null

  const hasRefresh = Boolean(install.refresh_token && install.refresh_token.length > 10)
  const tokenPresent = Boolean(install.access_token)

  if (!hasRefresh) {
    return {
      locationId,
      status: 'no_refresh',
      source: auth.source,
      tokenPresent,
      refreshTokenPresent: false,
      expiresAt: install.expires_at ?? null,
      expiresInMinutes: minutesUntilExpiry,
      needsReauth: true,
      message:
        'Your CRM connection has no refresh token, so it cannot auto-renew. Reconnect once to repair — after that, it will refresh automatically.',
    }
  }

  if (minutesUntilExpiry !== null && minutesUntilExpiry < 0) {
    return {
      locationId,
      status: 'expired',
      source: auth.source,
      tokenPresent,
      refreshTokenPresent: true,
      expiresAt: install.expires_at ?? null,
      expiresInMinutes: minutesUntilExpiry,
      needsReauth: false,
      message:
        'Access token expired. The next request will trigger an auto-refresh using the stored refresh token.',
    }
  }

  return {
    locationId,
    status: 'healthy',
    source: auth.source,
    tokenPresent,
    refreshTokenPresent: true,
    expiresAt: install.expires_at ?? null,
    expiresInMinutes: minutesUntilExpiry,
    needsReauth: false,
    message: 'CRM connection healthy.',
  }
}

// ─────────────────────────────────────────────────────────────────────────
// PIT fallback exposure — kept for callers that need explicit PIT.
// ─────────────────────────────────────────────────────────────────────────
export function getPit(locationId: string): string {
  return getPitForLocation(locationId)
}
