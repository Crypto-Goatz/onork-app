/**
 * Marketplace usage meters — ONE source of truth for the site and the app.
 *
 * SEPARATE FROM lib/pricing.ts ON PURPOSE. That file holds the standalone
 * SUBSCRIPTION tiers (Starter/Pro/Agency/Enterprise) and is wired to Stripe
 * price IDs used by checkout. These are USAGE meters billed through the
 * marketplace's own payment system, which never touches Stripe. Two different
 * billing rails, two different files — merging them would put a Stripe price ID
 * next to a meter key and invite exactly the wrong call being made.
 *
 * The site plan requires the usage table to mirror the marketplace meters
 * EXACTLY. Two hand-maintained copies of a price list always diverge, and the
 * failure mode is a customer reading $12 on the pricing page and being charged
 * something else. So both surfaces import this, and `key` here IS the meter key
 * posted to the billing API.
 *
 * Prices in CENTS. 0.1 + 0.2 is not 0.3.
 */

export type MeterKey = 'SITE_BUILD' | 'CLIENT_PROVISION' | 'SOCIAL_POST' | 'BURST_LEG'

export interface Meter {
  key: MeterKey
  /** What an agency owner calls it. */
  label: string
  /** What one unit actually is — the thing being counted. */
  unit: string
  priceCents: number
  /** Plain-English trigger, so the pricing page needs no separate copy. */
  when: string
  /**
   * Free during launch. A flag rather than a price of 0, so the decision stays
   * visible and reversible and the UI can say "free while we launch" honestly
   * instead of implying it is free forever.
   */
  launchFree?: boolean
}

export const METERS: Meter[] = [
  {
    key: 'SITE_BUILD',
    label: 'Site build',
    unit: 'per site',
    priceCents: 1200,
    when: 'A full site or landing page is generated and deployed for a client.',
  },
  {
    key: 'CLIENT_PROVISION',
    label: 'Client provisioned',
    unit: 'per client',
    priceCents: 2500,
    when: 'A new sub-account is created, a snapshot applied and onboarding started.',
  },
  {
    key: 'SOCIAL_POST',
    label: 'Social post',
    unit: 'per post',
    priceCents: 25,
    when: 'A post is written and scheduled to a connected channel.',
  },
  {
    key: 'BURST_LEG',
    label: 'Command action',
    unit: 'per action',
    priceCents: 0,
    when: 'Any standard action from the command bar — contacts, messages, pipeline, calendar.',
    launchFree: true,
  },
]

export function meter(key: MeterKey): Meter {
  const m = METERS.find((x) => x.key === key)
  if (!m) throw new Error(`Unknown meter: ${key}`)
  return m
}

/** "$12" / "25¢" / "Free" — no trailing .00 on whole dollars. */
export function formatPrice(cents: number): string {
  if (cents === 0) return 'Free'
  if (cents < 100) return `${cents}¢`
  const d = cents / 100
  return Number.isInteger(d) ? `$${d}` : `$${d.toFixed(2)}`
}

/**
 * What an agency can charge their client after markup.
 *
 * Reselling is the adoption engine: an agency that PROFITS from a usage fee has
 * a reason to run more of them. Showing the resale figure beside the cost turns
 * the number from an expense into a margin, which is how an agency owner
 * actually reads it.
 */
export function resale(cents: number, multiple = 3): string {
  return formatPrice(cents * multiple)
}
