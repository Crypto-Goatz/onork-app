import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { CAPABILITIES, legPriceCents, capability } from '@/lib/crm/registry'

/**
 * Agent tool policy — what a native agent may do on its own.
 *
 * DEFAULT IS 'approve', NOT 'auto', for anything that writes or costs money.
 * An autonomous agent with an unattended key is exactly the thing that can spend
 * or change client accounts at 3am with nobody watching, and "it only did what
 * it was asked" is not a defence when the ask came from a model. Reads default
 * to auto because a read cannot cost or break anything.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

const READ_ONLY = new Set(['contact.search', 'conversation.read', 'workflow.list', 'snapshot.list', 'report.rollup'])

/** What a tool defaults to before the agency has said anything about it. */
export function defaultMode(id: string): 'auto' | 'approve' | 'block' {
  const cap = capability(id)
  if (!cap || cap.mechanism === 'blocked') return 'block'
  if (READ_ONLY.has(id)) return 'auto'
  return 'approve'
}

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const { data } = await admin()
    .from('agent_tool_policy')
    .select('tool, mode')
    .eq('company_id', session.claims.companyId)

  const set = new Map((data ?? []).map((r) => [r.tool, r.mode as string]))

  return NextResponse.json({
    ok: true,
    tools: CAPABILITIES
      .filter((c) => c.mechanism !== 'blocked')
      .map((c) => ({
        id: c.id,
        intent: c.intent,
        priceCents: legPriceCents(c.id),
        writes: !READ_ONLY.has(c.id),
        mode: set.get(c.id) ?? defaultMode(c.id),
        isDefault: !set.has(c.id),
      })),
  })
}

export async function POST(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const tool = String(body?.tool ?? '')
  const mode = String(body?.mode ?? '')
  if (!['auto', 'approve', 'block'].includes(mode)) {
    return NextResponse.json({ error: 'Unknown mode.' }, { status: 400 })
  }
  const cap = capability(tool)
  if (!cap) return NextResponse.json({ error: 'Unknown tool.' }, { status: 400 })
  if (cap.mechanism === 'blocked') {
    // Setting a policy on something the platform cannot do would read as
    // enabling it.
    return NextResponse.json({ error: 'That one cannot be done through the API at all.' }, { status: 400 })
  }

  const { error } = await admin().from('agent_tool_policy').upsert({
    company_id: session.claims.companyId,
    tool,
    mode,
    updated_at: new Date().toISOString(),
  })
  if (error) {
    console.error('[agents/policy]', error)
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, tool, mode })
}
