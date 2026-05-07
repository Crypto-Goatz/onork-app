/**
 * GET    /api/service-packager/packages       — list current user's packages
 * DELETE /api/service-packager/packages?id=…  — delete a draft/generated package
 *
 * Auth: Supabase session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LIST_FIELDS = `
  id, source_type, source_url, source_prompt, source_mcp_server,
  service_name, service_description, category, primary_deliverable,
  delivery_time, price_anchor_cents, status, vpis_score, images,
  published_platforms, created_at, updated_at,
  fiverr_gig, portfolio_item
`

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const category = url.searchParams.get('category')
  const search = url.searchParams.get('q')?.trim()
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200)
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0)

  let q = supabase
    .from('service_packages')
    .select(LIST_FIELDS, { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) q = q.eq('status', status)
  if (category) q = q.eq('category', category)
  if (search) q = q.ilike('service_name', `%${search}%`)

  const { data, error, count } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    packages: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Block deleting published packages — must archive instead
  const { data: pkg } = await supabase
    .from('service_packages')
    .select('status')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!pkg) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (pkg.status === 'published') {
    return NextResponse.json(
      { error: 'cannot delete a published package — archive it instead' },
      { status: 409 }
    )
  }

  const { error } = await supabase
    .from('service_packages')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
