/**
 * Endpoints the platform has deprecated or removed, and what we do about it.
 *
 * WHY THIS IS DATA AND NOT A COMMENT. The catalog holds 1,356 endpoint
 * definitions across 113 services. A removal announced in a changelog nobody
 * re-reads is indistinguishable from no announcement at all — and the platform
 * has already pulled two OAuth endpoints **without any deprecation period**.
 * Written down as a list, "are we exposed?" becomes a query instead of a
 * reading exercise.
 *
 * THE DANGEROUS STATE IS NOT 404. It is *removed from the documentation while
 * still answering*: no deprecation clock, no warning, nothing to consult when it
 * finally stops. Both OAuth endpoints below are in exactly that state today —
 * they return 401-scope rather than 404, so a smoke test would call them
 * healthy.
 *
 * Verified against the published changelog and by live call, 2026-08-14.
 */

export type DeprecationStatus =
  /** Gone from the docs with no notice period. Still answering today. */
  | 'removed-undocumented'
  /** Announced for removal, still documented, still answering. */
  | 'deprecated'
  /** Confirmed 404. */
  | 'gone'

export interface DeprecatedEndpoint {
  method: string
  path: string
  status: DeprecationStatus
  announced: string
  /** What we use it for — blank if we do not. */
  usedBy?: string[]
  /** What to do instead. The point of the entry. */
  replacement: string
  liveCheck?: string
}

export const DEPRECATED_ENDPOINTS: DeprecatedEndpoint[] = [
  {
    method: 'POST',
    path: '/oauth/locationToken',
    status: 'removed-undocumented',
    announced: '2026-06-11',
    usedBy: ['lib/crm.ts (resolution step 3)', 'lib/crm/agency-token.ts', 'app/api/bridge/crm-location'],
    replacement:
      'A pasted per-location PIT (resolution step 1). Every active location already has one, so this path is latent, not load-bearing. Keep it that way — see requirePastedKey below.',
    liveCheck:
      'Probed every 6 hours by runLocationTokenCanary() (lib/crm/location-token-canary.ts), ' +
      'called from /api/cron/refresh-tokens. Anything other than a 2xx carrying an access_token ' +
      'is logged loudly and returned as `canary` in that cron\'s response. This entry is the ' +
      'documentation; the canary is the clock the vendor did not give us.',
  },
  {
    method: 'GET',
    path: '/oauth/installedLocations',
    status: 'removed-undocumented',
    announced: '2026-06-11',
    usedBy: [],
    replacement:
      'Not used here. NOTE: the LeadScout bulk-install design assumes it — enumerate sub-accounts on agency install. That design needs rewriting before build.',
  },
  {
    method: 'GET',
    path: '/users/',
    status: 'deprecated',
    announced: '2026-06-11',
    usedBy: ['app/crm/ProofOfLife.tsx', 'app/api/crm/users', 'app/api/agency', 'lib/crm/sdk.ts'],
    replacement: 'Users v3. Proof of Life probes this endpoint, so its removal surfaces there first.',
    liveCheck: '401, not 404, as of 2026-08-14',
  },
  {
    method: 'DELETE',
    path: '/contacts/{contactId}/campaigns/removeAll',
    status: 'deprecated',
    announced: '2026-06-11',
    usedBy: [],
    replacement: '/contacts/{contactId}/campaigns/remove-all (hyphenated)',
  },
]

/**
 * Locations that would fall through to a removed endpoint.
 *
 * Credential resolution is: pasted key → live OAuth install → MINT → env PIT.
 * A location with a pasted key never reaches the mint, so exposure is exactly
 * "active locations with no pasted key and no live install". Today that set is
 * empty; this exists so it cannot quietly stop being empty.
 */
export async function locationsAtRisk(companyId: string): Promise<{
  atRisk: { locationId: string; name: string }[]
  safe: number
}> {
  const { createServiceClient } = await import('@/lib/connect/service-client')
  const db = createServiceClient()
  if (!db) return { atRisk: [], safe: 0 }

  const { data: locs } = await db
    .from('location_connections')
    .select('location_id, location_name, location_pit')
    .eq('company_id', companyId)
    .eq('status', 'active')

  const atRisk: { locationId: string; name: string }[] = []
  let safe = 0

  for (const l of locs ?? []) {
    if (l.location_pit) { safe++; continue }
    const { data: install } = await db
      .from('crm_installations')
      .select('id')
      .eq('location_id', l.location_id)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    if (install) { safe++; continue }
    atRisk.push({ locationId: l.location_id as string, name: (l.location_name as string) || l.location_id as string })
  }

  return { atRisk, safe }
}

/**
 * Called at the mint site. Records that a removed endpoint was reached.
 *
 * Deliberately NOT a throw. Breaking a working call because the vendor
 * un-documented it would be us causing the outage rather than the removal. It
 * gets loud instead, and names the location so someone can paste a real key
 * before the platform decides for us.
 */
export function warnMintUsed(locationId: string, reason: string): void {
  console.error(
    `[deprecation] MINT PATH USED for ${locationId} (${reason}). ` +
    'POST /oauth/locationToken was removed from the docs 2026-06-11 with no deprecation period ' +
    'and can stop answering without notice. Paste a per-location key for this account.',
  )
}
