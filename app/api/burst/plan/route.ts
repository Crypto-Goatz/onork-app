import { NextRequest, NextResponse } from 'next/server'
import {
  plannerCatalogue, capability, legPriceCents, assertExecutable,
} from '@/lib/crm/registry'

/**
 * POST /api/burst/plan — turn a sentence into a costed plan.
 *
 * PLANNING ONLY. This route cannot write to a CRM and has no path that does.
 * It reads the registry, asks the model to pick capability IDs from it, prices
 * the result, and returns it. Execution is a separate route with a separate
 * approval, per the live-write rule: a malformed parse must never be able to
 * reach a client account.
 *
 * THE MODEL CHOOSES IDS, NEVER FREE TEXT. Anything it returns that is not in
 * the registry is dropped here — a hallucinated capability would otherwise
 * become a leg the executor has no handler for, which is a plan that looks
 * right and does nothing.
 *
 * Blocked capabilities are kept in the response rather than filtered out, with
 * their alternative, so the UI can say what it cannot do and what it will do
 * instead. Silence would read as the assistant not understanding.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GROQ = 'https://api.groq.com/openai/v1/chat/completions'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const command = String(body?.command ?? '').trim()
  if (!command) return NextResponse.json({ error: 'Say what you want done.' }, { status: 400 })

  const key = process.env.GROQ_API_KEY
  if (!key) return NextResponse.json({ error: 'Planner is not configured.' }, { status: 503 })

  const cat = plannerCatalogue()
  const system = [
    'You turn an agency owner\'s instruction into a plan of steps.',
    '',
    'CAPABILITIES — choose only from these ids:',
    ...cat.map((c) => `  ${c.id} — ${c.intent}${c.mechanism === 'blocked' ? ' [NOT POSSIBLE]' : ''}`),
    '',
    'RULES',
    '- Use ONLY ids from the list. Never invent one.',
    '- One step per distinct action per client. If several clients are named,',
    '  emit one step each — that is the whole point of the command bar.',
    '- `location` is the client name exactly as the user said it, or null.',
    '- If the instruction asks for something marked NOT POSSIBLE, still emit',
    '  that id so the interface can explain it. Do not silently substitute.',
    '- `intent` is what YOU will do, in plain words, specific to this request.',
    '',
    'Reply with JSON only: {"legs":[{"capability":string,"intent":string,"location":string|null}]}',
  ].join('\n')

  try {
    const r = await fetch(GROQ, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: command }],
      }),
      signal: AbortSignal.timeout(25000),
    })
    if (!r.ok) {
      return NextResponse.json({ error: `Planner unavailable (${r.status}).` }, { status: 502 })
    }

    const j = await r.json()
    let parsed: { legs?: { capability?: string; intent?: string; location?: string | null }[] } = {}
    try { parsed = JSON.parse(j?.choices?.[0]?.message?.content || '{}') } catch { /* handled below */ }

    const raw = Array.isArray(parsed.legs) ? parsed.legs : []
    const legs = raw
      .map((l) => {
        const id = String(l?.capability ?? '')
        const cap = capability(id)
        if (!cap) return null                       // hallucinated — drop it
        const check = assertExecutable(id)
        return {
          capability: id,
          intent: String(l?.intent ?? cap.intent).slice(0, 160),
          location: l?.location ? String(l.location).slice(0, 80) : undefined,
          priceCents: legPriceCents(id),
          blocked: !check.ok,
          insteadOffer: check.ok ? undefined : check.insteadOffer,
        }
      })
      .filter(Boolean)
      .slice(0, 20)

    const dropped = raw.length - legs.length

    return NextResponse.json({
      ok: true,
      command,
      legs,
      // Surfaced rather than swallowed: if the model keeps reaching for
      // something the registry lacks, that is a signal about what to build.
      droppedUnknown: dropped > 0 ? dropped : undefined,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Planning failed.' },
      { status: 500 },
    )
  }
}
