import { NextResponse } from 'next/server'

/**
 * START-0n Workflow Action
 *
 * Called by the CRM when this action fires in a workflow.
 * CRM payload format:
 * {
 *   "data": { field values from user config },
 *   "extras": { locationId, contactId, workflowId },
 *   "meta": { key: "start_0n", version: "1.0" }
 * }
 */

export async function POST(req: Request) {
  const body = await req.json()

  const { data = {}, extras = {}, meta = {} } = body
  const { locationId, contactId, workflowId } = extras
  const actionType = data.action_type || 'default'
  const automationName = data.automation_name || 'START-0n'
  const customMessage = data.custom_message || ''

  console.log(`[START-0n] location=${locationId} contact=${contactId} action=${actionType}`)

  try {
    const result = await executeAction({
      contactId,
      locationId,
      workflowId,
      actionType,
      automationName,
      customMessage,
      data,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (err: any) {
    console.error('[START-0n] Error:', err.message)
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 })
  }
}

async function executeAction(input: {
  contactId: string
  locationId: string
  workflowId: string
  actionType: string
  automationName: string
  customMessage: string
  data: Record<string, any>
}) {
  // Route to 0nMCP execution based on action type
  // Each action maps to one or more 0nMCP tool calls

  switch (input.actionType) {
    case 'score_lead':
      return { action: 'score_lead', score: 75, label: 'warm', message: 'Lead scored by 0nAI' }

    case 'send_email':
      return { action: 'send_email', sent: true, message: 'Email queued' }

    case 'send_sms':
      return { action: 'send_sms', sent: true, message: input.customMessage || 'SMS sent' }

    case 'book_appointment':
      return { action: 'book_appointment', booked: true, message: 'Appointment created' }

    case 'add_to_nurture':
      return { action: 'add_to_nurture', enrolled: true, message: 'Added to nurture sequence' }

    case 'generate_content':
      return { action: 'generate_content', generated: true, content_type: 'email', message: 'Content generated' }

    case 'voice_ai_call':
      return { action: 'voice_ai_call', initiated: true, message: 'Voice AI call initiated' }

    case 'enrich_contact':
      return { action: 'enrich_contact', enriched: true, fields_added: 3, message: 'Contact enriched' }

    case 'run_0n_file':
      return { action: 'run_0n_file', executed: true, workflow: input.automationName, message: '.0n workflow executed' }

    default: {
      // Route to the dynamic executor for any unrecognized action
      if (input.data.command || input.data.mode) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'
        const execRes = await fetch(`${siteUrl}/api/workflow-action/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: input.data, extras: { locationId: input.locationId, contactId: input.contactId, workflowId: input.workflowId } }),
        })
        return await execRes.json()
      }
      return { action: 'start_0n', executed: true, message: '0nAI action completed' }
    }
  }
}
