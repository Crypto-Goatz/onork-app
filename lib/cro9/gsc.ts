/**
 * Google Search Console data pull for CRO9.
 *
 * Two modes:
 *   - `fetchByPage`   → one row per page (top N by impressions)
 *   - `fetchByQuery`  → one row per (page, query) pair (for keyword mapping)
 *
 * Uses the existing service-account webmasters client from lib/google/auth.ts.
 * For user-delegated OAuth we'd pull the token via crm-oauth — deferred.
 */

import { getWebmastersClient } from '@/lib/google/auth'
import type { GscPageRow } from './types'

interface FetchOpts {
  siteUrl: string                 // gsc_property (e.g. "sc-domain:example.com")
  startDate?: string              // YYYY-MM-DD
  endDate?: string                // YYYY-MM-DD
  rowLimit?: number
}

function dateDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
}

export async function fetchByPage(opts: FetchOpts): Promise<GscPageRow[]> {
  const webmasters = getWebmastersClient()
  const start = opts.startDate || dateDaysAgo(28)
  const end = opts.endDate || dateDaysAgo(1)
  const r = await webmasters.searchanalytics.query({
    siteUrl: opts.siteUrl,
    requestBody: {
      startDate: start,
      endDate: end,
      dimensions: ['page'],
      rowLimit: opts.rowLimit || 250,
    },
  })
  return (r.data.rows || []).map((row) => ({
    url: row.keys?.[0] || '',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  })).filter((r) => r.url)
}

export async function fetchByPageQuery(opts: FetchOpts): Promise<GscPageRow[]> {
  const webmasters = getWebmastersClient()
  const start = opts.startDate || dateDaysAgo(28)
  const end = opts.endDate || dateDaysAgo(1)
  const r = await webmasters.searchanalytics.query({
    siteUrl: opts.siteUrl,
    requestBody: {
      startDate: start,
      endDate: end,
      dimensions: ['page', 'query'],
      rowLimit: opts.rowLimit || 1000,
    },
  })
  return (r.data.rows || []).map((row) => ({
    url: row.keys?.[0] || '',
    query: row.keys?.[1] || '',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  })).filter((r) => r.url)
}

/**
 * For each page, pick its primary keyword (highest impressions) and its
 * secondary keywords (top 5 by impressions). Returns a map keyed by url.
 */
export function primaryKeywordPerPage(rows: GscPageRow[]): Map<string, { primary: string; secondary: string[] }> {
  const perPage = new Map<string, GscPageRow[]>()
  for (const r of rows) {
    if (!r.query) continue
    if (!perPage.has(r.url)) perPage.set(r.url, [])
    perPage.get(r.url)!.push(r)
  }
  const out = new Map<string, { primary: string; secondary: string[] }>()
  for (const [url, arr] of perPage.entries()) {
    arr.sort((a, b) => b.impressions - a.impressions)
    const primary = arr[0]?.query || ''
    const secondary = arr.slice(1, 6).map((r) => r.query || '').filter(Boolean)
    out.set(url, { primary, secondary })
  }
  return out
}
