/**
 * POST /api/learning/distil — turn what happened into candidate facts.
 *
 * SUGGEST MODE ONLY. Produces candidates; promotes nothing; writes to no
 * knowledge base. The number that matters is not how many facts it finds but
 * how many a human would accept — which is why they land in a review queue
 * rather than in a client's agent.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { distilLocation } from '@/lib/learning/distiller'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const s = verifyAppJwt(bearer(req))
  if (!s.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const locationId = typeof body?.locationId === 'string' ? body.locationId.trim() || null : null
  const sinceDays = Number(body?.sinceDays) || 30

  const r = await distilLocation(s.claims.companyId, locationId, { sinceDays })
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 })
  return NextResponse.json({ ...r })
}
