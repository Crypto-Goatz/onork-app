import { crmGet, crmPostRaw } from '@/lib/crm'
import type { MeterKey } from '@/lib/meters'

/**
 * Marketplace wallet charges — billing the agency through the CRM's own wallet.
 *
 * WHY THIS RAIL AND NOT STRIPE. The agency already funds a wallet inside the
 * platform. Charging it means no card collection, no second subscription, no
 * Stripe Connect onboarding — and the charge appears on the bill they already
 * read. Our own prepaid wallet (lib/wallet.ts, user_wallets) stays what it is:
 * a per-USER balance for standalone products. These are different customers and
 * different money; merging them would put a user id where a companyId belongs.
 *
 * THE CONTRACT, discovered by POSTing an empty body and reading the validator
 * back — the docs site is a SPA and returns no schema to a fetch:
 *
 *   POST /marketplace/billing/charges?appId=&locationId=   [LOCATION token]
 *     { appId, meterId, eventId, locationId, companyId, description, units }
 *   GET  /marketplace/billing/charges?appId=&locationId=
 *   GET  /marketplace/billing/charges/has-funds?appId=&locationId=&amount=
 *
 * PRICE IS NOT OURS TO SEND. There is no amount field: we send `units` and the
 * platform multiplies by the meter's own price. So every billable meter needs a
 * matching meter created on the app in the portal, and its id lives in env. A
 * missing meter id is a hard refusal here — inventing one would mean charging
 * against someone else's meter.
 *
 * LOCATION TOKEN, NOT AGENCY. The agency token answers 401 on this route. That
 * is consistent with the two-app split: billing rides with the sub-account app.
 */

const APP_ID = process.env.CRM_SUBACCT_APP_ID || '6a7178a4e8d7c3c038c593b3'

/**
 * Our meter key -> the platform's meter id, created in the portal.
 * Unset means "cannot bill this yet", which the gate treats as a refusal.
 */
export function meterIdFor(key: MeterKey): string | null {
  const map: Record<MeterKey, string | undefined> = {
    SITE_BUILD: process.env.CRM_METER_SITE_BUILD,
    SITE_BUILD_NATIVE: process.env.CRM_METER_SITE_BUILD_NATIVE,
    CLIENT_PROVISION: process.env.CRM_METER_CLIENT_PROVISION,
    SOCIAL_POST: process.env.CRM_METER_SOCIAL_POST,
    BURST_LEG: process.env.CRM_METER_BURST_LEG,
    // No CRM meter id, and not an oversight: AI_CALL is recorded at zero while
    // we learn the volume, so it must never reach the charge path. Leaving this
    // undefined is what makes canRun() refuse to bill it even if somebody wires
    // a price in before the pricing decision is actually made.
    AI_CALL: undefined,
  }
  return map[key] || null
}

export interface FundsCheck { ok: boolean; hasFunds: boolean; error?: string }

/**
 * Ask whether the wallet covers an amount.
 *
 * TREATED AS ADVISORY, NOT AUTHORITATIVE. On a live account this returned
 * hasFunds:true for every amount tried, up to 100,000,000 — so it cannot
 * currently be relied on to prevent an overdraft. It is worth calling because a
 * `false` is meaningful, but a `true` must never be the only thing standing
 * between us and a charge the agency cannot cover.
 */
export async function hasFunds(locationId: string, amountCents: number): Promise<FundsCheck> {
  try {
    const res = await crmGet(
      `/marketplace/billing/charges/has-funds?appId=${APP_ID}&amount=${Math.max(1, Math.round(amountCents))}`,
      locationId,
    )
    if (!res.ok) return { ok: false, hasFunds: false, error: `funds check failed (${res.status})` }
    const j = (await res.json().catch(() => ({}))) as { hasFunds?: boolean }
    return { ok: true, hasFunds: Boolean(j.hasFunds) }
  } catch (err) {
    return { ok: false, hasFunds: false, error: err instanceof Error ? err.message : 'funds check failed' }
  }
}

export interface ChargeInput {
  locationId: string
  companyId: string
  meterKey: MeterKey
  description: string
  units?: number
  /**
   * Idempotency key. Pass the RECEIPT id — it is already unique per leg and
   * already the thing an audit would join on, so a retry cannot double-charge
   * and every charge traces back to the action that caused it.
   */
  eventId: string
}

export type ChargeResult =
  | { ok: true; chargeId?: string; raw?: unknown }
  | { ok: false; error: string; unbillable?: boolean }

export async function createCharge(input: ChargeInput): Promise<ChargeResult> {
  const meterId = meterIdFor(input.meterKey)
  if (!meterId) {
    // Deliberately not an error the caller can shrug off: the work may have
    // already happened, and this says plainly that it went unbilled.
    return { ok: false, unbillable: true, error: `No meter configured for ${input.meterKey}.` }
  }

  try {
    const res = await crmPostRaw(
      `/marketplace/billing/charges?appId=${APP_ID}&locationId=${encodeURIComponent(input.locationId)}`,
      input.locationId,
      {
        appId: APP_ID,
        meterId,
        eventId: input.eventId,
        locationId: input.locationId,
        companyId: input.companyId,
        description: input.description.slice(0, 240),
        units: Math.max(1, Math.round(input.units ?? 1)),
      },
    )
    const body = await res.text().catch(() => '')
    if (!res.ok) {
      console.error(`[crm/wallet] charge failed ${res.status}: ${body.slice(0, 220)}`)
      return { ok: false, error: `Charge failed (${res.status}).` }
    }
    let parsed: { id?: string; _id?: string; chargeId?: string } = {}
    try { parsed = JSON.parse(body) } catch { /* the id is a bonus, not required */ }
    return { ok: true, chargeId: parsed.chargeId || parsed.id || parsed._id, raw: parsed }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Charge failed.' }
  }
}

export async function listCharges(locationId: string): Promise<{ charges: unknown[]; total: number }> {
  try {
    const res = await crmGet(`/marketplace/billing/charges?appId=${APP_ID}`, locationId)
    if (!res.ok) return { charges: [], total: 0 }
    const j = (await res.json().catch(() => ({}))) as { charges?: unknown[]; pagination?: { total?: number } }
    return { charges: j.charges ?? [], total: j.pagination?.total ?? (j.charges?.length ?? 0) }
  } catch {
    return { charges: [], total: 0 }
  }
}
