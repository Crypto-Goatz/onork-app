/**
 * Does this LOCATION get to open this add-on, and in what state?
 *
 * THREE STATES, AND THERE IS NO FOURTH.
 *   active — open it, run it, no banner.
 *   grace  — open it, run it, and the customer is told how many days are left.
 *   locked — the frame does not render; a locked tile does, saying what it
 *            would do and what would turn it on.
 * "Broken", "unknown" and "we could not check" all collapse to LOCKED, with the
 * reason printed. A gate that opens when its own read failed is not a gate.
 *
 * KEYED ON location_id, NEVER user_id. The gate this replaces read
 * `product_keys` by user, which meant one buyer on a sub-account could run an
 * add-on and their five colleagues on the same subscription could not. What
 * gets sold, installed, billed and revoked is the location.
 *
 * THE HYBRID: three sources, one veto.
 *   1. explicit   — a row in addon_entitlements. status='revoked' is a VETO
 *                   that outranks everything below; nothing may quietly undo a
 *                   deliberate removal.
 *   2. tier       — the location's plan reaches the add-on's rung on the
 *                   pricing.ts ladder. Enterprise reaches every rung, which is
 *                   how "enterprise = all add-ons" is enforced.
 *   3. install    — a live CRM install at this location. An install IS an
 *                   entitlement: someone who installed the app from the
 *                   marketplace has already said yes, and making them wait for
 *                   a billing row to land is how a fresh install dead-ends on
 *                   its own front page.
 * The best of the three wins. Any of them alone is enough.
 *
 * GRACE FOLLOWS THE EVENT THAT CAUSED IT. An expired purchase gets
 * expires_at + grace_days. A CRM install whose credential lapsed
 * (status='expired') gets seven days from when it lapsed, because a refresh
 * failure is an operations problem and not a customer cancelling. An install
 * that was actually removed (archived/uninstalled) gets nothing — they meant it.
 *
 * LOCATION IDS ARE TRIMMED AND '' IS NEVER A KEY. Both failures are already in
 * this database: crm_installations carries a row with location_id = '' that
 * read as the newest install in the table, and profiles carries
 * 'nphConTwfHcVE1oA0uep\n' with a trailing newline. An untrimmed compare misses
 * the real location; an empty compare matches the wrong one.
 */
import { createServiceClient } from '@/lib/connect/service-client'
import { isTierSlug, tierAtLeast, type TierSlug } from '@/lib/pricing'
import { skeletonFor, type AddonSkeleton } from '@/lib/addons/skeleton'
import { isRetiredCrmApp } from '@/lib/crm-apps'

export type EntitlementState = 'active' | 'grace' | 'locked'
export type EntitlementSource = 'explicit' | 'tier' | 'install' | 'owner'

export interface EntitlementVerdict {
  slug: string
  locationId: string
  state: EntitlementState
  /** What opened it. null when nothing did. */
  source: EntitlementSource | null
  /** A sentence a customer can act on. Always present, including when locked. */
  reason: string
  /**
   * false when a read failed, so the caller can say "we could not check"
   * instead of "you do not own this". The state is still locked either way.
   */
  verified: boolean
  graceEndsAt?: string
  graceDaysLeft?: number
  requiredTier: TierSlug
  /** null = no plan recorded for this location. Not the same as 'free'. */
  locationTier: TierSlug | null
  entryRoute: string
}

const DAY_MS = 86_400_000

/** Trim, and treat blank as absent. '' is not a location. */
export function normaliseLocationId(v: string | null | undefined): string {
  return (v ?? '').trim()
}

function locked(
  slug: string, locationId: string, reason: string,
  requiredTier: TierSlug, entryRoute: string, verified = true,
  locationTier: TierSlug | null = null,
): EntitlementVerdict {
  return { slug, locationId, state: 'locked', source: null, reason, verified, requiredTier, locationTier, entryRoute }
}

/** Candidate produced by one source. The best across sources wins. */
type Candidate = {
  state: 'active' | 'grace'
  source: EntitlementSource
  reason: string
  graceEndsAt?: Date
}

export async function resolveEntitlement(args: {
  slug: string
  locationId: string | null | undefined
  /** Operator override. Never writes a row and never implies a purchase. */
  isOwner?: boolean
  now?: Date
}): Promise<EntitlementVerdict> {
  const now = args.now ?? new Date()
  const slug = args.slug
  const skeleton: AddonSkeleton | null = skeletonFor(slug)

  if (!skeleton) {
    // A listing with no code behind it is a locked tile, never a door.
    return locked(slug, normaliseLocationId(args.locationId),
      'This add-on is listed but has nothing running behind it yet.', 'enterprise', `/x/${slug}`)
  }

  const { entryRoute } = skeleton
  const requiredTier = skeleton.requiredEntitlement.minTier
  const locationId = normaliseLocationId(args.locationId)

  // The owner override is deliberately checked before the location, because the
  // owner has to be able to open a frame on an account with no CRM connected in
  // order to look at it at all. It is reported as source 'owner' so nothing
  // downstream can mistake it for a customer entitlement.
  if (args.isOwner) {
    return {
      slug, locationId, state: 'active', source: 'owner', verified: true, requiredTier,
      locationTier: null, entryRoute,
      reason: 'Open as the account owner. This is an operator override, not an entitlement on this location.',
    }
  }

  if (!locationId) {
    return locked(slug, '', 'No CRM location is connected to this account, and add-ons are enabled per location. Connect one in Settings.', requiredTier, entryRoute)
  }

  const db = createServiceClient()
  if (!db) {
    return locked(slug, locationId,
      'We could not reach the entitlement store, so this stayed shut. This is not the same as you not owning it.',
      requiredTier, entryRoute, false)
  }

  const candidates: Candidate[] = []
  let locationTier: TierSlug | null = null
  let verified = true
  const failures: string[] = []

  // ── 1. Explicit row. Revocation is a veto and returns immediately. ──────
  try {
    const { data: row, error } = await db
      .from('addon_entitlements')
      .select('status, source, granted_at, expires_at, grace_days, note')
      .eq('location_id', locationId)
      .eq('addon_slug', skeleton.requiredEntitlement.key)
      .maybeSingle()
    if (error) throw new Error(error.message)

    if (row?.status === 'revoked') {
      return {
        ...locked(slug, locationId,
          row.note
            ? `Access to this add-on was removed for this location: ${row.note}`
            : 'Access to this add-on was removed for this location. Billing can restore it.',
          requiredTier, entryRoute),
        source: 'explicit',
      }
    }

    if (row?.status === 'active') {
      const expires = row.expires_at ? new Date(row.expires_at) : null
      if (!expires || expires.getTime() > now.getTime()) {
        candidates.push({
          state: 'active', source: 'explicit',
          reason: row.source === 'purchase'
            ? 'Included with this location’s subscription.'
            : 'Enabled for this location.',
        })
      } else {
        const graceEndsAt = new Date(expires.getTime() + (row.grace_days ?? 7) * DAY_MS)
        if (graceEndsAt.getTime() > now.getTime()) {
          candidates.push({
            state: 'grace', source: 'explicit', graceEndsAt,
            reason: 'This add-on’s subscription lapsed. It keeps working during the grace period.',
          })
        }
        // Past grace: contributes nothing, and falls through to tier/install —
        // an expired purchase should not shut off a capability the plan covers.
      }
    }
  } catch (e) {
    verified = false
    failures.push(`entitlement row: ${(e as Error).message}`)
  }

  // ── 2. Tier ladder. ────────────────────────────────────────────────────
  try {
    const { data: plan, error } = await db
      .from('location_plans')
      .select('tier')
      .eq('location_id', locationId)
      .maybeSingle()
    if (error) throw new Error(error.message)

    if (plan && isTierSlug(plan.tier)) {
      locationTier = plan.tier
      if (tierAtLeast(plan.tier, requiredTier)) {
        candidates.push({
          state: 'active', source: 'tier',
          reason: `Included on the ${plan.tier} plan.`,
        })
      }
    }
  } catch (e) {
    verified = false
    failures.push(`plan: ${(e as Error).message}`)
  }

  // ── 3. Install-as-entitlement. ─────────────────────────────────────────
  try {
    // AN ADD-ON WITH ITS OWN APP AND NO APP ID YET CONTRIBUTES NOTHING.
    // Without this the query drops its app_id filter and every live install at
    // the location — including the sub-account app everyone already has —
    // satisfies the install source, handing out a product still being listed.
    // Skipping the source is the fail-closed reading; the tier ladder and an
    // explicit row can still open it, and the owner override always can.
    const installSourceUnavailable = skeleton.ownApp && !skeleton.appId

    let q = db
      .from('crm_installations')
      .select('app_id, status, updated_at')
      .eq('location_id', locationId)
      .in('status', ['active', 'expired'])
    if (skeleton.appId) q = q.eq('app_id', skeleton.appId)

    const { data: installs, error } = installSourceUnavailable
      ? { data: [] as { app_id: string | null; status: string; updated_at: string | null }[], error: null }
      : await q.limit(50)
    if (error) throw new Error(error.message)

    // A retired app's rows are history, not permission. isRetiredCrmApp matches
    // on prefix because one retired registration is only known by its prefix.
    const usable = (installs ?? []).filter((r) => !isRetiredCrmApp(String(r.app_id ?? '')))

    if (usable.some((r) => r.status === 'active')) {
      candidates.push({
        state: 'active', source: 'install',
        reason: 'You installed this from the marketplace, which turns it on for this location.',
      })
    } else {
      // Credential lapsed rather than app removed: seven days to fix it.
      const lapsed = usable
        .filter((r) => r.status === 'expired' && r.updated_at)
        .map((r) => new Date(r.updated_at as string).getTime())
        .sort((a, b) => b - a)[0]
      if (lapsed) {
        const graceEndsAt = new Date(lapsed + 7 * DAY_MS)
        if (graceEndsAt.getTime() > now.getTime()) {
          candidates.push({
            state: 'grace', source: 'install', graceEndsAt,
            reason: 'The connection to your CRM stopped refreshing. Reconnecting it keeps this on.',
          })
        }
      }
    }
  } catch (e) {
    verified = false
    failures.push(`install: ${(e as Error).message}`)
  }

  // ── Best of the three ──────────────────────────────────────────────────
  const best =
    candidates.find((c) => c.state === 'active') ??
    candidates
      .filter((c) => c.state === 'grace')
      .sort((a, b) => (b.graceEndsAt?.getTime() ?? 0) - (a.graceEndsAt?.getTime() ?? 0))[0]

  if (best) {
    const v: EntitlementVerdict = {
      slug, locationId, state: best.state, source: best.source, reason: best.reason,
      verified, requiredTier, locationTier, entryRoute,
    }
    if (best.state === 'grace' && best.graceEndsAt) {
      v.graceEndsAt = best.graceEndsAt.toISOString()
      v.graceDaysLeft = Math.max(0, Math.ceil((best.graceEndsAt.getTime() - now.getTime()) / DAY_MS))
    }
    return v
  }

  // Nothing opened it. Say which of the three is missing, not "access denied".
  if (!verified) {
    return locked(slug, locationId,
      `We could not finish checking your access (${failures.join('; ')}), so this stayed shut. This is not the same as you not owning it.`,
      requiredTier, entryRoute, false, locationTier)
  }

  const reason = locationTier
    ? `Not included on the ${locationTier} plan. It comes with ${requiredTier}, or you can add it to this location on its own.`
    : `No plan is recorded for this location yet, so nothing on the ladder opens this. Installing it from the marketplace, or adding it to this location, turns it on.`

  return locked(slug, locationId, reason, requiredTier, entryRoute, true, locationTier)
}

/**
 * Grant or revoke, in one place, so every caller writes the same shape.
 *
 * `expiresAt` null is perpetual. Revoking keeps the row — a deleted row is
 * indistinguishable from one that was never written, and "why did this customer
 * lose access" is a question someone always asks later.
 */
export async function setAddonEntitlement(args: {
  locationId: string
  slug: string
  status: 'active' | 'revoked'
  source?: 'purchase' | 'grant' | 'install' | 'tier'
  expiresAt?: string | null
  graceDays?: number
  companyId?: string | null
  note?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const locationId = normaliseLocationId(args.locationId)
  if (!locationId) return { ok: false, error: 'A blank location id is not a location.' }

  const db = createServiceClient()
  if (!db) return { ok: false, error: 'Entitlement store unavailable.' }

  const { error } = await db.from('addon_entitlements').upsert(
    {
      location_id: locationId,
      addon_slug: args.slug,
      status: args.status,
      source: args.source ?? 'grant',
      expires_at: args.expiresAt ?? null,
      grace_days: args.graceDays ?? 7,
      company_id: args.companyId ?? null,
      note: args.note ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'location_id,addon_slug' },
  )

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * THE SAME QUESTION, ASKED ABOUT A LIST.
 *
 * `resolveEntitlement` answers for one location and costs three queries. A
 * picker asks about every workspace a person holds — 47 of them today — and a
 * loop would be 141 round trips, so the list case needs its own shape.
 *
 * IT IS NOT A SECOND SOURCE OF TRUTH, and the distinction matters because this
 * repo has already paid for exactly that mistake. `lib/workspaces/resolve.ts`
 * used to read `addon_entitlements` directly and gate `canPublish` on a row
 * being there. That table holds ZERO rows for ai-course-builder (measured
 * 2026-08-21), so every non-owner's picker was empty by construction — while
 * the canonical gate three files away already said an INSTALL is an
 * entitlement and would have opened it. Picker says no, gate says yes: the
 * split this module exists to prevent.
 *
 * So the precedence below is the same precedence as above — revoked vetoes,
 * then explicit, then tier, then install — batched into three queries instead
 * of three per location. When one changes the other must change with it; they
 * are in the same file so that is visible rather than discovered.
 *
 * INSTALLS ARRIVE AS AN ARGUMENT. A marketplace install of a per-sub-account
 * app can come back COMPANY-scoped: one row, `location_id = ''`, covering the
 * whole agency, so the sub-accounts it entitles have no row of their own to
 * find. The caller already asks the platform which locations carry the app
 * (`listAgencyInstalledLocations`) — passing that in reuses the answer instead
 * of re-deriving a narrower one from a table that cannot hold it.
 */
export interface BulkEntitlement {
  state: EntitlementState
  source: EntitlementSource | null
  /** A sentence a picker can show. Always present, including when locked. */
  reason: string
  /** False when a read failed — "we could not check", not "you do not own it". */
  verified: boolean
  graceEndsAt?: string
}

export async function entitledLocations(args: {
  slug: string
  locationIds: string[]
  /**
   * Locations where the platform itself reports THIS add-on's app installed.
   * Counts as the install source even with no per-location row.
   */
  installedLocationIds?: Iterable<string>
  now?: Date
}): Promise<{ verdicts: Map<string, BulkEntitlement>; notes: string[] }> {
  const now = args.now ?? new Date()
  const notes: string[] = []
  const verdicts = new Map<string, BulkEntitlement>()

  const ids = [...new Set(args.locationIds.map(normaliseLocationId).filter(Boolean))]
  const skeleton = skeletonFor(args.slug)
  if (!ids.length) return { verdicts, notes }

  if (!skeleton) {
    for (const id of ids) {
      verdicts.set(id, {
        state: 'locked', source: null, verified: true,
        reason: 'This add-on is listed but has nothing running behind it yet.',
      })
    }
    return { verdicts, notes }
  }

  const db = createServiceClient()
  if (!db) {
    for (const id of ids) {
      verdicts.set(id, {
        state: 'locked', source: null, verified: false,
        reason: 'We could not reach the entitlement store, so this stayed shut. This is not the same as you not owning it.',
      })
    }
    return { verdicts, notes: ['Entitlement store unavailable — no location is marked entitled rather than guessing.'] }
  }

  const key = skeleton.requiredEntitlement.key
  const requiredTier = skeleton.requiredEntitlement.minTier
  let verified = true

  // ── 1. Explicit rows. 'revoked' is a veto that outranks everything. ─────
  const revoked = new Map<string, string | null>()
  const explicit = new Map<string, Candidate>()
  try {
    const { data: rows, error } = await db
      .from('addon_entitlements')
      .select('location_id, status, source, expires_at, grace_days, note')
      .in('location_id', ids)
      .eq('addon_slug', key)
    if (error) throw new Error(error.message)

    for (const r of rows ?? []) {
      const id = normaliseLocationId(r.location_id)
      if (!id) continue
      if (r.status === 'revoked') { revoked.set(id, r.note ?? null); continue }
      if (r.status !== 'active') continue
      const expires = r.expires_at ? new Date(r.expires_at) : null
      if (!expires || expires.getTime() > now.getTime()) {
        explicit.set(id, {
          state: 'active', source: 'explicit',
          reason: r.source === 'purchase'
            ? 'Included with this location’s subscription.'
            : 'Enabled for this location.',
        })
      } else {
        const graceEndsAt = new Date(expires.getTime() + ((r.grace_days as number | null) ?? 7) * DAY_MS)
        if (graceEndsAt.getTime() > now.getTime()) {
          explicit.set(id, {
            state: 'grace', source: 'explicit', graceEndsAt,
            reason: 'This add-on’s subscription lapsed. It keeps working during the grace period.',
          })
        }
        // Past grace contributes nothing and falls through to tier/install.
      }
    }
  } catch (e) {
    verified = false
    notes.push(`Entitlement rows could not be read: ${(e as Error).message}`)
  }

  // ── 2. Tier ladder. ────────────────────────────────────────────────────
  const byTier = new Map<string, Candidate>()
  try {
    const { data: plans, error } = await db
      .from('location_plans')
      .select('location_id, tier')
      .in('location_id', ids)
    if (error) throw new Error(error.message)
    for (const p of plans ?? []) {
      const id = normaliseLocationId(p.location_id)
      if (!id || !isTierSlug(p.tier)) continue
      if (tierAtLeast(p.tier, requiredTier)) {
        byTier.set(id, { state: 'active', source: 'tier', reason: `Included on the ${p.tier} plan.` })
      }
    }
  } catch (e) {
    verified = false
    notes.push(`Plans could not be read: ${(e as Error).message}`)
  }

  // ── 3. Install-as-entitlement. ─────────────────────────────────────────
  const byInstall = new Map<string, Candidate>()
  for (const id of args.installedLocationIds ?? []) {
    const n = normaliseLocationId(id)
    if (!n) continue
    byInstall.set(n, {
      state: 'active', source: 'install',
      reason: 'You installed this from the marketplace, which turns it on for this location.',
    })
  }
  // Same fail-closed rule as the single-location path: an add-on with its own
  // app and no known app id contributes nothing rather than matching any install.
  if (!(skeleton.ownApp && !skeleton.appId)) {
    try {
      let q = db
        .from('crm_installations')
        .select('location_id, app_id, status, updated_at')
        .in('location_id', ids)
        .in('status', ['active', 'expired'])
      if (skeleton.appId) q = q.eq('app_id', skeleton.appId)
      const { data: installs, error } = await q.limit(1000)
      if (error) throw new Error(error.message)

      const lapsed = new Map<string, number>()
      for (const r of installs ?? []) {
        const id = normaliseLocationId(r.location_id)
        if (!id) continue
        if (isRetiredCrmApp(String(r.app_id ?? ''))) continue
        if (r.status === 'active') {
          byInstall.set(id, {
            state: 'active', source: 'install',
            reason: 'You installed this from the marketplace, which turns it on for this location.',
          })
        } else if (r.status === 'expired' && r.updated_at) {
          const t = new Date(r.updated_at as string).getTime()
          if (!Number.isNaN(t)) lapsed.set(id, Math.max(lapsed.get(id) ?? 0, t))
        }
      }
      for (const [id, t] of lapsed) {
        if (byInstall.get(id)?.state === 'active') continue
        const graceEndsAt = new Date(t + 7 * DAY_MS)
        if (graceEndsAt.getTime() > now.getTime()) {
          byInstall.set(id, {
            state: 'grace', source: 'install', graceEndsAt,
            reason: 'The connection to your CRM stopped refreshing. Reconnecting it keeps this on.',
          })
        }
      }
    } catch (e) {
      verified = false
      notes.push(`Installs could not be read: ${(e as Error).message}`)
    }
  }

  // ── Best of the three, per location ────────────────────────────────────
  for (const id of ids) {
    if (revoked.has(id)) {
      const note = revoked.get(id)
      verdicts.set(id, {
        state: 'locked', source: 'explicit', verified,
        reason: note
          ? `Access to this add-on was removed for this location: ${note}`
          : 'Access to this add-on was removed for this location. Billing can restore it.',
      })
      continue
    }

    const candidates = [explicit.get(id), byTier.get(id), byInstall.get(id)].filter(Boolean) as Candidate[]
    const best =
      candidates.find((c) => c.state === 'active') ??
      candidates.filter((c) => c.state === 'grace')
        .sort((a, b) => (b.graceEndsAt?.getTime() ?? 0) - (a.graceEndsAt?.getTime() ?? 0))[0]

    if (best) {
      const v: BulkEntitlement = { state: best.state, source: best.source, reason: best.reason, verified }
      if (best.state === 'grace' && best.graceEndsAt) v.graceEndsAt = best.graceEndsAt.toISOString()
      verdicts.set(id, v)
      continue
    }

    verdicts.set(id, {
      state: 'locked', source: null, verified,
      reason: verified
        ? 'You have access, but this add-on is not enabled for this workspace.'
        : 'We could not finish checking your access here, so it stayed shut. This is not the same as you not owning it.',
    })
  }

  return { verdicts, notes }
}
