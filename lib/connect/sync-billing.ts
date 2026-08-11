/**
 * Push the agency's client count onto their live Stripe subscription.
 *
 * WHY THIS EXISTS. Quantity was only ever set at checkout. Nothing updated it
 * afterwards, so an agency that subscribed with two clients and then connected
 * twenty kept paying for two. Connecting an account is the billable event, so
 * the count has to reach Stripe at the moment it changes.
 *
 * Deliberately best-effort and non-throwing: a Stripe hiccup must not fail the
 * connect itself. The agency has already proved they hold a valid token for the
 * account, and refusing that because a billing API was slow would be the wrong
 * trade. Failures are logged loudly and the next connect re-syncs the true
 * count, because we always send the ABSOLUTE quantity rather than a delta —
 * a missed delta would compound silently.
 */
import Stripe from 'stripe'
import { AGENCY_BILLING, billableClients, countAgencyClients } from '@/lib/agency-billing'
import { createServiceClient } from '@/lib/connect/service-client'

export async function syncAgencyQuantity(companyId: string): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return

  const sb = createServiceClient()
  if (!sb) return

  try {
    const total = await countAgencyClients(sb, companyId)
    if (total === null) {
      console.error(`[sync-billing] skipped ${companyId}: client count unreadable`)
      return
    }
    const quantity = billableClients(total)

    const { data: bill } = await sb
      .from('agency_billing')
      .select('stripe_subscription_id')
      .eq('company_id', companyId)
      .maybeSingle()

    const subId = bill?.stripe_subscription_id
    // No subscription yet is normal: they connect accounts before they pay.
    // Checkout reads the live count, so nothing is lost by returning here.
    if (!subId) return

    const stripe = new Stripe(key)
    const sub = await stripe.subscriptions.retrieve(subId)
    const item = sub.items.data.find((i) => i.price.id === AGENCY_BILLING.perClientPriceId)

    if (!item) {
      // They subscribed while they had only the free client, so the per-client
      // item was never created. Add it now that there is something to bill.
      if (quantity > 0) {
        await stripe.subscriptionItems.create({
          subscription: subId,
          price: AGENCY_BILLING.perClientPriceId,
          quantity,
        })
      }
      return
    }

    if (item.quantity !== quantity) {
      await stripe.subscriptionItems.update(item.id, { quantity })
    }
  } catch (err) {
    console.error(`[sync-billing] ${companyId} failed:`, err)
  }
}
