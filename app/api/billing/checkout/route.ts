// @ts-nocheck
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { isVipProfile, vipDiscounts } from '@/lib/billing/vip'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' as any })
}

function getTierPrices(): Record<number, string> {
  return {
    1: process.env.STRIPE_PRICE_TIER_1 || '',
    2: process.env.STRIPE_PRICE_TIER_2 || '',
    3: process.env.STRIPE_PRICE_TIER_3 || '',
    4: process.env.STRIPE_PRICE_TIER_4 || '',
    5: process.env.STRIPE_PRICE_TIER_5 || '',
  }
}

const TIER_NAMES: Record<number, string> = {
  1: 'supporter',
  2: 'builder',
  3: 'enterprise',
  4: 'business',
  5: 'penthouse',
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { tier_level, pack_id } = await req.json()

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, crm_contact_id, is_vip, is_admin')
    .eq('id', user.id)
    .single()

  // VIP is a 100% DISCOUNT, not a skipped checkout: the session, subscription,
  // webhook and entitlement grant all still happen, at $0. Bypassing here
  // would leave the paid path untested by the people who demo it.
  const vip = isVipProfile(profile, user.email)

  // Get or create Stripe customer
  const { data: balance } = await supabase
    .from('run_balances')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  let customerId = balance?.stripe_customer_id

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: profile?.email || user.email!,
      name: profile?.full_name || undefined,
      metadata: {
        user_id: user.id,
        ...(profile?.crm_contact_id ? { crm_contact_id: profile.crm_contact_id } : {}),
      },
    })
    customerId = customer.id
    await supabase.from('run_balances').upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
      balance: 0,
      lifetime_earned: 0,
      lifetime_spent: 0,
    }, { onConflict: 'user_id' })
  }

  // Resolved once, before the session: if the coupon cannot be ensured this
  // THROWS rather than quietly charging a VIP full price.
  const discounts = await vipDiscounts(getStripe(), vip)

  // SUBSCRIPTION (tier upgrade)
  if (tier_level && getTierPrices()[tier_level]) {
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: getTierPrices()[tier_level], quantity: 1 }],
      ...(discounts ? { discounts } : {}),
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/console?upgrade=success&tier=${tier_level}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/console?upgrade=cancelled`,
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier_level: String(tier_level),
          tier_name: TIER_NAMES[tier_level],
        },
      },
    })
    return Response.json({ url: session.url })
  }

  // Usage credits are now the prepaid wallet — see /api/wallet/topup.
  return Response.json({ error: 'tier_level required' }, { status: 400 })
}
