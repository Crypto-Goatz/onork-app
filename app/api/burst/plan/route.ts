import { NextRequest, NextResponse } from 'next/server'
import {
  plannerCatalogue, capability, legPriceCents, assertExecutable,
} from '@/lib/crm/registry'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { listAgencyLocations, resolveLocation, type AgencyLocation } from '@/lib/crm/locations'
import { IMPLEMENTED } from '@/lib/burst/executor'
import { signPlan, type SignedLeg } from '@/lib/burst/plan-token'

/**
 * POST /api/burst/plan — turn a sentence into a costed, signed plan.
 *
 * PLANNING ONLY. This route cannot write to a CRM and has no path that does.
 * Execution is /api/burst/run, behind a human approval, per the live-write rule:
 * a malformed parse must never reach a client account on its own.
 *
 * THE MODEL CHOOSES IDS, NEVER FREE TEXT. Anything outside the registry is
 * dropped — a hallucinated capability would otherwise become a leg the executor
 * has no handler for.
 *
 * IT IS GROUNDED IN REAL CLIENTS. The model sees the agency's actual
 * sub-accounts and its client names are resolved to ids HERE, server-side,
 * against the same list the dashboard renders. A name that matches two clients
 * is returned as a question rather than a guess.
 *
 * THE PLAN IS SIGNED. What comes back includes a token covering every leg's
 * capability, location and params, and /api/burst/run executes only what that
 * token covers — so "approve" means this plan and not merely some plan.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GROQ = 'https://api.groq.com/openai/v1/chat/completions'

/** What each runnable capability needs. Fed to the model so it fills them in. */
const PARAM_HINTS: Record<string, string> = {
  'contact.create': 'firstName, lastName, email, phone',
  'contact.note': 'contactQuery (who), note (the text)',
  'contact.tag': 'tag, contactQuery (which contacts)',
  'contact.search': 'query, limit',
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const command = String(body?.command ?? '').trim()
  if (!command) return NextResponse.json({ error: 'Say what you want done.' }, { status: 400 })

  const key = process.env.GROQ_API_KEY
  if (!key) return NextResponse.json({ error: 'Planner is not configured.' }, { status: 503 })

  // A session is optional for planning and required for running. Planning
  // without one still works — it just cannot resolve clients or sign anything,
  // which is exactly the state the UI should show as "sign in to run this".
  const session = verifyAppJwt(bearer(req))
  const companyId = session.ok ? session.claims.companyId : null

  let locations: AgencyLocation[] = []
  if (companyId) {
    const res = await listAgencyLocations(companyId)
    locations = res.locations
  }

  const activeLocationId = typeof body?.activeLocationId === 'string' ? body.activeLocationId : null
  const activeLocation = locations.find((l) => l.id === activeLocationId) || null

  const cat = plannerCatalogue()
  const system = [
    "You turn an agency owner's instruction into a plan of steps.",
    '',
    'CAPABILITIES — choose only from these ids:',
    ...cat.map((c) => {
      const flags = [
        c.mechanism === 'blocked' ? '[NOT POSSIBLE]' : '',
        PARAM_HINTS[c.id] ? `params: ${PARAM_HINTS[c.id]}` : '',
      ].filter(Boolean).join(' ')
      return `  ${c.id} — ${c.intent}${flags ? ` ${flags}` : ''}`
    }),
    '',
    ...(locations.length
      ? [
          'CLIENTS on this agency — use these names exactly in `location`:',
          ...locations.slice(0, 120).map((l) => `  ${l.name}`),
          '',
        ]
      : []),
    ...(activeLocation ? [`The user is currently looking at "${activeLocation.name}". If they do not name a client, use that one.`, ''] : []),
    'RULES',
    '- Use ONLY ids from the list. Never invent one.',
    '- One step per distinct action per client. If several clients are named,',
    '  emit one step each — that is the whole point of the command bar.',
    '- `location` must be a client name from the list above, or null.',
    '- Fill `params` with whatever the instruction gives you for that step.',
    '- If the instruction asks for something marked NOT POSSIBLE, still emit',
    '  that id so the interface can explain it. Do not silently substitute.',
    '- `intent` is what YOU will do, in plain words, specific to this request.',
    '',
    'Reply with JSON only: {"legs":[{"capability":string,"intent":string,"location":string|null,"params":object}]}',
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
    let parsed: { legs?: { capability?: string; intent?: string; location?: string | null; params?: unknown }[] } = {}
    try { parsed = JSON.parse(j?.choices?.[0]?.message?.content || '{}') } catch { /* handled below */ }

    const raw = Array.isArray(parsed.legs) ? parsed.legs : []
    const signable: SignedLeg[] = []

    const legs = raw
      .map((l) => {
        const id = String(l?.capability ?? '')
        const cap = capability(id)
        if (!cap) return null                       // hallucinated — drop it
        const check = assertExecutable(id)

        const spoken = l?.location ? String(l.location).slice(0, 80) : null
        const match = resolveLocation(spoken ?? activeLocation?.name, locations)
        const params = (l?.params && typeof l.params === 'object' ? l.params : {}) as Record<string, unknown>

        const price = legPriceCents(id)
        const blocked = !check.ok
        const runnable = !blocked && IMPLEMENTED.has(id) && price === 0

        if (runnable) {
          signable.push({ capability: id, locationId: match.location?.id, params })
        }

        return {
          capability: id,
          intent: String(l?.intent ?? cap.intent).slice(0, 160),
          location: match.location?.name ?? spoken ?? undefined,
          locationId: match.location?.id,
          // A name that matched several clients. Surfaced as a question rather
          // than resolved to a guess.
          ambiguous: match.ambiguous?.map((a) => a.name),
          params,
          priceCents: price,
          blocked,
          insteadOffer: check.ok ? undefined : check.insteadOffer,
          // Honest up front about what Approve will actually do. A step that is
          // planned but unwired says so BEFORE approval, not in the receipt.
          runnable,
          notYetWired: !blocked && !IMPLEMENTED.has(id),
          needsBilling: !blocked && price > 0,
        }
      })
      .filter(Boolean)
      .slice(0, 20)

    const dropped = raw.length - legs.length

    // Only a session-backed plan can be signed, and only signed plans can run.
    const signed = companyId && signable.length
      ? signPlan({ companyId, command, legs: signable })
      : null

    return NextResponse.json({
      ok: true,
      command,
      legs,
      planToken: signed?.token,
      runnableCount: signable.length,
      ...(companyId ? {} : { needsSession: 'Open 0nCORE from inside your CRM to run a plan.' }),
      droppedUnknown: dropped > 0 ? dropped : undefined,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Planning failed.' },
      { status: 500 },
    )
  }
}
