import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || ''
const STRIPE_API = 'https://api.stripe.com/v1'
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function stripeRequest(path: string, method: string = 'GET', body?: Record<string, string>) {
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  }
  if (body) {
    options.body = new URLSearchParams(body).toString()
  }
  const res = await fetch(`${STRIPE_API}${path}`, options)
  return res.json()
}

/**
 * GET /api/stripe?action=...
 * Actions: prices, customer, payment_methods
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'prices'

  if (!STRIPE_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  try {
    switch (action) {
      case 'prices': {
        // Return 0nCore pricing tiers
        return NextResponse.json({
          plans: [
            { id: 'free', name: 'Free', price: 0, features: ['5 workflow runs/mo', '100 contacts', 'Community support'] },
            { id: 'supporter', name: 'Supporter', price: 900, priceId: 'price_1T1rY5HThmAuKVQMEvWdsvcy', features: ['100 workflow runs/mo', '1,000 contacts', 'Priority support', 'CRM sync'] },
            { id: 'builder', name: 'Builder', price: 2900, priceId: 'price_1T1rYYHThmAuKVQMZIOi4kdq', features: ['Unlimited runs', '10,000 contacts', 'API access', 'Custom integrations', 'Training center'] },
            { id: 'enterprise', name: 'Enterprise', price: 9900, priceId: 'price_1T1rYiHThmAuKVQMsUKlhrSq', features: ['Unlimited everything', 'White-label', 'Dedicated support', 'Custom brains', 'SLA'] },
          ],
        })
      }

      case 'customer': {
        const userId = searchParams.get('user_id')
        if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

        const admin = getAdmin()
        const { data: profile } = await admin.from('profiles').select('stripe_customer_id').eq('id', userId).single()

        if (!profile?.stripe_customer_id) {
          return NextResponse.json({ customer: null })
        }

        const customer = await stripeRequest(`/customers/${profile.stripe_customer_id}`)
        return NextResponse.json({ customer })
      }

      case 'payment_methods': {
        const customerId = searchParams.get('customer_id')
        if (!customerId) return NextResponse.json({ error: 'customer_id required' }, { status: 400 })

        const methods = await stripeRequest(`/customers/${customerId}/payment_methods?type=card`)
        return NextResponse.json({ payment_methods: methods.data || [] })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

/**
 * POST /api/stripe
 * Actions: checkout, portal, create_customer
 */
export async function POST(request: Request) {
  if (!STRIPE_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = body.action as string
  const admin = getAdmin()

  try {
    switch (action) {
      case 'create_customer': {
        const userId = body.user_id as string
        const email = body.email as string
        const name = body.name as string

        if (!userId || !email) return NextResponse.json({ error: 'user_id and email required' }, { status: 400 })

        // Check if already has customer
        const { data: profile } = await admin.from('profiles').select('stripe_customer_id').eq('id', userId).single()
        if (profile?.stripe_customer_id) {
          return NextResponse.json({ customer_id: profile.stripe_customer_id, existing: true })
        }

        // Create Stripe customer
        const customer = await stripeRequest('/customers', 'POST', {
          email,
          name: name || '',
          'metadata[user_id]': userId,
          'metadata[source]': '0ncore',
        })

        // Save to profile
        await admin.from('profiles').update({ stripe_customer_id: customer.id }).eq('id', userId)

        return NextResponse.json({ customer_id: customer.id, existing: false })
      }

      case 'checkout': {
        const priceId = body.price_id as string
        const customerId = body.customer_id as string
        const userId = body.user_id as string

        if (!priceId) return NextResponse.json({ error: 'price_id required' }, { status: 400 })

        // Ensure customer exists
        let stripeCustomerId = customerId
        if (!stripeCustomerId && userId) {
          const { data: profile } = await admin.from('profiles').select('stripe_customer_id, email, full_name').eq('id', userId).single()
          if (profile?.stripe_customer_id) {
            stripeCustomerId = profile.stripe_customer_id
          } else if (profile?.email) {
            const customer = await stripeRequest('/customers', 'POST', {
              email: profile.email,
              name: profile.full_name || '',
              'metadata[user_id]': userId,
              'metadata[source]': '0ncore',
            })
            stripeCustomerId = customer.id
            await admin.from('profiles').update({ stripe_customer_id: customer.id }).eq('id', userId)
          }
        }

        // Create checkout session
        const sessionParams: Record<string, string> = {
          mode: 'subscription',
          'line_items[0][price]': priceId,
          'line_items[0][quantity]': '1',
          success_url: `${SITE_URL}/dashboard?payment=success`,
          cancel_url: `${SITE_URL}/dashboard?payment=cancelled`,
          'metadata[source]': '0ncore',
        }

        if (stripeCustomerId) {
          sessionParams.customer = stripeCustomerId
        }

        const session = await stripeRequest('/checkout/sessions', 'POST', sessionParams)

        return NextResponse.json({ url: session.url, session_id: session.id })
      }

      case 'portal': {
        const customerId = body.customer_id as string
        if (!customerId) return NextResponse.json({ error: 'customer_id required' }, { status: 400 })

        const session = await stripeRequest('/billing_portal/sessions', 'POST', {
          customer: customerId,
          return_url: `${SITE_URL}/dashboard/billing`,
        })

        return NextResponse.json({ url: session.url })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
