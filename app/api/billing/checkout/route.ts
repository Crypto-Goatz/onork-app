// @ts-nocheck
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

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
    .select('email, full_name, crm_contact_id')
    .eq('id', user.id)
    .single()

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

  // SUBSCRIPTION (tier upgrade)
  if (tier_level && getTierPrices()[tier_level]) {
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: getTierPrices()[tier_level], quantity: 1 }],
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

  // CREDIT PACK (one-time)
  if (pack_id) {
    const { data: pack } = await supabase
      .from('run_packs')
      .select('*')
      .eq('id', pack_id)
      .eq('active', true)
      .single()

    if (!pack?.stripe_price_id) {
      return Response.json({ error: 'Pack not available' }, { status: 400 })
    }

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: pack.stripe_price_id, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/console?sparks=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/console`,
      metadata: {
        user_id: user.id,
        pack_id: pack.id,
        sparks: String(pack.sparks),
      },
    })
    return Response.json({ url: session.url })
  }

  return Response.json({ error: 'tier_level or pack_id required' }, { status: 400 })
}
