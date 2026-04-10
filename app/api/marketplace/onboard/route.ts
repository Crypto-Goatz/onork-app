// @ts-nocheck
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '')
}

// POST — Generate an account link for KYC onboarding
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { account_id } = await req.json()

  // If no account_id provided, get from profile
  let connectAccountId = account_id
  if (!connectAccountId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id')
      .eq('id', user.id)
      .single()
    connectAccountId = profile?.stripe_connect_account_id
  }

  if (!connectAccountId) {
    return Response.json({ error: 'No connected account found. Create one first.' }, { status: 400 })
  }

  const accountLink = await getStripe().accountLinks.create({
    account: connectAccountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?stripe=refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?stripe=complete`,
    type: 'account_onboarding',
  })

  return Response.json({ url: accountLink.url })
}
