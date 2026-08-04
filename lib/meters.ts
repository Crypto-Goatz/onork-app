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

export type MeterKey = 'SITE_BUILD' | 'SITE_BUILD_NATIVE' | 'CLIENT_PROVISION' | 'SOCIAL_POST' | 'BURST_LEG'

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
  /**
   * Priced but not yet sellable — the capability is behind a discovery gate.
   * Rendered as "coming" rather than a number, because quoting a price for
   * something that may not ship is how a pricing page becomes a liability.
   */
  pending?: boolean
}

export const METERS: Meter[] = [
  {
    key: 'SITE_BUILD',
    label: 'Site build',
    unit: 'per site',
    priceCents: 1000,
    when: 'A full site or landing page is generated and deployed, hosted at your 0nCORE URL.',
  },
  {
    // Lane B — the page appearing in the client's own Sites area, which is the
    // whole value of it. Gated on proving import fidelity; until that is
    // tested, quoting a price would be selling something that may not exist.
    key: 'SITE_BUILD_NATIVE',
    label: 'Site build — in your CRM',
    unit: 'per site',
    priceCents: 0,
    pending: true,
    when: 'The page lands in the client\'s own Sites area, not just hosted by us.',
  },
  {
    key: 'CLIENT_PROVISION',
    label: 'Client provisioned',
    unit: 'per client',
    priceCents: 500,
    when: 'A new sub-account is created with your snapshot loaded and onboarding started.',
  },
  {
    key: 'SOCIAL_POST',
    label: 'Social post',
    unit: 'per post',
    priceCents: 15,
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

/** "$10" / "15¢" / "Free" — no trailing .00 on whole dollars. */
export function formatPrice(cents: number, pending = false): string {
  if (pending) return 'Coming'
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
