// POST /api/subscribe — Create Stripe Checkout for a subscription tier
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' as any })
}

// Tier → Stripe Price mapping
const TIER_PRICES: Record<string, { name: string; price_id: string; tier_level: number }> = {
  starter: {
    name: 'Starter',
    price_id: process.env.STRIPE_PRICE_TIER_1 || 'price_1T1rY5HThmAuKVQMEvWdsvcy',
    tier_level: 1,
  },
  pro: {
    name: 'Pro',
    price_id: process.env.STRIPE_PRICE_TIER_2 || 'price_1T1rYYHThmAuKVQMZIOi4kdq',
    tier_level: 2,
  },
  unlimited: {
    name: 'Unlimited',
    price_id: process.env.STRIPE_PRICE_TIER_3 || 'price_1T1rYiHThmAuKVQMsUKlhrSq',
    tier_level: 3,
  },
}

export async function POST(req: NextRequest) {
  const { tier } = await req.json()
  if (!tier || !TIER_PRICES[tier]) {
    return NextResponse.json({ error: 'Invalid tier. Options: starter, pro, unlimited' }, { status: 400 })
  }

  const serverSupabase = await createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tierConfig = TIER_PRICES[tier]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'

  const session = await getStripe().checkout.sessions.create({
    customer_email: user.email || undefined,
    mode: 'subscription',
    success_url: `${siteUrl}/dashboard?subscribed=${tier}`,
    cancel_url: `${siteUrl}/pricing`,
    subscription_data: {
      trial_period_days: tier === 'starter' ? 14 : undefined,
      metadata: {
        user_id: user.id,
        tier_name: tier,
        tier_level: String(tierConfig.tier_level),
        type: 'addon_purchase',
        addon_slug: `plan_${tier}`,
      },
    },
    metadata: {
      user_id: user.id,
      tier_name: tier,
      tier_level: String(tierConfig.tier_level),
      type: 'addon_purchase',
      addon_slug: `plan_${tier}`,
    },
    line_items: [{
      price: tierConfig.price_id,
      quantity: 1,
    }],
  })

  return NextResponse.json({ url: session.url })
}
