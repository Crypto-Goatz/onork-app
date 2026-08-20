/**
 * THE WORKSPACE RESOLVER — "which workspaces may this person act in, and how?"
 *
 * This is the "Contacts LOCATION ID Check" at the centre of Mike's model, and
 * it is the single question the whole product could not answer. Course Builder
 * finishes writing a course and then asks "choose which client to publish to"
 * with nothing to choose. The Hub cannot render My Workspaces. Every add-on
 * needs a switcher and none can populate one. All of it is this function.
 *
 * THE MODEL IT IMPLEMENTS, in Mike's words:
 *   · a CONTACT is the person — identity, profile, one per human
 *   · a LOCATION is the workspace — the company, where the work lives
 *   · one contact holds MANY locations, each with its OWN role: admin in one,
 *     plain user in another. Permission comes from the agency level.
 *   · what they may DO in a workspace is role ∩ entitlement, resolved per
 *     location, never inherited from the last one they looked at.
 *
 * WHY IT IS AN INTERSECTION, not a list. Three independent questions get
 * conflated constantly and they are not the same:
 *
 *   access      may this contact act here at all?        (contact ↔ location)
 *   role        as an admin, or as a user?               (the pair's attribute)
 *   entitlement is this add-on switched on HERE?         (the location)
 *
 * A person can have access to a workspace where the add-on is off, and be
 * entitled in a workspace where they are only a viewer. Publishing needs all
 * three, which is why `canPublish` is computed rather than assumed.
 *
 * HONESTY RULES, because this feeds a picker that writes to a customer's CRM:
 *   · a workspace we cannot verify is EXCLUDED, never included optimistically.
 *     Publishing a course into the wrong company is unrecoverable.
 *   · `reason` explains every exclusion, so the UI can say "you have access but
 *     Course Builder is not enabled here" instead of showing an empty list.
 *   · `resolvable` reports whether the CRM link exists at all. Today it usually
 *     does not — see the note below — and an empty list for that reason must
 *     never look like "you have no workspaces".
 *
 * THE KNOWN GAP, stated so nobody mistakes an empty result for a bug here:
 * the contact↔location relationship is not yet written into the CRM. Signup
 * mints a contact in the parent location and provisions a sub-account, and
 * NOTHING records that they belong together — the contact carries zero custom
 * fields. Until that write-back exists (see signup-architecture.md §6), this
 * resolves from the install registry, which only knows locations that completed
 * OAuth. That is a real answer, just a narrower one than the model allows.
 */
import { createServiceClient } from '@/lib/connect/service-client'
import { isOwnerEmail } from '@/lib/owner'
import { appIdForAddon, listAgencyInstalledLocations } from './agency-locations'

export type WorkspaceRole = 'admin' | 'user' | 'unknown'

export interface Workspace {
  locationId: string
  name: string | null
  role: WorkspaceRole
  /** Can this account actually be called right now? A dead install cannot. */
  connected: boolean
  /** Is the requested add-on switched on for THIS location? */
  entitled: boolean
  /** access ∧ role ∧ entitlement ∧ connected — the only field a picker should gate on. */
  canPublish: boolean
  /** Why not, in words a person can read. Null when it can. */
  reason: string | null
}

export interface WorkspaceResolution {
  /** False when the contact↔location link cannot be read at all. */
  resolvable: boolean
  contactId: string | null
  workspaces: Workspace[]
  /** The subset a picker should offer. */
  publishable: Workspace[]
  /** Present when the list is empty, saying which kind of empty it is. */
  emptyReason: string | null
  notes: string[]
}

const EMPTY: WorkspaceResolution = {
  resolvable: false, contactId: null, workspaces: [], publishable: [],
  emptyReason: 'Could not resolve any workspace for this account.', notes: [],
}

/**
 * Resolve every workspace this user may act in, for a given add-on.
 *
 * @param userId  the Supabase user — we look up their contact id from it
 * @param slug    the add-on being gated (entitlement is per add-on, per location)
 */
export async function resolveWorkspaces(
  userId: string,
  slug: string,
): Promise<WorkspaceResolution> {
  const notes: string[] = []
  const db = createServiceClient()
  if (!db) {
    return { ...EMPTY, notes: ['Storage unavailable — this is not the same as owning no workspaces.'] }
  }

  // ── who is this, in CRM terms ────────────────────────────────────────
  const { data: profile } = await db
    .from('profiles')
    .select('id, email, crm_contact_id, crm_location_id')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) {
    return { ...EMPTY, emptyReason: 'No profile for this account.', notes }
  }

  const owner = isOwnerEmail(profile.email)
  const contactId = profile.crm_contact_id ?? null

  if (!contactId) {
    // Said precisely. 341 of 378 profiles are in this state today, and it is a
    // sync gap — NOT the user having no workspaces.
    notes.push(
      'This account has no CRM contact id on file, so the contact→location link cannot be read. ' +
      'Falling back to workspaces with a completed install.',
    )
  }

  // ── which locations can we actually reach ────────────────────────────
  // The install registry is the only place today that records a real
  // contact-to-workspace relationship, because completing OAuth is the one act
  // that writes both sides. When the CRM write-back lands this becomes a CRM
  // read and this query becomes the cache.
  const { data: installs, error } = await db
    .from('crm_installations')
    .select('location_id, expires_at, refresh_token, health_status, status')
    .eq('status', 'active')
    .limit(500)

  if (error) {
    return { ...EMPTY, contactId, notes: [...notes, `Install lookup failed: ${error.message}`] }
  }

  const now = Date.now()
  const byLocation = new Map<string, { connected: boolean }>()
  // Names the platform gave us for agency-installed sub-accounts. Preferred
  // over user_locations below, which only knows accounts that signed up here.
  const agencyNames = new Map<string, string>()
  for (const r of installs ?? []) {
    if (!r.location_id) continue
    const live = !!r.expires_at && new Date(r.expires_at).getTime() > now
    // An install that exists but cannot be called is NOT a usable workspace.
    // Offering it would produce a publish that 401s after the user commits.
    const prev = byLocation.get(r.location_id)
    byLocation.set(r.location_id, { connected: (prev?.connected ?? false) || live })
  }

  /**
   * AGENCY-LEVEL INSTALLS, folded in.
   *
   * A marketplace install of a per-sub-account app can still return a COMPANY
   * token — measured, not assumed: the 2026-08-20 Course Builder install came
   * back `userType: Company`, empty locationId, `isBulkInstallation: true`, and
   * wrote a single row with `location_id = ''` while the app was installed in
   * 101 sub-accounts. The loop above skips that row, so a successful install
   * produced an empty picker. See lib/workspaces/agency-locations.ts.
   *
   * The platform is asked at request time, and a failure adds a note rather
   * than a workspace — an unverified publish target is worse than none.
   */
  const agencyAppId = appIdForAddon(slug)
  if (agencyAppId) {
    const agency = await listAgencyInstalledLocations(agencyAppId)
    if (agency.error) {
      notes.push(`Agency-level install lookup: ${agency.error}`)
    }
    for (const loc of agency.locations) {
      const prev = byLocation.get(loc.locationId)
      // The agency token can mint a location token for any of these on demand
      // (POST /oauth/locationToken, verified 201 on 2026-08-20), so reachability
      // is real rather than inherited.
      byLocation.set(loc.locationId, { connected: (prev?.connected ?? false) || true })
      if (loc.name) agencyNames.set(loc.locationId, loc.name)
    }
    if (agency.truncated) {
      notes.push(
        `Only the first ${agency.locations.length} of ${agency.total ?? 'an unknown number of'} ` +
        `installed sub-accounts were listed. The rest are not shown — this is a paging limit, not an empty result.`,
      )
    }
  }

  // The owner's own location always counts — the standing VIP rule — so the
  // operator can drive the product on an account they have not "installed".
  if (owner && profile.crm_location_id) {
    if (!byLocation.has(profile.crm_location_id)) byLocation.set(profile.crm_location_id, { connected: true })
  }

  if (byLocation.size === 0) {
    return {
      resolvable: !!contactId,
      contactId,
      workspaces: [],
      publishable: [],
      emptyReason: contactId
        ? 'No workspace has completed a connection yet. Install the app in a sub-account to enable publishing.'
        : 'This account is not linked to a CRM contact yet, and no workspace has completed a connection.',
      notes,
    }
  }

  // ── entitlement, per location, for THIS add-on ───────────────────────
  const locationIds = [...byLocation.keys()]
  const entitled = new Set<string>()
  try {
    const { data: ents } = await db
      .from('addon_entitlements')
      .select('location_id, addon_slug, status')
      .in('location_id', locationIds)
      .eq('addon_slug', slug)
    for (const e of ents ?? []) {
      // active AND grace both permit use — that is what grace is for.
      if (e.location_id && (e.status === 'active' || e.status === 'grace')) entitled.add(e.location_id)
    }
  } catch (e) {
    notes.push(`Entitlement lookup failed: ${(e as Error).message}. Nothing is marked entitled rather than guessing.`)
  }

  // ── names, best effort ───────────────────────────────────────────────
  const names = new Map<string, string>()
  try {
    const { data: locs } = await db
      .from('user_locations')
      .select('crm_location_id, name')
      .in('crm_location_id', locationIds)
    for (const l of locs ?? []) if (l.crm_location_id) names.set(l.crm_location_id, l.name)
  } catch { /* a missing name is cosmetic; never a reason to hide a workspace */ }

  const workspaces: Workspace[] = locationIds.map((locationId) => {
    const { connected } = byLocation.get(locationId)!
    const isEntitled = owner || entitled.has(locationId)
    // Role is genuinely unknown until the CRM write-back records it. Saying
    // 'unknown' is correct; defaulting to 'admin' would hand publishing rights
    // to someone who may only be a viewer.
    const role: WorkspaceRole = owner ? 'admin' : 'unknown'

    let reason: string | null = null
    if (!connected) reason = 'This workspace is not connected — reconnect it to publish here.'
    else if (!isEntitled) reason = 'You have access, but this add-on is not enabled for this workspace.'

    return {
      locationId,
      // The platform's name wins. `user_locations` only knows accounts that
      // signed up here, so for an agency-installed sub-account it is usually
      // absent — and a picker showing an id instead of "Unhooked" is how
      // someone publishes into the wrong company.
      name: agencyNames.get(locationId) ?? names.get(locationId) ?? null,
      role,
      connected,
      entitled: isEntitled,
      canPublish: connected && isEntitled,
      reason,
    }
  })

  const publishable = workspaces.filter((w) => w.canPublish)

  return {
    resolvable: true,
    contactId,
    workspaces,
    publishable,
    emptyReason: publishable.length
      ? null
      : workspaces.length
        ? 'You have workspaces, but none of them can publish this add-on yet.'
        : 'No workspace available.',
    notes,
  }
}
