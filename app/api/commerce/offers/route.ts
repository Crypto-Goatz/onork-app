/**
 * GET /api/commerce/offers
 *
 * Lists available digital products (downloads, addons, plans) from
 * ucp_products. Public (anyone authed) — gated client-side per plan.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PUBLIC_FIELDS =
  'id, name, slug, description, category, tags, price_cents, price_type, currency, fulfillment_type, icon, cover_image, featured'

export async function GET(req: NextRequest) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const category = req.nextUrl.searchParams.get('category')
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20'), 100)

  let q = sb
    .from('ucp_products')
    .select(PUBLIC_FIELDS)
    .eq('status', 'active')
    .order('featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .limit(limit)

  if (category) q = q.eq('category', category)

  const { data, error } = await q

  if (error) {
    console.error('[commerce/offers]', error)
    return NextResponse.json({ offers: [] }, { status: 200 })
  }

  return NextResponse.json({ offers: data ?? [] })
}
