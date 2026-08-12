import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { workflowAction } from '@/lib/crm/actions'
import { executeLeg } from '@/lib/burst/executor'
import { legPriceCents } from '@/lib/crm/registry'
import { draftMessage, scoreAndRoute, noteOnContact } from '@/lib/burst/ai-actions'
import { fireTrigger } from '@/lib/crm/triggers'
import { mintMemberLink } from '@/lib/member/token'

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

  const cfg2 = (payload.config ?? {}) as Record<string, string>
  const contact = payload.contactId

  /**
   * The AI actions answer directly; everything else goes through the burst
   * executor. Reusing that engine matters — two executors would mean two sets
   * of safety rules, and the second copy always drifts from the first.
   *
   * The returned `output` is what later workflow steps read, which is the whole
   * reason an agency places one of these: the value has to come BACK.
   */
  let result: Awaited<ReturnType<typeof executeLeg>>
  let output: Record<string, string | number> = {}

  if (actionKey === 'oncore_member_link') {
    if (!contact) {
      result = { status: 'refused', detail: 'This step needs a contact to make a portal link for.', targets: 0, priceCents: 0, billed: false }
    } else {
      const days = Math.min(90, Math.max(1, Number(cfg2.expiryDays) || 14))
      const link = mintMemberLink(contact, locationId, days * 24 * 3600)
      const portalUrl = `${cfg2.portalUrl || 'https://app.0ncore.com/portal'}?k=${encodeURIComponent(link)}`
      output = { portalUrl }
      result = { status: 'ok', detail: `Portal link created, valid ${days} days.`, targets: 1, priceCents: 0, billed: false }
    }
  } else if (actionKey === 'oncore_ai_draft') {
    const { draft, note } = await draftMessage({
      locationId, contactId: contact,
      purpose: cfg2.purpose || 'follow up with this contact',
      tone: cfg2.tone,
    })
    if (draft && contact) await noteOnContact(locationId, contact, `0nCORE drafted:\n\n${draft}`)
    output = { draft }
    result = draft
      ? { status: 'ok', detail: note, targets: 1, priceCents: 0, billed: false }
      : { status: 'failed', detail: note, targets: 0, priceCents: 0, billed: false }
  } else if (actionKey === 'oncore_score_route') {
    const { score, branch, reason } = await scoreAndRoute({
      locationId, contactId: contact,
      criteria: cfg2.criteria || 'likelihood to buy soon',
    })
    if (contact) await noteOnContact(locationId, contact, `0nCORE scored ${score}/100 (${branch}) — ${reason}`)
    output = { score, branch, reason }
    result = { status: 'ok', detail: `Scored ${score}/100 — ${branch}.`, targets: 1, priceCents: 0, billed: false }

    // A score is exactly the kind of event an agency wants their OWN automation
    // to react to, so it starts one rather than ending here.
    void fireTrigger({ trigger: 'oncore_lead_scored', locationId, companyId, contactId: contact, data: { score, branch } })
  } else if (actionKey === 'oncore_enroll_student') {
    const courseId = (cfg2.course_id || '').trim()
    if (!contact) {
      result = { status: 'refused', detail: 'This step needs a contact to enrol.', targets: 0, priceCents: 0, billed: false }
    } else if (!courseId) {
      result = { status: 'refused', detail: 'This step needs a course to enrol them in.', targets: 0, priceCents: 0, billed: false }
    } else {
      /**
       * UPSERT, NOT INSERT. A workflow can legitimately reach its enrol step
       * twice — a contact re-entering the automation, a retry after a timeout —
       * and the honest answer to "enrol them again" is that they are already
       * enrolled. Erroring there would break a live customer journey over
       * something that is not a problem.
       *
       * The existing row's progress is deliberately NOT reset: someone who
       * re-enters the workflow half way through a course has not un-learned it.
       */
      const { data: existing } = await sb
        .from('crm_course_enrollments')
        .select('id, status, enrolled_at')
        .eq('location_id', locationId)
        .eq('contact_id', contact)
        .eq('course_id', courseId)
        .maybeSingle()

      if (existing) {
        await sb
          .from('crm_course_enrollments')
          .update({ last_activity_at: new Date().toISOString(), stalled_fired_at: null, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        output = { enrollment_id: existing.id, status: 'already_enrolled' }
        result = { status: 'ok', detail: 'Already enrolled — progress left as it was.', targets: 1, priceCents: 0, billed: false }
      } else {
        const { data: row, error } = await sb
          .from('crm_course_enrollments')
          .insert({ company_id: companyId, location_id: locationId, contact_id: contact, course_id: courseId })
          .select('id')
          .single()

        if (error || !row) {
          result = { status: 'failed', detail: 'Could not record the enrolment.', targets: 0, priceCents: 0, billed: false }
        } else {
          output = { enrollment_id: row.id, status: 'enrolled' }
          result = { status: 'ok', detail: 'Enrolled and progress tracking started.', targets: 1, priceCents: 0, billed: false }
        }
      }
    }
  } else if (actionKey === 'oncore_mark_complete') {
    const courseId = (cfg2.course_id || '').trim()
    const moduleId = (cfg2.module_id || '').trim()
    if (!contact || !courseId) {
      result = { status: 'refused', detail: 'This step needs a contact and a course.', targets: 0, priceCents: 0, billed: false }
    } else {
      const { data: row } = await sb
        .from('crm_course_enrollments')
        .select('id, modules_completed, status')
        .eq('location_id', locationId)
        .eq('contact_id', contact)
        .eq('course_id', courseId)
        .maybeSingle()

      if (!row) {
        // Branchable, not an error. Marking an un-enrolled contact complete is
        // a workflow the agency built in the wrong order, and they need to see
        // that rather than have us invent an enrolment to hide it.
        output = { status: 'not_enrolled' }
        result = { status: 'refused', detail: 'That contact is not enrolled in this course.', targets: 0, priceCents: 0, billed: false }
      } else {
        const now = new Date().toISOString()

        if (moduleId) {
          // ONE MODULE. The course stays open — only a step without a module id
          // completes the whole thing, because the CRM has no notion of how many
          // modules a course has and guessing "that was the last one" would end
          // courses early.
          const modules = Array.from(new Set([...(row.modules_completed ?? []), moduleId]))
          await sb
            .from('crm_course_enrollments')
            .update({ modules_completed: modules, last_activity_at: now, stalled_fired_at: null, updated_at: now })
            .eq('id', row.id)
          output = { status: 'module_complete', completed_at: now }
          result = { status: 'ok', detail: `Module recorded — ${modules.length} done.`, targets: 1, priceCents: 0, billed: false }
          void fireTrigger({ trigger: 'oncore_module_completed', locationId, companyId, contactId: contact, data: { course_id: courseId, module_id: moduleId } })
        } else {
          await sb
            .from('crm_course_enrollments')
            .update({ status: 'completed', completed_at: now, last_activity_at: now, stalled_fired_at: null, updated_at: now })
            .eq('id', row.id)
          output = { status: 'completed', completed_at: now }
          result = { status: 'ok', detail: 'Course marked complete.', targets: 1, priceCents: 0, billed: false }
          void fireTrigger({ trigger: 'oncore_course_completed', locationId, companyId, contactId: contact, data: { course_id: courseId } })
        }
      }
    }
  } else {
    result = await executeLeg({
      capability: mapActionToCapability(actionKey),
      locationId,
      params: { ...cfg2, contactId: contact },
      companyId,
      receiptId: receipt?.id,
    })
  }

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
    // Flat keys: workflow fields cannot read a nested object.
    ...output,
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
