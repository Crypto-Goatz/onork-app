/**
 * GET /api/agency/billing-status — is this agency on 0nCORE billing + what it costs.
 *
 * Auth is the APP JWT (same as the whole dashboard) — companyId comes from the
 * signed token, never a Supabase cookie. Everything keys off companyId +
 * agency_billing, so it works however the agency signed in (GHL install boot,
 * standalone login, or the iframe SSO).
 */
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
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

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ authed: false, subscribed: false }, { status: 401 })
  const { companyId } = session.claims

  const sb = admin()

  // ADDED clients only — never the whole CRM roster.
  const { count } = await sb.from('agency_added_clients').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active')
  const clients = count ?? 0
  const summary = billingSummary(clients)

  // Founding + the stored Stripe customer, both keyed to the agency.
  const { data: bill } = await sb.from('agency_billing').select('is_founding, stripe_customer_id').eq('company_id', companyId).maybeSingle()
  let isFounding = true
  if (bill) isFounding = !!bill.is_founding
  else {
    const { count: n } = await sb.from('agency_billing').select('*', { count: 'exact', head: true })
    isFounding = (n ?? 0) < AGENCY_BILLING.foundingLimit
  }

  let subscribed = false
  if (bill?.stripe_customer_id) {
    try {
      const subs = await getStripe().subscriptions.list({ customer: bill.stripe_customer_id, status: 'active', limit: 20 })
      subscribed = subs.data.some((s) => s.items.data.some((i) => i.price?.id && OURS.has(i.price.id)))
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
