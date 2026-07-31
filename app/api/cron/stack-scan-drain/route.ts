/**
 * GET /api/cron/stack-scan-drain
 * Drains in-progress scan_orders one batch at a time until complete.
 * Protected by CRON_SECRET (Vercel cron sends it as a bearer token).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { CRON_BATCH, processOrderBatch } from '@/lib/services/stack-scan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${secret}` && req.nextUrl.searchParams.get('secret') !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const db = createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )

  // Process up to a few orders per tick (each one batch) to stay within maxDuration.
  const { data: orders } = await db
    .from('scan_orders')
    .select('id,urls,results,scanned_count')
    .eq('status', 'scanning')
    .order('updated_at', { ascending: true })
    .limit(3)

  if (!orders || orders.length === 0) return NextResponse.json({ ok: true, drained: 0 })

  const summary: Array<{ id: string; scanned: number; total: number; done: boolean }> = []
  for (const o of orders) {
    const p = await processOrderBatch(db as any, o as any, CRON_BATCH)
    summary.push({ id: o.id, scanned: p.scanned, total: p.total, done: p.done })
  }
  return NextResponse.json({ ok: true, drained: summary.length, summary })
}
