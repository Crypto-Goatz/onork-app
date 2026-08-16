// GET /api/addons/checkout?addon=<slug> — Create Stripe Checkout session for an add-on
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' as any })
}

const ADDON_PRICES: Record<string, { name: string; price_cents: number; type: 'one_time' | 'subscription' }> = {
  'linkedin-scraper-pro': { name: 'LinkedIn Scraper Pro', price_cents: 2900, type: 'one_time' },
  'ai-composer-pro': { name: 'AI Composer Pro (6 tones)', price_cents: 4900, type: 'one_time' },
  'crm-sync': { name: 'CRM Sync Module', price_cents: 900, type: 'subscription' },
  'site-manager': { name: 'Site Manager', price_cents: 1900, type: 'one_time' },
}

export async function GET(req: NextRequest) {
  const addonSlug = req.nextUrl.searchParams.get('addon')
  if (!addonSlug) return NextResponse.json({ error: 'addon parameter required' }, { status: 400 })

  const addon = ADDON_PRICES[addonSlug]
  if (!addon) return NextResponse.json({ error: 'Unknown add-on' }, { status: 404 })

  const serverSupabase = await createServerClient()
  const { data: { session: authSession } } = await serverSupabase.auth.getSession()
  const user = authSession?.user ?? null
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer_email: user.email || undefined,
    mode: addon.type === 'subscription' ? 'subscription' : 'payment',
    success_url: `${siteUrl}/dashboard?addon_activated=${addonSlug}`,
    cancel_url: `${siteUrl}/downloads`,
    metadata: {
      user_id: user.id,
      addon_slug: addonSlug,
      type: 'addon_purchase',
    },
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `0nCore Add-On: ${addon.name}` },
        unit_amount: addon.price_cents,
        ...(addon.type === 'subscription' ? { recurring: { interval: 'month' as const } } : {}),
      },
      quantity: 1,
    }],
  }

  const session = await getStripe().checkout.sessions.create(sessionParams)

  return NextResponse.redirect(session.url!)
}
