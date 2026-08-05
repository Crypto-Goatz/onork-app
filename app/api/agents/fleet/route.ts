import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { listAgentsForAgency } from '@/lib/crm/agent-fleet'

/** GET /api/agents/fleet — every client's agents, in one view. */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  return NextResponse.json(await listAgentsForAgency(session.claims.companyId))
}
