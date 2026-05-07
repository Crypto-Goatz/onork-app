import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '')
}

function getAdmin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST() {
  try {
    const supabase = await createClient()
    const user = (await supabase.auth.getSession()).data.session?.user ?? null
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()

    // Get or create Stripe customer
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      // Check run_balances for stripe_customer_id
      const { data: balance } = await admin
        .from('run_balances')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .single()

      customerId = balance?.stripe_customer_id
    }

    if (!customerId) {
      // Create a Stripe customer
      const stripe = getStripe()
      const customer = await stripe.customers.create({
        email: profile?.email || user.email || '',
        metadata: { user_id: user.id },
      })
      customerId = customer.id

      // Save customer ID
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const stripe = getStripe()
    const returnUrl = `${process.env.NEXT_PUBLIC_URL || 'https://0ncore.com'}/dashboard/billing`

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[billing/portal]', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Failed to create portal session',
    }, { status: 500 })
  }
}
