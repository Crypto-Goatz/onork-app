/**
 * POST /api/agency/subscribe — start the agency's 0nCORE billing.
 *
 * Creates ONE Stripe subscription checkout with two items:
 *   • per-client ($5/mo) — quantity = clients beyond the first (the free one)
 *   • API usage ($0.10/call) — metered, fed by the oncore_api_call meter
 *
 * Auth is the signed-in owner's Supabase session (so their card attaches to
 * their SSO identity via profiles.stripe_customer_id). The agency is resolved
 * from their own install, never from the request. Returns { url } for the
 * dashboard button to redirect to Stripe.
 */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { listAgencyLocations } from '@/lib/crm/locations'
import { AGENCY_BILLING, billableClients } from '@/lib/agency-billing'

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

export async function POST() {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) {
    return NextResponse.json({ error: 'Sign in at app.0ncore.com to set up billing.' }, { status: 401 })
  }

  const sb = admin()

  // The agency this owner belongs to — resolved from their own install.
  const { data: install } = await sb
    .from('crm_installations')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .not('company_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const companyId = install?.company_id
  if (!companyId) {
    return NextResponse.json({ error: 'No agency is linked to this account yet.' }, { status: 403 })
  }

  // Client count → billable quantity. If it can't be read, fall back to 0
  // billable (metered-only) rather than blocking the sale.
  let quantity = 0
  try {
    const { locations } = await listAgencyLocations(companyId)
    quantity = billableClients(locations.length)
  } catch { /* metered-only */ }

  // Customer on the owner's profile (create + persist if missing).
  const { data: profile } = await sb.from('profiles').select('stripe_customer_id, email').eq('id', user.id).maybeSingle()
  const stripe = getStripe()
  let customerId = profile?.stripe_customer_id ?? undefined
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? profile?.email ?? undefined,
      metadata: { user_id: user.id, company_id: companyId },
    })
    customerId = customer.id
    await sb.from('profiles').update({ stripe_customer_id: customer.id }).eq('id', user.id)
  }

  // Founding status — the first 50 agencies never pay the monthly base fee, and
  // it's fixed at signup so the grandfather is permanent. Reuse an existing row;
  // otherwise assign the next founding number.
  const { data: existingBill } = await sb.from('agency_billing').select('is_founding, founding_number').eq('company_id', companyId).maybeSingle()
  let isFounding: boolean
  if (existingBill) {
    isFounding = !!existingBill.is_founding
  } else {
    const { count } = await sb.from('agency_billing').select('*', { count: 'exact', head: true })
    const foundingNumber = (count ?? 0) + 1
    isFounding = foundingNumber <= AGENCY_BILLING.foundingLimit
    await sb.from('agency_billing').upsert({
      company_id: companyId, founding_number: foundingNumber, is_founding: isFounding,
      stripe_customer_id: customerId, status: 'pending', updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' })
  }

  // Items: metered API (always) + per-client (when >0) + base fee (only if NOT
  // founding — the founding 50 never pay it).
  const line_items: Array<{ price: string; quantity?: number }> = [
    { price: AGENCY_BILLING.apiMeteredPriceId }, // metered: no quantity
  ]
  if (quantity > 0) line_items.push({ price: AGENCY_BILLING.perClientPriceId, quantity })
  if (!isFounding) line_items.push({ price: AGENCY_BILLING.basePriceId, quantity: 1 })

  // Owner/VIP walks the full flow for free — auto-apply the 100%-off coupon.
  // (Stripe forbids discounts + allow_promotion_codes together, so it's one or
  // the other.)
  const email = (user.email ?? '').toLowerCase()
  const freeForever = AGENCY_BILLING.freeForeverEmails.map((e) => e.toLowerCase()).includes(email)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items,
    metadata: { user_id: user.id, company_id: companyId, kind: 'agency', billable_clients: String(quantity), free_forever: String(freeForever) },
    subscription_data: { metadata: { user_id: user.id, company_id: companyId, kind: 'agency' } },
    success_url: `${APP}/crm?subscribed=1`,
    cancel_url: `${APP}/crm?billing=canceled`,
    billing_address_collection: 'auto',
    ...(freeForever
      ? { discounts: [{ coupon: AGENCY_BILLING.freeForeverCoupon }] }
      : { allow_promotion_codes: true }),
  })

  if (!session.url) return NextResponse.json({ error: 'Could not start checkout.' }, { status: 502 })
  return NextResponse.json({ url: session.url })
}
