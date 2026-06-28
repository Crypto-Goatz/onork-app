/**
 * POST /api/wallet/topup  { cents }
 * Creates a Stripe one-time Checkout Session to add funds to the user's wallet.
 * Minimum $5. The webhook credits the wallet on completion.
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { MIN_TOPUP_CENTS } from '@/lib/wallet'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' as any })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  let cents = Math.round(Number(body.cents) || 0)
  if (!cents || cents < MIN_TOPUP_CENTS) cents = MIN_TOPUP_CENTS // enforce $5 minimum
  cents = Math.min(cents, 100000) // cap a single top-up at $1,000

  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://www.0ncore.com'
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: '0nCore wallet top-up', description: `Adds $${(cents / 100).toFixed(2)} to your execution balance` },
          unit_amount: cents,
        },
        quantity: 1,
      }],
      success_url: `${base}/dashboard/billing?topup=success`,
      cancel_url: `${base}/dashboard/billing?topup=cancelled`,
      client_reference_id: user.id,
      metadata: { user_id: user.id, kind: 'wallet_topup', cents: String(cents) },
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'checkout failed' }, { status: 500 })
  }
}
