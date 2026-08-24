/**
 * ONE ACCOUNT, WHATEVER THEY BOUGHT — the entitlement write.
 *
 * `product_keys` is what the 0n token returns as `addons`, and it is what the
 * extension, the Hub and every destination read to decide what to switch on.
 * Until this module existed, only ONE checkout shape wrote it: a session whose
 * metadata carried `type=addon_purchase` AND `user_id`. Everything else — the
 * commerce store, marketplace apps, CRO9, tiers, widgets — landed in a
 * per-product table that the token does not read. A customer could pay and the
 * extension would still show `addons: []`.
 *
 * A purchase that does not provision is worse than no purchase: it manufactures
 * a support incident with a receipt attached.
 *
 * Two resolvers, both of which LOG WHICH SOURCE HIT, because the failure we
 * cannot see is the one where a real sale silently resolves to nobody.
 */

import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type BuyerResolution = {
  userId: string | null
  via: 'client_reference_id' | 'metadata.buyer_id' | 'metadata.user_id' | 'email' | 'none'
  email: string | null
}

/**
 * Resolve the 0n account behind a checkout session.
 *
 * Order matters: client_reference_id is the only field that survives a refund,
 * a Stripe-side edit and a subscription rebuild, so it is tried first. Email is
 * LAST because it is a guess — two people can share an address, and Stripe's
 * customer_details.email is whatever was typed into the form.
 */
export async function resolveBuyer(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<BuyerResolution> {
  const email =
    session.customer_details?.email || (session as { customer_email?: string }).customer_email || null

  const candidates: Array<[BuyerResolution['via'], string | null | undefined]> = [
    ['client_reference_id', session.client_reference_id],
    ['metadata.buyer_id', session.metadata?.buyer_id],
    ['metadata.user_id', session.metadata?.user_id],
  ]

  for (const [via, value] of candidates) {
    if (value && UUID_RE.test(value)) return { userId: value, via, email }
  }

  if (email) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .limit(2)
    // Exactly one match, or it isn't evidence.
    if (data && data.length === 1) return { userId: data[0].id, via: 'email', email }
  }

  return { userId: null, via: 'none', email }
}

export type SlugResolution = {
  slug: string | null
  name: string
  via: string
}

/**
 * Resolve which product was bought.
 *
 * Prefers what the checkout route DECLARED (`entitlement_slug`) over anything
 * inferred, so we never have to keep a price-id table in sync — the price list
 * is already eighteen entries long and drifting.
 */
export async function resolveProduct(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<SlugResolution> {
  const md = session.metadata || {}
  const declared: Array<[string, string | undefined]> = [
    ['metadata.entitlement_slug', md.entitlement_slug],
    ['metadata.product_slug', md.product_slug],
    ['metadata.addon_slug', md.addon_slug],
    ['metadata.app_slug', md.app_slug],
  ]
  for (const [via, value] of declared) {
    if (value) return { slug: value, name: md.product_name || value, via }
  }

  // A plan purchase declares a tier, not a slug.
  const tier = md.tier || md.tier_name
  if (tier) return { slug: `plan_${tier}`, name: md.product_name || `${tier} plan`, via: 'metadata.tier' }

  // Last resort: ask Stripe what the line item actually was. price.metadata is
  // where a slug SHOULD live for prices created in the dashboard.
  try {
    const items = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 1,
      expand: ['data.price.product'],
    })
    const price = items.data[0]?.price as Stripe.Price | undefined
    if (price?.metadata?.entitlement_slug) {
      return { slug: price.metadata.entitlement_slug, name: items.data[0]?.description || price.metadata.entitlement_slug, via: 'price.metadata' }
    }
    const product = price?.product as Stripe.Product | undefined
    if (product && typeof product === 'object' && product.metadata?.entitlement_slug) {
      return { slug: product.metadata.entitlement_slug, name: product.name, via: 'product.metadata' }
    }
  } catch (err) {
    console.error('[entitlements] line item lookup failed:', (err as Error).message)
  }

  return { slug: null, name: '', via: 'none' }
}

export type GrantResult = { ok: boolean; outcome: 'granted' | 'already_active' | 'skipped'; reason?: string }

/**
 * Write (or confirm) the entitlement row. IDEMPOTENT on
 * (user_id, location_id, product_slug): Stripe retries, and a second delivery
 * of the same event must be a no-op, not a second activation timestamp.
 */
export async function grantProductKey(
  supabase: SupabaseClient,
  input: {
    userId: string
    locationId?: string | null
    slug: string
    name: string
    capabilities?: string[]
    stripePaymentId?: string | null
    priceCents?: number | null
    metadata?: Record<string, unknown>
  },
): Promise<GrantResult> {
  const locationId = input.locationId || ''

  const { data: existing, error: readErr } = await supabase
    .from('product_keys')
    .select('id, status')
    .eq('user_id', input.userId)
    .eq('location_id', locationId)
    .eq('product_slug', input.slug)
    .maybeSingle()

  if (readErr) {
    console.error('[entitlements] product_keys read failed:', readErr.message)
  }

  if (existing?.status === 'active') {
    console.log(`[entitlements] already active: ${input.slug} for ${input.userId} — no-op`)
    return { ok: true, outcome: 'already_active' }
  }

  const row = {
    user_id: input.userId,
    location_id: locationId,
    product_slug: input.slug,
    product_name: input.name || input.slug,
    status: 'active',
    capabilities: input.capabilities || [],
    stripe_payment_id: input.stripePaymentId || null,
    price_cents: input.priceCents ?? 0,
    activated_at: new Date().toISOString(),
    metadata: input.metadata || {},
  }

  const { error } = await supabase
    .from('product_keys')
    .upsert(row, { onConflict: 'user_id,location_id,product_slug' })

  if (error) {
    // Loud, with the platform's own words — a swallowed insert here is a paid
    // customer with nothing switched on.
    console.error(
      `[entitlements] GRANT FAILED slug=${input.slug} user=${input.userId} loc=${locationId}: ${error.message}`,
    )
    return { ok: false, outcome: 'skipped', reason: error.message }
  }

  console.log(`[entitlements] GRANTED ${input.slug} to ${input.userId} (loc=${locationId || 'none'})`)
  return { ok: true, outcome: 'granted' }
}

/**
 * Revoke on cancellation — NEVER DELETE. We need the history of what someone
 * once owned, both to re-grant it and to answer "did I ever pay for this".
 */
export async function revokeByStripeId(
  supabase: SupabaseClient,
  stripeId: string,
  reason: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('product_keys')
    .update({ status: 'revoked' })
    .eq('stripe_payment_id', stripeId)
    .eq('status', 'active')
    .select('id, product_slug')

  if (error) {
    console.error(`[entitlements] revoke failed for ${stripeId}: ${error.message}`)
    return 0
  }
  if (data?.length) {
    console.log(`[entitlements] REVOKED ${data.length} key(s) for ${stripeId} (${reason})`)
  }
  return data?.length || 0
}

/**
 * The whole path, for one completed checkout session. Returns a receipt so the
 * caller can log it against the event rather than guessing afterwards.
 */
export async function grantFromCheckoutSession(
  supabase: SupabaseClient,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<{ outcome: string; slug: string | null; userVia: string; slugVia: string }> {
  const buyer = await resolveBuyer(supabase, session)
  const product = await resolveProduct(stripe, session)

  if (!buyer.userId || !product.slug) {
    console.error(
      `[entitlements] UNPROVISIONED SALE session=${session.id} user_via=${buyer.via} slug_via=${product.via} email=${buyer.email || 'none'} amount=${session.amount_total}`,
    )
    return { outcome: 'unresolved', slug: product.slug, userVia: buyer.via, slugVia: product.via }
  }

  // A location scopes the entitlement when the buyer named one; otherwise the
  // key belongs to the account itself.
  let locationId = session.metadata?.location_id || ''
  if (!locationId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('crm_location_id')
      .eq('id', buyer.userId)
      .maybeSingle()
    locationId = profile?.crm_location_id || ''
  }

  let capabilities: string[] = []
  try {
    const raw = session.metadata?.capabilities
    if (raw) capabilities = JSON.parse(raw)
  } catch {
    capabilities = []
  }

  const stripePaymentId =
    (typeof session.subscription === 'string' ? session.subscription : null) ||
    (typeof session.payment_intent === 'string' ? session.payment_intent : null)

  const result = await grantProductKey(supabase, {
    userId: buyer.userId,
    locationId,
    slug: product.slug,
    name: product.name,
    capabilities,
    stripePaymentId,
    priceCents: session.amount_total || 0,
    metadata: {
      granted_by: 'stripe_webhook',
      session_id: session.id,
      resolved_user_via: buyer.via,
      resolved_slug_via: product.via,
      buyer_email: buyer.email,
    },
  })

  return { outcome: result.outcome, slug: product.slug, userVia: buyer.via, slugVia: product.via }
}
