/**
 * POST /api/webhooks/automation/[workflowId]
 *
 * Receives CRM webhook events and executes the associated automation.
 * This is the bridge between "trigger fires" and "workflow runs."
 *
 * Flow:
 * 1. CRM event fires (e.g. ContactCreate)
 * 2. CRM sends POST to this URL with event data
 * 3. We look up the workflow by ID
 * 4. Map the trigger data to workflow variables
 * 5. Execute each step in sequence via the execution engine
 * 6. Log the execution result
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await params
  const admin = getAdmin()

  // 1. Load the workflow
  const { data: workflow, error: wfError } = await admin
    .from('user_workflows')
    .select('*')
    .eq('id', workflowId)
    .eq('status', 'active')
    .single()

  if (wfError || !workflow) {
    return NextResponse.json({ error: 'Workflow not found or inactive' }, { status: 404 })
  }

  // 2. Parse the trigger event data from CRM
  let triggerData: Record<string, unknown> = {}
  try {
    triggerData = await req.json()
  } catch {
    // Some webhooks send form-encoded data
    const text = await req.text()
    try { triggerData = JSON.parse(text) } catch { triggerData = { raw: text } }
  }

  // 3. Extract contact info from CRM webhook payload
  const contactId = triggerData.contactId || triggerData.contact_id ||
    (triggerData as any).contact?.id || (triggerData as any).data?.contactId || ''
  const contactEmail = (triggerData as any).email || (triggerData as any).contact?.email || ''
  const contactName = (triggerData as any).name || (triggerData as any).contact?.name ||
    (triggerData as any).contact?.firstName || ''
  const eventType = (triggerData as any).event || (triggerData as any).type || workflow.trigger_type

  // 4. Build the execution context
  const dotOnFile = workflow.dot_on_file || {}
  const steps = dotOnFile.steps || []

  if (steps.length === 0) {
    return NextResponse.json({ error: 'Workflow has no steps to execute' }, { status: 400 })
  }

  // Map .0n steps to the execution engine format
  const executionSteps = steps.map((step: any) => ({
    id: step.id,
    name: step.input?.name || step.action || step.id,
    tool: mapCapabilityToTool(step.action),
    inputs: {
      contactId: String(contactId),
      contactEmail: String(contactEmail),
      contactName: String(contactName),
      ...((step.input?.config) || {}),
    },
    on_fail: 'skip',
  }))

  // 5. Execute the workflow
  const locationId = workflow.location_id || process.env.CRM_LOCATION_ID || ''
  const startTime = Date.now()
  const results: any[] = []

  const context = {
    trigger: {
      contactId,
      contactEmail,
      contactName,
      eventType,
      ...triggerData,
    },
    outputs: {} as Record<string, unknown>,
    variables: {},
  }

  // Execute each step (import the execution logic inline to avoid circular deps)
  for (const step of executionSteps) {
    const stepStart = Date.now()
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (process.env.INTERNAL_DISPATCH_SECRET) {
        headers['x-internal-secret'] = process.env.INTERNAL_DISPATCH_SECRET
      }
      const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'}/api/automations/execute`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: workflow.user_id,
          workflow: {
            name: workflow.name,
            trigger: { type: eventType, event: eventType, config: {} },
            steps: [step],
            variables: {},
          },
          triggerData: context.trigger,
        }),
      })
      const data = await res.json()
      results.push({
        stepId: step.id,
        name: step.name,
        tool: step.tool,
        status: data.success ? 'success' : 'failed',
        output: data.results?.[0]?.output,
        error: data.results?.[0]?.error,
        duration: Date.now() - stepStart,
      })

      // Store output for next step
      if (data.results?.[0]?.output) {
        context.outputs[step.id] = data.results[0].output
      }
    } catch (err) {
      results.push({
        stepId: step.id,
        name: step.name,
        tool: step.tool,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Execution failed',
        duration: Date.now() - stepStart,
      })
    }
  }

  const totalDuration = Date.now() - startTime
  const succeeded = results.filter(r => r.status === 'success').length
  const failed = results.filter(r => r.status === 'failed').length

  // 6. Log execution
  await admin.from('user_workflows').update({
    last_executed_at: new Date().toISOString(),
    execution_count: (workflow.execution_count || 0) + 1,
  }).eq('id', workflowId)

  // Save execution log
  await admin.from('workflow_executions').insert({
    workflow_id: workflowId,
    user_id: workflow.user_id,
    trigger_type: eventType,
    trigger_data: triggerData,
    steps_total: results.length,
    steps_succeeded: succeeded,
    steps_failed: failed,
    duration_ms: totalDuration,
    results,
    status: failed === 0 ? 'success' : 'partial',
  }).then(() => {}, () => {})

  // Notify user
  await admin.from('dashboard_notifications').insert({
    user_id: workflow.user_id,
    type: failed === 0 ? 'success' : 'warning',
    title: `Automation: ${workflow.name}`,
    message: `Triggered by ${eventType}. ${succeeded}/${results.length} steps completed in ${totalDuration}ms.`,
    metadata: { workflow_id: workflowId, trigger: eventType, results },
  }).then(() => {}, () => {})

  return NextResponse.json({
    success: failed === 0,
    workflow: workflow.name,
    trigger: eventType,
    contactId,
    totalSteps: results.length,
    succeeded,
    failed,
    duration: totalDuration,
    results,
  })
}

/**
 * Maps a capability ID from the visual builder to an execution tool name.
 * The visual builder uses IDs like "trigger_new_lead", "score_hot_leads", etc.
 * The execution engine uses tool names like "crm_add_tag", "ai_score_lead", etc.
 */
function mapCapabilityToTool(capabilityId: string): string {
  const MAP: Record<string, string> = {
    // Triggers don't have tools — they're the entry point
    trigger_new_lead: 'noop',
    trigger_form_submit: 'noop',
    trigger_appointment_booked: 'noop',
    trigger_payment_received: 'noop',
    trigger_tag_added: 'noop',
    trigger_no_response: 'noop',

    // Lead Intelligence
    score_hot_leads: 'ai_score_lead',
    get_fb_lead_cost: 'crm_search_contacts',
    identify_stale_leads: 'crm_search_contacts',
    enrich_contact: 'crm_update_contact',
    qualify_lead: 'crm_update_contact',

    // Communication
    start_email_campaign: 'crm_send_email',
    send_sms: 'crm_send_sms',
    send_website_report: 'ai_generate_content',
    follow_up_no_show: 'crm_send_email',
    send_review_request: 'crm_send_email',

    // Scheduling
    book_appointment: 'crm_create_appointment',
    send_reminder: 'crm_send_sms',
    reschedule_no_shows: 'crm_send_email',

    // Revenue
    create_invoice: 'stripe_create_invoice',
    track_payment: 'crm_search_contacts',
    upsell_alert: 'ai_generate_content',

    // AI
    ai_generate_content: 'ai_generate_content',
    ai_ask_council: 'ai_generate_content',
    ai_classify_intent: 'ai_score_lead',

    // Social
    post_social: 'ai_generate_content',
    monitor_mentions: 'crm_search_contacts',

    // Reports
    daily_summary: 'ai_generate_content',
    weekly_pipeline: 'ai_generate_content',

    // Learn
    learn_custom: 'learn_generate',
    learn_why: 'learn_explain',
    learn_improve: 'learn_generate',
    learn_pattern: 'learn_generate',
    learn_course: 'learn_generate',

    // Service Packager
    package_from_url: 'service_packager_generate',
    package_from_prompt: 'service_packager_generate',
    package_from_mcp: 'service_packager_generate',
    generate_portfolio: 'service_packager_portfolio_add',
    export_fiverr_gig: 'service_packager_export',
    scan_mcp_registry: 'service_packager_sync_registry',
  }

  return MAP[capabilityId] || capabilityId
}
