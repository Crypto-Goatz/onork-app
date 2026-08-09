/**
 * POST /api/agent/run — spawn an autonomous 0nAGENT (Prime Agent) for this agency.
 *
 * This is the 0nCORE → daemon bridge. Auth is the agency's app JWT (companyId
 * comes from the signed token, never the body). Budgets are ALWAYS applied and
 * every spawn is mirrored to agent_actions — Prime Agent has no sandbox and
 * documented reward-hacking, so bounded + audited is non-negotiable.
 *
 * Activates the moment PRIME_AGENT_ENDPOINT points at a deployed daemon
 * (agent/Dockerfile in 0nMCP). Until then it returns a clear 503 rather than
 * pretending to work.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_MAX_TURNS = 20
const DEFAULT_MAX_TOKENS = 500_000

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

export async function POST(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Open 0nCORE from your CRM to run an agent.' }, { status: 401 })
  const { companyId } = session.claims

  const endpoint = (process.env.PRIME_AGENT_ENDPOINT || '').replace(/\/$/, '')
  if (!endpoint) {
    return NextResponse.json(
      { error: 'The autonomous agent isn’t connected yet. Deploy the 0nAGENT daemon (agent/Dockerfile) and set PRIME_AGENT_ENDPOINT.' },
      { status: 503 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const goal = typeof body?.goal === 'string' ? body.goal.trim() : ''
  if (!goal) return NextResponse.json({ error: 'A goal is required.' }, { status: 400 })

  // Budgets always bounded.
  const payload = {
    goal,
    gate: typeof body?.gate === 'string' ? body.gate : undefined,
    maxTurns: Math.min(Number(body?.maxTurns) || DEFAULT_MAX_TURNS, 100),
    maxTokens: Math.min(Number(body?.maxTokens) || DEFAULT_MAX_TOKENS, 2_000_000),
    autonomous: true,
  }

  let spawn: { ok?: boolean; sessionId?: string; error?: string } = {}
  try {
    const res = await fetch(endpoint + '/spawn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(process.env.PRIME_AGENT_KEY ? { Authorization: `Bearer ${process.env.PRIME_AGENT_KEY}` } : {}) },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    })
    spawn = await res.json().catch(() => ({}))
    if (!res.ok) return NextResponse.json({ error: spawn?.error || `Agent daemon returned ${res.status}` }, { status: 502 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not reach the agent daemon.' }, { status: 502 })
  }

  // Audit the spawn (what the agent was set loose to do).
  try {
    await admin().from('agent_actions').insert({
      session_id: spawn.sessionId ?? null,
      tool: 'agent_spawn',
      gated: false,
      args: { goal, gate: payload.gate, maxTurns: payload.maxTurns, maxTokens: payload.maxTokens, company_id: companyId },
      result_summary: spawn.ok ? 'spawned' : (spawn.error ?? 'spawn failed'),
    })
  } catch { /* audit advisory */ }

  return NextResponse.json({ ok: true, sessionId: spawn.sessionId, status: 'running' })
}
