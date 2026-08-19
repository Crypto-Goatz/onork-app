/**
 * The one-click upgrade: $5 → $10, which is three writes and nothing else.
 *
 *   1. debit the client wallet by the DIFFERENCE between the tiers
 *   2. write the AI-layer entitlement for this location
 *   3. leave a receipt in the ledger that names what was bought
 *
 * A purchase in this product is deliberately not a new subsystem. The /x frame
 * already decides who may open an add-on from `addon_entitlements`, keyed on
 * location. So "they bought the AI layer" and "they may open the AI layer" are
 * the same row, and cannot drift into disagreeing.
 *
 * THE TIER IS DERIVED FROM THE ENTITLEMENT, NOT STORED TWICE. There is no
 * `sub_location_tier` column, because a column like that is a second answer to
 * a question `addon_entitlements` already answers — and the two would disagree
 * the first time a grant or a revocation went through the other path.
 *
 * IT READS THE EXPLICIT ROW, NOT THE RESOLVER. resolveEntitlement() is
 * deliberately generous: an owner override, a plan tier or a live CRM install
 * all open the door. Any of those would make this function believe the client
 * had ALREADY BOUGHT the AI tier and refuse to sell it — and for the owner's
 * own account, that is not a hypothetical. "Has this location purchased the
 * upgrade" is a narrower question than "may this location open the add-on", and
 * it is answered from the purchase row.
 *
 * MONEY MOVES BEFORE ACCESS, AND A FAILED GRANT IS REFUNDED. If the debit
 * succeeds and the entitlement write fails, the charge is reversed with a
 * matching refund entry rather than left as a payment for nothing. Both
 * movements carry a `ref`, so a double-clicked button replays instead of
 * charging twice.
 */
import { createServiceClient } from '@/lib/connect/service-client'
import { AI_LAYER_SLUG, getSubLocationTier, upgradeDeltaCents, moneyMode } from '@/lib/client-tiers'
import { charge, credit, getWallet } from '@/lib/wallets/scoped'

export type ClientTier = 'bare' | 'ai'

export interface ClientTierState {
  tier: ClientTier
  /** false when the read failed. The UI must say "we could not check". */
  verified: boolean
  /** When the AI layer was granted, if it was. */
  grantedAt: string | null
  source: string | null
}

/**
 * Has this LOCATION purchased (or been granted) the AI layer?
 *
 * 'revoked' is a veto here for the same reason it is one in the resolver:
 * nothing may quietly undo a deliberate removal — and in particular, an
 * upgrade must be re-purchasable after a revocation rather than silently
 * treated as still-owned.
 */
export async function getClientTier(locationId: string): Promise<ClientTierState> {
  const id = (locationId ?? '').trim()
  if (!id) return { tier: 'bare', verified: true, grantedAt: null, source: null }

  const db = createServiceClient()
  if (!db) return { tier: 'bare', verified: false, grantedAt: null, source: null }

  const { data, error } = await db
    .from('addon_entitlements')
    .select('status, source, granted_at, expires_at')
    .eq('location_id', id)
    .eq('addon_slug', AI_LAYER_SLUG)
    .maybeSingle()

  if (error) {
    console.error('[clients/upgrade] tier read failed:', error.message)
    return { tier: 'bare', verified: false, grantedAt: null, source: null }
  }
  if (!data || data.status !== 'active') {
    return { tier: 'bare', verified: true, grantedAt: null, source: null }
  }
  return { tier: 'ai', verified: true, grantedAt: data.granted_at ?? null, source: data.source ?? null }
}

export type UpgradeOutcome =
  | { ok: true; tier: 'ai'; chargedCents: number; balanceCents: number; mode: 'test' | 'live'; alreadyOwned?: boolean }
  | { ok: false; reason: 'insufficient'; needCents: number; balanceCents: number | null; message: string }
  | { ok: false; reason: 'failed'; message: string }

/**
 * Buy the AI layer for one client.
 *
 * `ref` makes the whole operation idempotent. It defaults to a key derived from
 * the location and the current billing month, so the same button pressed twice
 * in the same month replays rather than charging twice — and a genuine
 * re-purchase after a revocation next month is still possible.
 */
export async function upgradeClientToAi(args: {
  locationId: string
  companyId: string
  actor: string
  ref?: string
  note?: string
}): Promise<UpgradeOutcome> {
  const locationId = (args.locationId ?? '').trim()
  const companyId = (args.companyId ?? '').trim()
  if (!locationId || !companyId) {
    return { ok: false, reason: 'failed', message: 'The client could not be identified.' }
  }

  const db = createServiceClient()
  if (!db) return { ok: false, reason: 'failed', message: 'Storage is not configured.' }

  const current = await getClientTier(locationId)
  if (!current.verified) {
    // Refusing to sell is the safe failure. Selling an upgrade to someone who
    // already has it is the unsafe one.
    return { ok: false, reason: 'failed', message: 'We could not read this client’s current plan, so nothing was charged.' }
  }
  if (current.tier === 'ai') {
    // Already theirs. Report the real balance rather than a placeholder zero —
    // a UI that refreshes from this response would otherwise show the client
    // as broke the moment they press a button they did not need to press.
    const w = await getWallet('location', locationId, companyId)
    return {
      ok: true, tier: 'ai', chargedCents: 0,
      balanceCents: w?.balanceCents ?? 0, mode: moneyMode(), alreadyOwned: true,
    }
  }

  const cents = upgradeDeltaCents()
  const period = new Date().toISOString().slice(0, 7) // YYYY-MM
  const ref = args.ref ?? `upgrade:${AI_LAYER_SLUG}:${locationId}:${period}`
  const aiTier = getSubLocationTier('ai')

  const debit = await charge({
    scope: 'location',
    scopeId: locationId,
    companyId,
    cents,
    kind: 'upgrade',
    description: `Upgrade to ${aiTier.name} — AI layer switched on`,
    ref,
    actor: args.actor,
  })

  if (!debit.ok) {
    if (debit.insufficient) {
      return {
        ok: false, reason: 'insufficient', needCents: cents, balanceCents: null,
        message: 'This client’s wallet does not cover the upgrade. Add credits and try again.',
      }
    }
    return { ok: false, reason: 'failed', message: debit.error ?? 'The upgrade could not be charged.' }
  }

  const { error: grantErr } = await db.from('addon_entitlements').upsert(
    {
      location_id: locationId,
      addon_slug: AI_LAYER_SLUG,
      source: 'purchase',
      status: 'active',
      company_id: companyId,
      note: args.note ?? `Client Upsell: ${aiTier.name} bought from the client page by ${args.actor}`,
      granted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'location_id,addon_slug' },
  )

  if (grantErr) {
    console.error('[clients/upgrade] entitlement write failed:', grantErr.message)
    // Paid for and not received. Put the money back, and say so.
    const refund = await credit({
      scope: 'location', scopeId: locationId, companyId, cents,
      kind: 'refund',
      description: 'Refund — the AI layer could not be switched on',
      ref: `${ref}:refund`,
      actor: 'system',
    })
    return {
      ok: false,
      reason: 'failed',
      message: refund.ok
        ? 'The AI layer could not be switched on, so the charge was refunded. Nothing was billed.'
        : 'The AI layer could not be switched on AND the refund failed. This needs a human — the ledger has both entries.',
    }
  }

  return {
    ok: true,
    tier: 'ai',
    chargedCents: cents,
    balanceCents: debit.balanceCents ?? 0,
    mode: moneyMode(),
  }
}

/**
 * The AI-layer state for MANY locations in one read — what the index needs.
 *
 * The per-client version issues one query each, which is fine on a page about
 * one client and is 87 round-trips on Mike's index. Returns null on a failed
 * read so the index can say "we could not check" rather than rendering every
 * client as bare, which would invite an agency to re-buy an upgrade they
 * already own.
 */
export async function getClientTiers(locationIds: string[]): Promise<Map<string, ClientTier> | null> {
  const ids = locationIds.map((s) => (s ?? '').trim()).filter(Boolean)
  if (!ids.length) return new Map()

  const db = createServiceClient()
  if (!db) return null

  const { data, error } = await db
    .from('addon_entitlements')
    .select('location_id, status')
    .eq('addon_slug', AI_LAYER_SLUG)
    .in('location_id', ids)

  if (error) {
    console.error('[clients/upgrade] bulk tier read failed:', error.message)
    return null
  }

  const out = new Map<string, ClientTier>(ids.map((id) => [id, 'bare' as ClientTier]))
  for (const row of (data ?? []) as { location_id: string; status: string }[]) {
    if (row.status === 'active') out.set(row.location_id.trim(), 'ai')
  }
  return out
}
