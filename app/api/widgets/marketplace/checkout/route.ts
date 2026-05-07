/**
 * POST /api/widgets/marketplace/checkout
 *
 * Iframe-aware Stripe Checkout for the CRM marketplace widget. Resolves
 * the actor via 0n token / session / location owner, then thin-wraps
 * /api/commerce/checkout. Returns { url } so the widget can break out of
 * the iframe and redirect the parent window.
 *
 * Body: { slug, source, locationId, onToken? }
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { validateToken } from '@/lib/0n-token'
import { createClient as createServerClient } from '@/lib/supabase/server'

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
  let body: { slug?: string; source?: string; locationId?: string; onToken?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  if (!body.slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  // Actor resolution
  let actorUserId: string | null = null
  let actorEmail: string | null = null

  if (body.onToken) {
    const ctx = await validateToken(body.onToken)
    if (ctx) actorUserId = ctx.userId
  }

  if (!actorUserId) {
    const supabase = await createServerClient()
    const user = (await supabase.auth.getSession()).data.session?.user ?? null
    if (user) {
      actorUserId = user.id
      actorEmail = user.email ?? null
    }
  }

  if (!actorUserId && body.locationId) {
    const { data: profile } = await admin()
      .from('profiles')
      .select('id, email')
      .eq('crm_location_id', body.locationId)
      .maybeSingle()
    if (profile) {
      actorUserId = profile.id
      actorEmail = (profile as { email?: string }).email ?? null
    }
  }

  if (!actorUserId) {
    return NextResponse.json(
      { error: 'no actor — provide a 0n token, login, or a connected locationId' },
      { status: 401 }
    )
  }

  const sb = admin()
  const isUcp = body.source === 'ucp_products'

  // Pull product details from the right table
  const { data: product } = isUcp
    ? await sb
        .from('ucp_products')
        .select('id, name, slug, description, price_cents, currency, price_type')
        .eq('slug', body.slug)
        .eq('status', 'active')
        .maybeSingle()
    : await sb
        .from('marketplace_apps')
        .select('id, slug, name, description, price_cents, price_type')
        .eq('slug', body.slug)
        .eq('status', 'active')
        .maybeSingle()

  if (!product) return NextResponse.json({ error: 'product not found' }, { status: 404 })
  if (product.price_cents <= 0) {
    return NextResponse.json(
      { error: 'free product — use /api/widgets/marketplace/install' },
      { status: 400 }
    )
  }

  const stripe = getStripe()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
  const isSubscription = product.price_type === 'subscription' || product.price_type === 'recurring'

  const session = await stripe.checkout.sessions.create({
    mode: isSubscription ? 'subscription' : 'payment',
    customer_email: actorEmail ?? undefined,
    line_items: [
      {
        price_data: {
          currency: (product as { currency?: string }).currency || 'usd',
          unit_amount: product.price_cents,
          product_data: {
            name: product.name,
            description: product.description ?? undefined,
            metadata: { product_id: product.id, slug: product.slug, source: body.source ?? 'unknown' },
          },
          ...(isSubscription ? { recurring: { interval: 'month' as const } } : {}),
        },
        quantity: 1,
      },
    ],
    metadata: {
      product_id: product.id,
      product_slug: product.slug,
      buyer_id: actorUserId,
      location_id: body.locationId ?? '',
      source: 'widget_marketplace',
    },
    success_url: `${baseUrl}/dashboard/downloads?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/widgets/marketplace?canceled=1${body.locationId ? `&locationId=${body.locationId}` : ''}`,
  })

  // Pre-write pending purchase row (only when source is ucp_products — store_purchases.listing_id FK assumes product UUID)
  if (isUcp) {
    await sb.from('store_purchases').insert({
      buyer_id: actorUserId,
      listing_id: product.id,
      workflow_id: null,
      stripe_session_id: session.id,
      amount: product.price_cents,
      currency: (product as { currency?: string }).currency || 'usd',
      status: 'pending',
    })
  }

  return NextResponse.json({
    url: session.url,
    sessionId: session.id,
    productName: product.name,
    amount: product.price_cents,
  })
}
