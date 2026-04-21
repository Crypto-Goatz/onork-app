/**
 * GET /api/cro9/sites/:id/history — action log, newest first
 *
 * ?limit=50 (max 200)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireSiteOwner } from '@/lib/cro9/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await requireSiteOwner(req, id)
  if (!r.ok) return r.response

  const url = new URL(req.url)
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit')) || 50))

  const supabase = adminClient()
  const { data: entries } = await supabase
    .from('cro9_action_history')
    .select('id, task_id, action_type, payload, outcome, created_at')
    .eq('site_id', id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return NextResponse.json({ entries: entries || [] })
}
