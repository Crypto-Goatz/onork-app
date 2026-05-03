/**
 * POST /api/jaxx/ghl
 *
 * The GHL-specialized Jaxx brain endpoint. Powers the Chrome extension,
 * the Slack /0n command (via lib/slack/jaxx routing), and any standalone
 * chat surface that wants workflow-architect responses.
 *
 * Body: { message: string, context?: GhlBrainContext, history?: [...] }
 * Returns: { text: string, traceId: string }
 *
 * Auth: optional Bearer 0n_ token. When present, we hydrate context from
 * the profile so the brain knows the caller's plan + connections + crm
 * location. When absent, we run anonymous (still returns instructions but
 * with placeholder context).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runGhlJaxx, type GhlBrainContext } from '@/lib/jaxx/ghl-brain'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

interface Body {
  message?: string
  context?: GhlBrainContext
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}

async function hydrateContext(token: string | null): Promise<GhlBrainContext | undefined> {
  if (!token || !token.startsWith('0n_')) return undefined
  try {
    const sb = admin()
    const { data: profile } = await sb
      .from('profiles')
      .select('id, email, full_name, tier_level, crm_location_id, settings')
      .eq('access_token', token)
      .maybeSingle()

    if (!profile) return undefined

    const { data: conns } = await sb
      .from('user_connections')
      .select('provider, status')
      .eq('user_id', profile.id)
      .eq('status', 'active')

    const plan =
      profile.tier_level >= 5
        ? 'unlimited'
        : profile.tier_level >= 3
          ? 'pro'
          : profile.tier_level >= 1
            ? 'starter'
            : 'free'

    return {
      caller: {
        user_id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        plan,
        crm_location_id: profile.crm_location_id,
        is_admin: false,
      },
      connections: (conns ?? []).map((c) => c.provider),
      k_layers:
        profile.settings && typeof profile.settings === 'object'
          ? (profile.settings as Record<string, unknown>)
          : {},
    }
  } catch {
    return undefined
  }
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const message = (body.message ?? '').trim()
  if (!message) {
    return NextResponse.json({ error: 'message_required' }, { status: 400 })
  }

  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : null
  const hydrated = body.context ?? (await hydrateContext(token))

  const reply = await runGhlJaxx({
    message,
    context: hydrated,
    history: body.history,
  })

  return NextResponse.json(reply)
}

export async function GET() {
  return NextResponse.json({
    name: 'jaxx-ghl',
    description: 'GHL-specialized Jaxx brain — workflow architect for CRM + 0nCore + 0nMCP',
    method: 'POST',
    body: { message: 'string', context: 'optional', history: 'optional' },
  })
}
