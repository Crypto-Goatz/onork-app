/**
 * GET  /api/sxo-indexer/customers   - get current user's record (auto-creates on first call)
 * POST /api/sxo-indexer/customers   - upsert (alert_email, plan_tier)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getAdmin, generateIndexNowKey, PLAN_LIMITS } from '@/lib/sxo-indexer'

export const dynamic = 'force-dynamic'

async function getUser() {
  const server = await createServerClient()
  const { data: { user } } = await server.auth.getUser()
  return user
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = getAdmin()
  let { data: customer } = await admin
    .from('sxo_indexer_customers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!customer) {
    const key = generateIndexNowKey()
    const limits = PLAN_LIMITS.free
    const { data, error } = await admin
      .from('sxo_indexer_customers')
      .insert({
        user_id: user.id,
        plan_tier: 'free',
        indexnow_key: key,
        daily_url_cap: limits.daily_url_cap,
        domain_cap: limits.domain_cap,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    customer = data
  }

  const { data: domains } = await admin
    .from('sxo_indexer_domains')
    .select('*')
    .eq('customer_id', customer!.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ customer, domains: domains || [] })
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const admin = getAdmin()

  const update: Record<string, unknown> = {}
  if (typeof body.alert_email === 'string') update.alert_email = body.alert_email || null
  if (typeof body.plan_tier === 'string' && PLAN_LIMITS[body.plan_tier]) {
    update.plan_tier = body.plan_tier
    update.daily_url_cap = PLAN_LIMITS[body.plan_tier].daily_url_cap
    update.domain_cap = PLAN_LIMITS[body.plan_tier].domain_cap
  }

  const { data, error } = await admin
    .from('sxo_indexer_customers')
    .update(update)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ customer: data })
}
