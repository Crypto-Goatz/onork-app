/**
 * GET /api/cron/market-aggregate — runs daily.
 * Aggregates raw market_listings into per-skill metrics (market_skills) and
 * daily time-series rows (market_trends). On Mondays, also runs the analyzer
 * to generate the weekly Groq snapshot.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runAggregator } from '@/lib/market-intel/aggregator'
import { runAnalyzer } from '@/lib/market-intel/analyzer'

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
  const url = new URL(req.url)
  const force = url.searchParams.get('analyze') === '1'

  const aggregate = await runAggregator()

  let analyze: { weekStart: string; totalListings: number; uniqueSkills: number; summary: string } | null = null
  const today = new Date().getUTCDay() // 1 = Monday
  if (today === 1 || force) {
    try {
      const r = await runAnalyzer()
      analyze = {
        weekStart: r.weekStart,
        totalListings: r.totalListings,
        uniqueSkills: r.uniqueSkills,
        summary: r.summary.slice(0, 500),
      }
    } catch (e) {
      analyze = { weekStart: '', totalListings: 0, uniqueSkills: 0, summary: `analyzer failed: ${e instanceof Error ? e.message : String(e)}` }
    }
  }

  return NextResponse.json({
    ok: true,
    duration_ms: Date.now() - startedAt,
    aggregate,
    analyze,
  })
}
