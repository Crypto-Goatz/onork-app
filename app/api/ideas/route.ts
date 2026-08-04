import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'

/**
 * GET /api/ideas — what the market is asking for, ranked by opportunity.
 *
 * OPPORTUNITY IS NOT THE SAME AS VOTES. A four-year-old request with 900 votes
 * is a known want the platform has chosen not to build; a request gaining 40
 * votes a week is a want that is becoming urgent. Both matter and they are
 * different decisions, so momentum is scored alongside size rather than folded
 * into one number that hides which is which.
 *
 * The run's health travels with the data. A stale or failed collection has to be
 * visible on the same screen as the numbers — otherwise yesterday's snapshot
 * reads as today's market.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const board = req.nextUrl.searchParams.get('board')

  let q = sb.from('idea_posts')
    .select('board, slug, title, url, score, prev_score, first_score, first_seen, last_seen')
    .order('score', { ascending: false })
    .limit(400)
  if (board) q = q.eq('board', board)

  const [{ data: posts }, { data: runs }] = await Promise.all([
    q,
    sb.from('idea_runs').select('started_at, finished_at, boards_ok, boards_failed, posts_seen, posts_new, error').order('started_at', { ascending: false }).limit(1),
  ])

  const rows = posts ?? []
  const lastRun = runs?.[0] ?? null

  const scored = rows.map((p) => {
    const gain = Math.max(0, (p.score ?? 0) - (p.prev_score ?? p.score ?? 0))
    return { ...p, gain }
  })

  const byBoard = new Map<string, { board: string; posts: number; totalScore: number; top: string }>()
  for (const p of scored) {
    const b = byBoard.get(p.board) ?? { board: p.board, posts: 0, totalScore: 0, top: p.title }
    b.posts += 1
    b.totalScore += p.score ?? 0
    byBoard.set(p.board, b)
  }

  return NextResponse.json({
    ok: true,
    // Biggest wants overall.
    loudest: scored.slice(0, 25),
    // Moving fastest since the last collection — the "becoming urgent" list.
    rising: [...scored].filter((p) => p.gain > 0).sort((a, b) => b.gain - a.gain).slice(0, 15),
    // Where demand is concentrated, which is where a product line lives.
    boards: [...byBoard.values()].sort((a, b) => b.totalScore - a.totalScore).slice(0, 20),
    total: rows.length,
    lastRun,
    // Said plainly so nobody reads a stale table as current.
    stale: lastRun?.started_at ? (Date.now() - new Date(lastRun.started_at).getTime()) > 20 * 3600_000 : true,
  })
}
