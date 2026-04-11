/**
 * CRM API helper — resolves the correct PIT token per location
 * and provides typed request methods.
 */

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

/**
 * 0nAGENCY App (Marketplace, full scopes)
 * App ID: 69cf4d25a74f834803470537
 * Client ID: 69cf4d25a74f834803470537-mnu5bzyo
 * This is the master agency app — works across all sub-locations
 */
export const AGENCY_APP = {
  appId: process.env.CRM_AGENCY_APP_ID || '69cf4d25a74f834803470537',
  clientId: process.env.CRM_AGENCY_CLIENT_ID || '69cf4d25a74f834803470537-mnu5bzyo',
  clientSecret: process.env.CRM_AGENCY_CLIENT_SECRET || '',
}

export function getPitForLocation(locationId: string): string {
  // Read env vars at call time (not module init) to ensure they resolve on Vercel
  // Priority: location-specific PIT → agency PIT → fallback chain
  const pits: Record<string, string | undefined> = {
    '6MSqx0trfxgLxeHBJE1k': process.env.CRM_PIT_ROCKETOPP,
    'nphConTwfHcVE1oA0uep': process.env.CRM_PIT_RAW,
  }

  const specific = pits[locationId]
  if (specific) return specific

  // Agency PIT (full scope across all sub-locations)
  if (process.env.CRM_AGENCY_PIT_NEW) return process.env.CRM_AGENCY_PIT_NEW

  return process.env.CRM_PIT_RAW || process.env.CRM_PIT_ROCKETOPP || process.env.CRM_PIT || ''
}

export async function crmGet(path: string, locationId: string): Promise<Response> {
  const pit = getPitForLocation(locationId)
  const sep = path.includes('?') ? '&' : '?'
  const url = `${CRM_API}${path}${sep}locationId=${locationId}`

  return fetch(url, {
    headers: {
      'Authorization': `Bearer ${pit}`,
      'Version': CRM_VERSION,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })
}

export async function crmPost(path: string, locationId: string, body: Record<string, unknown>): Promise<Response> {
  const pit = getPitForLocation(locationId)

  return fetch(`${CRM_API}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pit}`,
      'Version': CRM_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...body, locationId }),
  })
}

export async function crmPut(path: string, locationId: string, body: Record<string, unknown>): Promise<Response> {
  const pit = getPitForLocation(locationId)

  return fetch(`${CRM_API}${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${pit}`,
      'Version': CRM_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...body, locationId }),
  })
}

export async function crmDelete(path: string, locationId: string): Promise<Response> {
  const pit = getPitForLocation(locationId)

  return fetch(`${CRM_API}${path}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${pit}`,
      'Version': CRM_VERSION,
      'Content-Type': 'application/json',
    },
  })
}
