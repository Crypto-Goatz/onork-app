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
import { entitledLocations } from '@/lib/addons/entitlements'

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
  /**
   * A second line for the picker — address, or when the app was installed here.
   * Null when the platform gave us nothing to distinguish this row by.
   */
  hint: string | null
  /**
   * True when another workspace in this same result shows the SAME name.
   *
   * Six duplicate-name groups exist today (Crypto Goatz ×2, RocketOpp LLC ×2,
   * Mike Mento — 0n ×3, 0nMCP ×2, two Sean McIntyre pairs). A picker that
   * renders name-only is then asking someone to choose between two identical
   * options, and publishing into the wrong company cannot be undone — so the
   * ambiguity is computed HERE, where the whole list is visible, rather than
   * left for each of the three surfaces to notice separately.
   */
  ambiguous: boolean
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
 * WHO IS ASKING, separated from HOW THEY SIGNED IN.
 *
 * There are two front doors and only one of them produces a Supabase user. An
 * agency signed in at 0ncore.com has a cookie session and a profile row. Someone
 * inside the CRM iframe has neither — their identity arrives as the SSO app JWT,
 * which carries an email, an agency and the location the frame is open in. Both
 * are the same three facts by the time this resolver cares, so it takes the
 * facts rather than the session.
 */
export interface WorkspaceIdentity {
  email: string | null
  /** CRM contact id, when the contact↔location write-back has happened. */
  crmContactId: string | null
  /** The workspace this identity is anchored to: a profile's home location, or
   *  the location the iframe is currently open in. */
  crmLocationId: string | null
  /**
   * The agency asking. Every workspace read is scoped to it — see
   * listAgencyInstalledLocations for what happens without it.
   */
  companyId: string | null
  /**
   * True only when this identity came from an authenticated Supabase session.
   *
   * The owner override (VIP) is gated on it deliberately. Owner is decided by
   * EMAIL, and the SSO email is whatever the CRM user typed into their own
   * profile — so honouring it on the iframe path would let anyone in any agency
   * that installed the app promote themselves by renaming their account. A
   * password-backed session is not spoofable that way.
   */
  fromSession: boolean
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
  const db = createServiceClient()
  if (!db) {
    return { ...EMPTY, notes: ['Storage unavailable — this is not the same as owning no workspaces.'] }
  }

  // ── who is this, in CRM terms ────────────────────────────────────────
  const { data: profile } = await db
    .from('profiles')
    .select('id, email, crm_contact_id, crm_location_id, crm_agency_id')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) {
    return { ...EMPTY, emptyReason: 'No profile for this account.', notes: [] }
  }

  return resolveWorkspacesForIdentity({
    email: profile.email ?? null,
    crmContactId: profile.crm_contact_id ?? null,
    crmLocationId: profile.crm_location_id ?? null,
    companyId: profile.crm_agency_id ?? null,
    fromSession: true,
  }, slug)
}

/** The resolver proper. See WorkspaceIdentity for why it does not take a user. */
export async function resolveWorkspacesForIdentity(
  identity: WorkspaceIdentity,
  slug: string,
): Promise<WorkspaceResolution> {
  const notes: string[] = []
  const db = createServiceClient()
  if (!db) {
    return { ...EMPTY, notes: ['Storage unavailable — this is not the same as owning no workspaces.'] }
  }

  const owner = identity.fromSession && isOwnerEmail(identity.email)
  const contactId = identity.crmContactId

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
  // Distinguishing facts for the picker, kept beside the name they disambiguate.
  const agencyHints = new Map<string, string>()
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
  // Locations where the PLATFORM reports this add-on's app installed. A
  // company-scoped install writes no per-location row, so this set is the only
  // record that the add-on is switched on there — it feeds the install source
  // of the entitlement gate below.
  const agencyInstalled = new Set<string>()

  const agencyAppId = appIdForAddon(slug)
  if (agencyAppId) {
    const agency = await listAgencyInstalledLocations(agencyAppId, { companyId: identity.companyId })
    if (agency.error) {
      notes.push(`Agency-level install lookup: ${agency.error}`)
    }
    for (const loc of agency.locations) {
      agencyInstalled.add(loc.locationId)
      const prev = byLocation.get(loc.locationId)
      // The agency token can mint a location token for any of these on demand
      // (POST /oauth/locationToken, verified 201 on 2026-08-20), so reachability
      // is real rather than inherited.
      byLocation.set(loc.locationId, { connected: (prev?.connected ?? false) || true })
      if (loc.name) agencyNames.set(loc.locationId, loc.name)
      // Address first — it is what a human recognises. Install date second,
      // because it is always present. Neither is invented when absent.
      const bits: string[] = []
      if (loc.address) bits.push(loc.address)
      if (loc.installedAt) {
        const d = new Date(loc.installedAt)
        if (!Number.isNaN(d.getTime())) {
          bits.push(`added ${d.toISOString().slice(0, 10)}`)
        }
      }
      if (bits.length) agencyHints.set(loc.locationId, bits.join(' · '))
    }
    if (agency.truncated) {
      notes.push(
        `Only the first ${agency.locations.length} sub-accounts were read out of ` +
        `${agency.total ?? 'an unknown number of'} under this agency. The rest are not shown — ` +
        `this is a paging limit, not an empty result.`,
      )
    }
    /**
     * SAY WHY THE NUMBER IS SMALLER THAN THE AGENCY.
     *
     * `installedLocations` returns every sub-account with an `isInstalled`
     * flag, so the count it reports (102) is the agency's size, not the
     * install's. Dropping the 55 that answered false without a word left a
     * picker showing 47 beside a platform figure of ~101, which reads exactly
     * like truncation — and "a check that can pass for a reason other than the
     * thing you are checking is not a check" cuts both ways: a NUMBER that can
     * be small for two different reasons has to name which one.
     */
    if (agency.notInstalled > 0) {
      notes.push(
        `${agency.locations.length} of ${agency.total ?? agency.locations.length + agency.notInstalled} ` +
        `sub-accounts under this agency have this add-on installed. The other ${agency.notInstalled} ` +
        `are not shown because the platform reports the app is not installed in them — ` +
        `this is the complete list, not a truncated one.`,
      )
    }
  }

  // The owner's own location always counts — the standing VIP rule — so the
  // operator can drive the product on an account they have not "installed".
  if (owner && identity.crmLocationId) {
    if (!byLocation.has(identity.crmLocationId)) byLocation.set(identity.crmLocationId, { connected: true })
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

  /**
   * ── entitlement, per location, THROUGH THE ONE GATE ──────────────────
   *
   * This used to read `addon_entitlements` directly and treat a missing row as
   * "not entitled". That table holds ZERO rows for ai-course-builder (measured
   * 2026-08-21 against pwujhhmlrtxjmjzyttwn), so `canPublish` was false for
   * every non-owner by construction and the picker was structurally empty for
   * exactly the customer this product is sold to — while `resolveEntitlement`,
   * the gate that decides whether the add-on opens at all, already counted a
   * live install as an entitlement and would have said yes.
   *
   * Two answers to one question, and the narrower one was wired to the button.
   * Both now come out of lib/addons/entitlements.ts.
   */
  const locationIds = [...byLocation.keys()]
  const { verdicts, notes: entNotes } = await entitledLocations({
    slug,
    locationIds,
    installedLocationIds: agencyInstalled,
  })
  notes.push(...entNotes)

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
    const verdict = verdicts.get(locationId)
    const isEntitled = owner || verdict?.state === 'active' || verdict?.state === 'grace'
    // Role is genuinely unknown until the CRM write-back records it. Saying
    // 'unknown' is correct; defaulting to 'admin' would hand publishing rights
    // to someone who may only be a viewer.
    const role: WorkspaceRole = owner ? 'admin' : 'unknown'

    let reason: string | null = null
    if (!connected) reason = 'This workspace is not connected — reconnect it to publish here.'
    // The gate's own sentence, not a generic one — it distinguishes "not
    // enabled here" from "we could not check" and from "access was revoked",
    // which need different screens.
    else if (!isEntitled) reason = verdict?.reason ?? 'You have access, but this add-on is not enabled for this workspace.'

    return {
      locationId,
      /**
       * The platform's name wins. `user_locations` only knows accounts that
       * signed up here, so for an agency-installed sub-account it is usually
       * absent — and a picker showing a bare location id is how someone
       * publishes into the wrong company.
       *
       * "Unhooked" IS A REAL BUSINESS NAME — DO NOT "FIX" IT. Location
       * B0PbcWhs9By4H04dgsxP is genuinely named Unhooked (the la7oh /
       * stayunhooked.com brand). Verified 2026-08-20 straight off
       * /oauth/installedLocations: `{"_id":"B0PbcWhs9By4H04dgsxP",
       * "name":"Unhooked","isInstalled":true,"installedAt":
       * "2026-08-20T00:25:48.314Z"}`. It arrives on the agency-name path with
       * every other real name and is not a placeholder falling through — the
       * string being identical to an old fallback is a coincidence, and
       * deleting it on sight would blank a live customer's row.
       */
      name: agencyNames.get(locationId) ?? names.get(locationId) ?? null,
      role,
      connected,
      entitled: isEntitled,
      canPublish: connected && isEntitled,
      reason,
      hint: agencyHints.get(locationId) ?? null,
      // Filled in below — it cannot be known one row at a time.
      ambiguous: false,
    }
  })

  /**
   * WHICH ROWS ARE INDISTINGUISHABLE BY NAME.
   *
   * Computed over the resolved list rather than the raw platform payload,
   * because the name a row is ambiguous *under* is the one the picker will
   * actually render — a duplicate that only exists upstream is not a hazard,
   * and a collision introduced by our own fallback order is.
   */
  const nameTally = new Map<string, number>()
  for (const w of workspaces) {
    const key = (w.name ?? '').trim().toLowerCase()
    if (key) nameTally.set(key, (nameTally.get(key) ?? 0) + 1)
  }
  for (const w of workspaces) {
    const key = (w.name ?? '').trim().toLowerCase()
    // A row with no name at all is worse than ambiguous, so it counts too.
    w.ambiguous = !key || (nameTally.get(key) ?? 0) > 1
  }

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
