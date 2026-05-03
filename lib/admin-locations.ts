/**
 * Hardcoded locations for the /admin surface.
 *
 * Public list (id + name) is safe to ship to the browser. The PIT map is
 * imported only by server-side API routes — never re-export it from a file
 * that's bundled to the client.
 */

export interface AdminLocation {
  id: string
  name: string
}

export const ADMIN_LOCATIONS: AdminLocation[] = [
  { id: 'F76MNKOMQCMruMrumtdf', name: 'Spa Ligonier' },
  { id: '6MSqx0trfxgLxeHBJE1k', name: 'RocketOpp' },
  { id: 'nphConTwfHcVE1oA0uep', name: '0nCore' },
]

export const DEFAULT_ADMIN_LOCATION_ID = 'F76MNKOMQCMruMrumtdf'

const PIT_BY_LOCATION: Record<string, string> = {
  F76MNKOMQCMruMrumtdf: 'pit-3b3a956e-2586-4048-ada8-f92caf34240c',
  '6MSqx0trfxgLxeHBJE1k': 'pit-0317b406-8a47-478e-ac28-a88763a9bb3f',
  nphConTwfHcVE1oA0uep: 'pit-f5f41b5a-32e4-4aee-84f4-a130cd3aad91',
}

/**
 * Resolve a PIT for the given location. Server-only — never call from a
 * client component. Prefers env vars when present so production can rotate
 * tokens without a redeploy.
 */
export function getAdminPit(locationId: string): string | null {
  const envPit =
    locationId === 'F76MNKOMQCMruMrumtdf' ? process.env.CRM_PIT_SPA :
    locationId === '6MSqx0trfxgLxeHBJE1k' ? process.env.CRM_PIT_ROCKETOPP :
    locationId === 'nphConTwfHcVE1oA0uep' ? (process.env.CRM_PIT_ONCORE || process.env.CRM_PIT_RAW) :
    undefined

  if (envPit && envPit.startsWith('pit-')) return envPit
  return PIT_BY_LOCATION[locationId] ?? null
}

export function getAdminLocation(locationId: string): AdminLocation | null {
  return ADMIN_LOCATIONS.find((l) => l.id === locationId) ?? null
}
