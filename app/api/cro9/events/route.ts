/**
 * POST /api/cro9/events
 *
 * Receives browser events from the CRO9 embed script.
 * Open CORS — accept from any origin (the script is on customer pages).
 * Hard fast-path: empty whitelist would still 200, but we DO process events.
 *
 * Stores raw events in cro9_events. The server analysis pipeline
 * (lib/cro9/engine.ts) consumes these for adaptive scoring.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 5

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

const ALLOWED_EVENTS = new Set([
  'pageview',
  'scroll',
  'click',
  'time_on_page',
  'exit_intent',
  'conversion',
  'form_start',
  'form_submit',
  'video_play',
  'cart_add',
  'checkout_start',
])

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

interface IncomingEvent {
  site_slug?: string
  session_id?: string
  event_type?: string
  url?: string
  path?: string
  referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  variant_id?: string
  duration_ms?: number
  scroll_pct?: number
  metadata?: Record<string, unknown>
}

function adPlatformFor(refer: string | null, utmSource: string | null): string | null {
  const s = (utmSource || '').toLowerCase()
  if (s === 'google' || s === 'google_ads' || s === 'adwords') return 'google'
  if (s === 'facebook' || s === 'fb' || s === 'meta') return 'meta'
  if (s === 'instagram' || s === 'ig') return 'meta'
  if (s === 'linkedin') return 'linkedin'
  if (s === 'tiktok') return 'tiktok'
  if (s === 'bing' || s === 'microsoft') return 'bing'
  if (refer && /google\.com\/aclk/.test(refer)) return 'google'
  if (refer && /facebook\.com|instagram\.com/.test(refer)) return 'meta'
  return null
}

export async function POST(req: NextRequest) {
  let body: IncomingEvent = {}
  try {
    body = await req.json()
  } catch {
    return Response.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: CORS })
  }

  const event_type = String(body.event_type || '')
  if (!ALLOWED_EVENTS.has(event_type)) {
    // Drop unknown events (cost-burn rule) — same pattern as /api/webhooks/crm
    return Response.json({ ok: true, dropped: true, reason: 'unknown_event' }, { headers: CORS })
  }

  const site_slug = String(body.site_slug || '').slice(0, 80)
  if (!site_slug) {
    return Response.json({ ok: false, error: 'site_slug_required' }, { status: 400, headers: CORS })
  }

  // IP hash for privacy-aware analytics (no raw IPs stored)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ''
  const ip_hash = ip
    ? createHash('sha256').update(ip + (process.env.CRO9_IP_SALT || 'cro9')).digest('hex').slice(0, 16)
    : null

  const ad_platform = adPlatformFor(body.referrer || null, body.utm_source || null)

  // Insert + heartbeat the embed-sites row
  const { error: insertError } = await admin.from('cro9_events').insert({
    site_slug,
    session_id: String(body.session_id || ''),
    event_type,
    url: body.url ?? null,
    path: body.path ?? null,
    referrer: body.referrer ?? null,
    ad_platform,
    utm_source: body.utm_source ?? null,
    utm_medium: body.utm_medium ?? null,
    utm_campaign: body.utm_campaign ?? null,
    user_agent: req.headers.get('user-agent')?.slice(0, 250) ?? null,
    ip_hash,
    variant_id: body.variant_id ?? null,
    duration_ms: typeof body.duration_ms === 'number' ? Math.min(86_400_000, body.duration_ms) : null,
    scroll_pct: typeof body.scroll_pct === 'number' ? Math.max(0, Math.min(100, body.scroll_pct)) : null,
    metadata: body.metadata ?? {},
  })

  if (insertError) {
    // Postgres' own words, not a generic string. A dropped event that logs
    // nothing is indistinguishable from a site nobody visited.
    console.error('[cro9/events] insert failed', site_slug, event_type, insertError.message)
  }

  // Heartbeat — AWAITED, not fire-and-forget. This ran unawaited and the
  // update never landed: the serverless invocation is frozen the moment the
  // response is returned, so a promise with no one waiting on it is killed
  // mid-flight. last_event_at stayed null on a site receiving events, which
  // reads on every dashboard as "installed, never fired" — the exact opposite
  // of the truth. Costs ~30ms against a 5s budget.
  const { error: beatError } = await admin
    .from('cro9_embed_sites')
    .update({ last_event_at: new Date().toISOString() })
    .eq('site_slug', site_slug)

  if (beatError) {
    console.error('[cro9/events] heartbeat failed', site_slug, beatError.message)
  }

  return Response.json({ ok: true, accepted: event_type }, { headers: CORS })
}
