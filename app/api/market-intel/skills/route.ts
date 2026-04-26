/**
 * GET /api/market-intel/skills
 *
 * Query params:
 *   sort      — listing_count_7d (default), avg_budget, growth_pct, saturation_score, skill
 *   dir       — desc (default) | asc
 *   category  — filter by category (e.g. "ai", "development")
 *   trend     — hot | up | flat | down
 *   q         — substring search on skill
 *   limit     — default 100, max 500
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const SORTABLE = new Set(['listing_count_7d', 'listing_count_30d', 'avg_budget', 'growth_pct', 'saturation_score', 'skill', 'updated_at'])

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const sort = url.searchParams.get('sort') || 'listing_count_7d'
  const dir = url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc'
  const category = url.searchParams.get('category')
  const trend = url.searchParams.get('trend')
  const q = url.searchParams.get('q')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 500)

  if (!SORTABLE.has(sort)) {
    return NextResponse.json({ error: 'invalid_sort', allowed: Array.from(SORTABLE) }, { status: 400 })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = sb
    .from('market_skills')
    .select('skill, category, avg_budget, median_budget, budget_min, budget_max, listing_count_7d, listing_count_30d, listing_count_90d, growth_pct, competition_level, saturation_score, trend, top_locations, top_platforms, related_skills, last_listing_at, updated_at')
    .order(sort, { ascending: dir === 'asc', nullsFirst: false })
    .limit(limit)

  if (category) query = query.eq('category', category)
  if (trend) query = query.eq('trend', trend)
  if (q) query = query.ilike('skill', `%${q}%`)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { count: total } = await sb.from('market_skills').select('id', { count: 'exact', head: true })

  return NextResponse.json({
    ok: true,
    total,
    count: data?.length || 0,
    skills: data || [],
  })
}
