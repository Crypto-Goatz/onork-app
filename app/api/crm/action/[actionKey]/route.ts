import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { workflowAction } from '@/lib/crm/actions'
import { executeLeg } from '@/lib/burst/executor'
import { legPriceCents } from '@/lib/crm/registry'

/**
 * POST /api/crm/action/:actionKey — a native workflow step calling 0nCORE.
 *
 * This is the flagship: the agency drops a "0nCORE: …" step into their own
 * workflow builder, and when a contact reaches it the platform calls here with
 * the contact and the step's config. We do the work and hand back fields the
 * rest of their workflow continues on.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT FAILS CLOSED, AND THAT IS THE POINT RIGHT NOW.
 *
 * The exact callback-verification mechanism (header name, signing scheme) is
 * revealed by the portal only after the action shell is saved, and that has not
 * happened yet. So this route REFUSES every call until CRM_ACTION_SECRET is set,
 * rather than running unverified.
 *
 * The alternative — accept anything while we wait for the contract — would be an
 * unauthenticated, internet-facing endpoint that writes to customer CRM accounts.
 * This repo has already shipped that mistake once: /api/admin/linkedin-queue sat
 * open, leaked user ids and content, and could publish to a user's real LinkedIn.
 * A 503 that says "not finished" costs a day; an open write endpoint costs
 * customer trust that does not come back.
 *
 * TO FINISH THIS: save a shell in the portal, read the revealed contract, set
 * CRM_ACTION_SECRET, and replace verifySignature() below with the real scheme.
 * The rest of the route — routing, billing gate, execution, receipts — is done
 * and tested.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/**
 * Placeholder for the platform's real scheme.
 *
 * Written as an HMAC over the raw body because that is the common shape and the
 * surrounding code should not change when the real contract lands — only this
 * function should. Constant-time compared, because a fast string compare on a
 * signature is a timing oracle.
 */
function verifySignature(req: NextRequest, rawBody: string): { ok: boolean; why?: string } {
  const secret = process.env.CRM_ACTION_SECRET
  if (!secret) return { ok: false, why: 'unconfigured' }

  const presented =
    req.headers.get('x-signature') ||
    req.headers.get('x-hub-signature-256') ||
    req.headers.get('x-wh-signature') ||
    ''
  if (!presented) return { ok: false, why: 'unsigned' }

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(presented.replace(/^sha256=/, ''))
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, why: 'bad-signature' }
  return { ok: true }
}

interface ActionPayload {
  locationId?: string
  contactId?: string
  workflowId?: string
  companyId?: string
  config?: Record<string, unknown>
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ actionKey: string }> }) {
  const { actionKey } = await ctx.params
  const action = workflowAction(actionKey)
  if (!action) {
    return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 404 })
  }

  const rawBody = await req.text()
  const sig = verifySignature(req, rawBody)
  if (!sig.ok) {
    if (sig.why === 'unconfigured') {
      console.error(`[crm/action] refused ${actionKey}: CRM_ACTION_SECRET is not set — callback contract not captured yet.`)
      return NextResponse.json(
        { success: false, error: 'This action is not finished being set up.' },
        { status: 503 },
      )
    }
    return NextResponse.json({ success: false, error: 'Could not verify this request.' }, { status: 401 })
  }

  let payload: ActionPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ success: false, error: 'Could not read the request.' }, { status: 400 })
  }

  const { locationId, contactId, companyId } = payload
  if (!locationId || !companyId) {
    return NextResponse.json({ success: false, error: 'Missing location or company.' }, { status: 400 })
  }

  const sb = admin()

  // The agency must have switched this action on. A shell placed in a workflow
  // is the agency's intent to USE it; the toggle is their intent to PAY for it
  // and to let it write. Those are different consents.
  const { data: cfg } = await sb
    .from('workflow_action_config')
    .select('enabled')
    .eq('company_id', companyId)
    .eq('action_key', actionKey)
    .maybeSingle()

  if (!cfg?.enabled) {
    // Structured, not a hard failure — the workflow branches on it rather than
    // erroring out in the middle of a live customer journey.
    return NextResponse.json({
      success: false,
      result: 'requires_setup',
      message: `${action.name} is switched off in 0nCORE.`,
    })
  }

  // Billing gate. Same shape: a branchable result, never a 500 inside a
  // customer's workflow.
  const price = action.meter ? legPriceCents(`__action.${actionKey}`) || 0 : 0
  if (action.meter && !action.live) {
    return NextResponse.json({
      success: false,
      result: 'requires_plan',
      message: `${action.name} needs a plan that includes it.`,
    })
  }

  const { data: run } = await sb
    .from('burst_runs')
    .insert({
      company_id: companyId,
      command: `[workflow action] ${action.name}`,
      plan_id: `wfa_${crypto.randomUUID()}`,
      leg_count: 1,
      status: 'running',
    })
    .select('id')
    .single()

  const { data: receipt } = await sb
    .from('burst_receipts')
    .insert({
      run_id: run?.id,
      company_id: companyId,
      location_id: locationId,
      capability: actionKey,
      intent: action.name,
      status: 'pending',
      source: 'workflow_action',
    })
    .select('id')
    .single()

  // Reuse the dashboard executor rather than forking a second one. Two engines
  // would mean two sets of safety rules, and the second one always drifts.
  const result = await executeLeg({
    capability: mapActionToCapability(actionKey),
    locationId,
    params: { ...(payload.config ?? {}), contactId },
    companyId,
  })

  if (receipt?.id) {
    await sb.from('burst_receipts').update({
      status: result.status,
      detail: result.detail?.slice(0, 1000) ?? null,
      error: result.error?.slice(0, 500) ?? null,
      targets: result.targets,
      price_cents: result.priceCents,
      billed: result.billed,
      settled_at: new Date().toISOString(),
    }).eq('id', receipt.id)
  }
  if (run?.id) {
    await sb.from('burst_runs').update({
      status: result.status === 'ok' ? 'complete' : 'failed',
      ok_count: result.status === 'ok' ? 1 : 0,
      failed_count: result.status === 'ok' ? 0 : 1,
      billed_cents: result.billed ? result.priceCents : 0,
      completed_at: new Date().toISOString(),
    }).eq('id', run.id)
  }

  return NextResponse.json({
    success: result.status === 'ok',
    receiptId: receipt?.id,
    status: result.status,
    message: result.detail,
    priceCents: price,
  })
}

/** Action keys are the agency's vocabulary; capability ids are the executor's. */
function mapActionToCapability(actionKey: string): string {
  switch (actionKey) {
    case 'oncore_enrich': return 'contact.update'
    case 'oncore_build_site': return 'site.build'
    case 'oncore_post_social': return 'social.schedule'
    // The AI-side actions have no CRM capability of their own; they are answered
    // by the planner path and land as a note on the contact.
    default: return 'contact.note'
  }
}
