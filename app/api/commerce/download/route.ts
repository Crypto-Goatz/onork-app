/**
 * GET /api/commerce/download?slug=<product-slug>
 *
 * Verifies the requesting user has a completed store_purchases row for the
 * named product, then returns the download URL stored in app_config.
 *
 * For digital downloads, ucp_products.app_config.download_url holds the
 * file location (could be a Supabase storage signed-url request or a
 * direct CDN link — implementation detail).
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

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const sb = admin()

  const { data: product } = await sb
    .from('ucp_products')
    .select('id, slug, name, app_config, fulfillment_type, price_cents')
    .eq('slug', slug)
    .maybeSingle()

  if (!product) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Free products: skip purchase check
  const isFree = product.price_cents === 0

  if (!isFree) {
    const { data: purchase } = await sb
      .from('store_purchases')
      .select('id, status')
      .eq('buyer_id', user.id)
      .eq('listing_id', product.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!purchase) {
      return NextResponse.json(
        {
          error: 'no completed purchase on file',
          checkoutUrl: `/api/commerce/checkout`,
          message: `You need to purchase ${product.name} first.`,
        },
        { status: 402 }
      )
    }
  }

  const cfg = (product.app_config as { download_url?: string } | null) ?? {}
  const downloadUrl = cfg.download_url

  if (!downloadUrl) {
    return NextResponse.json(
      { error: 'no download_url configured for this product', productName: product.name },
      { status: 500 }
    )
  }

  // Log the download event (best-effort)
  void sb.from('downloads').insert({
    user_id: user.id,
    workflow_id: null,
    file_format: cfg ? 'product' : 'unknown',
  })

  return NextResponse.json({
    productName: product.name,
    downloadUrl,
    expiresIn: 3600,
  })
}
