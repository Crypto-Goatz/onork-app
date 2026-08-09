/**
 * POST /api/agency/subscribe — start the agency's 0nCORE billing.
 *
 * Auth is the APP JWT (companyId from the signed token) — same as the dashboard.
 * The Stripe customer is keyed to the AGENCY (agency_billing.stripe_customer_id),
 * not a Supabase profile, so it works however they signed in. Two items:
 * metered API ($0.01/call) + per-client ($5/mo, first free); base fee only if
 * not founding; owner agencies get the free-forever coupon.
 */
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { AGENCY_BILLING, billableClients } from '@/lib/agency-billing'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY missing')
  return new Stripe(key)
}
function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}
const APP = 'https://app.0ncore.com'

export async function POST(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Open 0nCORE from your CRM to set up billing.' }, { status: 401 })
  const { companyId } = session.claims

  const sb = admin()
  const stripe = getStripe()

  // Billable = ADDED clients beyond the first (free). 0 at signup.
  const { count } = await sb.from('agency_added_clients').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active')
  const quantity = billableClients(count ?? 0)

  // Founding + the agency's Stripe customer, both on agency_billing.
  const { data: bill } = await sb.from('agency_billing').select('is_founding, stripe_customer_id').eq('company_id', companyId).maybeSingle()
  let isFounding: boolean
  if (bill) {
    isFounding = !!bill.is_founding
  } else {
    const { count: n } = await sb.from('agency_billing').select('*', { count: 'exact', head: true })
    const foundingNumber = (n ?? 0) + 1
    isFounding = foundingNumber <= AGENCY_BILLING.foundingLimit
    await sb.from('agency_billing').upsert({ company_id: companyId, founding_number: foundingNumber, is_founding: isFounding, status: 'pending', updated_at: new Date().toISOString() }, { onConflict: 'company_id' })
  }

  // Customer keyed to the agency. Verify a stored id still exists (stale/cross-
  // account ids fail checkout); recreate if not.
  let customerId = bill?.stripe_customer_id ?? undefined
  if (customerId) {
    try { const c = await stripe.customers.retrieve(customerId); if ((c as Stripe.DeletedCustomer).deleted) customerId = undefined } catch { customerId = undefined }
  }
  if (!customerId) {
    const customer = await stripe.customers.create({ metadata: { company_id: companyId } })
    customerId = customer.id
    await sb.from('agency_billing').upsert({ company_id: companyId, stripe_customer_id: customerId, updated_at: new Date().toISOString() }, { onConflict: 'company_id' })
  }

  const line_items: Array<{ price: string; quantity?: number }> = [{ price: AGENCY_BILLING.apiMeteredPriceId }]
  if (quantity > 0) line_items.push({ price: AGENCY_BILLING.perClientPriceId, quantity })
  if (!isFounding) line_items.push({ price: AGENCY_BILLING.basePriceId, quantity: 1 })

  const freeForever = (AGENCY_BILLING.freeForeverCompanyIds as readonly string[]).includes(companyId)

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items,
    metadata: { company_id: companyId, kind: 'agency', billable_clients: String(quantity), free_forever: String(freeForever) },
    subscription_data: { metadata: { company_id: companyId, kind: 'agency' } },
    success_url: `${APP}/crm/billing?subscribed=1`,
    cancel_url: `${APP}/crm/billing?billing=canceled`,
    billing_address_collection: 'auto',
    ...(freeForever ? { discounts: [{ coupon: AGENCY_BILLING.freeForeverCoupon }] } : { allow_promotion_codes: true }),
  })

  if (!checkout.url) return NextResponse.json({ error: 'Could not start checkout.' }, { status: 502 })
  return NextResponse.json({ url: checkout.url })
}
