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
  const url = new URL(req.url)
  const category = url.searchParams.get('category')
  const search = url.searchParams.get('q')
  const sort = url.searchParams.get('sort') || 'installs'
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)

  const supabase = getSupabase()

  let query = supabase
    .from('marketplace_apps')
    .select('id, slug, name, description, category, tags, version, vendor_name, vendor_verified, icon, screenshots, price_cents, price_type, installs, active_installs, avg_rating, review_count, required_plan, required_services')
    .eq('status', 'active')
    .limit(limit)

  if (category) query = query.eq('category', category)
  if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)

  const sortMap: Record<string, [string, boolean]> = {
    installs: ['installs', false],
    rating: ['avg_rating', false],
    price_low: ['price_cents', true],
    price_high: ['price_cents', false],
    newest: ['created_at', false],
  }
  const [col, asc] = sortMap[sort] || sortMap.installs
  query = query.order(col, { ascending: asc, nullsFirst: false })

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    apps: data || [],
    count: data?.length || 0,
  })
}
