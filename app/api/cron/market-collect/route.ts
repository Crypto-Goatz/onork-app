/**
 * GET /api/cron/market-collect — runs every 6 hours.
 * Pulls freelance listings from Upwork RSS, Reddit r/forhire + r/freelance,
 * HackerNews Who is Hiring, and stub sources, into market_listings.
 */

import { NextRequest, NextResponse } from 'next/server'
import { collectAll } from '@/lib/market-intel/collectors'

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
  const results = await collectAll()
  const totals = results.reduce(
    (acc, r) => ({ collected: acc.collected + r.collected, inserted: acc.inserted + r.inserted }),
    { collected: 0, inserted: 0 }
  )

  return NextResponse.json({
    ok: true,
    duration_ms: Date.now() - startedAt,
    totals,
    results,
  })
}
