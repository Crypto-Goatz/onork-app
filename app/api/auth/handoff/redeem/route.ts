/**
 * POST /api/auth/handoff/redeem — the other half of the one-login handoff.
 *
 * A destination product (CRO9, 0nTask, web0n, Lead0n) posts the code it was
 * handed in the URL and gets back who the person is. It then creates ITS OWN
 * session however it normally would. This endpoint never issues anyone else's
 * session — it only answers "who is this, and which client are they in".
 *
 * SINGLE USE IS ENFORCED HERE, NOT PROMISED. The code is revoked the instant it
 * is redeemed, inside the same request, before the identity is returned. A
 * replayed code — from browser history, a log, a Referer header — gets 401.
 * That is the property that makes it safe to put in a URL at all.
 *
 * No cookie, no CORS restriction: the caller is a SERVER, not a browser. A
 * destination should redeem this server-side and never expose the code to its
 * own client.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken } from '@/lib/0n-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function POST(req: NextRequest) {
  let body: { code?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const code = (body.code || '').trim()
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

  const ctx = await validateToken(code).catch(() => null)
  if (!ctx?.userId) {
    // Covers expired, already-redeemed and never-existed alike. Distinguishing
    // them would tell an attacker which codes were once real.
    return NextResponse.json({ error: 'Code invalid, expired, or already used.' }, { status: 401 })
  }

  const sb = admin()

  // Must be a handoff code. A device key pasted here would otherwise be
  // silently consumed and revoked — turning a support question into a customer
  // whose extension stopped working.
  const { data: row } = await sb
    .from('api_tokens')
    .select('id, channel, metadata')
    .eq('user_id', ctx.userId)
    .eq('channel', 'handoff')
    .eq('revoked', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row) {
    return NextResponse.json({ error: 'Not a handoff code.' }, { status: 401 })
  }

  // BURN IT FIRST. Revoke before returning the identity, so a crash after this
  // point cannot leave a live code behind.
  await sb
    .from('api_tokens')
    .update({ revoked: true, revoked_at: new Date().toISOString() })
    .eq('id', row.id)

  const { data: profile } = await sb
    .from('profiles')
    .select('id, email, full_name, business_name, tier_level, crm_location_id, crm_agency_id, is_vip, plan')
    .eq('id', ctx.userId)
    .maybeSingle()

  // What the customer owns, so the destination can switch features on without a
  // second lookup. This is the same list the extension gets.
  const { data: addons } = await sb
    .from('product_keys')
    .select('product_slug, product_name, capabilities')
    .eq('user_id', ctx.userId)
    .eq('status', 'active')

  return NextResponse.json({
    ok: true,
    user: {
      id: ctx.userId,
      email: profile?.email ?? null,
      name: profile?.full_name ?? null,
      businessName: profile?.business_name ?? null,
      tierLevel: profile?.tier_level ?? 0,
      plan: profile?.plan ?? 'free',
      isVip: Boolean(profile?.is_vip),
      locationId: profile?.crm_location_id ?? ctx.locationId ?? null,
      agencyId: profile?.crm_agency_id ?? null,
    },
    products: (addons || []).map((a) => ({
      slug: a.product_slug,
      name: a.product_name,
      capabilities: a.capabilities,
    })),
    product: (row.metadata as Record<string, unknown> | null)?.product ?? null,
  })
}
