/**
 * GET /api/agency/billing-overview — everything an agency owner should see about
 * their billing, in one call: plan, what it costs, usage this month, the card on
 * file, recent invoices, and a link to manage it. All tied to their SSO (the
 * Stripe customer on their profile). Read-only; Stripe is the source of truth.
 */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { AGENCY_BILLING, billingSummary } from '@/lib/agency-billing'

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

const OURS = new Set<string>([AGENCY_BILLING.perClientPriceId, AGENCY_BILLING.apiMeteredPriceId, AGENCY_BILLING.basePriceId])

export async function GET() {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ authed: false }, { status: 401 })

  const sb = admin()
  const { data: install } = await sb.from('crm_installations')
    .select('company_id').eq('user_id', user.id).eq('status', 'active').not('company_id', 'is', null)
    .order('updated_at', { ascending: false }).limit(1).maybeSingle()
  const companyId = install?.company_id ?? null

  // ADDED clients only — never the whole CRM roster.
  let clients = 0
  if (companyId) {
    const { count } = await sb.from('agency_added_clients').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active')
    clients = count ?? 0
  }
  const summary = billingSummary(clients)
  let isFounding = true
  if (companyId) {
    const { data: bill } = await sb.from('agency_billing').select('is_founding').eq('company_id', companyId).maybeSingle()
    if (bill) isFounding = !!bill.is_founding
    else { const { count } = await sb.from('agency_billing').select('*', { count: 'exact', head: true }); isFounding = (count ?? 0) < AGENCY_BILLING.foundingLimit }
  }

  // Usage this month = successful actions billed (matches what the meter got).
  let usageThisMonth = 0
  if (companyId) {
    const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)
    const { count } = await sb.from('burst_receipts').select('*', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('status', 'ok').gte('created_at', monthStart.toISOString())
    usageThisMonth = count ?? 0
  }

  const { data: profile } = await sb.from('profiles').select('stripe_customer_id').eq('id', user.id).maybeSingle()
  const customerId = profile?.stripe_customer_id ?? null

  let subscribed = false, subStatus: string | null = null, discount: string | null = null
  let card: { brand: string; last4: string } | null = null
  let invoices: { amount: number; status: string; date: number; url: string | null }[] = []
  let portalUrl: string | null = null

  if (customerId) {
    const stripe = getStripe()
    try {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 })
      const ours = subs.data.find((s) => s.items.data.some((i) => i.price?.id && OURS.has(i.price.id)))
      if (ours) {
        subscribed = ours.status === 'active' || ours.status === 'trialing'
        subStatus = ours.status
        // Stripe renamed subscription.discount → discounts[]. Any discount on an
        // owner sub is our 100%-off founder coupon.
        const hasDiscount = Array.isArray(ours.discounts) && ours.discounts.length > 0
        discount = hasDiscount ? 'Free forever (founder)' : null
      }
    } catch {}
    try {
      const cust = await stripe.customers.retrieve(customerId, { expand: ['invoice_settings.default_payment_method'] }) as Stripe.Customer
      const pm = cust.invoice_settings?.default_payment_method as Stripe.PaymentMethod | null
      if (pm?.card) card = { brand: pm.card.brand, last4: pm.card.last4 }
    } catch {}
    try {
      const inv = await stripe.invoices.list({ customer: customerId, limit: 6 })
      invoices = inv.data.map((i) => ({ amount: i.amount_paid, status: i.status ?? 'unknown', date: i.created, url: i.hosted_invoice_url ?? null }))
    } catch {}
    try {
      const portal = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: 'https://app.0ncore.com/crm/billing' })
      portalUrl = portal.url
    } catch {}
  }

  return NextResponse.json({
    authed: true, companyId, subscribed, subStatus, discount,
    isFounding, baseFeeCents: isFounding ? 0 : AGENCY_BILLING.baseFeeCents,
    perClientCents: AGENCY_BILLING.perClientCents, perCallCents: AGENCY_BILLING.perCallCents,
    ...summary,
    usageThisMonth, usageCostCents: usageThisMonth * AGENCY_BILLING.perCallCents,
    card, invoices, portalUrl,
  })
}
