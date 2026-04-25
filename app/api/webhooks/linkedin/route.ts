/**
 * LinkedIn Webhooks — Challenge validation + event processing
 *
 * GET  /api/webhooks/linkedin?challengeCode=xxx  — Webhook validation (challenge-response)
 * POST /api/webhooks/linkedin                     — Receive webhook events
 *
 * Spec: https://learn.microsoft.com/en-us/linkedin/shared/api-guide/webhook-validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function getClientSecret(): string {
  return process.env.LINKEDIN_CLIENT_SECRET || ''
}

/**
 * GET — LinkedIn webhook validation (challenge-response)
 *
 * LinkedIn sends: GET /api/webhooks/linkedin?challengeCode=890e4665-4dfe-4ab1-b689-ed553bceeed0
 * We must respond within 3 seconds with:
 * {
 *   "challengeCode": "890e4665-...",
 *   "challengeResponse": "hex-encoded HMACSHA256(challengeCode, clientSecret)"
 * }
 */
export async function GET(req: NextRequest) {
  const challengeCode = req.nextUrl.searchParams.get('challengeCode')

  if (!challengeCode) {
    return NextResponse.json({ error: 'challengeCode required' }, { status: 400 })
  }

  const clientSecret = getClientSecret()
  if (!clientSecret) {
    console.error('[linkedin/webhook] LINKEDIN_CLIENT_SECRET not set')
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  // Compute: HMACSHA256(challengeCode, clientSecret) → hex
  const challengeResponse = createHmac('sha256', clientSecret)
    .update(challengeCode)
    .digest('hex')

  console.log(`[linkedin/webhook] Challenge validated: ${challengeCode.slice(0, 8)}...`)

  return NextResponse.json(
    { challengeCode, challengeResponse },
    { headers: { 'Content-Type': 'application/json' } },
  )
}

/**
 * POST — LinkedIn webhook events
 *
 * LinkedIn sends events with X-LI-Signature header:
 * X-LI-Signature: hmacsha256=<hex-encoded HMACSHA256(body, clientSecret)>
 *
 * We must:
 * 1. Verify the signature
 * 2. Deduplicate by notification ID
 * 3. Process the event
 * 4. Return 2xx
 */
export async function POST(req: NextRequest) {
  const clientSecret = getClientSecret()
  const rawBody = await req.text()

  // Verify signature
  const signature = req.headers.get('x-li-signature')
  if (signature && clientSecret) {
    const computed = 'hmacsha256=' + createHmac('sha256', clientSecret)
      .update(rawBody)
      .digest('hex')

    if (computed !== signature) {
      console.error('[linkedin/webhook] Signature mismatch — rejecting event')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = (payload.eventType || payload.type || 'unknown') as string
  const notificationId = (payload.id || payload.notificationId || '') as string

  console.log(`[linkedin/webhook] Event: ${eventType} | ID: ${notificationId}`)

  // Deduplicate — check if we already processed this notification
  if (notificationId) {
    const { data: existing } = await supabase
      .from('dashboard_notifications')
      .select('id')
      .eq('metadata', JSON.stringify({ linkedin_notification_id: notificationId }))
      .limit(1)

    if (existing && existing.length > 0) {
      console.log(`[linkedin/webhook] Duplicate notification ${notificationId} — skipping`)
      return NextResponse.json({ ok: true, deduplicated: true })
    }
  }

  // Log the event
  try {
    await supabase.from('dashboard_notifications').insert({
      type: 'info',
      title: `LinkedIn: ${eventType}`,
      message: JSON.stringify(payload).slice(0, 500),
      metadata: JSON.stringify({
        linkedin_notification_id: notificationId,
        event_type: eventType,
        received_at: new Date().toISOString(),
      }),
    })
  } catch (err) {
    console.error('[linkedin/webhook] Failed to log event:', err)
  }

  // Process specific event types
  switch (eventType) {
    case 'ORGANIZATION_SOCIAL_ACTION':
    case 'MEMBER_SOCIAL_ACTION':
      // Social engagement event — like, comment, share
      console.log('[linkedin/webhook] Social action received')
      break

    case 'ORGANIZATION_FOLLOWER_NOTIFICATION':
      // New follower
      console.log('[linkedin/webhook] New follower notification')
      break

    case 'LEAD_GEN_FORM_RESPONSE':
      // Lead gen form submission
      console.log('[linkedin/webhook] Lead gen form response — creating CRM contact')
      // TODO: Extract lead data and create CRM contact
      break

    default:
      console.log(`[linkedin/webhook] Unhandled event type: ${eventType}`)
  }

  return NextResponse.json({ ok: true })
}
