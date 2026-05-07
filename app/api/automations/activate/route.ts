/**
 * POST /api/automations/activate — Save, register trigger, and activate workflow
 *
 * Full activation flow:
 * 1. Validate workflow (has trigger, all nodes configured)
 * 2. Save to user_workflows table
 * 3. Register the trigger (CRM webhook, Stripe webhook, or cron)
 * 4. Return workflow ID + trigger registration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { toFlowSteps } from '@/lib/automations/to-flow-steps'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'
const FLOW_API_BASE = process.env.FLOW_API_BASE || 'https://www.0nmcp.com'

// ─── Provision a 0nFlow companion when any step has a delay ─────────
async function provisionFlowCompanion(args: {
  workflowId: string
  name: string
  nodes: unknown[]
  edges: unknown[]
  locationId: string
  ownerEmail?: string | null
}): Promise<{ flowSlug?: string; warnings: string[]; error?: string }> {
  const callbackSecret = process.env.FLOW_CALLBACK_SECRET || process.env.INTERNAL_DISPATCH_SECRET || ''
  // Canonical name agreed with the 0nFlow engine team: ONMCP_FLOW_API_TOKEN.
  // Older names kept as fallback so existing deploys don't break mid-rollout.
  const flowApiKey =
    process.env.ONMCP_FLOW_API_TOKEN ||
    process.env.FLOW_API_KEY ||
    process.env.FLOW_TRIGGER_SECRET ||
    ''

  const { steps, hasDelays, warnings } = toFlowSteps(
    args.nodes as Parameters<typeof toFlowSteps>[0],
    args.edges as Parameters<typeof toFlowSteps>[1],
    {
      workflowId: args.workflowId,
      callbackSecret,
    },
  )

  if (!hasDelays) return { warnings }

  const slug = `automation-${args.workflowId}`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (flowApiKey) headers['Authorization'] = `Bearer ${flowApiKey}`

  try {
    const res = await fetch(`${FLOW_API_BASE}/api/flows`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        slug,
        name: args.name,
        owner_product: '0ncore',
        owner_email: args.ownerEmail || undefined,
        default_provider: 'crm',
        default_location_id: args.locationId || undefined,
        steps,
        metadata: { workflow_id: args.workflowId },
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { warnings, error: data?.error || `flow create ${res.status}` }
    }
    return { flowSlug: slug, warnings }
  } catch (err) {
    return { warnings, error: err instanceof Error ? err.message : 'flow create failed' }
  }
}

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// ─── Trigger type → CRM webhook event mapping ───
const TRIGGER_TO_CRM_EVENT: Record<string, string[]> = {
  trigger_new_lead: ['ContactCreate'],
  trigger_form_submit: ['FormSubmission'],
  trigger_appointment_booked: ['AppointmentCreate'],
  trigger_payment_received: ['InvoicePaymentReceived'],
  trigger_tag_added: ['ContactTagUpdate'],
  trigger_no_response: [], // handled by cron, not webhook
}

// ─── Register CRM webhook for a trigger ───
async function registerCrmWebhook(
  workflowId: string,
  triggerType: string,
  locationId: string,
  crmPit: string,
): Promise<{ webhookId?: string; cronSchedule?: string; error?: string }> {
  const events = TRIGGER_TO_CRM_EVENT[triggerType]

  // Time-based triggers use cron instead of webhooks
  if (!events || events.length === 0) {
    if (triggerType === 'trigger_no_response') {
      return { cronSchedule: '0 9 * * *' } // daily at 9am
    }
    return { error: `Unknown trigger type: ${triggerType}` }
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'}/api/webhooks/automation/${workflowId}`

  try {
    // Register webhook with CRM
    const res = await fetch(`${CRM_API}/hooks/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${crmPit}`,
        'Content-Type': 'application/json',
        'Version': CRM_VERSION,
      },
      body: JSON.stringify({
        url: webhookUrl,
        events,
        locationId,
        name: `0nCore Automation: ${workflowId.slice(0, 8)}`,
      }),
    })

    const data = await res.json()

    if (data.webhook?.id || data.id) {
      return { webhookId: data.webhook?.id || data.id }
    }

    // If webhook creation fails, workflow still activates but without auto-trigger
    return { error: data.message || 'Webhook registration failed — workflow saved but trigger is manual' }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'CRM webhook registration failed' }
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, description, dot_on_file, nodes, edges, status } = body

  if (!name || !nodes || nodes.length === 0) {
    return NextResponse.json({ error: 'Name and at least one node required' }, { status: 400 })
  }

  const admin = getAdmin()

  // Get user's CRM location
  const { data: profile } = await admin
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id || ''
  const triggerType = dot_on_file?.triggers?.[0]?.type || 'manual'
  const triggerConfig = dot_on_file?.triggers?.[0]?.config || {}

  // ─── Save workflow ───
  const workflowData = {
    user_id: user.id,
    location_id: locationId,
    name,
    description: description || `${nodes.length} steps`,
    dot_on_file: dot_on_file || {},
    nodes: nodes || [],
    edges: edges || [],
    status: status || 'active',
    trigger_type: triggerType,
    trigger_config: triggerConfig,
    source_platform: 'visual_builder',
    source_channel: 'dashboard',
    last_executed_at: null,
    webhook_id: null as string | null,
    cron_schedule: null as string | null,
  }

  // Check if workflow with same name exists
  const { data: existing } = await admin
    .from('user_workflows')
    .select('id, webhook_id')
    .eq('user_id', user.id)
    .eq('name', name)
    .maybeSingle()

  // If updating existing, clean up old webhook
  if (existing?.webhook_id) {
    const crmPit = process.env.CRM_PIT || ''
    if (crmPit) {
      await fetch(`${CRM_API}/hooks/${existing.webhook_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${crmPit}`, 'Version': CRM_VERSION },
      }).catch(() => {})
    }
  }

  let result
  if (existing) {
    const { data, error } = await admin
      .from('user_workflows')
      .update(workflowData)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  } else {
    const { data, error } = await admin
      .from('user_workflows')
      .insert(workflowData)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  }

  // ─── Provision 0nFlow companion (only if any step has a delay) ───
  const flowResult = await provisionFlowCompanion({
    workflowId: result.id,
    name,
    nodes: nodes || [],
    edges: edges || [],
    locationId,
    ownerEmail: user.email ?? null,
  })

  if (flowResult.flowSlug) {
    await admin
      .from('user_workflows')
      .update({ flow_slug: flowResult.flowSlug })
      .eq('id', result.id)
    result.flow_slug = flowResult.flowSlug
  }

  // ─── Register trigger ───
  let triggerResult: { webhookId?: string; cronSchedule?: string; error?: string } = {}

  if (triggerType !== 'manual' && locationId) {
    const crmPit = process.env.CRM_PIT || ''
    if (crmPit) {
      triggerResult = await registerCrmWebhook(result.id, triggerType, locationId, crmPit)

      // Save webhook/cron ID back to workflow
      if (triggerResult.webhookId || triggerResult.cronSchedule) {
        await admin.from('user_workflows').update({
          webhook_id: triggerResult.webhookId || null,
          cron_schedule: triggerResult.cronSchedule || null,
        }).eq('id', result.id)
      }
    }
  }

  // ─── Log activity ───
  await admin.from('dashboard_notifications').insert({
    user_id: user.id,
    type: 'success',
    title: 'Automation Activated',
    message: `"${name}" is now live with ${nodes.length} steps. Trigger: ${triggerType}.${triggerResult.webhookId ? ' Webhook registered.' : ''}${triggerResult.cronSchedule ? ' Cron scheduled.' : ''}`,
    metadata: {
      workflow_id: result?.id,
      node_count: nodes.length,
      trigger_type: triggerType,
      webhook_id: triggerResult.webhookId,
      cron_schedule: triggerResult.cronSchedule,
    },
  }).then(() => {}, () => {})

  return NextResponse.json({
    success: true,
    workflow: result,
    trigger: {
      type: triggerType,
      webhookId: triggerResult.webhookId || null,
      cronSchedule: triggerResult.cronSchedule || null,
      webhookUrl: triggerResult.webhookId
        ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'}/api/webhooks/automation/${result.id}`
        : null,
      error: triggerResult.error || null,
    },
    flow: flowResult.flowSlug
      ? {
          slug: flowResult.flowSlug,
          warnings: flowResult.warnings,
        }
      : flowResult.error
        ? { error: flowResult.error, warnings: flowResult.warnings }
        : null,
    message: `"${name}" activated with ${nodes.length} steps${flowResult.flowSlug ? ' (time-delayed flow live)' : ''}`,
  })
}
