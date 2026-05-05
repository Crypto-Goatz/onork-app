/**
 * POST /api/webhooks/crm
 *
 * Hard rule: NOTHING from a CRM customer's internal workflow should ever cost
 * us GB-Hours. If it's not on the HANDLED whitelist, we 200 it in <50ms with
 * no DB write, no fan-out, no logging beyond a counter — the receiver becomes
 * a thin null-router for everything we don't actively process.
 *
 * Why this exists:
 *   May 4: spa Mother's Day workflow tagged 3,412 contacts. Every tag-add
 *   fired a webhook to us (because the 0nCore marketplace app subscribed to
 *   contact.tag.added in the GHL Dev Portal). Our handler hung on a fan-out
 *   call → 504 → CRM retried → 5x amplification → ~278 GB-Hrs burned.
 *   Mike's hard rule afterwards: "if it's failing, we cannot be getting
 *   drilled with charges. Ever."
 *
 *   Subscription-side fix: trim the marketplace app's webhook events in the
 *   GHL Dev Portal so we don't even receive these. Belt-and-suspenders here:
 *   even if a future app accidentally subscribes to 50 events, this whitelist
 *   caps the cost.
 *
 * To enable an event: add it to HANDLED + write the actual handler that
 * dequeues from webhook_events_queue. No one-liners — explicit registration.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 5

/**
 * The ONLY events we accept inbound. Anything else gets a fast 200 + drop.
 *
 * As of 2026-05-05 this is intentionally empty — no inbound events feed any
 * production feature in onork-app today. The /vip/spa dashboard pulls live
 * from CRM via PIT (outbound), Stripe webhooks go to /api/webhooks/stripe,
 * and the 0nCore add-on framework's marketplace fan-out is parked.
 *
 * Add events here ONLY when:
 *   1. There's a concrete handler in the drain cron that does something with it
 *   2. The event has been added to the GHL Dev Portal app's webhook subscription
 *   3. We've confirmed the new event volume doesn't blow GB-Hrs at scale
 */
const HANDLED: ReadonlySet<string> = new Set<string>([
  // Intentionally empty — no inbound CRM webhooks are wired to anything yet.
  // When you wire one, add the EXACT eventType string here. e.g.:
  //   'AppointmentCreate',
  //   'OpportunityStatusUpdate',
])

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    // Malformed → accept-and-drop. The CRM should not retry on a 200.
    return NextResponse.json({ received: true, dropped: true, reason: 'invalid_json' })
  }

  const eventType = String(body.type || body.event || body.webhookEvent || 'unknown')

  // ── Whitelist gate ────────────────────────────────────────────────
  // If the event isn't actively wired, return 200 immediately. No DB write.
  // No log. The function exits in <50ms. CRM sees success and never retries.
  if (!HANDLED.has(eventType)) {
    return NextResponse.json({ received: true, dropped: true, event: eventType })
  }

  // ── Below here only runs for events we explicitly opted into ─────
  const locationId = String(body.locationId || body.location_id || '')

  try {
    await admin.from('webhook_events_queue').insert({
      source: 'crm',
      event_type: eventType,
      location_id: locationId || null,
      payload: body,
    })
  } catch (err) {
    console.error('[crm-webhook] enqueue failed:', err instanceof Error ? err.message : err)
  }

  return NextResponse.json({ received: true, queued: true, event: eventType })
}
