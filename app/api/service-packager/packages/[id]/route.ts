/**
 * GET   /api/service-packager/packages/[id] — full package detail (all 8 outputs)
 * PATCH /api/service-packager/packages/[id] — update one or more output JSONB columns
 * POST  /api/service-packager/packages/[id] — body: { action: 'publish'|'archive' }
 *
 * Auth: Supabase session, user must own the row.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PATCHABLE_FIELDS = new Set([
  'fiverr_gig',
  'portfolio_item',
  'upwork_listing',
  'on_marketplace_app',
  'ucp_product',
  'crm_service',
  'landing_page',
  'social_posts',
  'service_name',
  'service_description',
  'target_audience',
  'primary_deliverable',
  'delivery_time',
  'price_anchor_cents',
  'category',
  'keywords',
  'images',
])

async function ownPackage(req: NextRequest, id: string) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return { error: 'Unauthorized', status: 401 as const, supabase: null, user: null }

  const { data, error } = await supabase
    .from('service_packages')
    .select('id, user_id, status')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return { error: 'not found', status: 404 as const, supabase, user }
  if (data.user_id !== user.id) return { error: 'forbidden', status: 403 as const, supabase, user }
  return { error: null, status: 200 as const, supabase, user, pkg: data }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('service_packages')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ package: data })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const auth = await ownPackage(req, id)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const [k, v] of Object.entries(body)) {
    if (PATCHABLE_FIELDS.has(k)) update[k] = v
  }
  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: 'no patchable fields provided' }, { status: 400 })
  }

  const { data, error } = await auth.supabase!
    .from('service_packages')
    .update(update)
    .eq('id', id)
    .eq('user_id', auth.user!.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ package: data })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const auth = await ownPackage(req, id)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: { action?: string; platform?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const action = body.action

  if (action === 'publish' || action === 'archive') {
    const newStatus = action === 'publish' ? 'published' : 'archived'

    const update: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    // Track which platform the user pushed to (Fiverr, Upwork, etc.)
    if (action === 'publish' && body.platform) {
      // Append platform to published_platforms (fetched first to avoid array RPC)
      const { data: cur } = await auth.supabase!
        .from('service_packages')
        .select('published_platforms')
        .eq('id', id)
        .single()
      const list = new Set<string>(cur?.published_platforms ?? [])
      list.add(body.platform)
      update.published_platforms = Array.from(list)
    }

    const { data, error } = await auth.supabase!
      .from('service_packages')
      .update(update)
      .eq('id', id)
      .eq('user_id', auth.user!.id)
      .select('id, status, published_platforms')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, package: data })
  }

  return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 })
}
