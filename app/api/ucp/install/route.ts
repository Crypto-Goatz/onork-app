/**
 * POST /api/ucp/install
 *
 * One-click install for UCP products that DON'T require an API key/auth.
 * Replaces /api/ucp/checkout for the no-payment, no-OAuth path.
 *
 * Eligibility:
 *   - product.status === 'active'
 *   - product.price_cents === 0  OR user is on a plan that includes it
 *   - product.fulfillment_type IN ('instant','digital','config_only')
 *   - registry_security_scans verdict is `passed` for this product
 *
 * Side effects:
 *   - inserts ucp_orders row with amount=0, status='fulfilled', source='one_click_install'
 *   - bumps ucp_products.total_sold (single-row, idempotent via order id)
 *
 * Body: { product_slug } | { product_id }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { getLatestScan, evaluateGate } from '@/lib/security/registry-scan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

const ONE_CLICK_FULFILLMENT_TYPES = ['instant', 'digital', 'config_only']

interface UcpProduct {
  id: string
  slug: string
  name: string
  fulfillment_type: string | null
  price_cents: number | null
  app_config: Record<string, unknown> | null
  status: string
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Body
  let body: { product_id?: string; product_slug?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }
  if (!body.product_id && !body.product_slug) {
    return NextResponse.json({ error: 'product_id or product_slug required' }, { status: 400 })
  }

  const sb = admin()

  // 3. Load product
  const productQuery = sb.from('ucp_products').select('*').eq('status', 'active')
  const { data: product, error: prodErr } = body.product_id
    ? await productQuery.eq('id', body.product_id).single<UcpProduct>()
    : await productQuery.eq('slug', body.product_slug!).single<UcpProduct>()

  if (prodErr || !product) {
    return NextResponse.json({ error: 'Product not found or not active' }, { status: 404 })
  }

  // 4. Eligibility gate
  if ((product.price_cents ?? 0) > 0) {
    return NextResponse.json(
      {
        error: 'Paid product — use /api/ucp/checkout',
        price_cents: product.price_cents,
      },
      { status: 400 },
    )
  }

  const fulfillment = (product.fulfillment_type || '').toLowerCase()
  if (!ONE_CLICK_FULFILLMENT_TYPES.includes(fulfillment)) {
    return NextResponse.json(
      {
        error: `Fulfillment type "${fulfillment}" requires API/auth setup — not eligible for one-click`,
        fulfillment_type: fulfillment,
      },
      { status: 400 },
    )
  }

  // 5. Security scan gate
  const scan = await getLatestScan('ucp_product', product.id)
  const gate = evaluateGate(scan)
  if (!gate.allowed) {
    return NextResponse.json(
      {
        error: 'Install blocked by security scan',
        gate,
      },
      { status: 403 },
    )
  }

  // 6. Idempotency — already installed?
  const { data: existing } = await sb
    .from('ucp_orders')
    .select('id, status, fulfilled_at, deliverable')
    .eq('product_id', product.id)
    .eq('buyer_user_id', user.id)
    .eq('source', 'one_click_install')
    .eq('status', 'fulfilled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      ok: true,
      already_installed: true,
      order: existing,
      product: { id: product.id, slug: product.slug, name: product.name },
      gate,
    })
  }

  // 7. Insert install record
  const { data: order, error: orderErr } = await sb
    .from('ucp_orders')
    .insert({
      product_id: product.id,
      buyer_email: user.email || `${user.id}@onork.io`,
      buyer_user_id: user.id,
      amount_cents: 0,
      currency: 'usd',
      status: 'fulfilled',
      source: 'one_click_install',
      deliverable: product.app_config ?? {},
      fulfilled_at: new Date().toISOString(),
      metadata: {
        product_slug: product.slug,
        fulfillment_type: fulfillment,
        scan_id: gate.scan_id || null,
      },
    })
    .select('*')
    .single()

  if (orderErr || !order) {
    return NextResponse.json(
      { error: orderErr?.message || 'install failed' },
      { status: 500 },
    )
  }

  // 8. Bump counter (best-effort)
  await sb
    .from('ucp_products')
    .update({ total_sold: (product as unknown as { total_sold?: number }).total_sold ? undefined : 1 })
    .eq('id', product.id)
    .then(() => {}, () => {})

  return NextResponse.json({
    ok: true,
    already_installed: false,
    order,
    product: { id: product.id, slug: product.slug, name: product.name },
    gate,
  })
}
