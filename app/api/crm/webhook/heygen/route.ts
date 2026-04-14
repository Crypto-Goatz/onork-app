/**
 * POST /api/crm/webhook/heygen
 *
 * CRM webhook receiver for HeyGen video generation.
 * HMAC validation, idempotency via crm_webhook_events,
 * fires syncContactVideo async.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncContactVideo } from '@/lib/crm/heygen-sync'

export const runtime = 'nodejs'
export const maxDuration = 300

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ── HMAC Validation ─────────────────────────────────────────────

async function verifyHMAC(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return hex === signature
}

// ── Idempotency ─────────────────────────────────────────────────

async function isProcessed(eventId: string): Promise<boolean> {
  const { data } = await getAdmin()
    .from('crm_webhook_events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle()
  return !!data
}

async function markProcessed(eventId: string, eventType: string) {
  await getAdmin().from('crm_webhook_events').insert({
    id: eventId,
    event_type: eventType,
    processed_at: new Date().toISOString(),
  })
}

// ── Handler ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-crm-signature')
    const secret = process.env.CRM_WEBHOOK_SECRET || process.env.CRM_MARKETPLACE_SHARED_SECRET || ''

    // Validate HMAC if a secret is configured
    if (secret) {
      const valid = await verifyHMAC(rawBody, signature, secret)
      if (!valid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const body = JSON.parse(rawBody)
    const {
      eventId,
      eventType,
      contactId,
      locationId,
      testMode,
    } = body as {
      eventId?: string
      eventType?: string
      contactId: string
      locationId: string
      testMode?: boolean
    }

    if (!contactId || !locationId) {
      return NextResponse.json(
        { error: 'contactId and locationId are required' },
        { status: 400 }
      )
    }

    // Idempotency check
    const dedupId = eventId || `heygen-${contactId}-${Date.now()}`
    if (eventId && (await isProcessed(eventId))) {
      return NextResponse.json({ success: true, message: 'Already processed' })
    }

    // Mark as processed immediately to prevent duplicates
    await markProcessed(dedupId, eventType || 'heygen_generate')

    // Fire sync async (don't block the webhook response)
    syncContactVideo(contactId, locationId, {
      testMode,
      skipPolling: false,
    }).catch((err) => {
      console.error('[crm/webhook/heygen] sync error:', err)
    })

    return NextResponse.json({
      success: true,
      eventId: dedupId,
      message: 'Video generation started',
    })
  } catch (err) {
    console.error('[crm/webhook/heygen] error:', err)
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
