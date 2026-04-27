import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { installApp } from '@/lib/0n-app/installer'
import { validateRequirements, OnAppManifest } from '@/lib/0n-app/parser'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(key)
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const appId = body.app_id
    const userId = body.user_id
    const userEmail = body.user_email
    const configOverrides = body.config_overrides || {}

    if (!appId || !userId) {
      return NextResponse.json({ error: 'app_id and user_id required' }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data: app, error: appErr } = await supabase
      .from('marketplace_apps')
      .select('*, ucp_products(id, slug, price_cents, fulfillment_type)')
      .eq('id', appId)
      .eq('status', 'active')
      .single()

    if (appErr || !app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, is_admin, is_vip, email')
      .eq('id', userId)
      .single()

    const userPlan = profile?.plan || 'starter'
    const isVip = Boolean(profile?.is_admin || profile?.is_vip)
    const buyerEmail = userEmail || profile?.email

    const { data: connections } = await supabase
      .from('user_service_connections')
      .select('service')
      .eq('user_id', userId)
      .eq('status', 'connected')

    const userServices = (connections || []).map(c => c.service)

    const manifest = app.app_config as OnAppManifest
    const requirements = validateRequirements(manifest, userPlan, userServices)

    if (!requirements.ok && !isVip) {
      return NextResponse.json({
        error: 'Requirements not met',
        requirements,
      }, { status: 403 })
    }

    if (app.price_cents > 0 && !isVip) {
      if (!buyerEmail) {
        return NextResponse.json({ error: 'user_email required for paid apps' }, { status: 400 })
      }

      const stripe = getStripe()
      const session = await stripe.checkout.sessions.create({
        mode: app.price_type === 'recurring' ? 'subscription' : 'payment',
        payment_method_types: ['card'],
        customer_email: buyerEmail,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: app.name, description: app.description },
            unit_amount: app.price_cents,
            ...(app.price_type === 'recurring' ? { recurring: { interval: 'month' } } : {}),
          },
          quantity: 1,
        }],
        success_url: `${SITE_URL}/dashboard/marketplace/my-apps?installed=${app.slug}`,
        cancel_url: `${SITE_URL}/dashboard/marketplace/${app.slug}`,
        metadata: {
          ucp_product_id: app.ucp_product_id || '',
          fulfillment_type: 'marketplace_app',
          buyer_user_id: userId,
          app_id: app.id,
          app_slug: app.slug,
          source: 'marketplace',
        },
      })

      const { data: order } = await supabase
        .from('ucp_orders')
        .insert({
          product_id: app.ucp_product_id || null,
          buyer_email: buyerEmail,
          buyer_user_id: userId,
          stripe_session_id: session.id,
          amount_cents: app.price_cents,
          vendor_id: app.vendor_id,
          status: 'pending',
          source: 'marketplace',
          metadata: { app_id: app.id, app_slug: app.slug, config_overrides: configOverrides },
        })
        .select()
        .single()

      return NextResponse.json({
        requires_payment: true,
        checkout_url: session.url,
        session_id: session.id,
        order_id: order?.id,
      })
    }

    const result = await installApp({ userId, appId, configOverrides })

    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Install failed' }, { status: 500 })
    }

    return NextResponse.json({
      installed: true,
      installation_id: result.installation_id,
      trigger_registered: result.trigger_registered,
      app: { id: app.id, slug: app.slug, name: app.name },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Install error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
