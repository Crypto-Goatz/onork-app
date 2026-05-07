/**
 * POST   /api/lead-magnet/funnels/[funnelId]/recommendations — add a rec
 * PUT    /api/lead-magnet/funnels/[funnelId]/recommendations — bulk replace
 *
 * Bulk replace pattern: client sends the full ordered list, we wipe + re-insert.
 * Cleanest UX for the dashboard editor.
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

async function ownerCheck(funnelId: string, userId: string): Promise<boolean> {
  const { data } = await admin()
    .from('funnel_config')
    .select('id')
    .eq('funnel_id', funnelId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

interface RecInput {
  name: string
  byline?: string | null
  bio?: string | null
  image_url?: string | null
  profile_url?: string | null
  cta_label?: string
  offer_type?: string
  crm_tag?: string | null
  crm_workflow_id?: string | null
  is_sponsored?: boolean
  is_active?: boolean
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

  let body: { recommendations?: RecInput[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const recs = body.recommendations ?? []

  const sb = admin()

  // Wipe current
  await sb.from('recommendations').delete().eq('funnel_id', funnelId)

  // Insert ordered
  if (recs.length > 0) {
    const rows = recs.map((r, i) => ({
      funnel_id: funnelId,
      slot_order: i + 1,
      name: r.name,
      byline: r.byline ?? null,
      bio: r.bio ?? null,
      image_url: r.image_url ?? null,
      profile_url: r.profile_url ?? null,
      cta_label: r.cta_label ?? 'Subscribe',
      offer_type: r.offer_type ?? 'newsletter',
      crm_tag: r.crm_tag ?? null,
      crm_workflow_id: r.crm_workflow_id ?? null,
      is_sponsored: r.is_sponsored ?? false,
      is_active: r.is_active ?? true,
    }))
    const { error } = await sb.from('recommendations').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: updated } = await sb
    .from('recommendations')
    .select('*')
    .eq('funnel_id', funnelId)
    .order('slot_order')

  return NextResponse.json({ recommendations: updated ?? [] })
}
