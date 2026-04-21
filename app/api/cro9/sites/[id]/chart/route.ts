/**
 * GET /api/cro9/sites/:id/chart — day-over-day growth series.
 *
 * Pulls 28 days of GSC dimension=date so the dashboard can draw the
 * "is this actually working" line.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSiteOwner } from '@/lib/cro9/auth'
import { getWebmastersClient } from '@/lib/google/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await requireSiteOwner(req, id)
  if (!r.ok) return r.response

  const site = r.site as { gsc_property?: string }
  if (!site.gsc_property) return NextResponse.json({ rows: [] })

  const end = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const start = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0]

  try {
    const webmasters = getWebmastersClient()
    const resp = await webmasters.searchanalytics.query({
      siteUrl: site.gsc_property,
      requestBody: { startDate: start, endDate: end, dimensions: ['date'], rowLimit: 200 },
    })
    const rows = (resp.data.rows || []).map((row) => ({
      date: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    })).filter((r) => r.date)
    return NextResponse.json({ rows })
  } catch (e) {
    return NextResponse.json({ rows: [], error: e instanceof Error ? e.message : 'gsc_error' })
  }
}
