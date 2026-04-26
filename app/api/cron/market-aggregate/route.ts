/**
 * Market Intel — Aggregator Cron
 * GET /api/cron/market-aggregate
 * Schedule: daily at 2am UTC (0 2 * * *)
 */

import { NextRequest, NextResponse } from 'next/server'
import { aggregate } from '@/lib/market-intel/aggregator'

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

  try {
    const result = await aggregate()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[market-aggregate cron] failed', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
