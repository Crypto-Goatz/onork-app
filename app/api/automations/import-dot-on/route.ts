/**
 * POST /api/automations/import-dot-on
 *
 * Body: { dot_on: <object|string>, answers?: { ... }, save?: boolean }
 *
 * Two modes:
 *   - PREVIEW (default): runs the resolver and returns either the resolved
 *     workflow or { needs_input: true, questions: [...] }.
 *   - SAVE (save=true): same but on success, writes to `user_workflows`,
 *     registers the trigger via the existing /api/automations/activate
 *     pattern, and returns the workflow id.
 *
 * Auth: requires a Supabase session. The user_id + their CRM location
 * (from `profiles.crm_location_id`) drive every CRM lookup.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { resolveDotOn, type ResolvedWorkflow } from '@/lib/0nflow/import-dot-on'

export const runtime = 'nodejs'
export const maxDuration = 60

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

const TRIGGER_TO_CRM_EVENT: Record<string, string[]> = {
  trigger_new_lead: ['ContactCreate'],
  trigger_form_submit: ['FormSubmission'],
  trigger_appointment_booked: ['AppointmentCreate'],
  trigger_payment_received: ['InvoicePaymentReceived'],
  trigger_tag_added: ['ContactTagUpdate'],
  trigger_no_response: [],
  trigger_scheduled: [],
  trigger_recurring: [],
  trigger_webhook: [],
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function registerTrigger(
  workflowId: string,
  triggerType: string,
  locationId: string,
): Promise<{ webhookId?: string; cronSchedule?: string; error?: string }> {
  const events = TRIGGER_TO_CRM_EVENT[triggerType]
  if (!events) return { error: `Unknown trigger: ${triggerType}` }
  if (events.length === 0) {
    return { cronSchedule: '0 9 * * *' } // default daily for time-based
  }

  const pit = process.env.CRM_PIT_AGENCY || process.env.CRM_PIT || ''
  if (!pit) return { error: 'CRM PIT not configured' }

  const webhookUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'
  }/api/webhooks/automation/${workflowId}`

  try {
    const res = await fetch(`${CRM_API}/hooks/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pit}`,
        'Content-Type': 'application/json',
        Version: CRM_VERSION,
      },
      body: JSON.stringify({
        url: webhookUrl,
        events,
        locationId,
        name: `0nCore Automation: ${workflowId.slice(0, 8)}`,
      }),
    })
    const data = await res.json()
    return { webhookId: data.webhook?.id || data.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'webhook register failed' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getAdmin()

    // Resolve user's CRM location
    const { data: profile } = await admin
      .from('profiles')
      .select('crm_location_id')
      .eq('id', user.id)
      .single()
    const locationId = profile?.crm_location_id || process.env.GHL_DEFAULT_LOCATION_ID || ''
    if (!locationId) {
      return NextResponse.json(
        { error: 'No CRM location is connected for this account.' },
        { status: 400 },
      )
    }

    const body = await req.json()
    let raw: unknown = body.dot_on
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw)
      } catch {
        return NextResponse.json(
          { error: 'dot_on must be valid JSON.' },
          { status: 400 },
        )
      }
    }

    const result = await resolveDotOn({
      raw,
      supabase: admin,
      userId: user.id,
      locationId,
      answers: body.answers || {},
    })

    if (!result.ok) {
      return NextResponse.json(result, { status: result.needs_input ? 200 : 400 })
    }

    const workflow = result.workflow as ResolvedWorkflow

    // Preview mode — return the resolved workflow for review
    if (!body.save) {
      return NextResponse.json({
        ok: true,
        preview: true,
        workflow,
      })
    }

    // SAVE mode: persist + activate
    const { data: row, error: insertErr } = await admin
      .from('user_workflows')
      .insert({
        user_id: user.id,
        location_id: locationId,
        name: workflow.name,
        description: workflow.description ?? null,
        dot_on_file: { trigger: workflow.trigger, steps: workflow.steps },
        nodes: workflow.steps,
        edges: [],
        status: 'paused', // start paused; user toggles on
        trigger_type: workflow.trigger.type,
        trigger_config: workflow.trigger.config,
        source_platform: 'dot_on_import',
        source_channel: 'api',
        webhook_id: null,
        cron_schedule: null,
      })
      .select('id, status')
      .single()

    if (insertErr || !row) {
      return NextResponse.json(
        { error: insertErr?.message || 'Save failed' },
        { status: 500 },
      )
    }

    // Register trigger (only if user immediately wants to start active)
    let triggerInfo: { webhookId?: string; cronSchedule?: string; error?: string } = {}
    if (body.activate === true) {
      triggerInfo = await registerTrigger(row.id as string, workflow.trigger.type, locationId)
      await admin
        .from('user_workflows')
        .update({
          status: 'active',
          webhook_id: triggerInfo.webhookId || null,
          cron_schedule: triggerInfo.cronSchedule || null,
        })
        .eq('id', row.id)
    }

    return NextResponse.json({
      ok: true,
      saved: true,
      workflow_id: row.id,
      status: body.activate ? 'active' : 'paused',
      trigger: triggerInfo,
      created: workflow.created,
      swap_notes: workflow.swap_notes,
      edit_url: `/dashboard/automations?workflow=${row.id}`,
      toggle_url: `/api/automations/${row.id}/toggle`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error('[import-dot-on] error', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
