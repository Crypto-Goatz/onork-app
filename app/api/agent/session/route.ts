/**
 * GET /api/agent/session?id=sess_... — poll an 0nAGENT session's status + output.
 * Proxies the deployed Prime Agent daemon. Agency-authed (app JWT).
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'session id required' }, { status: 400 })

  const endpoint = (process.env.PRIME_AGENT_ENDPOINT || '').replace(/\/$/, '')
  if (!endpoint) return NextResponse.json({ error: 'Agent daemon not connected.' }, { status: 503 })

  const headers = process.env.PRIME_AGENT_KEY ? { Authorization: `Bearer ${process.env.PRIME_AGENT_KEY}` } : {}
  try {
    const [statusRes, resultRes] = await Promise.all([
      fetch(`${endpoint}/status/${encodeURIComponent(id)}`, { headers, signal: AbortSignal.timeout(15_000) }),
      fetch(`${endpoint}/result/${encodeURIComponent(id)}`, { headers, signal: AbortSignal.timeout(15_000) }),
    ])
    const status = await statusRes.json().catch(() => ({}))
    const result = await resultRes.json().catch(() => ({}))
    return NextResponse.json({ ok: true, sessionId: id, status: status?.status ?? 'unknown', uptimeMs: status?.uptimeMs, output: result?.output ?? '' })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not reach the agent daemon.' }, { status: 502 })
  }
}
