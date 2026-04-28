/**
 * POST /api/widgets/marketplace/install
 *
 * Free-only install path for the CRM marketplace widget. Registers a
 * user_addons row keyed by addon_slug. Paid products go through
 * /api/widgets/marketplace/checkout instead.
 *
 * Body: { slug, source, locationId, onToken? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken } from '@/lib/0n-token'
import { createClient as createServerClient } from '@/lib/supabase/server'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  let body: { slug?: string; source?: string; locationId?: string; onToken?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  if (!body.slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  // Resolve actor: 0n token > Supabase session > location owner lookup
  let actorUserId: string | null = null

  if (body.onToken) {
    const ctx = await validateToken(body.onToken)
    if (ctx) actorUserId = ctx.userId
  }

  if (!actorUserId) {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    actorUserId = user?.id ?? null
  }

  if (!actorUserId && body.locationId) {
    const { data: profile } = await admin()
      .from('profiles')
      .select('id')
      .eq('crm_location_id', body.locationId)
      .maybeSingle()
    actorUserId = profile?.id ?? null
  }

  if (!actorUserId) {
    return NextResponse.json(
      { error: 'no actor — provide a 0n token, login, or a connected locationId' },
      { status: 401 }
    )
  }

  const sb = admin()

  // Lookup product to confirm it's free
  const isUcp = body.source === 'ucp_products'
  const { data: product } = isUcp
    ? await sb
        .from('ucp_products')
        .select('id, slug, name, price_cents')
        .eq('slug', body.slug)
        .eq('status', 'active')
        .maybeSingle()
    : await sb
        .from('marketplace_apps')
        .select('id, slug, name, price_cents')
        .eq('slug', body.slug)
        .eq('status', 'active')
        .maybeSingle()

  if (!product) return NextResponse.json({ error: 'product not found' }, { status: 404 })
  if (product.price_cents > 0) {
    return NextResponse.json(
      { error: 'paid product — use /api/widgets/marketplace/checkout' },
      { status: 400 }
    )
  }

  // Already installed?
  const { data: existing } = await sb
    .from('user_addons')
    .select('id, status')
    .eq('user_id', actorUserId)
    .eq('addon_slug', body.slug)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, alreadyInstalled: true, addonId: existing.id })
  }

  const { data: row, error } = await sb
    .from('user_addons')
    .insert({
      user_id: actorUserId,
      addon_id: product.id,
      addon_slug: body.slug,
      status: 'active',
      payment_type: 'free',
      purchased_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[widgets/marketplace/install]', error)
    return NextResponse.json({ error: 'install failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, addonId: row.id })
}
