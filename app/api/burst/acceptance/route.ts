/**
 * POST /api/burst/acceptance — THE acceptance test, as a route.
 *
 * Proves the product in one call: one natural-language command naming TWO
 * clients → the real planner decomposes it → the real executor runs both legs
 * under each location's own credential → the CRM is read back to verify both
 * artifacts exist. PASS means the core loop works, end to end, on production
 * infrastructure — not in anyone's memory.
 *
 * It exercises the REAL path: the same /api/burst/plan and /api/burst/run the
 * command bar calls, with a server-minted app JWT — no mocks, no shortcuts.
 * Test contacts are named ACCEPTANCE-TEST-<ts> so they are identifiable and
 * deletable in the CRM afterwards.
 *
 * Gated by CRON_SECRET (repo convention for ops routes).
 */
import { NextRequest, NextResponse } from 'next/server'
import { issueAppJwt } from '@/lib/auth/app-jwt'
import { getValidAgencyToken } from '@/lib/crm/agency-token'
import { listAgencyLocations } from '@/lib/crm/locations'
import { crmGet } from '@/lib/crm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

interface LegOutcome {
  capability?: string
  location?: string
  status?: string
  detail?: string
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || ''
  const auth = req.headers.get('authorization') || ''
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
  }

  // ── 1. Resolve the agency and two real client locations ──
  const agency = await getValidAgencyToken()
  if (!agency.companyId) {
    return NextResponse.json({ pass: false, stage: 'agency', error: agency.error || 'No agency install found.' }, { status: 500 })
  }
  const { locations, error: locErr } = await listAgencyLocations(agency.companyId)
  if (locErr || locations.length < 2) {
    return NextResponse.json({ pass: false, stage: 'locations', error: locErr || `Need 2+ locations, found ${locations.length}.` }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const wantA = typeof body?.locationA === 'string' ? body.locationA.toLowerCase() : null
  const wantB = typeof body?.locationB === 'string' ? body.locationB.toLowerCase() : null
  const locA = (wantA && locations.find((l) => l.name.toLowerCase().includes(wantA))) || locations[0]
  const locB = (wantB && locations.find((l) => l.name.toLowerCase().includes(wantB))) || locations.find((l) => l.id !== locA.id)
  if (!locB) {
    return NextResponse.json({ pass: false, stage: 'locations', error: 'Could not pick two distinct locations.' }, { status: 500 })
  }

  // ── 2. One message, two clients, two directives — the product claim ──
  const ts = Date.now()
  const emailA = `acceptance-a-${ts}@0ncore-test.com`
  const emailB = `acceptance-b-${ts}@0ncore-test.com`
  const command =
    `For ${locA.name}: create a contact named Acceptance AlphaTest with email ${emailA}. ` +
    `For ${locB.name}: create a contact named Acceptance BetaTest with email ${emailB}.`

  const jwt = issueAppJwt({ sub: 'acceptance-test', companyId: agency.companyId }, 600)
  const base = req.nextUrl.origin
  const hdr = { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` }

  // ── 3. The real planner ──
  const planRes = await fetch(`${base}/api/burst/plan`, { method: 'POST', headers: hdr, body: JSON.stringify({ command }) })
  const plan = await planRes.json().catch(() => ({}))
  if (!planRes.ok || !plan.planToken) {
    return NextResponse.json({
      pass: false, stage: 'plan', command,
      error: plan?.error || (plan.runnableCount === 0 ? 'Planner produced no runnable legs.' : `Plan HTTP ${planRes.status}`),
      legs: plan?.legs ?? null,
    }, { status: 500 })
  }

  // ── 4. The real executor ──
  const runRes = await fetch(`${base}/api/burst/run`, { method: 'POST', headers: hdr, body: JSON.stringify({ planToken: plan.planToken }) })
  const run = await runRes.json().catch(() => ({}))
  const results: LegOutcome[] = Array.isArray(run.results) ? run.results : []
  if (!runRes.ok) {
    return NextResponse.json({ pass: false, stage: 'run', command, error: run?.error || `Run HTTP ${runRes.status}`, results }, { status: 500 })
  }

  // ── 5. Independent verification — never trust the executor's word alone.
  //       Read each contact back from the CRM under that location's own auth. ──
  async function verify(locationId: string, email: string): Promise<boolean> {
    const res = await crmGet(`/contacts/?${new URLSearchParams({ query: email, limit: '5' })}`, locationId)
    if (!res.ok) return false
    const j = (await res.json().catch(() => ({}))) as { contacts?: { email?: string }[] }
    return (j.contacts ?? []).some((c) => (c.email || '').toLowerCase() === email.toLowerCase())
  }
  const foundA = await verify(locA.id, emailA)
  const foundB = await verify(locB.id, emailB)

  const pass = foundA && foundB
  return NextResponse.json({
    pass,
    command,
    planned: Array.isArray(plan.legs) ? plan.legs.length : 0,
    ran: results.length,
    verification: [
      { location: locA.name, locationId: locA.id, email: emailA, foundInCrm: foundA },
      { location: locB.name, locationId: locB.id, email: emailB, foundInCrm: foundB },
    ],
    results: results.map((r) => ({ status: r.status, detail: r.detail })),
    note: pass
      ? 'PASS — one message, two sub-accounts, both executed and independently verified in the CRM. Test contacts are named Acceptance AlphaTest/BetaTest and can be deleted.'
      : 'FAIL — see stage results above. Test contacts, if any, are identifiable by the acceptance-* email.',
  })
}
