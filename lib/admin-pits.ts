/**
 * Admin PIT resolution — SERVER ONLY.
 *
 * Split out of lib/admin-locations.ts on 2026-08-04. That file exports the
 * public location list AND held three live agency tokens, and it is imported by
 * app/admin/page.tsx, which is a 'use client' component.
 *
 * The tokens did not reach the browser — all 12 admin chunks were checked in
 * production and none contained them, because the client only imports
 * ADMIN_LOCATIONS and the bundler shook the rest out. But that is TREE-SHAKING
 * protecting three live credentials, not architecture. One future edit that
 * calls getAdminPit() from the client component, or a barrel re-export, and
 * every visitor gets working agency tokens with no error to warn anyone.
 *
 * Now it cannot happen: this module throws if it is ever evaluated in a
 * browser, so the mistake is a crash in development rather than a breach in
 * production.
 *
 * These should still move to env vars — they are plaintext in git history —
 * but the client-exposure risk is closed either way.
 */

if (typeof window !== 'undefined') {
  throw new Error('admin-pits is server-only and must never reach the browser.')
}

const PIT_BY_LOCATION: Record<string, string> = {
  F76MNKOMQCMruMrumtdf: 'pit-3b3a956e-2586-4048-ada8-f92caf34240c',
  '6MSqx0trfxgLxeHBJE1k': 'pit-0317b406-8a47-478e-ac28-a88763a9bb3f',
  nphConTwfHcVE1oA0uep: 'pit-f5f41b5a-32e4-4aee-84f4-a130cd3aad91',
}

/**
 * Hardcoded locations for the /admin surface.
 *
 * Public list (id + name) is safe to ship to the browser. The PIT map is
 * imported only by server-side API routes — never re-export it from a file
 * that's bundled to the client.
 */

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
