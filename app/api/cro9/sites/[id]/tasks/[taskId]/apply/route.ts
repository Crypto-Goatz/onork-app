/**
 * POST /api/cro9/sites/:id/tasks/:taskId/apply — mark a task as applied.
 *
 * For apply_mode='briefs_only' this is a manual flag. The engine will
 * pick the task up in the next measurement window.
 *
 * Body (optional): { rewrites: [{ field, rewritten_value }] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireSiteOwner } from '@/lib/cro9/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id, taskId } = await params
  const r = await requireSiteOwner(req, id)
  if (!r.ok) return r.response

  const supabase = adminClient()
  const { data: task } = await supabase
    .from('cro9_tasks')
    .select('id, site_id, url, status, baseline_metrics, clicks, impressions, position, ctr')
    .eq('id', taskId)
    .eq('site_id', id)
    .maybeSingle()
  if (!task) return NextResponse.json({ error: 'task_not_found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const rewrites: Array<{ field: string; original_value?: string; rewritten_value: string }> = Array.isArray(body?.rewrites) ? body.rewrites : []

  const appliedAt = new Date().toISOString()
  await supabase.from('cro9_tasks').update({
    status: 'measuring',
    applied_at: appliedAt,
    baseline_metrics: task.baseline_metrics || {
      clicks: task.clicks, impressions: task.impressions, position: task.position, ctr: task.ctr,
    },
  }).eq('id', taskId)

  if (rewrites.length > 0) {
    await supabase.from('cro9_rewrites').insert(rewrites.map((rw) => ({
      task_id: taskId,
      site_id: id,
      field: ['title', 'meta', 'h1', 'intro', 'schema', 'alt', 'internal_links', 'full_rewrite'].includes(rw.field) ? rw.field : 'full_rewrite',
      original_value: rw.original_value || null,
      rewritten_value: String(rw.rewritten_value || '').slice(0, 20000),
      applied_at: appliedAt,
      applied_by: r.user.id,
    })))
  }

  await supabase.from('cro9_action_history').insert({
    site_id: id,
    task_id: taskId,
    action_type: rewrites.length > 0 ? 'apply_auto' : 'apply_manual',
    payload: { rewrite_fields: rewrites.map((r) => r.field) },
    outcome: { applied_at: appliedAt, next_measure_in_days: 14 },
  })

  return NextResponse.json({ ok: true, appliedAt })
}
