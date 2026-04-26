/**
 * /api/market-intel/matches
 *
 * GET    ?type=&status=&limit=  — list user's matches sorted by overall_score desc
 * PATCH  { id, status }          — update a match's status (viewed/saved/dismissed/acted_on)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const VALID_TYPES = new Set(['opportunity', 'trending', 'build_suggestion', 'skill_gap'])
const VALID_STATUS = new Set(['new', 'viewed', 'saved', 'dismissed', 'acted_on'])

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const type = url.searchParams.get('type')
  const status = url.searchParams.get('status')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200)

  let query = admin
    .from('market_matches')
    .select('*')
    .eq('user_id', user.id)
    .order('overall_score', { ascending: false })
    .limit(limit)

  if (type && VALID_TYPES.has(type)) query = query.eq('match_type', type)
  if (status && VALID_STATUS.has(status)) query = query.eq('status', status)
  else if (!status) query = query.neq('status', 'dismissed')

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Counts by type for filter UI
  const { data: allMatches } = await admin
    .from('market_matches')
    .select('match_type, status')
    .eq('user_id', user.id)
    .neq('status', 'dismissed')

  const counts = { opportunity: 0, trending: 0, build_suggestion: 0, skill_gap: 0, total: 0 }
  for (const m of (allMatches || [])) {
    counts.total++
    if (m.match_type in counts) counts[m.match_type as keyof typeof counts]++
  }

  return NextResponse.json({ matches: data || [], counts })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { id?: string; status?: string }
  if (!body.id || !body.status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 })
  }
  if (!VALID_STATUS.has(body.status)) {
    return NextResponse.json({ error: 'invalid status', allowed: Array.from(VALID_STATUS) }, { status: 400 })
  }

  const { data, error } = await admin
    .from('market_matches')
    .update({ status: body.status })
    .eq('id', body.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, match: data })
}
