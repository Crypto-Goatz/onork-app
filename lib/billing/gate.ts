import { createClient } from '@supabase/supabase-js'
import { capability, legPriceCents } from '@/lib/crm/registry'
import { meterIdFor, hasFunds, createCharge } from '@/lib/crm/wallet'
import type { MeterKey } from '@/lib/meters'

/**
 * The billing gate.
 *
 * TWO HALVES, and the order between them is the whole design:
 *
 *   canRun()   BEFORE the work. Refuses when the meter is unconfigured, the
 *              agency has not enabled the feature, or the wallet says no.
 *   settle()   AFTER the work, and ONLY on success. Charges the wallet and
 *              records a usage_event.
 *
 * A CHARGE NEVER PRECEDES THE WORK. Billing first and refunding on failure
 * needs a refund path that stays correct under partial failure, retries and
 * timeouts — and gets it wrong quietly. Charging only what demonstrably
 * happened makes "a step that fails is never billed" true by construction
 * rather than by remembering to reverse it.
 *
 * IDEMPOTENT ON THE RECEIPT ID. eventId is the receipt's uuid, and usage_events
 * carries a unique index on it, so a replay writes nothing and charges nothing.
 */

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

export type GateVerdict =
  | { allowed: true; free: true }
  | { allowed: true; free: false; meterKey: MeterKey; priceCents: number }
  | { allowed: false; reason: string; needsEntitlement?: MeterKey; priceCents?: number }

/** Decide whether a leg may run. Never has a side effect. */
export async function canRun(args: {
  companyId: string
  locationId?: string
  capabilityId: string
}): Promise<GateVerdict> {
  const cap = capability(args.capabilityId)
  if (!cap) return { allowed: false, reason: `Unknown capability "${args.capabilityId}".` }

  const priceCents = legPriceCents(args.capabilityId)
  if (!cap.meter || priceCents === 0) return { allowed: true, free: true }

  const meterKey = cap.meter
  if (!meterIdFor(meterKey)) {
    // Ours to fix, and said as such rather than blamed on the customer.
    return { allowed: false, reason: `Billing for "${cap.intent}" is not switched on yet.`, priceCents }
  }

  const { data: ent } = await admin()
    .from('entitlements')
    .select('enabled')
    .eq('company_id', args.companyId)
    .eq('meter_key', meterKey)
    .maybeSingle()

  if (!ent?.enabled) {
    // A price the agency has not agreed to is a conversation, not an error.
    return {
      allowed: false,
      reason: `"${cap.intent}" costs money and is not switched on.`,
      needsEntitlement: meterKey,
      priceCents,
    }
  }

  if (args.locationId) {
    const funds = await hasFunds(args.locationId, priceCents)
    // Only a definite NO blocks. A failed check must not stop paid work the
    // agency has already agreed to — and a `true` is not trusted either (see
    // the note in lib/crm/wallet.ts).
    if (funds.ok && !funds.hasFunds) {
      return { allowed: false, reason: 'Your CRM wallet does not have enough funds for this.', priceCents }
    }
  }

  return { allowed: true, free: false, meterKey, priceCents }
}

/**
 * Charge for work that HAS happened. Called only after a leg succeeds.
 *
 * Records the usage_event first, then charges. If the charge fails the row
 * stays visible with its error — retryable, rather than work that silently went
 * unbilled.
 */
export async function settle(args: {
  companyId: string
  locationId?: string
  meterKey: MeterKey
  priceCents: number
  description: string
  /** The receipt id. Doubles as the idempotency key. */
  receiptId: string
  units?: number
}): Promise<{ billed: boolean; error?: string }> {
  const sb = admin()

  const { data: row, error: insErr } = await sb
    .from('usage_events')
    .insert({
      company_id: args.companyId,
      location_id: args.locationId ?? null,
      meter_key: args.meterKey,
      receipt_id: args.receiptId,
      price_cents: args.priceCents,
      quantity: args.units ?? 1,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insErr) {
    // A duplicate means this leg was already settled — the correct outcome for
    // a replay, not a failure.
    if (insErr.code === '23505') return { billed: false, error: 'already settled' }
    console.error('[billing/gate] usage_event insert failed:', insErr)
    return { billed: false, error: 'could not record usage' }
  }

  if (!args.locationId) {
    await sb.from('usage_events').update({ status: 'skipped', error: 'no location' }).eq('id', row.id)
    return { billed: false, error: 'no location to charge' }
  }

  const charge = await createCharge({
    locationId: args.locationId,
    companyId: args.companyId,
    meterKey: args.meterKey,
    description: args.description,
    units: args.units ?? 1,
    eventId: args.receiptId,
  })

  if (!charge.ok) {
    await sb.from('usage_events').update({ status: 'failed', error: charge.error }).eq('id', row.id)
    return { billed: false, error: charge.error }
  }

  await sb.from('usage_events')
    .update({ status: 'posted', meter_ref: charge.chargeId ?? null, posted_at: new Date().toISOString() })
    .eq('id', row.id)
  return { billed: true }
}
