// POST /api/webhooks/crm — Handles all inbound CRM marketplace app webhooks
// Events: ContactCreate, ContactUpdate, ContactDelete, AppointmentCreate,
// AppointmentUpdate, OpportunityCreate, OpportunityStatusUpdate,
// ConversationUnreadUpdate, InvoiceCreate, NoteCreate, CampaignStatusUpdate

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const eventType = body.type || body.event || body.webhookEvent || 'unknown'
    const locationId = body.locationId || body.location_id || ''

    // Log every webhook event
    try {
      await supabase.from('dashboard_notifications').insert({
        type: 'info',
        title: `CRM Event: ${eventType}`,
        message: `Location: ${locationId}. ${JSON.stringify(body).slice(0, 200)}`,
        metadata: { event_type: eventType, location_id: locationId, raw: body },
      })
    } catch {}

    // Handle specific events
    switch (eventType) {
      case 'ContactCreate':
      case 'ContactUpdate':
      case 'ContactDelete': {
        // Could sync to local DB or trigger automations
        console.log(`[crm-webhook] ${eventType}: ${body.id || body.contactId || 'unknown'}`)
        break
      }

      case 'AppointmentCreate':
      case 'AppointmentUpdate': {
        console.log(`[crm-webhook] ${eventType}: ${body.id || 'unknown'}`)
        break
      }

      case 'OpportunityCreate':
      case 'OpportunityStatusUpdate': {
        console.log(`[crm-webhook] ${eventType}: ${body.id || 'unknown'} status=${body.status || ''}`)
        break
      }

      case 'ConversationUnreadUpdate': {
        console.log(`[crm-webhook] Unread conversation: ${body.conversationId || body.id || 'unknown'}`)
        break
      }

      case 'InvoiceCreate': {
        console.log(`[crm-webhook] Invoice created: ${body.id || 'unknown'}`)
        break
      }

      default:
        console.log(`[crm-webhook] Unhandled event: ${eventType}`)
    }

    return NextResponse.json({ received: true, event: eventType })
  } catch (err) {
    console.error('[crm-webhook] Error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
