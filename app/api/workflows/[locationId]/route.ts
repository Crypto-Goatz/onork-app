import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { listAgencyLocations } from '@/lib/crm/locations'
import { crmGet } from '@/lib/crm'

/**
 * GET /api/workflows/:locationId — a client's native automations, to LOOK at.
 *
 * READ-ONLY BY PLATFORM LAW. The API exposes no create or edit for native
 * workflows, so this route has no write path and the UI must not offer one.
 * The editable lane is 0nCORE Flows; conflating the two is how an agency ends
 * up believing they edited something they did not.
 *
 * THE LOCATION IS CHECKED AGAINST THE AGENCY, not just accepted. A locationId in
 * the path with no ownership check is a way to read any client on the platform
 * by guessing ids.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: { params: Promise<{ locationId: string }> }) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const { locationId } = await ctx.params
  const { locations } = await listAgencyLocations(session.claims.companyId)
  const owned = locations.find((l) => l.id === locationId)
  if (!owned) {
    // Same answer whether the client belongs to someone else or does not exist —
    // a distinct "not yours" would confirm the id is real.
    return NextResponse.json({ error: 'No such client on this agency.' }, { status: 404 })
  }

  const res = await crmGet('/workflows/', locationId)
  if (!res.ok) {
    return NextResponse.json({ error: 'Could not read this client\'s automations.' }, { status: 502 })
  }
  const json = (await res.json().catch(() => ({}))) as {
    workflows?: { id?: string; name?: string; status?: string; version?: number; updatedAt?: string }[]
  }

  return NextResponse.json({
    ok: true,
    location: owned,
    readOnly: true,
    workflows: (json.workflows ?? []).map((w) => ({
      id: w.id, name: w.name, status: w.status, version: w.version, updatedAt: w.updatedAt,
    })),
  })
}
