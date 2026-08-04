import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'

/**
 * GET /api/burst/receipts — what 0nCORE has actually done for this agency.
 *
 * Scoped to the companyId in the signed JWT and nowhere else. An agency id in a
 * query param would make this a way to read another agency's activity log,
 * which is a list of their clients and what was done to them.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ ok: true, receipts: [] })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const locationId = req.nextUrl.searchParams.get('locationId')
  let q = sb
    .from('burst_receipts')
    .select('id, location_name, capability, status, detail, targets, price_cents, billed, created_at')
    .eq('company_id', session.claims.companyId)
    .order('created_at', { ascending: false })
    .limit(40)

  if (locationId) q = q.eq('location_id', locationId)

  const { data, error } = await q
  if (error) {
    console.error('[burst/receipts]', error)
    return NextResponse.json({ ok: false, receipts: [], error: 'Could not read your activity.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, receipts: data ?? [] })
}
