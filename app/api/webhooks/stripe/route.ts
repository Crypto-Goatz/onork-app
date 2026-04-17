// @ts-nocheck
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' as any })
}

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '')
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return Response.json({ error: 'Missing signature' }, { status: 400 })

  let event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET || '')
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getSupabase()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const userId = session.metadata?.user_id
      if (!userId) break

      if (session.mode === 'subscription' && session.subscription) {
        const sub = await getStripe().subscriptions.retrieve(session.subscription)
        await supabase.from('product_subscriptions').upsert({
          user_id: userId, product_id: '0ncore', tier: session.metadata?.tier_name || 'supporter',
          status: 'active', stripe_subscription_id: sub.id, stripe_customer_id: sub.customer,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
        }, { onConflict: 'user_id,product_id' })
      }

      if (session.mode === 'payment') {
        const sparks = parseInt(session.metadata?.sparks || '0')
        if (sparks > 0) {
          const { data: existing } = await supabase.from('run_balances').select('balance, lifetime_earned').eq('user_id', userId).single()
          await supabase.from('run_balances').upsert({
            user_id: userId, balance: (existing?.balance || 0) + sparks,
            lifetime_earned: (existing?.lifetime_earned || 0) + sparks,
            stripe_customer_id: session.customer,
          }, { onConflict: 'user_id' })
        }

        // Add-on purchase → write product_keys + report to CRM billing webhook
        if (session.metadata?.type === 'addon_purchase') {
          const productSlug = session.metadata.product_slug
          const locationId = session.metadata.location_id
          const capabilities = JSON.parse(session.metadata.capabilities || '[]')

          await supabase.from('product_keys').upsert({
            user_id: userId,
            location_id: locationId || '',
            product_slug: productSlug,
            product_name: session.metadata.product_name || productSlug,
            status: 'active',
            capabilities,
            stripe_payment_id: typeof session.payment_intent === 'string' ? session.payment_intent : '',
            price_cents: session.amount_total || 0,
            activated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,location_id,product_slug' })

          // Report to CRM billing webhook (activate marketplace app for this location)
          if (locationId) {
            const CRM_BILLING_URL = 'https://services.leadconnectorhq.com/oauth/billing/webhook'
            const clientKey = process.env.CRM_MARKETPLACE_CLIENT_ID || ''
            const clientSecret = process.env.CRM_MARKETPLACE_CLIENT_SECRET || ''
            fetch(CRM_BILLING_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-ghl-client-key': clientKey, 'x-ghl-client-secret': clientSecret },
              body: JSON.stringify({
                clientId: clientKey.split('-')[0],
                authType: 'location',
                locationId,
                subscriptionId: typeof session.subscription === 'string' ? session.subscription : `addon_${productSlug}_${Date.now()}`,
                paymentId: typeof session.payment_intent === 'string' ? session.payment_intent : `pay_${Date.now()}`,
                amount: (session.amount_total || 0) / 100,
                status: 'COMPLETED',
                paymentType: 'one_time',
              }),
            }).catch(err => console.error('[stripe/webhook] CRM billing report failed:', err.message))
          }
        }
      }
      break
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object
      await supabase.from('product_subscriptions').update({
        status: sub.status,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
      }).eq('stripe_subscription_id', sub.id)
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      await supabase.from('product_subscriptions').update({ status: 'cancelled', cancel_at_period_end: false }).eq('stripe_subscription_id', sub.id)
      break
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object
      if (invoice.subscription) {
        const sub = await getStripe().subscriptions.retrieve(invoice.subscription)
        await supabase.from('product_subscriptions').update({
          status: 'active', current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }).eq('stripe_subscription_id', sub.id)
      }
      break
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object
      if (invoice.subscription) {
        await supabase.from('product_subscriptions').update({ status: 'past_due' }).eq('stripe_subscription_id', invoice.subscription)
      }
      break
    }
  }

  return Response.json({ received: true })
}
