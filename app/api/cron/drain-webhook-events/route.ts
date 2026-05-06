/**
 * GET /api/cron/drain-webhook-events
 *
 * Pulls a batch of pending events from webhook_events_queue and runs the
 * marketplace-app fan-out for each. This is the async tail of the CRM
 * webhook receiver — splitting receive/process is what kept May 4's burn
 * from happening: a slow upstream now blocks ONE drain pass, not the
 * webhook itself.
 *
 * Auth: Vercel cron header OR Bearer CRON_SECRET (or ?manual=1 for dev).
 * Schedule: every minute (vercel.json).
 * maxDuration: 50s — leaves headroom under Vercel's 60s ceiling.
 *
 * Per-event hard timeout: 8s. Anything slower gets re-queued with backoff
 * up to max_attempts. After max_attempts, the row goes to status='failed'
 * and is left for inspection (no auto-purge).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { executeApp, ExecutionContext } from '@/lib/0n-app/executor'
import { OnAppManifest } from '@/lib/0n-app/parser'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 50

const PER_EVENT_TIMEOUT_MS = 8_000
const BATCH_SIZE = 50

// Same EVENT_MAP we used to use in the receiver — only here now.
const EVENT_MAP: Record<string, string> = {
  ContactCreate: 'contact.created',
  ContactUpdate: 'contact.updated',
  ContactDelete: 'contact.deleted',
  AppointmentCreate: 'appointment.created',
  AppointmentUpdate: 'appointment.updated',
  OpportunityCreate: 'opportunity.created',
  OpportunityStatusUpdate: 'opportunity.status_updated',
  InvoiceCreate: 'invoice.created',
  NoteCreate: 'note.created',
  ConversationUnreadUpdate: 'conversation.unread',
  CampaignStatusUpdate: 'campaign.status_updated',
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface QueueRow {
  id: string
  source: string
  event_type: string
  location_id: string | null
  payload: Record<string, unknown>
  attempts: number
  max_attempts: number
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms)
    p.then((v) => {
      clearTimeout(t)
      resolve(v)
    }).catch((e) => {
      clearTimeout(t)
      reject(e)
    })
  })
}

async function processOne(row: QueueRow): Promise<void> {
  const sb = admin()
  const normalizedEvent = EVENT_MAP[row.event_type] || row.event_type.toLowerCase()

  // Find marketplace-app triggers subscribed to this event.
  const { data: triggers } = await sb
    .from('custom_triggers')
    .select('id, user_id, config')
    .eq('trigger_type', 'crm_event')
    .eq('enabled', true)

  const matches = (triggers || []).filter((t) => {
    const cfg = (t.config as Record<string, unknown>) || {}
    return cfg.event === normalizedEvent || cfg.event === row.event_type
  })

  if (matches.length === 0) return

  for (const t of matches) {
    const cfg = (t.config as Record<string, unknown>) || {}
    const installationId = cfg.installation_id as string | undefined
    if (!installationId) continue

    const { data: install } = await sb
      .from('user_installed_apps')
      .select('id, user_id, status, config_overrides, marketplace_apps(slug, app_config)')
      .eq('id', installationId)
      .single()

    if (!install || install.status !== 'active') continue

    const rawApp = install.marketplace_apps as unknown
    const app = (Array.isArray(rawApp) ? rawApp[0] : rawApp) as
      | { slug: string; app_config: OnAppManifest }
      | null
    if (!app) continue

    const ctx: ExecutionContext = {
      userId: install.user_id,
      installationId: install.id,
      appSlug: app.slug,
      trigger: {
        source: 'crm_webhook',
        event: normalizedEvent,
        location_id: row.location_id || '',
        ...row.payload,
      },
      outputs: {},
      variables: {},
      config: (install.config_overrides as Record<string, unknown>) || {},
    }

    // Per-app hard timeout. If any single match hangs, abandon it and
    // continue with the next. The whole event row gets retry credit.
    await withTimeout(executeApp(app.app_config, ctx), PER_EVENT_TIMEOUT_MS)
  }
}

export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  const auth = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET || ''
  const isCronSecret = !!cronSecret && auth === `Bearer ${cronSecret}`
  const isManual = req.url.includes('manual=1')
  if (!isVercelCron && !isCronSecret && !isManual) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = admin()

  // Atomic claim — picks N pending rows and flips them to processing.
  const { data: claimed, error: claimErr } = await sb.rpc('webhook_events_claim', {
    claim_limit: BATCH_SIZE,
  })

  if (claimErr) {
    return NextResponse.json({ error: claimErr.message }, { status: 500 })
  }

  const rows: QueueRow[] = (claimed as QueueRow[]) || []
  const results: { id: string; status: 'done' | 'retry' | 'failed'; error?: string }[] = []

  for (const row of rows) {
    try {
      await withTimeout(processOne(row), PER_EVENT_TIMEOUT_MS + 1000)
      await sb
        .from('webhook_events_queue')
        .update({ status: 'done', processed_at: new Date().toISOString(), error: null })
        .eq('id', row.id)
      results.push({ id: row.id, status: 'done' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const giveUp = row.attempts >= row.max_attempts
      // Exponential-ish backoff: 1m, 2m, 4m, 8m, 16m
      const backoffMin = Math.min(16, Math.pow(2, row.attempts - 1))
      const nextRetry = new Date(Date.now() + backoffMin * 60_000).toISOString()

      await sb
        .from('webhook_events_queue')
        .update({
          status: giveUp ? 'failed' : 'pending',
          processed_at: giveUp ? new Date().toISOString() : null,
          next_retry_at: giveUp ? null : nextRetry,
          error: msg.slice(0, 500),
        })
        .eq('id', row.id)
      results.push({ id: row.id, status: giveUp ? 'failed' : 'retry', error: msg })
    }
  }

  return NextResponse.json({
    drained_at: new Date().toISOString(),
    claimed: rows.length,
    done: results.filter((r) => r.status === 'done').length,
    retry: results.filter((r) => r.status === 'retry').length,
    failed: results.filter((r) => r.status === 'failed').length,
  })
}
