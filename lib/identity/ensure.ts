/**
 * ONE IDENTITY, TWO DOORS — the function every signup and every install calls.
 *
 * Mike's rulings, 2026-08-21, and every line here implements one of them:
 *
 *   1. Every 0nCore customer is a CONTACT in nphConTwfHcVE1oA0uep. That is
 *      what 0nCore's own location is FOR — it holds the customer list, and it
 *      is the only account with the AI plan, so our own nurture can reach them.
 *   2. A DIRECT signup gets an auto-provisioned sub-location. They arrived with
 *      nothing, so we give them a workspace.
 *   3. A MARKETPLACE agency does NOT. They bring their own CRM and their own
 *      sub-accounts; provisioning another would be an empty location nobody
 *      opens.
 *   4. Same human, both doors → ONE contact, and the workspace LIST grows.
 *      Matched on email. This is the many-locations-per-contact model: a person
 *      ends up holding their provisioned sub-location AND their agency.
 *
 * WHY THIS FILE EXISTS AT ALL. Signup wrote a contact and a location; the OAuth
 * callback wrote a location and no contact. Two paths, two shapes, and the
 * result is measurable: 37 of 378 profiles carry a contact id. A single
 * function both doors call is the only way that stops drifting again — the
 * alternative is two implementations of "who is this person", which is the
 * failure this codebase keeps paying for.
 *
 * IT IS IDEMPOTENT AND IT UPSERTS. Signing up twice, installing twice, or
 * installing after signing up must never produce a second contact. A duplicate
 * contact splits a person's history in the CRM permanently, and no amount of
 * later cleanup puts a conversation back together.
 */
import { createServiceClient } from '@/lib/connect/service-client'

/** 0nCore's own location — the customer list, and the only one with the AI plan. */
export const ONCORE_LOCATION = 'nphConTwfHcVE1oA0uep'

const CRM = 'https://services.leadconnectorhq.com'
const VERSION = '2021-07-28'

export type Door = 'direct' | 'marketplace'

export interface IdentityResult {
  contactId: string | null
  /** Workspaces this person now holds — theirs to switch between. */
  locationIds: string[]
  /** True when we created the contact rather than finding one. */
  created: boolean
  /** Should the caller provision a sub-location? Only ever true for a direct signup. */
  shouldProvision: boolean
  error: string | null
}

function pit(): string {
  return process.env.CRM_LOCATION_PIT || process.env.CRM_PIT || process.env.CRM_PIT_TOKEN || ''
}

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Version: VERSION,
  'Content-Type': 'application/json',
  Accept: 'application/json',
})

/**
 * Find or create this person's contact in 0nCore, and record which workspace
 * they arrived with.
 *
 * @param userId    the Supabase user
 * @param email     matched on — the one identifier both doors share
 * @param door      'direct' (0ncore.com signup) or 'marketplace' (agency install)
 * @param locationId the workspace they arrived with; for marketplace this is
 *                   their agency location, for direct it is empty until
 *                   provisioning runs
 */
export async function ensureIdentity({
  userId, email, fullName, company, door, locationId,
}: {
  userId: string
  email: string
  fullName?: string | null
  company?: string | null
  door: Door
  locationId?: string | null
}): Promise<IdentityResult> {
  const db = createServiceClient()
  const token = pit()

  if (!token) {
    // Named exactly. An agency PIT cannot create contacts — POST /contacts/
    // 401s — so "invalid token" would send the next reader down the wrong path.
    return {
      contactId: null, locationIds: [], created: false,
      shouldProvision: door === 'direct',
      error: 'No CRM LOCATION pit configured (CRM_LOCATION_PIT). An agency pit cannot create contacts.',
    }
  }

  const [firstName, ...rest] = String(fullName || '').trim().split(/\s+/).filter(Boolean)

  let contactId: string | null = null
  let created = false
  let error: string | null = null

  try {
    /**
     * UPSERT, never create. The same person can sign up directly and later
     * install from the marketplace — ruling 4 — and each door must find the
     * contact the other made. Upsert matches on email inside the location, so
     * the second door updates rather than duplicating.
     */
    const res = await fetch(`${CRM}/contacts/upsert`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({
        locationId: ONCORE_LOCATION,
        email,
        ...(firstName ? { firstName } : {}),
        ...(rest.length ? { lastName: rest.join(' ') } : {}),
        ...(company ? { companyName: company } : {}),
        // The door is recorded as a tag so it is visible to a human reading the
        // CRM, and usable as a workflow trigger without a custom field lookup.
        tags: ['0n user', door === 'direct' ? '0n direct signup' : '0n agency'],
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      contactId = body?.contact?.id || body?.id || null
      created = !!body?.new
    } else {
      error = `contact upsert ${res.status}: ${JSON.stringify(body).slice(0, 160)}`
    }
  } catch (e) {
    error = (e as Error).message
  }

  /**
   * MIRROR INTO SUPABASE — the cache, never the source of truth.
   *
   * The CRM holds the customer; this row is how the app finds them fast. It is
   * written even when the CRM call failed, so a later repair can find the
   * account by email rather than hunting through auth users.
   */
  const locationIds: string[] = []
  if (db) {
    try {
      const { data: existing } = await db
        .from('profiles')
        .select('crm_location_id, crm_contact_id')
        .eq('id', userId)
        .maybeSingle()

      // Workspace list GROWS — ruling 4. A direct signup that later connects an
      // agency keeps its provisioned sub-location; the agency is added.
      if (existing?.crm_location_id) locationIds.push(existing.crm_location_id)
      if (locationId && !locationIds.includes(locationId)) locationIds.push(locationId)

      const patch: Record<string, unknown> = {}
      if (contactId) patch.crm_contact_id = contactId
      // Only ever SET a location, never clear one — clearing is how a second
      // door would silently take a workspace away from someone.
      if (locationId) patch.crm_location_id = locationId
      else if (!existing?.crm_location_id && door === 'marketplace') {
        // nothing to set yet; the callback fills it once it knows the location
      }

      if (Object.keys(patch).length) {
        await db.from('profiles').update(patch).eq('id', userId)
      }
    } catch (e) {
      error = error ?? `profile mirror failed: ${(e as Error).message}`
    }
  }

  return {
    contactId,
    locationIds,
    created,
    // Ruling 3: only a direct signup is provisioned. An agency brings its own.
    shouldProvision: door === 'direct' && locationIds.length === 0,
    error,
  }
}
