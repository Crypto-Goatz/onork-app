/**
 * GET  /api/snapshot/backfill — what this agency's locations are missing.
 * POST /api/snapshot/backfill — create the missing managed Custom Values.
 *
 * The release step a snapshot push cannot perform. GET is a dry run and is the
 * intended first call: a release should be able to see what it is about to
 * change before it changes it, because there is no rollback on the other side.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { createServiceClient } from '@/lib/connect/service-client'
import { backfillAll, MANAGED_VALUES } from '@/lib/snapshot/backfill'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Only VERIFIED clients — an unverified key 401s per location and reads as breakage. */
async function targets(companyId: string, only?: string) {
  const db = createServiceClient()
  if (!db) return []
  let q = db
    .from('location_connections')
    .select('location_id')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .not('verified_at', 'is', null)
  if (only) q = q.eq('location_id', only)
  const { data } = await q
  return (data ?? []).map((r) => r.location_id as string)
}

export async function GET(req: NextRequest) {
  const s = verifyAppJwt(bearer(req))
  if (!s.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const ids = await targets(s.claims.companyId, req.nextUrl.searchParams.get('locationId') || undefined)
  return NextResponse.json({
    contract: MANAGED_VALUES.map((v) => ({ name: v.name, since: v.since, notes: v.notes })),
    locations: ids.length,
    locationIds: ids,
    note: 'POST to create anything missing. Existing values are never overwritten.',
  })
}

export async function POST(req: NextRequest) {
  const s = verifyAppJwt(bearer(req))
  if (!s.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const only = typeof body?.locationId === 'string' ? body.locationId.trim() : undefined
  const ids = await targets(s.claims.companyId, only)
  if (!ids.length) return NextResponse.json({ error: 'No verified clients to backfill.' }, { status: 400 })

  const out = await backfillAll(ids)
  return NextResponse.json(out)
}
