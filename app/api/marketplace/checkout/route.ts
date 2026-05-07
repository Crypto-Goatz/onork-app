// @ts-nocheck
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '')
}

// POST — Create a checkout session with marketplace split
// Charges the buyer, sends payment to the connected account, keeps application fee
export async function POST(req: Request) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    connected_account_id,  // The seller's Stripe Connect account
    product_name,
    amount_cents,           // Total amount in cents
    application_fee_cents,  // Platform's cut in cents
    currency,
    success_url,
    cancel_url,
    metadata,
  } = await req.json()

  if (!connected_account_id || !amount_cents) {
    return Response.json({ error: 'connected_account_id and amount_cents required' }, { status: 400 })
  }

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: currency || 'usd',
        product_data: {
          name: product_name || 'Marketplace Purchase',
        },
        unit_amount: amount_cents,
      },
      quantity: 1,
    }],
    payment_intent_data: {
      application_fee_amount: application_fee_cents || Math.round(amount_cents * 0.10), // Default 10% platform fee
      transfer_data: {
        destination: connected_account_id,
      },
    },
    success_url: success_url || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?purchase=success`,
    cancel_url: cancel_url || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?purchase=cancelled`,
    metadata: {
      buyer_user_id: user.id,
      seller_account_id: connected_account_id,
      ...metadata,
    },
  })

  return Response.json({ url: session.url, session_id: session.id })
}
