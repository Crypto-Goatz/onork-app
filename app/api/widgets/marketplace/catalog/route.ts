/**
 * GET /api/widgets/marketplace/catalog?locationId=...&mode=installed
 *
 * Powers the CRM-iframe marketplace widget. Unions ucp_products and
 * marketplace_apps into one normalized catalog. De-dupes by slug. If a
 * locationId or 0n token is provided, marks each item with installed=true
 * when a completed purchase or active addon record exists for the actor.
 *
 * Public — anonymous fetch returns the catalog with installed=false.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractToken } from '@/lib/0n-token'

interface CatalogItem {
  id: string
  slug: string
  name: string
  description: string
  category: string | null
  tags: string[] | null
  price_cents: number
  price_type: string | null
  currency: string | null
  fulfillment_type: string | null
  icon: string | null
  cover_image: string | null
  featured: boolean
  source: 'ucp_products' | 'marketplace_apps'
  installed: boolean
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const sb = admin()

  // Optional actor for entitlement check
  const tokenRaw = extractToken(req)
  const tokenCtx = tokenRaw ? await validateToken(tokenRaw) : null
  const locationOverride = req.nextUrl.searchParams.get('locationId')
  const filterMode = req.nextUrl.searchParams.get('mode') // 'installed' = only installed

  // Resolve actor user id from 0n token, or from location's profile
  let actorUserId: string | null = tokenCtx?.userId ?? null
  if (!actorUserId && locationOverride) {
    const { data: profile } = await sb
      .from('profiles')
      .select('id')
      .eq('crm_location_id', locationOverride)
      .maybeSingle()
    actorUserId = profile?.id ?? null
  }

  // Pull both sources in parallel
  const [ucp, mkt] = await Promise.all([
    sb
      .from('ucp_products')
      .select(
        'id, name, slug, description, category, tags, price_cents, price_type, currency, fulfillment_type, icon, cover_image, featured'
      )
      .eq('status', 'active')
      .order('featured', { ascending: false })
      .order('sort_order', { ascending: true }),
    sb
      .from('marketplace_apps')
      .select('id, slug, name, description, category, tags, price_cents, price_type, icon')
      .eq('status', 'active'),
  ])

  // Owner's installed state
  let installedSlugs = new Set<string>()
  if (actorUserId) {
    const [purchases, addons] = await Promise.all([
      sb
        .from('store_purchases')
        .select('listing_id, ucp_products(slug)')
        .eq('buyer_id', actorUserId)
        .eq('status', 'completed'),
      sb
        .from('user_addons')
        .select('addon_slug')
        .eq('user_id', actorUserId)
        .eq('status', 'active'),
    ])

    type PurchaseRow = { listing_id: string; ucp_products?: { slug?: string } | { slug?: string }[] }
    for (const p of (purchases.data ?? []) as PurchaseRow[]) {
      const upRel = Array.isArray(p.ucp_products) ? p.ucp_products[0] : p.ucp_products
      const slug = upRel?.slug
      if (slug) installedSlugs.add(slug)
    }
    type AddonRow = { addon_slug?: string }
    for (const a of (addons.data ?? []) as AddonRow[]) {
      if (a.addon_slug) installedSlugs.add(a.addon_slug)
    }
  }

  const items: CatalogItem[] = []
  const seenSlugs = new Set<string>()

  // ucp_products first (richer schema)
  for (const p of ucp.data ?? []) {
    if (!p.slug || seenSlugs.has(p.slug)) continue
    seenSlugs.add(p.slug)
    items.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description ?? '',
      category: p.category ?? null,
      tags: p.tags ?? null,
      price_cents: p.price_cents ?? 0,
      price_type: p.price_type ?? null,
      currency: p.currency ?? 'usd',
      fulfillment_type: p.fulfillment_type ?? null,
      icon: p.icon ?? null,
      cover_image: p.cover_image ?? null,
      featured: !!p.featured,
      source: 'ucp_products',
      installed: installedSlugs.has(p.slug),
    })
  }

  // Then marketplace_apps for anything still uncovered
  for (const a of mkt.data ?? []) {
    if (!a.slug || seenSlugs.has(a.slug)) continue
    seenSlugs.add(a.slug)
    items.push({
      id: a.id,
      slug: a.slug,
      name: a.name,
      description: a.description ?? '',
      category: a.category ?? null,
      tags: a.tags ?? null,
      price_cents: a.price_cents ?? 0,
      price_type: a.price_type ?? null,
      currency: 'usd',
      fulfillment_type: 'app',
      icon: a.icon ?? null,
      cover_image: null,
      featured: false,
      source: 'marketplace_apps',
      installed: installedSlugs.has(a.slug),
    })
  }

  const filtered = filterMode === 'installed' ? items.filter((i) => i.installed) : items

  return NextResponse.json({
    items: filtered,
    actorUserId,
    locationId: locationOverride,
  })
}
