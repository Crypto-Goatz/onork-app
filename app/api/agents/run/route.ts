import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { listAgencyLocations } from '@/lib/crm/locations'
import { executeAgent } from '@/lib/crm/agents'

/**
 * POST /api/agents/run — ask one of your agents something, from the dashboard.
 *
 * Ownership-checked: the location must belong to the agency in the JWT, or this
 * becomes a way to run agents inside someone else's account.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const locationId = String(body?.locationId ?? '')
  const agentId = String(body?.agentId ?? '')
  const message = String(body?.message ?? '').trim().slice(0, 2000)
  if (!locationId || !agentId || !message) return NextResponse.json({ error: 'Missing details.' }, { status: 400 })

  const { locations } = await listAgencyLocations(session.claims.companyId)
  if (!locations.some((l) => l.id === locationId)) {
    return NextResponse.json({ error: 'No such client on this agency.' }, { status: 404 })
  }

  const r = await executeAgent({ locationId, agentId, message })
  if (!r.ok) return NextResponse.json({ error: r.error ?? 'The agent did not run.' }, { status: 502 })
  return NextResponse.json({ ok: true, reply: r.reply, status: r.status, goalReached: r.goalReached })
}
