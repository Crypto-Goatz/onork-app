/**
 * GET    /api/cro9/sites/:id  — site detail + stats
 * PATCH  /api/cro9/sites/:id  — update settings (apply_mode, serpapi_key, paused/active)
 * DELETE /api/cro9/sites/:id  — remove a site (cascades tasks/history)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireSiteOwner } from '@/lib/cro9/auth'
import { encryptSecret, maskSecret, decryptSecret } from '@/lib/cro9/crypto'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await requireSiteOwner(req, id)
  if (!r.ok) return r.response
  const supabase = adminClient()

  const [tasks, history, weights] = await Promise.all([
    supabase.from('cro9_tasks').select('id, status').eq('site_id', id),
    supabase.from('cro9_action_history').select('id', { count: 'exact', head: true }).eq('site_id', id),
    supabase.from('cro9_adaptive_weights').select('*').eq('site_id', id),
  ])

  const t = tasks.data || []
  const stats = {
    tasksTotal: t.length,
    tasksPending: t.filter((x) => x.status === 'pending' || x.status === 'briefed').length,
    tasksApplied: t.filter((x) => x.status === 'applied' || x.status === 'measuring').length,
    tasksImproved: t.filter((x) => x.status === 'improved').length,
    historyCount: history.count || 0,
  }

  const site = r.site as Record<string, unknown> & { serpapi_key_encrypted?: string | null }
  const serpMask = maskSecret(decryptSecret(site.serpapi_key_encrypted || null))

  return NextResponse.json({
    site: { ...site, serpapi_key_encrypted: undefined, serpapi_key_masked: serpMask },
    stats,
    weights: weights.data || [],
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await requireSiteOwner(req, id)
  if (!r.ok) return r.response
  const supabase = adminClient()

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.apply_mode === 'string' && ['briefs_only', 'snippet', 'wordpress'].includes(body.apply_mode)) {
    patch.apply_mode = body.apply_mode
  }
  if (typeof body.status === 'string' && ['paused', 'active'].includes(body.status) && (r.entitlement.hasProductKey || r.site.status === 'trial')) {
    patch.status = body.status
  }
  if (typeof body.serpapi_key === 'string') {
    const clean = body.serpapi_key.trim()
    patch.serpapi_key_encrypted = clean ? encryptSecret(clean) : null
  }
  if (typeof body.gsc_property === 'string') patch.gsc_property = body.gsc_property.trim()
  if (typeof body.ga4_property_id === 'string') patch.ga4_property_id = body.ga4_property_id.trim()

  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
  }

  const { error } = await supabase.from('cro9_sites').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('cro9_action_history').insert({
    site_id: id,
    action_type: 'site_updated',
    payload: { fields: Object.keys(patch).filter((k) => k !== 'serpapi_key_encrypted' && k !== 'updated_at') },
    outcome: null,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await requireSiteOwner(req, id)
  if (!r.ok) return r.response
  const supabase = adminClient()

  const { error } = await supabase.from('cro9_sites').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
