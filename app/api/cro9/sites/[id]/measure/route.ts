/**
 * POST /api/cro9/sites/:id/measure — run measurement for this site now.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSiteOwner } from '@/lib/cro9/auth'
import { runMeasurement, type Site } from '@/lib/cro9/engine'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await requireSiteOwner(req, id)
  if (!r.ok) return r.response
  const result = await runMeasurement(r.site as unknown as Site)
  return NextResponse.json({ ok: true, result })
}
