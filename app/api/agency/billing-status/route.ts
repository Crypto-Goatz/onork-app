/**
 * GET /api/agency/billing-status — is this agency on 0nCORE billing, and what
 * would/does it cost. Drives the dashboard's Activate vs. Active state.
 *
 * Source of truth is Stripe (the customer's live subscriptions), not a mirror
 * table — a mirror can lag a webhook. Falls back gracefully so the dashboard
 * never blocks on it.
 */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { listAgencyLocations } from '@/lib/crm/locations'
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

export async function GET() {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ authed: false, subscribed: false })

  const sb = admin()
  const { data: install } = await sb
    .from('crm_installations')
    .select('company_id')
    .eq('user_id', user.id).eq('status', 'active').not('company_id', 'is', null)
    .order('updated_at', { ascending: false }).limit(1).maybeSingle()
  const companyId = install?.company_id ?? null

  let clients = 0
  if (companyId) {
    try { clients = (await listAgencyLocations(companyId)).locations.length } catch { /* leave 0 */ }
  }
  const summary = billingSummary(clients)

  // Founding = first 50 agencies, base fee waived forever. If this agency has no
  // row yet, it WOULD be founding as long as fewer than 50 exist — show that.
  let isFounding = true
  if (companyId) {
    const { data: bill } = await sb.from('agency_billing').select('is_founding').eq('company_id', companyId).maybeSingle()
    if (bill) isFounding = !!bill.is_founding
    else {
      const { count } = await sb.from('agency_billing').select('*', { count: 'exact', head: true })
      isFounding = (count ?? 0) < AGENCY_BILLING.foundingLimit
    }
  }

  // Is there an active subscription carrying our agency prices?
  let subscribed = false
  const { data: profile } = await sb.from('profiles').select('stripe_customer_id').eq('id', user.id).maybeSingle()
  if (profile?.stripe_customer_id) {
    try {
      const subs = await getStripe().subscriptions.list({ customer: profile.stripe_customer_id, status: 'active', limit: 20 })
      const ours = new Set<string>([AGENCY_BILLING.perClientPriceId, AGENCY_BILLING.apiMeteredPriceId])
      subscribed = subs.data.some((s) => s.items.data.some((i) => i.price?.id && ours.has(i.price.id)))
    } catch { /* treat as not subscribed */ }
  }

  return NextResponse.json({
    authed: true,
    subscribed,
    companyId,
    isFounding,
    baseFeeCents: isFounding ? 0 : AGENCY_BILLING.baseFeeCents,
    perClientCents: AGENCY_BILLING.perClientCents,
    perCallCents: AGENCY_BILLING.perCallCents,
    ...summary,
  })
}
