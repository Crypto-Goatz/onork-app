import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { readSaas } from '@/lib/crm/saas'
import { listAgencyLocations } from '@/lib/crm/locations'

/**
 * GET /api/saas — the agency's plans and what each client is on.
 *
 * Scoped to the JWT's companyId. Merges the SaaS view with the location list so
 * a client that is NOT on a plan is visible as exactly that, rather than simply
 * missing — an agency's unbilled clients are the most interesting rows on this
 * screen, and a list that only shows subscribers hides them.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const companyId = session.claims.companyId

  const [saas, locs] = await Promise.all([
    readSaas(companyId),
    listAgencyLocations(companyId),
  ])

  if (!saas.ok) return NextResponse.json({ error: saas.error }, { status: 502 })

  if (!saas.enabled) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      reason: saas.reason,
      needsInstall: saas.needsInstall ?? false,
      // The install link is the whole point of this response — without it the
      // message is a dead end.
      installUrl: saas.needsInstall ? '/api/oauth/install/agency' : undefined,
      clientCount: locs.locations.length,
    })
  }

  const byId = new Map(saas.locations.map((l) => [l.locationId, l]))
  const clients = locs.locations.map((l) => {
    const s = byId.get(l.id)
    return {
      id: l.id,
      name: l.name,
      planName: s?.planName ?? null,
      priceCents: s?.priceCents ?? null,
      interval: s?.interval ?? null,
      status: s?.status ?? null,
      trialEndsAt: s?.trialEndsAt ?? null,
      onPlan: Boolean(s?.planId || s?.planName),
    }
  })

  const mrrCents = saas.plans.reduce((sum, p) => sum + p.mrrCents, 0)

  return NextResponse.json({
    ok: true,
    enabled: true,
    plans: saas.plans,
    clients,
    mrrCents,
    unbilled: clients.filter((c) => !c.onPlan).length,
  })
}
