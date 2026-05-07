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
    metadata: {
      product_id: product.id,
      product_slug: product.slug,
      buyer_id: user.id,
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
