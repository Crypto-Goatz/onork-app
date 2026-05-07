/**
 * GET    /api/lead-magnet/funnels/[funnelId]  — funnel + recommendations
 * PUT    /api/lead-magnet/funnels/[funnelId]  — update funnel config
 * DELETE /api/lead-magnet/funnels/[funnelId]  — soft-delete (is_active=false)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const EDITABLE_FIELDS = new Set([
  'funnel_name',
  'offer_title',
  'offer_description',
  'offer_file_url',
  'confirmation_heading',
  'confirmation_subtext',
  'from_name',
  'from_email',
  'reply_to',
  'modal_theme',
  'max_recommendation_slots',
  'post_subscribe_redirect',
  'crm_pipeline_id',
  'crm_verified_tag',
  'crm_delivered_tag',
  'is_active',
])

async function ownerCheck(funnelId: string, userId: string): Promise<boolean> {
  const { data } = await admin()
    .from('funnel_config')
    .select('id')
    .eq('funnel_id', funnelId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ funnelId: string }> }
) {
  const { funnelId } = await params
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await ownerCheck(funnelId, user.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const sb = admin()
  const [funnel, recs] = await Promise.all([
    sb.from('funnel_config').select('*').eq('funnel_id', funnelId).maybeSingle(),
    sb.from('recommendations').select('*').eq('funnel_id', funnelId).order('slot_order'),
  ])

  return NextResponse.json({ funnel: funnel.data, recommendations: recs.data ?? [] })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ funnelId: string }> }
) {
  const { funnelId } = await params
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await ownerCheck(funnelId, user.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of Object.keys(body)) {
    if (EDITABLE_FIELDS.has(k)) update[k] = body[k]
  }

  const { data, error } = await admin()
    .from('funnel_config')
    .update(update)
    .eq('funnel_id', funnelId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ funnel: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ funnelId: string }> }
) {
  const { funnelId } = await params
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await ownerCheck(funnelId, user.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await admin()
    .from('funnel_config')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('funnel_id', funnelId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
