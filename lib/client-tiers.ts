/**
 * Sub-location tiers and wallet denominations — the Client Upsell storefront's
 * numbers, in ONE place, as config.
 *
 * THE MODEL (Mike's): a client sub-account is $5/month bare — CRM, no AI, and
 * deliberately nothing greyed-in implying AI is nearly there. $10/month is the
 * same account born WITH the AI branding layer: a knowledge base created at
 * provisioning, the crawler pointed at the client's own site, a brand voice
 * seeded. The upgrade path from $5 to $10 is one click and runs the identical
 * seeding, so buying it later is not a lesser product than buying it at signup.
 *
 * NOTHING HERE IS A CONSTANT IN A PAGE. Every surface — the chooser, the client
 * page, the upgrade button, the wallet card — reads these values. Changing a
 * price is an env change or a one-line edit here, never a hunt through JSX. The
 * env override exists so Mike can move a number without a code deploy:
 *
 *   SUBLOCATION_PRICE_BARE_CENTS · SUBLOCATION_PRICE_AI_CENTS
 *   WALLET_TOPUP_CENTS (comma-separated) · WALLET_MIN_TOPUP_CENTS
 *   AGENCY_REFILL_TRIGGER_CENTS · AGENCY_REFILL_AMOUNT_CENTS
 *
 * THE VALUES ARE LAUNCH VALUES, NOT RATIFIED. $5/$10, the denominations and the
 * refill defaults are pending Mike's sign-off (0nTask `mike-cup-ratify`). They
 * are marked so on the surfaces that show them; `RATIFIED` flips when he says
 * so, and that flag is also what real-money movement is gated on alongside the
 * billing-rails probe.
 *
 * THE $5 ALREADY EXISTS ELSEWHERE AND THIS DOES NOT FORK IT.
 * lib/agency-billing.ts bills the agency $5/client/month through Stripe
 * (perClientPriceId). That is the same $5: BARE.priceCents is asserted equal to
 * AGENCY_BILLING.perClientCents below, so the storefront cannot advertise one
 * number while Stripe charges another. The AI tier's extra $5 is the delta this
 * product adds on top.
 */
import { AGENCY_BILLING } from '@/lib/agency-billing'

export type SubLocationTierSlug = 'bare' | 'ai'

export interface SubLocationTier {
  slug: SubLocationTierSlug
  name: string
  /** Monthly price in integer cents. Cents everywhere; no floats near money. */
  priceCents: number
  cadence: string
  tagline: string
  /** What the agency's client actually gets. Written to be sold, not to be exhaustive. */
  includes: string[]
  /** true = this tier provisions the AI knowledge layer at creation. */
  aiLayer: boolean
  /** The add-on entitlement key this tier grants. null = grants nothing extra. */
  grantsEntitlement: string | null
}

function centsFromEnv(key: string, fallback: number): number {
  const raw = process.env[key]
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  // A malformed override must not silently become $0.00 or NaN — a price of
  // zero is a giveaway and NaN renders as "$NaN" on a checkout button.
  if (!Number.isFinite(n) || n < 0) {
    console.error(`[client-tiers] ${key}="${raw}" is not a valid cent amount; using ${fallback}`)
    return fallback
  }
  return n
}

/**
 * The add-on entitlement key the $10 tier grants.
 *
 * It is the slug the /x frame gates on, so "bought the AI tier" and "may open
 * the AI add-on" are the same fact rather than two rows that can disagree.
 */
export const AI_LAYER_SLUG = 'content-engine'

export const SUBLOCATION_TIERS: SubLocationTier[] = [
  {
    slug: 'bare',
    name: 'Standard',
    priceCents: centsFromEnv('SUBLOCATION_PRICE_BARE_CENTS', 500),
    cadence: '/ month',
    tagline: 'The CRM account, clean. No AI, and nothing pretending to be.',
    includes: [
      'Full CRM sub-account',
      'Contacts, pipelines, calendars, conversations',
      'Managed from your dashboard',
    ],
    aiLayer: false,
    grantsEntitlement: null,
  },
  {
    slug: 'ai',
    name: 'Standard + AI',
    priceCents: centsFromEnv('SUBLOCATION_PRICE_AI_CENTS', 1000),
    cadence: '/ month',
    tagline: 'Born knowing the business. The AI reads their site and writes in their voice from day one.',
    includes: [
      'Everything in Standard, plus —',
      'A knowledge base built for this client at creation',
      'Their website crawled and learned, not pasted',
      'Brand voice seeded so content sounds like them',
      'Content written from what the AI already knows',
    ],
    aiLayer: true,
    grantsEntitlement: AI_LAYER_SLUG,
  },
]

export function getSubLocationTier(slug: SubLocationTierSlug): SubLocationTier {
  const t = SUBLOCATION_TIERS.find((x) => x.slug === slug)
  // Unknown slug is a programming error, not a customer state: refusing loudly
  // beats defaulting to the cheap tier and under-charging silently.
  if (!t) throw new Error(`[client-tiers] unknown sub-location tier "${slug}"`)
  return t
}

export function isSubLocationTierSlug(v: unknown): v is SubLocationTierSlug {
  return typeof v === 'string' && SUBLOCATION_TIERS.some((t) => t.slug === v)
}

/** What the $5 → $10 upgrade costs today: the difference, never a third number. */
export function upgradeDeltaCents(): number {
  return Math.max(0, getSubLocationTier('ai').priceCents - getSubLocationTier('bare').priceCents)
}

/**
 * The one place the storefront asks "may we move real money yet?".
 *
 * Two gates, both required: the platform billing rails must be runtime-proven
 * (W1) and Mike must ratify the numbers. Until then every wallet movement is
 * written mode='test' and every purchase surface says so out loud. This returns
 * a MODE rather than a boolean so callers pass it straight to the ledger.
 */
export const RATIFIED = process.env.CUP_PRICES_RATIFIED === 'true'
export const RAILS_PROVEN = process.env.CUP_BILLING_RAILS === 'proven'

export function moneyMode(): 'test' | 'live' {
  return RATIFIED && RAILS_PROVEN ? 'live' : 'test'
}

/** Why the storefront is in test mode, in a sentence a person can act on. */
export function testModeReason(): string | null {
  if (moneyMode() === 'live') return null
  const missing: string[] = []
  if (!RAILS_PROVEN) missing.push('the billing rails are still being verified')
  if (!RATIFIED) missing.push('the launch prices are awaiting sign-off')
  return `No card is charged yet — ${missing.join(' and ')}. Balances and receipts are real; the money is not.`
}

/**
 * Credit denominations offered on the add-credits control, and the floor.
 *
 * Denominations rather than a free-text box because a wallet top-up is a
 * decision, not a data-entry task — and because a typo in a text box is a
 * $500.00 mistake that arrives as a support ticket.
 */
function centsListFromEnv(key: string, fallback: number[]): number[] {
  const raw = process.env[key]
  if (!raw) return fallback
  const parsed = raw.split(',').map((s) => Number.parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n) && n > 0)
  if (!parsed.length) {
    console.error(`[client-tiers] ${key}="${raw}" yielded no valid amounts; using defaults`)
    return fallback
  }
  return parsed
}

export const WALLET = {
  /** Offered top-up buttons, cheapest first. */
  topupCents: centsListFromEnv('WALLET_TOPUP_CENTS', [2000, 5000, 10000, 25000]),
  /** Nothing smaller than this may be added — under it the processing fee wins. */
  minTopupCents: centsFromEnv('WALLET_MIN_TOPUP_CENTS', 2000),
  /** Agency auto-refill defaults, pre-filled in the config form. Agency-editable. */
  refillTriggerCents: centsFromEnv('AGENCY_REFILL_TRIGGER_CENTS', 2500),
  refillAmountCents: centsFromEnv('AGENCY_REFILL_AMOUNT_CENTS', 10000),
} as const

/** Money as a person reads it. One formatter, so $5 never renders as $5.0. */
export function usd(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`
}

/** Whole-dollar form for price tags, where ".00" is noise. */
export function usdShort(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : usd(cents)
}

/**
 * Development guard: the advertised bare price and the price Stripe actually
 * bills the agency per client must be the same number. They live in two files
 * because they serve two jobs; they may not disagree. Logged rather than
 * thrown — a mismatched price should not take the dashboard down, but it must
 * not pass unnoticed either.
 */
if (getSubLocationTier('bare').priceCents !== AGENCY_BILLING.perClientCents) {
  console.error(
    `[client-tiers] PRICE DRIFT: storefront bare tier is ${getSubLocationTier('bare').priceCents}c ` +
    `but AGENCY_BILLING.perClientCents is ${AGENCY_BILLING.perClientCents}c. ` +
    `One of these is charging a customer the wrong amount.`,
  )
}
