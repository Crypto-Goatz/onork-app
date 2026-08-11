import { getValidAgencyToken } from '@/lib/crm/agency-token'

/**
 * The agency's sub-accounts, from the platform.
 *
 * ONE READER, shared by bootstrap and the planner. Two copies of this would
 * drift, and the failure mode is specific and nasty: the planner would resolve a
 * client name against a list the dashboard never showed, so a step would run
 * against an account the user did not believe they had selected.
 */

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

export interface AgencyLocation { id: string; name: string }

export interface LocationsResult {
  locations: AgencyLocation[]
  /** Set when the READ failed — distinct from an agency that genuinely has none. */
  error?: string
}

export async function listAgencyLocations(companyId: string): Promise<LocationsResult> {
  const agency = await getValidAgencyToken(companyId)
  if (!agency.token) return { locations: [], error: agency.error || 'This agency has not connected 0nCORE yet.' }

  try {
    const res = await fetch(
      `${CRM_API}/locations/search?companyId=${encodeURIComponent(companyId)}&limit=200`,
      {
        headers: { Authorization: `Bearer ${agency.token}`, Version: CRM_VERSION, Accept: 'application/json' },
        cache: 'no-store',
      },
    )
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[crm/locations] search ${res.status}: ${body.slice(0, 200)}`)
      return { locations: [], error: 'Could not read your client list from the CRM.' }
    }
    const json = (await res.json()) as { locations?: { id?: string; _id?: string; name?: string }[] }
    const list = Array.isArray(json.locations) ? json.locations : []
    return {
      locations: list
        .map((l) => ({ id: String(l.id || l._id || ''), name: l.name || 'Untitled client' }))
        .filter((l) => l.id),
    }
  } catch (err) {
    console.error('[crm/locations] threw:', err)
    return { locations: [], error: 'Could not reach the CRM.' }
  }
}

/**
 * Match what the user called a client to a real sub-account.
 *
 * Exact, then prefix, then substring — and it REFUSES on an ambiguous
 * substring rather than picking the first. "dental" matching both Northside
 * Dental and Harbor Dental must not quietly become one of them; running the
 * wrong client's account is the single worst outcome this product has.
 */
export function resolveLocation(
  spoken: string | undefined | null,
  locations: AgencyLocation[],
): { location?: AgencyLocation; ambiguous?: AgencyLocation[] } {
  const q = (spoken || '').trim().toLowerCase()
  if (!q) return {}

  const exact = locations.filter((l) => l.name.toLowerCase() === q)
  if (exact.length === 1) return { location: exact[0] }

  const prefix = locations.filter((l) => l.name.toLowerCase().startsWith(q))
  if (prefix.length === 1) return { location: prefix[0] }

  const contains = locations.filter((l) => l.name.toLowerCase().includes(q))
  if (contains.length === 1) return { location: contains[0] }
  if (contains.length > 1) return { ambiguous: contains.slice(0, 6) }

  return {}
}


/**
 * The clients this agency has actually CONNECTED — the only ones we can act in.
 *
 * listAgencyLocations() returns the agency's whole CRM roster, which for one
 * real agency is 87 sub-accounts. That list is right for SETUP ("which of these
 * do you want to switch on?") and wrong for everything that acts: 0nCORE has no
 * key for 86 of them and cannot touch them.
 *
 * Grounding the planner in the roster meant it would happily plan work against
 * accounts that could never run, and it put 87 names in every prompt — which is
 * what actually exhausted the model's per-minute token budget.
 *
 * Reads location_connections, which is also where the key lives, so "appears in
 * this list" and "we hold a working credential" cannot drift apart.
 */
export async function listConnectedClients(companyId: string): Promise<AgencyLocation[]> {
  const { createServiceClient } = await import('@/lib/connect/service-client')
  const db = createServiceClient()
  if (!db) return []
  const { data, error } = await db
    .from('location_connections')
    .select('location_id, location_name')
    .eq('company_id', companyId)
    .eq('status', 'active')
  if (error) {
    console.error('[crm/locations] connected clients read failed:', error.message)
    return []
  }
  return (data ?? []).map((r: { location_id: string; location_name: string | null }) => ({
    id: r.location_id,
    name: r.location_name || 'Untitled client',
  }))
}
