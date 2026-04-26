/**
 * GET /api/cron/market-match — runs daily after aggregation.
 * Re-generates matches for every user with at least one linked market_profile.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateMatches } from '@/lib/market-intel/matcher'

export const runtime = 'nodejs'
export const maxDuration = 300

function isAuthed(req: NextRequest): boolean {
  if (req.headers.get('x-vercel-cron') === '1') return true
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const startedAt = Date.now()
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data, error } = await sb
    .from('market_profiles')
    .select('user_id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = Array.from(new Set((data || []).map(r => r.user_id).filter(Boolean)))

  const results: Array<{ user_id: string; generated: number; errors: string[] }> = []
  for (const userId of userIds) {
    try {
      const r = await generateMatches(userId)
      results.push({ user_id: userId, generated: r.generated, errors: r.errors })
    } catch (e) {
      results.push({ user_id: userId, generated: 0, errors: [e instanceof Error ? e.message : String(e)] })
    }
  }

  // Cleanup: drop expired matches that were never engaged with
  await sb
    .from('market_matches')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .in('status', ['new', 'viewed'])

  return NextResponse.json({
    ok: true,
    duration_ms: Date.now() - startedAt,
    users_processed: userIds.length,
    total_generated: results.reduce((s, r) => s + r.generated, 0),
    results,
  })
}
