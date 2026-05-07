/**
 * GET    /api/service-packager/portfolio              — current user's portfolio items
 * POST   /api/service-packager/portfolio              — create from a package_id
 *                                                       body: { package_id, sort_order? }
 * PATCH  /api/service-packager/portfolio?id=…         — update fields (title, published, etc.)
 * DELETE /api/service-packager/portfolio?id=…         — remove
 *
 * Auth: Supabase session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { PortfolioItem } from '@/lib/service-packager/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PATCHABLE = new Set([
  'title',
  'description',
  'category',
  'tags',
  'cover_image',
  'gallery_images',
  'price_display',
  'delivery_display',
  'features',
  'case_study',
  'published',
  'sort_order',
])

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const onlyPublished = new URL(req.url).searchParams.get('published') === 'true'
  let q = supabase
    .from('portfolio_items')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (onlyPublished) q = q.eq('published', true)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { package_id?: string; sort_order?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.package_id) {
    return NextResponse.json({ error: 'package_id required' }, { status: 400 })
  }

  const { data: pkg, error: pkgErr } = await supabase
    .from('service_packages')
    .select('id, user_id, service_name, category, portfolio_item, images, price_anchor_cents, delivery_time, fiverr_gig')
    .eq('id', body.package_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (pkgErr) return NextResponse.json({ error: pkgErr.message }, { status: 500 })
  if (!pkg) return NextResponse.json({ error: 'package not found' }, { status: 404 })

  const item = (pkg.portfolio_item ?? null) as PortfolioItem | null
  if (!item) {
    return NextResponse.json({ error: 'package has no portfolio_item — regenerate first' }, { status: 409 })
  }

  const insertRow = {
    user_id: user.id,
    package_id: pkg.id,
    title: item.title || pkg.service_name,
    description: item.description || '',
    category: pkg.category || 'general',
    tags: item.tags ?? [],
    cover_image: item.cover_image?.url || (Array.isArray(pkg.images) ? pkg.images[0] : null) || null,
    gallery_images: Array.isArray(pkg.images) ? pkg.images.slice(0, 6) : [],
    price_display: item.pricing_display || (pkg.price_anchor_cents ? `$${(pkg.price_anchor_cents / 100).toFixed(2)}` : null),
    delivery_display: item.delivery_display || pkg.delivery_time || null,
    features: item.features ?? [],
    case_study: item.case_study_hook || null,
    published: false,
    sort_order: body.sort_order ?? 0,
  }

  const { data, error } = await supabase
    .from('portfolio_items')
    .insert(insertRow)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (PATCHABLE.has(k)) update[k] = v
  }
  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'no patchable fields provided' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('portfolio_items')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('portfolio_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
