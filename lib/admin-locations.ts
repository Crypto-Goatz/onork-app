/**
 * The admin location list — safe for the browser.
 *
 * Id + display name only. This module is imported by app/admin/page.tsx, which
 * is a client component, so it must never hold a credential again.
 *
 * It used to. Until 2026-08-04 the PIT map for all three locations lived here,
 * beside the public list, in a file a 'use client' component imports. The
 * tokens never actually reached the browser — all 12 admin chunks were checked
 * in production and none contained them, because the bundler shook out what the
 * client did not use. But that is tree-shaking protecting three live agency
 * credentials, not architecture. They now live in lib/admin-pits.ts, which
 * throws if it is ever evaluated in a browser.
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

export function getAdminLocation(locationId: string): AdminLocation | null {
  return ADMIN_LOCATIONS.find((l) => l.id === locationId) ?? null
}
