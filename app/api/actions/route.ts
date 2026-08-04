import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { WORKFLOW_ACTIONS, workflowAction } from '@/lib/crm/actions'
import { METERS } from '@/lib/meters'

/**
 * The agency's control over the "0nCORE: …" steps in their workflow builder.
 * GET  — the six actions, their state, and what each has actually done.
 * POST — switch one on or off.
 *
 * A step placed in a workflow and a step SWITCHED ON are different consents.
 * The endpoint refuses any action that is off, so this toggle is a real control
 * and not a label.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const companyId = session.claims.companyId
  const sb = admin()

  const [{ data: cfgs }, { data: used }] = await Promise.all([
    sb.from('workflow_action_config').select('action_key, enabled').eq('company_id', companyId),
    sb.from('burst_receipts').select('capability, status').eq('company_id', companyId).eq('source', 'workflow_action').limit(500),
  ])

  const on = new Map((cfgs ?? []).map((c) => [c.action_key, c.enabled as boolean]))
  const counts = new Map<string, { runs: number; failures: number }>()
  for (const r of used ?? []) {
    const c = counts.get(r.capability) ?? { runs: 0, failures: 0 }
    c.runs += 1
    if (r.status !== 'ok') c.failures += 1
    counts.set(r.capability, c)
  }

  return NextResponse.json({
    ok: true,
    // The endpoint is dead until the portal contract is captured — the UI says
    // so rather than showing switches that cannot do anything yet.
    endpointReady: Boolean(process.env.CRM_ACTION_SECRET),
    actions: WORKFLOW_ACTIONS.map((a) => ({
      key: a.key,
      name: a.name,
      blurb: a.blurb,
      fields: a.fields,
      returns: a.returns,
      live: a.live,
      priceCents: a.meter ? (METERS.find((m) => m.key === a.meter)?.priceCents ?? 0) : 0,
      enabled: on.get(a.key) ?? false,
      usage: counts.get(a.key) ?? { runs: 0, failures: 0 },
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const key = String(body?.actionKey ?? '')
  const enabled = Boolean(body?.enabled)
  const action = workflowAction(key)
  if (!action) return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  if (enabled && !action.live) {
    // Switching on something the executor cannot run would put a step into a
    // live customer journey that fails when a real contact reaches it.
    return NextResponse.json({ error: `${action.name} is not finished yet.` }, { status: 400 })
  }

  const { error } = await admin().from('workflow_action_config').upsert({
    company_id: session.claims.companyId,
    action_key: key,
    enabled,
    updated_at: new Date().toISOString(),
  })
  if (error) {
    console.error('[actions]', error)
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, actionKey: key, enabled })
}
