/**
 * POST /api/cro9/sites/:id/analyze — trigger a one-off analysis run.
 *
 * Body: { max_pages?: 10, briefs?: true }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSiteOwner } from '@/lib/cro9/auth'
import { runAnalysis, type Site } from '@/lib/cro9/engine'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await requireSiteOwner(req, id)
  if (!r.ok) return r.response

  const body = await req.json().catch(() => ({}))
  const maxPages = Math.max(1, Math.min(50, Number(body?.max_pages) || 15))
  const briefs = body?.briefs !== false

  const result = await runAnalysis(r.site as unknown as Site, { maxPages, generateBriefs: briefs })
  return NextResponse.json({ ok: true, result })
}
