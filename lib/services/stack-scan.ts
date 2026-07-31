/**
 * Stack Scan service — shared fulfillment logic.
 * Processes a paid scan_orders row in batches using the real per-URL scanner.
 */
import { scanUrl } from '@/lib/scanner/detectors-server'

export const CONTACTS_PER_BLOCK = 1500
export const PRICE_PER_BLOCK_CENTS = 25000
export const INLINE_BATCH = 20 // scanned immediately on submit (instant feedback)
export const CRON_BATCH = 40 // scanned per cron tick until complete
export const SCAN_CONCURRENCY = 6

async function poolMap<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

export interface ScanOrderRow {
  id: string
  urls: string[]
  results: unknown[]
  scanned_count: number
}

/** Scan the next `batchSize` URLs of an order, persist results, advance status. */
export async function processOrderBatch(
  admin: { from: (t: string) => any },
  order: ScanOrderRow,
  batchSize: number,
): Promise<{ done: boolean; scanned: number; total: number }> {
  const urls = Array.isArray(order.urls) ? order.urls : []
  const start = order.scanned_count || 0
  const slice = urls.slice(start, start + batchSize)

  if (slice.length === 0) {
    await admin.from('scan_orders').update({ status: 'complete', updated_at: new Date().toISOString() }).eq('id', order.id)
    return { done: true, scanned: 0, total: urls.length }
  }

  const fresh = await poolMap(slice, SCAN_CONCURRENCY, async (u) => {
    try {
      return await scanUrl(u)
    } catch (e) {
      return { url: u, error: e instanceof Error ? e.message : 'scan failed' }
    }
  })

  const newResults = [...(Array.isArray(order.results) ? order.results : []), ...fresh]
  const newCount = start + slice.length
  const done = newCount >= urls.length

  await admin
    .from('scan_orders')
    .update({
      results: newResults,
      scanned_count: newCount,
      status: done ? 'complete' : 'scanning',
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  return { done, scanned: slice.length, total: urls.length }
}
