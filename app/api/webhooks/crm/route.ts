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
 * As of 2026-05-18: 3 LIFECYCLE events are wired for the public marketplace
 * launch. These are low-volume (one event per install/uninstall/rename per
 * user, not per-contact) so they can be handled inline without queuing.
 *
 * High-volume events (contact.*, conversation.*, opportunity.*) remain off
 * the whitelist — they require the queued drain pipeline first, and the
 * May 4 incident (278 GB-Hrs burned on tag-add fan-out) is the case-study
 * for why.
 *
 * Add events here ONLY when:
 *   1. There's a concrete handler that does something with it
 *   2. The event has been added to the marketplace app's webhook subscription
 *   3. We've confirmed the new event volume doesn't blow GB-Hrs at scale
 */
const HANDLED: ReadonlySet<string> = new Set<string>([
  // Lifecycle (low volume, handled inline below)
  'INSTALL',          // canonical marketplace install event
  'UNINSTALL',        // canonical marketplace uninstall event
  'LocationUpdate',   // sub-location renamed/branding changed
  // Lowercase / dot-notation variants — defensive, since the CRM marketplace
  // platform has used different conventions in different release notes
  'install',
  'uninstall',
  'app.installation',
  'app.uninstall',
  'location.update',
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
  const companyId = String(body.companyId || body.company_id || '')
  const appId = String(body.appId || body.app_id || '')

  // Always queue for audit / replay
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

  // ── Inline lifecycle handlers — low volume, no fan-out, safe to run sync ──
  try {
    const normalized = eventType.toLowerCase()
    if (normalized === 'install' || normalized === 'app.installation') {
      // OAuth callback is the canonical install path. This event is
      // belt-and-suspenders: mark the install as confirmed-by-CRM.
      if (locationId) {
        await admin.from('crm_installations')
          .update({ status: 'active', last_health_check: new Date().toISOString() })
          .eq('location_id', locationId)
          .eq('app_id', appId || process.env.CRM_MARKETPLACE_APP_ID || '69c762225a31e1cd2f28dd4c')
      }
    } else if (normalized === 'uninstall' || normalized === 'app.uninstall') {
      // Hard requirement for a public marketplace app — clean up when a
      // user removes us from their sub-location.
      if (locationId) {
        await admin.from('crm_installations')
          .update({
            status: 'uninstalled',
            access_token: null,
            refresh_token: null,
            last_health_check: new Date().toISOString(),
          })
          .eq('location_id', locationId)

        // Clear the user's crm_location_id pointer so the next /welcome render
        // shows them the claim-workspace banner instead of a stale dead link.
        await admin.from('profiles')
          .update({ crm_location_id: null })
          .eq('crm_location_id', locationId)
      }
    } else if (normalized === 'locationupdate' || normalized === 'location.update') {
      // Sub-location renamed / branding changed. Update our metadata cache.
      if (locationId) {
        await admin.from('crm_installations')
          .update({
            metadata: { last_location_update_at: new Date().toISOString(), ...((body.location || {}) as Record<string, unknown>) },
          })
          .eq('location_id', locationId)
      }
    }
  } catch (err) {
    console.error(`[crm-webhook] ${eventType} handler failed:`, err instanceof Error ? err.message : err)
    // Still return 200 — we logged + queued; don't let CRM retry-storm us
  }

  return NextResponse.json({ received: true, queued: true, event: eventType, companyId: companyId || undefined })
}
