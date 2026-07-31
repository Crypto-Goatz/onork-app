// @ts-nocheck
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { applyLifecycleTag, writeStripeIdsToCrmContact } from '@/lib/crm-billing-link'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' as any })
}

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '')
}

/**
 * Bidirectional Stripe → CRM sync for subscription events. Looks up the
 * profile by stripe_customer_id, then writes Stripe IDs + lifecycle tag onto
 * the master-location CRM contact. Skips silently when contact is missing.
 */
async function syncSubscriptionToCrm(
  supabase: ReturnType<typeof getSupabase>,
  sub: Stripe.Subscription,
) {
  try {
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
    if (!customerId) return

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, crm_contact_id, stripe_customer_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()

    if (error) {
      console.error('[stripe/webhook] profile lookup error:', error.message)
      return
    }
    if (!profile?.crm_contact_id) {
      console.log(
        `[stripe/webhook] No crm_contact_id for stripe_customer ${customerId} (user not yet claimed workspace) — skipping CRM sync`,
      )
      return
    }

    await writeStripeIdsToCrmContact({
      contactId: profile.crm_contact_id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
    })
    await applyLifecycleTag({ contactId: profile.crm_contact_id, stripeStatus: sub.status })
  } catch (err) {
    console.error('[stripe/webhook] syncSubscriptionToCrm threw:', (err as Error).message)
  }
}

/** Log every webhook event to stripe_webhook_logs for admin visibility */
async function logWebhookEvent(supabase: ReturnType<typeof getSupabase>, event: Stripe.Event, processed: boolean) {
  try {
    const obj = event.data.object as Record<string, unknown>
    await supabase.from('stripe_webhook_logs').upsert({
      event_id: event.id,
      event_type: event.type,
      customer_id: (obj.customer as string) || null,
      subscription_id: (obj.subscription as string) || (obj.id as string) || null,
      status: (obj.status as string) || null,
      amount: (obj.amount_total as number) || (obj.amount_paid as number) || null,
      raw_data: event.data.object,
      processed,
    }, { onConflict: 'event_id' })
  } catch (err) {
    console.error('[stripe/webhook] Failed to log event:', (err as Error).message)
  }
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
  let processed = false

  // Idempotency — bail if we've already processed this event.
  try {
    const { data: dup } = await supabase
      .from('stripe_webhook_logs')
      .select('event_id, processed')
      .eq('event_id', event.id)
      .maybeSingle()
    if (dup?.processed) {
      console.log(`[stripe/webhook] duplicate event ${event.id} (${event.type}) — skipping`)
      return Response.json({ received: true, duplicate: true })
    }
  } catch (err) {
    // Lookup failure shouldn't block — log and continue.
    console.warn('[stripe/webhook] idempotency lookup failed:', (err as Error).message)
  }

  try {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object

      // UCP order handling — fires for any product purchased through /api/ucp/checkout
      if (session.metadata?.ucp_product_id) {
        const paymentId = typeof session.payment_intent === 'string' ? session.payment_intent : null
        await supabase
          .from('ucp_orders')
          .update({ status: 'paid', stripe_payment_id: paymentId })
          .eq('stripe_session_id', session.id)

        const fulfillmentUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'}/api/ucp/fulfillment`
        fetch(fulfillmentUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stripe_session_id: session.id }),
        }).catch(err => console.error('[stripe/webhook] UCP fulfillment failed:', err.message))
      }

      const userId = session.metadata?.user_id
      if (!userId) break

      // Wallet top-up — credit the user's prepaid execution balance.
      if (session.metadata?.kind === 'wallet_topup') {
        const cents = parseInt(session.metadata?.cents || '0', 10)
        if (cents > 0) {
          const { error: wErr } = await supabase.rpc('wallet_credit', {
            p_user: userId, p_cents: cents, p_kind: 'topup', p_desc: 'Stripe top-up', p_ref: session.id,
          })
          if (wErr) console.error('[stripe/webhook] wallet_credit failed:', wErr.message)
        }
        break
      }

      if (session.mode === 'subscription' && session.subscription) {
        const sub = await getStripe().subscriptions.retrieve(session.subscription)
        const { error: subErr } = await supabase.from('product_subscriptions').upsert({
          user_id: userId, product_id: '0ncore', tier: session.metadata?.tier_name || 'supporter',
          status: 'active', stripe_subscription_id: sub.id, stripe_customer_id: sub.customer,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
        }, { onConflict: 'user_id,product_id' })
        if (subErr) console.error('[stripe-webhook] product_subscriptions upsert failed:', subErr)

        // Addon subscriptions — unlock the product_key and promote any
        // existing trial CRO9 sites to active status.
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
            stripe_payment_id: sub.id,
            price_cents: typeof sub.items?.data?.[0]?.price?.unit_amount === 'number' ? sub.items.data[0].price.unit_amount : 0,
            activated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,location_id,product_slug' })

          if (productSlug === 'cro9-neuro-engine') {
            await supabase.from('cro9_sites')
              .update({ status: 'active', stripe_subscription_id: sub.id, updated_at: new Date().toISOString() })
              .eq('user_id', userId)
              .in('status', ['trial', 'expired'])
          }
        }
      }

      // Handle add-on purchases (new user_addons table)
      if (session.metadata?.type === 'addon_purchase' && session.metadata?.addon_slug) {
        await supabase.from('user_addons').upsert({
          user_id: userId,
          addon_slug: session.metadata.addon_slug,
          status: 'active',
          payment_type: session.mode === 'subscription' ? 'subscription' : 'one_time',
          stripe_payment_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
          stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : null,
        }, { onConflict: 'user_id,addon_slug' })

        // Update plan if subscription tier purchase
        if (session.metadata?.tier_name) {
          await supabase.from('profiles').update({
            plan: session.metadata.tier_name,
            tier_level: parseInt(session.metadata.tier_level || '1'),
          }).eq('id', userId)
        }
      }

      if (session.mode === 'payment') {
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
    case 'customer.subscription.created': {
      const sub = event.data.object
      await syncSubscriptionToCrm(supabase, sub)
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
      await syncSubscriptionToCrm(supabase, sub)
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      await supabase.from('product_subscriptions').update({ status: 'cancelled', cancel_at_period_end: false }).eq('stripe_subscription_id', sub.id)
      await syncSubscriptionToCrm(supabase, sub)
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
  processed = true
  } catch (err) {
    console.error('[stripe/webhook] Processing error:', (err as Error).message)
    // Still log the event even if processing failed
  }

  // Log every event to stripe_webhook_logs
  await logWebhookEvent(supabase, event, processed)

  return Response.json({ received: true })
}
