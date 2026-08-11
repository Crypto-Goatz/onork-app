/**
 * PIT-based agency onboarding — validate, store, and resolve CRM credentials.
 *
 * WHY THIS EXISTS. The agency OAuth app cannot be granted `oauth.write`, so it
 * can never mint a per-sub-account token. Verified against production on
 * 2026-08-10: the agency token lists all 87 sub-accounts but returns
 * `401 The token is not authorized for this scope` on /contacts; a location PIT
 * returns 200. Agency-level auth can therefore enumerate clients and nothing
 * more — acting inside a client REQUIRES a credential scoped to that client.
 *
 * Every function here validates a token against the live CRM before storing it.
 * A PIT that is merely well-formed is worthless; the only thing that matters is
 * whether the CRM accepts it for the operation we intend. Storing an unverified
 * token converts a clear failure at connect time into a mysterious one later,
 * inside a customer's workflow.
 */
import { createServiceClient } from '@/lib/connect/service-client'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

export interface CrmLocation {
  id: string
  name: string
}

function pitHeaders(pit: string) {
  return {
    Authorization: `Bearer ${pit}`,
    Version: CRM_VERSION,
    Accept: 'application/json',
  }
}

/**
 * Translate a CRM error into something an agency can act on.
 *
 * The raw string ("The token is not authorized for this scope") names no
 * subject and suggests no fix, so surfacing it verbatim reliably produces a
 * support ticket.
 */
function explain(status: number, body: string): string {
  if (status === 401 || status === 403) {
    if (/scope/i.test(body)) {
      return 'That token exists but lacks the required permissions. Regenerate it in the CRM with the scopes listed above.'
    }
    return 'The CRM rejected that token. Check it was copied in full and has not been revoked.'
  }
  if (status === 404) return 'The CRM did not recognise that ID.'
  if (status >= 500) return 'The CRM is not responding right now. Try again in a moment.'
  return `The CRM refused the request (${status}).`
}

/**
 * Validate an AGENCY pit by doing the one thing it is for: listing sub-accounts.
 *
 * Success here proves exactly one capability. It does NOT imply we can act in
 * any of the returned accounts, and callers must not treat it that way.
 */
export async function verifyAgencyPit(
  pit: string,
  companyId: string,
): Promise<{ ok: true; locations: CrmLocation[]; companyId: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(
      `${CRM_API}/locations/search?companyId=${encodeURIComponent(companyId)}&limit=500`,
      { headers: pitHeaders(pit), cache: 'no-store' },
    )
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, error: explain(res.status, body) }
    }
    const json = (await res.json()) as {
      locations?: { id?: string; _id?: string; name?: string; companyId?: string }[]
    }
    const raw = Array.isArray(json.locations) ? json.locations : []
    const locations = raw
      .map((l) => ({ id: String(l.id || l._id || ''), name: l.name || 'Untitled account' }))
      .filter((l) => l.id)

    if (locations.length === 0) {
      return { ok: false, error: 'That token returned no client accounts. Check it is an AGENCY token.' }
    }

    /**
     * TRUST THE CRM, NOT THE TYPED VALUE.
     *
     * /locations/search IGNORES a wrong companyId and returns the token's own
     * accounts anyway — so a location ID pasted into the company field passes
     * every check and writes a bogus connection. That happened on 2026-08-11
     * and left two agency rows for one user, which broke every reader (they all
     * use .maybeSingle(), and two rows is an error).
     *
     * The response carries the real companyId on each location, so derive it.
     */
    const derived = raw.find((l) => typeof l.companyId === 'string' && l.companyId)?.companyId

    return { ok: true, locations, companyId: derived || companyId }
  } catch {
    return { ok: false, error: 'Could not reach the CRM.' }
  }
}

/**
 * Validate a LOCATION pit against the account it claims to be for.
 *
 * Reads contacts because that is the capability the executor actually needs.
 * A PIT that can read the location record but not its contacts would pass a
 * weaker check and then fail on first real use.
 */
export async function verifyLocationPit(
  pit: string,
  locationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(
      `${CRM_API}/contacts/?locationId=${encodeURIComponent(locationId)}&limit=1`,
      { headers: pitHeaders(pit), cache: 'no-store' },
    )
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, error: explain(res.status, body) }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not reach the CRM.' }
  }
}

/**
 * The stored PIT for a location, or null.
 *
 * This is what replaces the hardcoded per-customer map in lib/crm.ts. Returns
 * only active connections: a disconnected account must stop working the moment
 * it is disconnected, not at the next deploy.
 */
export async function getStoredLocationPit(locationId: string): Promise<string | null> {
  const db = createServiceClient()
  if (!db) return null
  const { data } = await db
    .from('location_connections')
    .select('location_pit')
    .eq('location_id', locationId)
    .eq('status', 'active')
    .maybeSingle()
  return data?.location_pit ?? null
}

export interface ConnectedAccount {
  location_id: string
  location_name: string | null
  is_free: boolean
  billing_status: string
  status: string
  verified_at: string | null
  last_error: string | null
}

/** Connected accounts for an agency — never includes the tokens themselves. */
export async function listConnectedAccounts(companyId: string): Promise<ConnectedAccount[]> {
  const db = createServiceClient()
  if (!db) return []
  const { data } = await db
    .from('location_connections')
    .select('location_id, location_name, is_free, billing_status, status, verified_at, last_error')
    .eq('company_id', companyId)
    .eq('status', 'active')
  return (data as ConnectedAccount[]) ?? []
}
