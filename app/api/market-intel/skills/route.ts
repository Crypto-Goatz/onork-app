/**
 * GET /api/market-intel/skills
 *
 * Query params:
 *   sort        — column name (default: listings_30d)
 *   dir         — asc | desc (default: desc)
 *   category    — filter by category
 *   trend       — filter by trend (hot | up | flat | down)
 *   competition — filter by competition (Low | Medium | High | Very High)
 *   search      — substring match on skill or category
 *   limit       — default 200, max 500
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const ALLOWED_SORT = new Set([
  'skill',
  'category',
  'avg_budget',
  'avg_sold',
  'listings_30d',
  'listings_7d',
  'growth_pct',
  'saturation_score',
  'updated_at',
])

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const sort = searchParams.get('sort') || 'listings_30d'
  const dir = (searchParams.get('dir') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc'
  const category = searchParams.get('category')
  const trend = searchParams.get('trend')
  const competition = searchParams.get('competition')
  const search = searchParams.get('search')
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '200', 10) || 200))

  const sortCol = ALLOWED_SORT.has(sort) ? sort : 'listings_30d'

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })

  let query = sb
    .from('market_skills')
    .select('*')
    .order(sortCol, { ascending: dir === 'asc' })
    .limit(limit)

  if (category) query = query.eq('category', category)
  if (trend) query = query.eq('trend', trend)
  if (competition) query = query.eq('competition', competition)
  if (search) query = query.or(`skill.ilike.%${search}%,category.ilike.%${search}%`)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    count: data?.length || 0,
    skills: data || [],
  })
}
