import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { listAgents, executeAgent } from '@/lib/crm/agents'

/**
 * POST /api/widgets/chat — the chat bubble's brain.
 *
 * BACKED BY THE CLIENT'S OWN AGENT, not a generic model. The agency has already
 * written what their agent knows and how it should speak; running a separate
 * prompt here would give their website a different personality from their SMS
 * and inbox, which is worse than having no bubble at all.
 *
 * Public and unauthenticated by nature — it is a widget on a stranger's site —
 * so it is rate-limited, it only ever READS an agent, and it refuses unless the
 * agency switched the widget on for that client.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 45

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }

const hits = new Map<string, { n: number; resetAt: number }>()
function throttled(k: string) {
  const now = Date.now()
  const r = hits.get(k)
  if (!r || now > r.resetAt) { hits.set(k, { n: 1, resetAt: now + 60_000 }); if (hits.size > 5000) hits.clear(); return false }
  r.n += 1
  return r.n > 15
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const locationId = String(body?.locationId ?? '').slice(0, 64)
  const message = String(body?.message ?? '').trim().slice(0, 1000)
  if (!locationId || !message) return NextResponse.json({ error: 'Nothing to answer.' }, { status: 400, headers: CORS })
  if (throttled(locationId)) return NextResponse.json({ error: 'Too many messages just now.' }, { status: 429, headers: CORS })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data: cfg } = await sb.from('widget_configs')
    .select('enabled, config').eq('widget_key', 'oncore_chat').eq('location_id', locationId).maybeSingle()
  if (!cfg?.enabled) return NextResponse.json({ error: 'Chat is not switched on here.' }, { status: 403, headers: CORS })

  const { agents } = await listAgents(locationId)
  // Prefer an ACTIVE agent — an inactive one is one the agency deliberately
  // switched off, and answering the public with it would override that.
  const target = agents.find((a) => a.status === 'active')
  if (!target) {
    return NextResponse.json({ reply: 'Thanks for the message — someone will come back to you shortly.' }, { headers: CORS })
  }

  const r = await executeAgent({ locationId, agentId: target.id, message })
  if (!r.ok || !r.reply) {
    return NextResponse.json({ reply: 'Thanks for the message — someone will come back to you shortly.' }, { headers: CORS })
  }
  return NextResponse.json({ reply: r.reply }, { headers: CORS })
}
