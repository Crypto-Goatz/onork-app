/**
 * Usage metering — report API-call usage to Stripe so per-call revenue accrues.
 *
 * Each executed action counts as one billable "API call" ($0.01). We push the
 * count to the `oncore_api_call` meter against the agency's Stripe customer;
 * Stripe sums it over the month and bills it on their subscription.
 *
 * FIRE-AND-FORGET, ALWAYS. Metering must never break or slow the actual work —
 * every failure is swallowed and logged. A dropped meter event costs a penny;
 * a thrown one would cost the customer's action.
 */
import { createClient } from '@supabase/supabase-js'
import { AGENCY_BILLING } from './agency-billing'
import { chargeWallet } from './crm/wallet-charge'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

/**
 * Bill `count` API calls for an agency. MARKETPLACE FIRST: charge the agency's
 * CRM wallet (their payment method on file with the CRM). If that path isn't live
 * for them (no CRM token / portal pricing not configured), fall back to the
 * Stripe meter for standalone agencies.
 */
export async function reportApiUsage(companyId: string | null | undefined, count: number): Promise<void> {
  try {
    if (!companyId || count <= 0) return

    // FREE-FOREVER AGENCIES ARE NEVER METERED. Checked HERE, before either
    // billing path, because the 100%-off Stripe coupon does not protect the
    // first one: chargeWallet() debits the agency's card on file with the CRM
    // marketplace and never touches Stripe, so a Stripe discount cannot zero
    // it. Relying on the coupon alone would have billed the owner in real money
    // for every action while the checkout page said "Free Forever".
    //
    // A guard in code also survives the coupon being edited, expiring, or being
    // detached from the subscription — none of which anyone would notice.
    if ((AGENCY_BILLING.freeForeverCompanyIds as readonly string[]).includes(companyId)) return

    // 1) Marketplace path — charge the CRM wallet.
    const wallet = await chargeWallet({
      companyId,
      amountCents: count * AGENCY_BILLING.perCallCents,
      description: `0nCORE — ${count} API call${count === 1 ? '' : 's'}`,
    })
    if (wallet.ok) return // billed through the marketplace; done

    // 2) Standalone fallback — Stripe meter.
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) return

    const { data: bill } = await admin()
      .from('agency_billing')
      .select('stripe_customer_id')
      .eq('company_id', companyId)
      .maybeSingle()
    const customer = bill?.stripe_customer_id
    if (!customer) return // not on billing yet — nothing to meter

    const body = new URLSearchParams({
      event_name: AGENCY_BILLING.apiMeterEvent,
      'payload[value]': String(Math.round(count)),
      'payload[stripe_customer_id]': customer,
    })
    const res = await fetch('https://api.stripe.com/v1/billing/meter_events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!res.ok) {
      console.error('[usage] meter event failed:', res.status, (await res.text().catch(() => '')).slice(0, 200))
    }
  } catch (err) {
    console.error('[usage] reportApiUsage threw (ignored):', err instanceof Error ? err.message : err)
  }
}
