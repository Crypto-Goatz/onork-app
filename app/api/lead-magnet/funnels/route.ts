/**
 * GET  /api/lead-magnet/funnels        — list owner's funnels (with subscriber + selection counts)
 * POST /api/lead-magnet/funnels        — create a funnel (slug auto-derived from name)
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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

export async function GET() {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = admin()
  const { data: funnels } = await sb
    .from('funnel_config')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!funnels) return NextResponse.json({ funnels: [] })

  // Pull subscriber + recommendation counts per funnel
  const funnelIds = funnels.map((f) => f.funnel_id)
  const [subs, recs] = await Promise.all([
    sb
      .from('lead_subscribers')
      .select('funnel_id, status')
      .in('funnel_id', funnelIds),
    sb
      .from('recommendations')
      .select('funnel_id')
      .in('funnel_id', funnelIds)
      .eq('is_active', true),
  ])

  type SubRow = { funnel_id: string; status: string }
  type RecRow = { funnel_id: string }
  const counts = new Map<string, { total: number; verified: number; subscribed: number; recCount: number }>()
  for (const s of (subs.data ?? []) as SubRow[]) {
    const c = counts.get(s.funnel_id) ?? { total: 0, verified: 0, subscribed: 0, recCount: 0 }
    c.total++
    if (s.status === 'verified' || s.status === 'delivered') c.verified++
    counts.set(s.funnel_id, c)
  }
  for (const r of (recs.data ?? []) as RecRow[]) {
    const c = counts.get(r.funnel_id) ?? { total: 0, verified: 0, subscribed: 0, recCount: 0 }
    c.recCount++
    counts.set(r.funnel_id, c)
  }

  return NextResponse.json({
    funnels: funnels.map((f) => ({
      ...f,
      stats: counts.get(f.funnel_id) ?? { total: 0, verified: 0, subscribed: 0, recCount: 0 },
    })),
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { funnel_name?: string; funnel_id?: string; offer_title?: string; offer_description?: string; offer_file_url?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.funnel_name || !body.offer_title) {
    return NextResponse.json({ error: 'funnel_name and offer_title required' }, { status: 400 })
  }

  const funnelId = body.funnel_id?.trim() || slugify(body.funnel_name) || `funnel-${Date.now()}`

  const sb = admin()
  const { data, error } = await sb
    .from('funnel_config')
    .insert({
      user_id: user.id,
      funnel_id: funnelId,
      funnel_name: body.funnel_name,
      offer_title: body.offer_title,
      offer_description: body.offer_description ?? null,
      offer_file_url: body.offer_file_url ?? null,
      post_subscribe_redirect: 'https://0ncore.com/builtwith',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A funnel with that slug already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ funnel: data })
}
