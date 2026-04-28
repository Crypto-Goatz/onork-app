/**
 * GET /api/billing/subscribe?tier=starter|pro|agency|enterprise
 *
 * One-shot subscribe link for the public /pricing page CTAs. Creates a
 * Stripe Checkout Session and redirects. Lazy-creates the Stripe customer
 * if needed.
 *
 * Uses the new slug-based tier system from lib/pricing.ts. The legacy
 * /api/billing/checkout (numeric tier 1-5) stays untouched for any
 * existing callers.
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { getTier, getStripePriceId, type TierSlug } from '@/lib/pricing'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY missing')
  return new Stripe(key)
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const VALID: ReadonlySet<TierSlug> = new Set<TierSlug>(['starter', 'pro', 'agency', 'enterprise'])

export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get('tier') as TierSlug | null
  const tier = param && VALID.has(param) ? getTier(param) : null

  if (!tier) {
    return NextResponse.redirect(new URL('/pricing', req.url))
  }

  if (tier.slug === 'free') {
    return NextResponse.redirect(new URL('/signup', req.url))
  }

  if (tier.slug === 'enterprise') {
    return NextResponse.redirect('mailto:mike@rocketopp.com?subject=0nCore%20Enterprise')
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const next = `/api/billing/subscribe?tier=${tier.slug}`
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, req.url))
  }

  const priceId = getStripePriceId(tier.slug)
  if (!priceId) {
    console.error(`[billing/subscribe] No Stripe price configured for tier: ${tier.slug}`)
    return NextResponse.redirect(new URL(`/pricing?error=price_missing&tier=${tier.slug}`, req.url))
  }

  const sb = admin()
  const { data: profile } = await sb
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .maybeSingle()

  const stripe = getStripe()
  let customerId = profile?.stripe_customer_id ?? undefined

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? profile?.email ?? undefined,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    await sb.from('profiles').update({ stripe_customer_id: customer.id }).eq('id', user.id)
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      user_id: user.id,
      tier: tier.slug,
      tier_name: tier.name,
    },
    subscription_data: {
      metadata: { user_id: user.id, tier: tier.slug },
    },
    success_url: `${baseUrl}/dashboard?subscribed=${tier.slug}`,
    cancel_url: `${baseUrl}/pricing?canceled=1`,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  })

  if (!session.url) {
    return NextResponse.redirect(new URL('/pricing?error=session_failed', req.url))
  }

  return NextResponse.redirect(session.url)
}
