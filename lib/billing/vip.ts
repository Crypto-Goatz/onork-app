/**
 * VIP comp'd billing — a 100% discount, NOT a bypass.
 *
 * The distinction is the whole point and it is easy to get backwards. The
 * existing VIP pattern elsewhere in this app skips gates outright
 * (`if (!requirements.ok && !isVip)`). Doing that to checkout would mean the
 * payment path is never exercised for the people most likely to be walking a
 * customer through it — so the first time it runs for real would be on a
 * stranger's card.
 *
 * Instead the VIP goes through the ENTIRE flow: a real Stripe Checkout
 * session, a real subscription, a real webhook, a real entitlement grant —
 * with a 100%-off coupon applied so the amount due is $0.
 *
 * Known constraint, learned the hard way: restricted Stripe keys are read-only
 * on `promotion_codes`, so this uses a plain coupon passed as
 * `discounts: [{ coupon }]` rather than a promotion code.
 */

import type Stripe from 'stripe'

/** Stable id so the coupon is created once and reused forever. */
export const VIP_COUPON_ID = '0ncore-vip-100'

/**
 * Emails that are VIP before they have ever signed up.
 *
 * A pre-signup allowlist is necessary because `profiles.is_vip` cannot be set
 * on a row that does not exist yet, and the whole point of a test account is
 * to walk the real new-user journey rather than a pre-seeded shortcut.
 *
 * Compared case-insensitively; addresses are normalised on read.
 */
const VIP_EMAILS = new Set<string>(['mike@rocketopp.com', 'mike@in2sight.net'])

/**
 * Normalise a plus-address to its base mailbox: `mike+test3@x.com` -> `mike@x.com`.
 *
 * Sub-addressing is the same human and the same inbox, so a VIP stays a VIP
 * however they tag the address. This exists so the signup flow can be tested
 * from scratch as many times as needed WITHOUT deleting the real account — the
 * only alternative was destroying a six-month-old profile that owns a live
 * vault credential, to run a test.
 */
function baseMailbox(email: string): string {
  const [local, domain] = email.trim().toLowerCase().split('@')
  if (!domain) return email.trim().toLowerCase()
  return `${local.split('+')[0]}@${domain}`
}

export function isVipEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const e = email.trim().toLowerCase()
  return VIP_EMAILS.has(e) || VIP_EMAILS.has(baseMailbox(e))
}

/** True if this user should be comped, by profile flag OR pre-signup allowlist. */
export function isVipProfile(
  profile: { is_vip?: boolean | null; is_admin?: boolean | null; email?: string | null } | null,
  sessionEmail?: string | null,
): boolean {
  if (!profile && !sessionEmail) return false
  return Boolean(profile?.is_vip || profile?.is_admin || isVipEmail(profile?.email ?? sessionEmail))
}

/**
 * Ensure the 100%-off coupon exists, and return its id.
 *
 * Idempotent: retrieves first, creates only on a genuine 404. Any other Stripe
 * error is rethrown rather than swallowed — a checkout that silently proceeds
 * WITHOUT the discount would charge a VIP real money, which is the one outcome
 * this module exists to prevent.
 */
export async function ensureVipCoupon(stripe: Stripe): Promise<string> {
  try {
    const existing = await stripe.coupons.retrieve(VIP_COUPON_ID)
    if (!existing.deleted) return existing.id
  } catch (err) {
    const code = (err as { statusCode?: number })?.statusCode
    if (code !== 404) throw err
  }

  const created = await stripe.coupons.create({
    id: VIP_COUPON_ID,
    percent_off: 100,
    duration: 'forever',
    name: '0nCore VIP — comped',
    metadata: { purpose: 'VIP accounts run the full payment flow at $0' },
  })
  return created.id
}

/**
 * The `discounts` argument for a Checkout session, or undefined for a normal
 * paying customer.
 *
 * Returning `undefined` rather than an empty array matters: Stripe rejects
 * `discounts: []` alongside certain other parameters, and an empty array also
 * silently disables `allow_promotion_codes` for real customers.
 */
export async function vipDiscounts(
  stripe: Stripe,
  vip: boolean,
): Promise<Array<{ coupon: string }> | undefined> {
  if (!vip) return undefined
  return [{ coupon: await ensureVipCoupon(stripe) }]
}
