import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('user_id') || req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const supabase = getSupabase()

  const { data: apps } = await supabase
    .from('marketplace_apps')
    .select('id, slug, name, status, review_status, installs, active_installs, avg_rating, review_count, price_cents, created_at, updated_at')
    .eq('vendor_id', userId)
    .order('created_at', { ascending: false })

  const { data: orders } = await supabase
    .from('ucp_orders')
    .select('id, amount_cents, vendor_payout_cents, vendor_payout_status, status, created_at, fulfilled_at')
    .eq('vendor_id', userId)
    .eq('status', 'fulfilled')
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: payouts } = await supabase
    .from('vendor_payouts')
    .select('id, amount_cents, stripe_transfer_id, status, created_at')
    .eq('vendor_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  const totalRevenue = (orders || []).reduce((sum, o) => sum + (o.amount_cents || 0), 0)
  const totalPayouts = (payouts || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0)
  const totalSales = (orders || []).length
  const totalInstalls = (apps || []).reduce((sum, a) => sum + (a.installs || 0), 0)

  return NextResponse.json({
    summary: {
      total_revenue_cents: totalRevenue,
      total_payouts_cents: totalPayouts,
      pending_payouts_cents: Math.max(0, totalRevenue * 0.7 - totalPayouts),
      total_sales: totalSales,
      total_installs: totalInstalls,
      app_count: apps?.length || 0,
    },
    apps: apps || [],
    recent_orders: orders || [],
    payouts: payouts || [],
  })
}
