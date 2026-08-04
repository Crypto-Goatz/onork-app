import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { listAgencyLocations } from '@/lib/crm/locations'
import { crmGet } from '@/lib/crm'

/**
 * POST /api/ai/query — one question, answered across every client at once.
 *
 * THE THING NO COMPETITOR SCREENSHOT CAN SHOW, because nothing else can read
 * across sub-accounts in one pass. "Who has gone quiet this month", "where are
 * the stalled deals" — asked once, answered for all of them.
 *
 * READ-ONLY, ALWAYS. This route has no write path. Its output is a list of
 * findings, and each finding carries a `command` the user can drop into the
 * command bar — which then goes through plan → approve → run like everything
 * else. Insight never becomes action without the same gate.
 *
 * IT REPORTS WHICH CLIENTS IT COULD NOT READ. An agency-wide answer computed
 * over 9 of 12 clients, presented as if it covered 12, is worse than no answer:
 * the three it missed are invisible and unaccounted for.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const GROQ = 'https://api.groq.com/openai/v1/chat/completions'
/** Reading every client on a large agency would blow the request budget. */
const MAX_CLIENTS = 12

interface Snapshot { name: string; id: string; contacts: number | null; workflows: number | null; error?: string }

export async function POST(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const question = String(body?.question ?? '').trim()
  if (!question) return NextResponse.json({ error: 'Ask a question.' }, { status: 400 })

  const key = process.env.GROQ_API_KEY
  if (!key) return NextResponse.json({ error: 'AI is not configured.' }, { status: 503 })

  const { locations, error } = await listAgencyLocations(session.claims.companyId)
  if (error) return NextResponse.json({ error }, { status: 502 })
  if (!locations.length) return NextResponse.json({ ok: true, findings: [], covered: 0, summary: 'No clients connected yet.' })

  const scope = locations.slice(0, MAX_CLIENTS)
  const truncated = locations.length - scope.length

  const snapshots: Snapshot[] = await Promise.all(scope.map(async (l): Promise<Snapshot> => {
    try {
      const [c, w] = await Promise.all([
        crmGet('/contacts/?limit=1', l.id),
        crmGet('/workflows/', l.id),
      ])
      const cj = c.ok ? await c.json().catch(() => ({})) as { meta?: { total?: number } } : null
      const wj = w.ok ? await w.json().catch(() => ({})) as { workflows?: unknown[] } : null
      if (!c.ok && !w.ok) return { name: l.name, id: l.id, contacts: null, workflows: null, error: `read failed (${c.status})` }
      return {
        name: l.name, id: l.id,
        contacts: cj?.meta?.total ?? null,
        workflows: Array.isArray(wj?.workflows) ? wj.workflows.length : null,
      }
    } catch {
      return { name: l.name, id: l.id, contacts: null, workflows: null, error: 'unreachable' }
    }
  }))

  const readable = snapshots.filter((s) => !s.error)
  const unreadable = snapshots.filter((s) => s.error)

  const system = [
    'You are looking at a summary of every client an agency manages.',
    'Answer their question about the whole book of business.',
    '',
    'RULES',
    '- Use ONLY the numbers given. Never invent a figure.',
    '- Findings are per client, and name the client exactly as given.',
    '- `command` is a plain instruction the agency could run next, naming that',
    '  client — or null when no action follows. Never invent capability.',
    '- If the data cannot answer the question, say so in the summary rather than',
    '  guessing. That is an acceptable answer.',
    '',
    'CLIENTS:',
    ...readable.map((s) => `  ${s.name} — contacts: ${s.contacts ?? 'unknown'}, automations: ${s.workflows ?? 'unknown'}`),
    '',
    'Reply with JSON only: {"summary":string,"findings":[{"client":string,"observation":string,"command":string|null}]}',
  ].join('\n')

  try {
    const r = await fetch(GROQ, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: question }],
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!r.ok) return NextResponse.json({ error: `AI unavailable (${r.status}).` }, { status: 502 })

    const j = await r.json()
    let parsed: { summary?: string; findings?: { client?: string; observation?: string; command?: string | null }[] } = {}
    try { parsed = JSON.parse(j?.choices?.[0]?.message?.content || '{}') } catch { /* below */ }

    const known = new Set(readable.map((s) => s.name))
    return NextResponse.json({
      ok: true,
      summary: String(parsed.summary ?? '').slice(0, 800),
      findings: (parsed.findings ?? [])
        // A finding about a client that was not in the data is a hallucination
        // wearing a real client's clothes.
        .filter((f) => f?.client && known.has(String(f.client)))
        .slice(0, 20)
        .map((f) => ({
          client: String(f.client),
          observation: String(f.observation ?? '').slice(0, 300),
          command: f.command ? String(f.command).slice(0, 300) : null,
        })),
      covered: readable.length,
      // Named, not counted. "3 clients could not be read" is a shrug; naming
      // them is something the agency can act on.
      couldNotRead: unreadable.map((s) => s.name),
      ...(truncated > 0 ? { notLookedAt: truncated } : {}),
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'That did not work.' }, { status: 500 })
  }
}
