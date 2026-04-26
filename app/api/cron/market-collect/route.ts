/**
 * Market Intel — Collector Cron
 * GET /api/cron/market-collect
 * Schedule: every 6 hours (0 *\/6 * * *)
 *
 * Auth: CRON_SECRET via x-cron-secret header, secret query param,
 * or Vercel's Authorization: Bearer header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { collectAll } from '@/lib/market-intel/collectors'

export const maxDuration = 300

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const fromHeader = req.headers.get('x-cron-secret')
  const fromBearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null
  const fromQuery = req.nextUrl.searchParams.get('secret')
  return [fromHeader, fromBearer, fromQuery].some((v) => v === expected)
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const start = Date.now()
  try {
    const results = await collectAll()
    const totals = results.reduce(
      (acc, r) => ({
        fetched: acc.fetched + r.fetched,
        inserted: acc.inserted + r.inserted,
        skipped: acc.skipped + r.skipped,
      }),
      { fetched: 0, inserted: 0, skipped: 0 }
    )
    return NextResponse.json({
      ok: true,
      duration_ms: Date.now() - start,
      totals,
      platforms: results,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[market-collect cron] failed', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
