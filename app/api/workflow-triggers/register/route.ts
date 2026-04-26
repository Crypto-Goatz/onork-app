// POST /api/workflow-triggers/register — Register a GHL workflow for 0nCore event triggers
// When a user adds "OnCore Event" trigger to a GHL workflow, this stores what events they want.
// When those events happen, 0nCore fires the workflow via the GHL workflow webhook.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // GHL sends registration data when trigger is configured
    const {
      source = 'any',
      event_type = '',
      min_score,
      // GHL provides these
      locationId,
      workflowId,
      webhookUrl, // URL to call when we want to fire this trigger
    } = body.data || body

    const extras = body.extras || {}
    const loc = locationId || extras.locationId || ''
    const wf = workflowId || extras.workflowId || ''

    // Store the trigger registration
    const { error } = await supabase.from('workflow_trigger_registrations').upsert({
      location_id: loc,
      workflow_id: wf,
      source,
      event_type: event_type || null,
      min_score: min_score ? parseInt(min_score) : null,
      webhook_url: webhookUrl || '',
      status: 'active',
      registered_at: new Date().toISOString(),
    }, { onConflict: 'location_id,workflow_id' })

    if (error) {
      console.error('[trigger-register] DB error:', error)
    }

    return NextResponse.json({
      success: true,
      registered: true,
      source,
      event_type: event_type || 'all',
      message: `Trigger registered for ${source} events`,
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: (err as Error).message,
    }, { status: 500 })
  }
}
