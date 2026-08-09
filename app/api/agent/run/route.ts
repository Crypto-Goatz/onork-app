/**
 * POST /api/agent/run — run an autonomous 0nAGENT for this agency.
 *
 * TWO ENGINES, one endpoint:
 *   • OUR OWN STACK (default) — Groq plans the goal into 0nCORE capabilities and
 *     the burst executor runs them against the connected CRM. Safe by default:
 *     the planner only auto-runs free, implemented, resolved actions; anything
 *     priced/gated/blocked is surfaced but NOT executed. No external daemon.
 *   • PRIME AGENT (optional) — if PRIME_AGENT_ENDPOINT is set, proxy to the RLM
 *     daemon instead (the self-improving upgrade).
 *
 * Auth is the app JWT (companyId from the signed token). Every run is audited.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

export async function POST(req: NextRequest) {
  const token = bearer(req)
  const session = verifyAppJwt(token)
  if (!session.ok) return NextResponse.json({ error: 'Open 0nCORE from your CRM to run an agent.' }, { status: 401 })
  const { companyId } = session.claims

  const body = await req.json().catch(() => ({}))
  const goal = typeof body?.goal === 'string' ? body.goal.trim() : ''
  if (!goal) return NextResponse.json({ error: 'A goal is required.' }, { status: 400 })

  const daemon = (process.env.PRIME_AGENT_ENDPOINT || '').replace(/\/$/, '')

  // ── Path 1: Prime Agent daemon (the RLM upgrade) ──
  if (daemon) {
    try {
      const res = await fetch(daemon + '/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(process.env.PRIME_AGENT_KEY ? { Authorization: `Bearer ${process.env.PRIME_AGENT_KEY}` } : {}) },
        body: JSON.stringify({ goal, gate: body?.gate, maxTurns: Math.min(Number(body?.maxTurns) || 20, 100), maxTokens: Math.min(Number(body?.maxTokens) || 500_000, 2_000_000), autonomous: true }),
        signal: AbortSignal.timeout(30_000),
      })
      const spawn = await res.json().catch(() => ({}))
      await admin().from('agent_actions').insert({ session_id: spawn.sessionId ?? null, tool: 'agent_spawn', gated: false, args: { goal, company_id: companyId, engine: 'prime-agent' }, result_summary: spawn.ok ? 'spawned' : (spawn.error ?? 'failed') }).then(() => {}, () => {})
      if (!res.ok) return NextResponse.json({ error: spawn?.error || `Agent daemon ${res.status}` }, { status: 502 })
      return NextResponse.json({ ok: true, engine: 'prime-agent', sessionId: spawn.sessionId, status: 'running' })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not reach the agent daemon.' }, { status: 502 })
    }
  }

  // ── Path 2: OUR OWN STACK — plan on Groq, execute on the CRM ──
  const base = req.nextUrl.origin
  const hdr = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  try {
    const planRes = await fetch(`${base}/api/burst/plan`, { method: 'POST', headers: hdr, body: JSON.stringify({ command: goal }) })
    const plan = await planRes.json().catch(() => ({}))
    if (!planRes.ok) return NextResponse.json({ error: plan?.error || 'Could not plan the goal.' }, { status: 502 })

    const legs = Array.isArray(plan.legs) ? plan.legs : []
    let ran: unknown[] = []
    let runStatus: string | null = null
    if (plan.planToken) {
      const runRes = await fetch(`${base}/api/burst/run`, { method: 'POST', headers: hdr, body: JSON.stringify({ planToken: plan.planToken }) })
      const runJson = await runRes.json().catch(() => ({}))
      ran = Array.isArray(runJson.results) ? runJson.results : []
      runStatus = runJson.status ?? null
    }

    await admin().from('agent_actions').insert({
      tool: 'agent_run', gated: false,
      args: { goal, company_id: companyId, engine: 'oncore' },
      result_summary: `planned ${legs.length}, ran ${ran.length}${runStatus ? ' (' + runStatus + ')' : ''}`,
    }).then(() => {}, () => {})

    return NextResponse.json({
      ok: true,
      engine: 'oncore',
      goal,
      planned: legs,
      ran,
      runStatus,
      runnableCount: plan.runnableCount ?? 0,
      note: (plan.runnableCount ?? 0) === 0
        ? 'The agent planned these steps but none were auto-runnable yet — priced or unwired actions are surfaced, not executed.'
        : undefined,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'The agent could not run.' }, { status: 502 })
  }
}
