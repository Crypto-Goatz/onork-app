import { NextResponse } from 'next/server'

/**
 * START-0n Workflow Action
 *
 * Called by the CRM when this action fires in a workflow.
 * Receives contact data + custom fields, routes to 0nMCP for execution.
 */

export async function POST(req: Request) {
  const body = await req.json()

  // CRM sends: contactId, locationId, workflowId, actionId, + any custom fields
  const {
    contactId,
    locationId,
    workflowId,
    automation_name,
    action_type,
    custom_message,
  } = body

  console.log(`[workflow-action] START-0n fired: location=${locationId} contact=${contactId} action=${action_type}`)

  try {
    // Route to the appropriate 0nMCP action based on action_type
    const result = await executeAction({
      contactId,
      locationId,
      actionType: action_type || 'default',
      automationName: automation_name || 'START-0n',
      customMessage: custom_message || '',
      payload: body,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (err: any) {
    console.error('[workflow-action] Error:', err.message)
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 })
  }
}

async function executeAction(input: {
  contactId: string
  locationId: string
  actionType: string
  automationName: string
  customMessage: string
  payload: any
}) {
  // This is where 0nMCP takes over
  // For now, log and return success — will wire to 0nMCP execution engine

  const actions: Record<string, () => Promise<any>> = {
    score_lead: async () => ({ action: 'score_lead', score: 75, label: 'warm' }),
    send_email: async () => ({ action: 'send_email', sent: true }),
    send_sms: async () => ({ action: 'send_sms', sent: true }),
    book_appointment: async () => ({ action: 'book_appointment', booked: true }),
    add_to_nurture: async () => ({ action: 'add_to_nurture', enrolled: true }),
    generate_content: async () => ({ action: 'generate_content', generated: true }),
    voice_ai_call: async () => ({ action: 'voice_ai_call', initiated: true }),
    enrich_contact: async () => ({ action: 'enrich_contact', enriched: true }),
    default: async () => ({ action: 'start_0n', executed: true }),
  }

  const handler = actions[input.actionType] || actions.default
  return handler()
}
