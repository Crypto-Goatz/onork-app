/**
 * POST /api/market-intel/generate-matches
 *
 * Re-runs the AI matching engine for the authenticated user against the
 * latest market_skills aggregates. Returns the result envelope.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMatches } from '@/lib/market-intel/matcher'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const startedAt = Date.now()
  const result = await generateMatches(user.id)

  return NextResponse.json({
    ok: result.errors.length === 0,
    duration_ms: Date.now() - startedAt,
    ...result,
  })
}
