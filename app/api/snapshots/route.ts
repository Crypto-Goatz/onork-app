import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { listSnapshots } from '@/lib/crm/agency-profile'

/** GET /api/snapshots — the agency's own templates, scoped to their JWT. */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const { snapshots, error } = await listSnapshots(session.claims.companyId)
  if (error) return NextResponse.json({ ok: false, snapshots: [], error }, { status: 502 })
  return NextResponse.json({ ok: true, snapshots })
}
