/**
 * GET /api/cro9/sites/:id/tasks — list tasks for a site
 *
 * Query:
 *   ?status=pending|briefed|applied|measuring|improved|flat|regressed
 *   ?limit=20
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireSiteOwner } from '@/lib/cro9/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await requireSiteOwner(req, id)
  if (!r.ok) return r.response

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 50))

  const supabase = adminClient()
  let q = supabase
    .from('cro9_tasks')
    .select('*')
    .eq('site_id', id)
    .order('score', { ascending: false })
    .limit(limit)
  if (status) q = q.eq('status', status)
  const { data: tasks, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: tasks || [] })
}
