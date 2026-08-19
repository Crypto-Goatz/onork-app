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
    let q = db
      .from('crm_installations')
      .select('app_id, status, updated_at')
      .eq('location_id', locationId)
      .in('status', ['active', 'expired'])
    if (skeleton.appId) q = q.eq('app_id', skeleton.appId)

    const { data: installs, error } = await q.limit(50)
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
