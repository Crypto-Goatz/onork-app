/**
 * GET /api/market-intel/trends
 *
 * Query params:
 *   skill — filter to a specific skill (returns full history)
 *   weeks — number of weeks back (default 12)
 *   limit — default 500, max 5000 (only used when no skill filter)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const skill = searchParams.get('skill')
  const weeks = Math.min(52, Math.max(1, parseInt(searchParams.get('weeks') || '12', 10) || 12))
  const limit = Math.min(5000, Math.max(1, parseInt(searchParams.get('limit') || '500', 10) || 500))

  const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })

  let query = sb
    .from('market_trends')
    .select('skill, period_start, period_end, listing_count, avg_budget, avg_proposals')
    .gte('period_start', since)
    .order('period_start', { ascending: true })

  if (skill) {
    query = query.eq('skill', skill)
  } else {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    count: data?.length || 0,
    trends: data || [],
  })
}
