/**
 * GET /api/notes/brain — returns the user's Notes brain content + stats
 *
 * This is what makes the self-learning visible. Show the user how the
 * system has learned them.
 */

import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { loadBrain, loadBrief, loadRecentOutcomes } from '@/lib/brain'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const APP_SLUG = 'notes'

export async function GET() {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [brain, brief, recent] = await Promise.all([
    loadBrain(user.id, APP_SLUG),
    loadBrief(APP_SLUG),
    loadRecentOutcomes(user.id, APP_SLUG, 25),
  ])

  const successRate = brain.outcomes_count > 0
    ? Math.round((brain.successes_count / brain.outcomes_count) * 100)
    : 0

  return NextResponse.json({
    brief: brief
      ? { display_name: brief.display_name, version: brief.version, tools: brief.tools }
      : null,
    brain: {
      content: brain.content,
      outcomes_count: brain.outcomes_count,
      successes_count: brain.successes_count,
      success_rate: successRate,
      last_updated_at: brain.last_updated_at,
    },
    recent,
  })
}
