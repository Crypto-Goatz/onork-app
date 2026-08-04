import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { BOARDS, fetchBoard } from '@/lib/research/ideas'

/**
 * The demand radar collection run. Scheduled three times a day.
 *
 * TIME-BUDGETED, NOT ALL-OR-NOTHING. 83 boards will not always finish inside a
 * function's lifetime, so this works in small concurrent batches against a
 * deadline and records exactly which boards it reached. A partial run that says
 * so is useful; a run that dies at board 60 and leaves no trace looks identical
 * to a run that found nothing.
 *
 * A RUN THAT PARSES NOTHING IS A FAILURE, NOT AN EMPTY MARKET. The board is
 * scraped HTML, so a markup change silently yields zero posts — and zeroes on a
 * signal you make build decisions from are worse than no signal at all. Zero
 * across the board is recorded as an error.
 *
 * PREVIOUS SCORE IS CARRIED FORWARD so momentum is computable without a history
 * table: first_score answers "how big", prev_score answers "moving how fast".
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CONCURRENCY = 6
const DEADLINE_MS = 240_000

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

export async function GET(req: NextRequest) {
  // Vercel signs its cron calls; anything else needs the secret. Without this
  // the endpoint is a free way to make us scrape someone else's site on demand.
  const isVercelCron = req.headers.get('user-agent')?.includes('vercel-cron')
  const secret = req.nextUrl.searchParams.get('secret')
  if (!isVercelCron && secret !== (process.env.CRON_SECRET || '')) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 401 })
  }

  const sb = admin()
  const started = Date.now()
  const { data: run } = await sb.from('idea_runs').insert({}).select('id').single()

  const failed: string[] = []
  let ok = 0, seen = 0, fresh = 0

  const queue = [...BOARDS]
  while (queue.length && Date.now() - started < DEADLINE_MS) {
    const batch = queue.splice(0, CONCURRENCY)
    const results = await Promise.all(batch.map((b) => fetchBoard(b, 1)))

    for (let i = 0; i < batch.length; i++) {
      const board = batch[i]
      const { posts, error } = results[i]
      if (error || posts.length === 0) { failed.push(board); continue }
      ok += 1
      seen += posts.length

      for (const p of posts) {
        const { data: existing } = await sb
          .from('idea_posts')
          .select('id, score, last_seen')
          .eq('board', p.board).eq('slug', p.slug)
          .maybeSingle()

        if (existing) {
          await sb.from('idea_posts').update({
            title: p.title, score: p.score, url: p.url,
            prev_score: existing.score, prev_seen: existing.last_seen,
            last_seen: new Date().toISOString(),
          }).eq('id', existing.id)
        } else {
          fresh += 1
          await sb.from('idea_posts').insert({
            board: p.board, slug: p.slug, title: p.title, url: p.url,
            score: p.score, first_score: p.score, prev_score: p.score,
          })
        }
      }
    }
  }

  const everythingFailed = ok === 0
  await sb.from('idea_runs').update({
    finished_at: new Date().toISOString(),
    boards_ok: ok, boards_failed: failed.length,
    posts_seen: seen, posts_new: fresh,
    failed_boards: failed.slice(0, 40),
    error: everythingFailed ? 'every board returned nothing — the page markup has probably changed' : null,
  }).eq('id', run?.id ?? '')

  return NextResponse.json({
    ok: !everythingFailed,
    boardsOk: ok,
    boardsFailed: failed.length,
    remaining: queue.length,
    postsSeen: seen,
    postsNew: fresh,
    tookMs: Date.now() - started,
    ...(everythingFailed ? { error: 'Collection produced nothing — treat as broken, not as no demand.' } : {}),
  })
}
