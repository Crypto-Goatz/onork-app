/**
 * Cron tick — every 5 minutes (registered in vercel.json)
 *
 * Picks up to N domains where verified = true AND next_run_at < now()
 * and runs a submission for each. After a successful run, next_run_at
 * is reset to +24h. On failure, retried in 1 hour.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, runDomainSubmission } from '@/lib/sxo-indexer'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BATCH_SIZE = 25

export async function GET(req: NextRequest) {
  // Auth: Vercel cron header OR Bearer CRON_SECRET
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  const auth = req.headers.get('authorization') || ''
  const isCronSecret = !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`
  const isManual = req.url.includes('manual=1')
  if (!isVercelCron && !isCronSecret && !isManual) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdmin()
  const now = new Date().toISOString()

  const { data: due } = await admin
    .from('sxo_indexer_domains')
    .select('id')
    .eq('verified', true)
    .eq('status', 'verified')
    .lt('next_run_at', now)
    .limit(BATCH_SIZE)

  const ids = (due || []).map(d => d.id)
  const results: Record<string, unknown>[] = []

  for (const id of ids) {
    try {
      const r = await runDomainSubmission(id)
      results.push({ domain_id: id, ...r })
    } catch (err) {
      results.push({
        domain_id: id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return NextResponse.json({
    tick_at: now,
    domains_processed: ids.length,
    results,
  })
}
