// @ts-nocheck
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '')
}

// POST — Create a connected account for a seller/sub-location
export async function POST(req: Request) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_name, email, country } = await req.json()

  const account = await getStripe().accounts.create({
    controller: {
      losses: { payments: 'application' },
      fees: { payer: 'application' },
      stripe_dashboard: { type: 'express' },
    },
    country: country || 'US',
    email: email || user.email,
    business_profile: {
      name: business_name || `${user.email} — 0nCore`,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  })

  // Store the connected account ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (profile) {
    await supabase.from('profiles').update({
      stripe_connect_account_id: account.id,
    }).eq('id', user.id)
  }

  return Response.json({
    account_id: account.id,
    details_submitted: account.details_submitted,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
  })
}

// GET — List connected accounts or get current user's account status
export async function GET(req: Request) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_connect_account_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_connect_account_id) {
    return Response.json({ connected: false, account: null })
  }

  const account = await getStripe().accounts.retrieve(profile.stripe_connect_account_id)

  return Response.json({
    connected: true,
    account_id: account.id,
    details_submitted: account.details_submitted,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    business_name: account.business_profile?.name,
  })
}
