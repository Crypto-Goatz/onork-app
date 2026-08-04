import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { listAgencyLocations } from '@/lib/crm/locations'
import { readSaas } from '@/lib/crm/saas'

/**
 * GET /api/clients — every sub-account on the agency, with what we know cheaply.
 *
 * DELIBERATELY SHALLOW. This agency has 86 clients; enriching each with a
 * contact count would be 86 API calls behind one page load — slow enough that
 * the page would feel broken, and a good way to get rate-limited. Names, plan
 * and billing state come from two calls total. Anything deeper is
 * /api/clients/:id, fetched when someone actually opens a client.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const companyId = session.claims.companyId

  const [locs, saas] = await Promise.all([
    listAgencyLocations(companyId),
    readSaas(companyId),
  ])

  if (locs.error) return NextResponse.json({ error: locs.error }, { status: 502 })

  const plans = saas.ok && saas.enabled
    ? new Map(saas.locations.map((l) => [l.locationId, l]))
    : new Map()

  // How much 0nCORE has actually done per client — the thing an agency owner
  // scans this list for.
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data: receipts } = await sb
    .from('burst_receipts')
    .select('location_id, status')
    .eq('company_id', companyId)
    .limit(2000)

  const activity = new Map<string, { runs: number; failures: number }>()
  for (const r of receipts ?? []) {
    if (!r.location_id) continue
    const a = activity.get(r.location_id) ?? { runs: 0, failures: 0 }
    a.runs += 1
    if (r.status !== 'ok') a.failures += 1
    activity.set(r.location_id, a)
  }

  return NextResponse.json({
    ok: true,
    billingConnected: saas.ok && saas.enabled,
    clients: locs.locations.map((l) => {
      const p = plans.get(l.id)
      return {
        id: l.id,
        name: l.name,
        planName: p?.planName ?? null,
        priceCents: p?.priceCents ?? null,
        status: p?.status ?? null,
        onPlan: Boolean(p?.planId || p?.planName),
        activity: activity.get(l.id) ?? { runs: 0, failures: 0 },
      }
    }),
  })
}
