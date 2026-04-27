import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(key)
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const action = body.action || 'create_session'

    const supabase = getSupabase()

    if (action === 'get_session') {
      const sessionId = body.session_id
      if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400 })
      const stripe = getStripe()
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      const { data: order } = await supabase
        .from('ucp_orders')
        .select('*')
        .eq('stripe_session_id', sessionId)
        .single()
      return NextResponse.json({ session, order })
    }

    // create_session
    const productId = body.product_id
    const productSlug = body.product_slug
    const buyerEmail = body.buyer_email
    const buyerName = body.buyer_name
    const buyerUserId = body.buyer_user_id
    const successUrl = body.success_url || `${SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = body.cancel_url || `${SITE_URL}/checkout/cancel`
    const source = body.source || 'direct'
    const metadata = body.metadata || {}

    if (!productId && !productSlug) {
      return NextResponse.json({ error: 'product_id or product_slug required' }, { status: 400 })
    }
    if (!buyerEmail) {
      return NextResponse.json({ error: 'buyer_email required' }, { status: 400 })
    }

    const productQuery = supabase.from('ucp_products').select('*').eq('status', 'active')
    const { data: product, error: productErr } = productId
      ? await productQuery.eq('id', productId).single()
      : await productQuery.eq('slug', productSlug).single()

    if (productErr || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const stripe = getStripe()

    const session = await stripe.checkout.sessions.create({
      mode: product.price_type === 'recurring' ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      customer_email: buyerEmail,
      line_items: [{
        price_data: {
          currency: product.currency || 'usd',
          product_data: {
            name: product.name,
            description: product.description || undefined,
            metadata: { product_id: product.id, slug: product.slug },
          },
          unit_amount: product.price_cents,
          ...(product.price_type === 'recurring' ? { recurring: { interval: 'month' } } : {}),
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        ucp_product_id: product.id,
        ucp_product_slug: product.slug,
        fulfillment_type: product.fulfillment_type,
        buyer_user_id: buyerUserId || '',
        source,
        ...metadata,
      },
    })

    const { data: order, error: orderErr } = await supabase
      .from('ucp_orders')
      .insert({
        product_id: product.id,
        buyer_email: buyerEmail,
        buyer_name: buyerName || null,
        buyer_user_id: buyerUserId || null,
        stripe_session_id: session.id,
        amount_cents: product.price_cents,
        currency: product.currency || 'USD',
        vendor_id: product.vendor_id || null,
        status: 'pending',
        source,
        metadata,
      })
      .select()
      .single()

    if (orderErr) {
      return NextResponse.json({ error: 'Failed to create order', details: orderErr.message }, { status: 500 })
    }

    return NextResponse.json({
      session_id: session.id,
      checkout_url: session.url,
      order_id: order.id,
      product: { id: product.id, slug: product.slug, name: product.name, price_cents: product.price_cents },
    }, { headers: { 'Access-Control-Allow-Origin': '*' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
