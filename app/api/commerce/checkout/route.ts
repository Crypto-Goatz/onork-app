/**
 * POST /api/commerce/checkout
 *
 * Creates a Stripe Checkout session for a ucp_products row. Returns the
 * session URL the user clicks to pay. On success, store_purchases gets a
 * row keyed by the session id (status='pending'); the existing Stripe
 * webhook handler flips it to 'completed' on payment_intent.succeeded.
 *
 * Body: { slug: string }
 * Returns: { url: string, sessionId: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(key)
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { slug?: string; quantity?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const sb = admin()
  const { data: product } = await sb
    .from('ucp_products')
    .select('id, name, slug, description, price_cents, currency, price_type, status, app_config, fulfillment_type')
    .eq('slug', body.slug)
    .eq('status', 'active')
    .maybeSingle()

  if (!product) return NextResponse.json({ error: 'product not found' }, { status: 404 })

  const stripe = getStripe()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
  const isSubscription = product.price_type === 'subscription'

  const session = await stripe.checkout.sessions.create({
    mode: isSubscription ? 'subscription' : 'payment',
    customer_email: user.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: product.currency || 'usd',
          unit_amount: product.price_cents,
          product_data: {
            name: product.name,
            description: product.description ?? undefined,
            metadata: { product_id: product.id, slug: product.slug },
          },
          ...(isSubscription
            ? { recurring: { interval: 'month' as const } }
            : {}),
        },
        quantity: Math.max(1, Math.min(body.quantity ?? 1, 10)),
      },
    ],
    // ONE 0n ACCOUNT, WHATEVER THEY BOUGHT AND WHEREVER THEY BOUGHT IT.
    //
    // client_reference_id is the field Stripe surfaces on the session, the
    // dashboard row, the webhook and every export — it is the durable link
    // between a payment and the 0n account it belongs to. Of 659 sessions on
    // this account only 8 carried one, which is why nothing that has ever been
    // sold can be attributed to a person without guessing from an email.
    //
    // metadata.buyer_id says the same thing, but metadata is easy to lose in a
    // refund, a Stripe-side edit, or a subscription rebuild. Setting both means
    // attribution survives all three.
    client_reference_id: user.id,
    metadata: {
      product_id: product.id,
      product_slug: product.slug,
      buyer_id: user.id,
      // The slug the entitlement is written under, so the webhook never has to
      // infer which product was bought from a price id.
      entitlement_slug: product.slug,
      source: 'jaxx_commerce',
    },
    success_url: `${baseUrl}/dashboard/downloads?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/dashboard/store?canceled=1`,
  })

  // Pre-write a pending purchase row so the webhook has something to update
  await sb.from('store_purchases').insert({
    buyer_id: user.id,
    listing_id: product.id,
    workflow_id: null,
    stripe_session_id: session.id,
    amount: product.price_cents,
    currency: product.currency || 'usd',
    status: 'pending',
  })

  return NextResponse.json({
    url: session.url,
    sessionId: session.id,
    productName: product.name,
    amount: product.price_cents,
    currency: product.currency || 'usd',
  })
}
