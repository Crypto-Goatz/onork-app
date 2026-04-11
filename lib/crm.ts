/**
 * CRM API helper — resolves the correct PIT token per location
 * and provides typed request methods.
 */

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

/**
 * CRM Marketplace Apps
 *
 * 0nAGENCY (Agency-level, all scopes):
 *   App ID: 69cf4d25a74f834803470537
 *   Client ID: 69cf4d25a74f834803470537-mnu5bzyo
 *   → Agency operations across all sub-locations
 *
 * 0nCORE Marketplace App (Sub-account level, 140+ scopes):
 *   App ID: 69c762225a31e1cd2f28dd4c
 *   Client ID: 69c762225a31e1cd2f28dd4c
 *   Redirect: https://0ncore.com/api/oauth/callback
 *   → Installed by users into their CRM sub-accounts
 *   → Modules: Conversation AI, Custom JS, Custom Page, Widgets,
 *     Workflows, Snapshots, Voice AI, Payment/Conversation Providers
 *   → This is the app users buy to connect 0nCore to their CRM
 */
export const AGENCY_APP = {
  appId: process.env.CRM_AGENCY_APP_ID || '69cf4d25a74f834803470537',
  clientId: process.env.CRM_AGENCY_CLIENT_ID || '69cf4d25a74f834803470537-mnu5bzyo',
  clientSecret: process.env.CRM_AGENCY_CLIENT_SECRET || '',
}

export const MARKETPLACE_APP = {
  appId: process.env.CRM_MARKETPLACE_APP_ID || '69c762225a31e1cd2f28dd4c',
  clientId: process.env.CRM_MARKETPLACE_APP_CLIENT_ID || '69c762225a31e1cd2f28dd4c-mnu5pazi',
  clientSecret: process.env.CRM_MARKETPLACE_CLIENT_SECRET || '',
  sharedSecret: process.env.CRM_MARKETPLACE_SHARED_SECRET || '',
  redirectUri: 'https://0ncore.com/api/oauth/callback',
  scopes: '140+ scopes (all available)',
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
// pit env vars fixed to plain type
