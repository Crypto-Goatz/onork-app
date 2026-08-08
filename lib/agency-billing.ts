/**
 * 0nCORE agency billing — the revenue model.
 *
 *   • $5 / month per client added to the agency (first client free)
 *   • $0.10 per API call (metered, billed monthly in arrears)
 *
 * One Stripe subscription per agency, two items: a licensed per-client item
 * whose quantity tracks the client count, and a metered item fed by the
 * `oncore_api_call` meter. Payment is attached to the signed-in owner's Stripe
 * customer (their profiles.stripe_customer_id), so "the SSO carries the card".
 *
 * IDs live here, not in env: a Stripe price id is not a secret, and keeping it
 * in version control means the number an agency is charged is reviewable in a
 * diff instead of a dashboard only one person can see. The SECRET key stays in
 * env. Change the price by creating a new one in Stripe and swapping the id.
 */
export const AGENCY_BILLING = {
  productId: 'prod_Umip8QjlU6Tafy', // "0nCore Agency"
  /** $5/mo, licensed — quantity = billable clients. */
  perClientPriceId: 'price_1U2FqsHThmAuKVQMq9ynnwev',
  perClientCents: 500,
  /** $0.10/call, metered — fed by the meter below. */
  apiMeteredPriceId: 'price_1U2FrBHThmAuKVQMld5UE9UL',
  perCallCents: 10,
  /** Stripe billing meter event name for an API call. */
  apiMeterEvent: 'oncore_api_call',
  /** Clients included at no charge before per-client billing starts. */
  freeClients: 1,
  /**
   * Monthly base access fee — $19/mo — but WAIVED FOREVER for the first 50
   * agencies (founding). Agency #51+ pays it; the founding 50 never do, even
   * after the fee turns on. Founding status is recorded per agency at signup so
   * the grandfather is permanent, not a moving count.
   */
  basePriceId: 'price_1U2FutHThmAuKVQMc2fgpaZT',
  baseFeeCents: 1900,
  foundingLimit: 50,
} as const

/** Billable clients = everything past the free allowance, never negative. */
export function billableClients(totalClients: number): number {
  return Math.max(0, totalClients - AGENCY_BILLING.freeClients)
}

/** Plain-language summary of what an agency will pay, for the UI. */
export function billingSummary(totalClients: number): {
  clients: number; freeClients: number; billableClients: number; monthlyClientCents: number
} {
  const billable = billableClients(totalClients)
  return {
    clients: totalClients,
    freeClients: AGENCY_BILLING.freeClients,
    billableClients: billable,
    monthlyClientCents: billable * AGENCY_BILLING.perClientCents,
  }
}
