import { NextResponse } from 'next/server'

/**
 * Trigger Subscription Endpoint
 *
 * CRM calls this when a user adds our trigger to a workflow.
 * We receive the webhook URL to call when the event fires.
 * Store it so 0nMCP knows where to send trigger events.
 */

export async function POST(req: Request) {
  const body = await req.json()

  // CRM sends: workflowId, locationId, webhookUrl (where to POST when trigger fires)
  console.log('[trigger-subscribe]', JSON.stringify(body))

  // Store the subscription — in production, save to Supabase
  // For now, acknowledge the subscription
  return NextResponse.json({ success: true })
}
