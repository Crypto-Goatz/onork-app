// POST /api/webhooks/crm — Handles all inbound CRM marketplace app webhooks
// Events: ContactCreate, ContactUpdate, ContactDelete, AppointmentCreate,
// AppointmentUpdate, OpportunityCreate, OpportunityStatusUpdate,
// ConversationUnreadUpdate, InvoiceCreate, NoteCreate, CampaignStatusUpdate

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { executeApp, ExecutionContext } from '@/lib/0n-app/executor'
import { OnAppManifest } from '@/lib/0n-app/parser'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const EVENT_MAP: Record<string, string> = {
  'ContactCreate': 'contact.created',
  'ContactUpdate': 'contact.updated',
  'ContactDelete': 'contact.deleted',
  'AppointmentCreate': 'appointment.created',
  'AppointmentUpdate': 'appointment.updated',
  'OpportunityCreate': 'opportunity.created',
  'OpportunityStatusUpdate': 'opportunity.status_updated',
  'InvoiceCreate': 'invoice.created',
  'NoteCreate': 'note.created',
  'ConversationUnreadUpdate': 'conversation.unread',
  'CampaignStatusUpdate': 'campaign.status_updated',
}

async function fanOutToMarketplaceApps(
  rawEventType: string,
  locationId: string,
  payload: Record<string, unknown>,
) {
  const normalizedEvent = EVENT_MAP[rawEventType] || rawEventType.toLowerCase()

  const { data: triggers } = await supabase
    .from('custom_triggers')
    .select('id, user_id, config')
    .eq('trigger_type', 'crm_event')
    .eq('enabled', true)

  if (!triggers || triggers.length === 0) return { fan_out_count: 0, results: [] }

  const matches = triggers.filter(t => {
    const cfg = (t.config as Record<string, unknown>) || {}
    return cfg.event === normalizedEvent || cfg.event === rawEventType
  })

  const results: { installation_id: string; app_slug: string; status: string; error?: string }[] = []

  for (const t of matches) {
    const cfg = (t.config as Record<string, unknown>) || {}
    const installationId = cfg.installation_id as string | undefined
    const appSlug = (cfg.app_slug as string) || 'unknown'
    if (!installationId) continue

    try {
      const { data: install } = await supabase
        .from('user_installed_apps')
        .select('id, user_id, status, config_overrides, marketplace_apps(slug, app_config)')
        .eq('id', installationId)
        .single()

      if (!install || install.status !== 'active') {
        results.push({ installation_id: installationId, app_slug: appSlug, status: 'skipped' })
        continue
      }

      const app = install.marketplace_apps as { slug: string; app_config: OnAppManifest } | null
      if (!app) continue

      const ctx: ExecutionContext = {
        userId: install.user_id,
        installationId: install.id,
        appSlug: app.slug,
        trigger: { source: 'crm_webhook', event: normalizedEvent, location_id: locationId, ...payload },
        outputs: {},
        variables: {},
        config: (install.config_overrides as Record<string, unknown>) || {},
      }

      const exec = await executeApp(app.app_config, ctx)
      results.push({
        installation_id: install.id,
        app_slug: app.slug,
        status: exec.ok ? 'success' : 'failed',
      })
    } catch (err) {
      results.push({
        installation_id: installationId,
        app_slug: appSlug,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return { fan_out_count: matches.length, results }
}

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

    // Fan out to any installed marketplace apps subscribed to this event
    const fanOut = await fanOutToMarketplaceApps(eventType, locationId, body).catch(err => {
      console.error('[crm-webhook] Fan-out failed:', err)
      return { fan_out_count: 0, results: [] }
    })

    return NextResponse.json({
      received: true,
      event: eventType,
      marketplace_fan_out: fanOut,
    })
  } catch (err) {
    console.error('[crm-webhook] Error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
