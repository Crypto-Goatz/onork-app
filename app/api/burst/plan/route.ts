import { NextRequest, NextResponse } from 'next/server'
import {
  plannerCatalogue, capability, legPriceCents, assertExecutable, tokenAudienceFor,
} from '@/lib/crm/registry'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { listConnectedClients, resolveLocation, type AgencyLocation } from '@/lib/crm/locations'
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
  'contact.note': 'contactQuery (a plain name/email/phone — NOT a query expression), note (the text)',
  'contact.tag': 'tag, contactQuery (a plain name/email/phone — NOT a query expression)',
  'contact.search': 'query (plain words, or omit for all), limit',
  'contact.update': 'contactQuery (who), then any of firstName, lastName, email, phone, city',
  'sms.send': 'contactQuery (who), message',
  'email.send': 'contactQuery (who), subject, body',
  'conversation.read': 'limit',
  'conversation.summarize': 'contactQuery (whose history to summarise)',
  'customfield.create': 'name, dataType (TEXT/NUMERICAL/DATE)',
  'task.create': 'contactQuery (who), title, body, dueDate',
  'workflow.trigger': 'contactQuery (who), workflow (its name)',
  'agent.run': 'agent (name, optional), message',
  'agent.create': 'name, prompt (what it should do)',
  'agent.list': '',
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const command = String(body?.command ?? '').trim()
  if (!command) return NextResponse.json({ error: 'Say what you want done.' }, { status: 400 })

  /**
   * Key POOL, falling back to the single key.
   *
   * The command bar is the product's front door, and it was failing outright on
   * a 429 — a burst of commands, or a shared daily cap, and the whole surface
   * reads as broken. The course generator already rotates a pool; this had no
   * retry at all. Adding keys to GROQ_API_KEYS now widens the cap with no code
   * change.
   */
  const keys = [
    process.env.GROQ_API_KEYS || '',
    process.env.GROQ_API_KEY || '',
    // Already provisioned and previously unread — the planner ran on one key
    // while a second sat unused.
    process.env.GROQ_API_KEY_FALLBACK || '',
  ].join(',').split(',').map((k) => k.trim()).filter(Boolean)
  if (keys.length === 0) {
    return NextResponse.json({ error: 'Planner is not configured.' }, { status: 503 })
  }

  // A session is optional for planning and required for running. Planning
  // without one still works — it just cannot resolve clients or sign anything,
  // which is exactly the state the UI should show as "sign in to run this".
  const session = verifyAppJwt(bearer(req))
  const companyId = session.ok ? session.claims.companyId : null

  /**
   * CONNECTED clients only — never the agency's whole CRM roster.
   *
   * The roster is 87 sub-accounts for a real agency; we hold a key for the ones
   * that were switched on and cannot act in the rest. Planning against an
   * account that can never run produces a leg that only ever fails, and it put
   * 87 names into every prompt.
   */
  let locations: AgencyLocation[] = []
  let defaultLocation: AgencyLocation | null = null
  if (companyId) {
    locations = await listConnectedClients(companyId)

    /**
     * The client a command means when it names none.
     *
     * Setup tells the agency in as many words that the free account "becomes
     * the default for every command unless you name a different client". That
     * was never implemented, so a perfectly good three-part instruction came
     * back with every leg unrunnable for want of a client the product had
     * already promised to assume.
     *
     * Falls back to the sole connected client: with one client there is no
     * ambiguity to protect anyone from.
     */
    const { createServiceClient } = await import('@/lib/connect/service-client')
    const db = createServiceClient()
    if (db) {
      const { data } = await db
        .from('agency_connections')
        .select('free_location_id')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      const freeId = data?.free_location_id
      defaultLocation = locations.find((l) => l.id === freeId) ?? null
    }
    if (!defaultLocation && locations.length === 1) defaultLocation = locations[0]
  }

  const activeLocationId = typeof body?.activeLocationId === 'string' ? body.activeLocationId : null
  // An explicitly selected client beats the default; the default beats nothing.
  const activeLocation = locations.find((l) => l.id === activeLocationId) || defaultLocation

  /**
   * Answers to "which client did you mean?", keyed by the phrase the user said.
   *
   * An agency can have several sub-accounts with the SAME name — there are three
   * called "RocketOpp LLC" — so the name is not a usable answer and neither is
   * asking the user to retype it. The UI offers the candidates as buttons and
   * sends back the id they picked; only ids are honoured here, and only ids that
   * belong to this agency, so a pin can never widen what a plan may touch.
   */
  const pins = new Map<string, string>()
  if (body?.pins && typeof body.pins === 'object') {
    for (const [spoken, id] of Object.entries(body.pins as Record<string, unknown>)) {
      if (typeof id === 'string' && locations.some((l) => l.id === id)) {
        pins.set(spoken.trim().toLowerCase(), id)
      }
    }
  }

  /**
   * Only the clients this command could plausibly mean.
   *
   * The full list was sent on EVERY request: 87 names is ~600 tokens, and with
   * the capability catalogue the system prompt reached ~1,520 tokens. Against a
   * 12,000 tokens/minute ceiling that capped the entire product at about seven
   * commands a minute — which is what actually caused the sweep to 429, not a
   * daily cap.
   *
   * Matching is generous on purpose: any name sharing a word of 4+ characters
   * with the command, plus the active client. If that finds too few, fall back
   * to a capped slice — a shortlist that omits the intended client would turn a
   * capacity problem into a correctness one.
   */
  // Connected clients are few by definition — one on a new agency. A shortlist
  // was only ever needed because the roster was being sent instead.
  const shortlist = locations.slice(0, 40)

  // Nothing connected means nothing can run. Say so before planning work that
  // could only fail.
  if (companyId && locations.length === 0) {
    return NextResponse.json({
      error: 'No clients are connected yet. Add one in Clients, then try that again.',
      legs: [], runnableCount: 0,
    }, { status: 400 })
  }

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
    ...(shortlist.length
      ? [
          'CLIENTS on this agency — use these names exactly in `location`:',
          ...shortlist.map((l) => `  ${l.name}`),
          ...(shortlist.length < locations.length
            ? [`  (+${locations.length - shortlist.length} more not shown — if the client you need is not listed, set location to null)`]
            : []),
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
    '- Search params are PLAIN TEXT the CRM matches on — a name, an email, a',
    '  phone. Never SQL, never `field = value`, never an operator.',
    '- If the instruction asks for something marked NOT POSSIBLE, still emit',
    '  that id so the interface can explain it. Do not silently substitute.',
    '- `intent` is what YOU will do, in plain words, specific to this request.',
    '',
    'Reply with JSON only: {"legs":[{"capability":string,"intent":string,"location":string|null,"params":object}]}',
  ].join('\n')

  try {
    /**
     * Retry on rate limit, rotating keys and honouring Retry-After.
     *
     * Only 429 and 5xx are retried: a 400 means the request itself is wrong and
     * sending it again just burns the cap.
     */
    let r: Response | null = null
    for (let attempt = 0; attempt < Math.max(3, keys.length); attempt++) {
      const k = keys[attempt % keys.length]
      r = await fetch(GROQ, {
        method: 'POST',
        headers: { Authorization: `Bearer ${k}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: system }, { role: 'user', content: command }],
        }),
        signal: AbortSignal.timeout(25000),
      })
      if (r.ok) break
      if (r.status !== 429 && r.status < 500) break

      // Respect the server's own backoff when it gives one; it knows the cap.
      const retryAfter = Number(r.headers.get('retry-after'))
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 6000)
        : 600 * (attempt + 1)
      await new Promise((res) => setTimeout(res, waitMs))
    }

    if (!r || !r.ok) {
      const status = r?.status ?? 0
      return NextResponse.json({
        error: status === 429
          ? 'The planner is rate limited right now. Try that again in a moment.'
          : `Planner unavailable (${status}).`,
      }, { status: 502 })
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
        // A pin the user clicked wins over name matching — it is the one answer
        // that cannot be ambiguous.
        const pinned = spoken ? pins.get(spoken.trim().toLowerCase()) : undefined
        const pinnedLocation = pinned ? locations.find((l2) => l2.id === pinned) : undefined
        const match = pinnedLocation
          ? { location: pinnedLocation }
          : resolveLocation(spoken ?? activeLocation?.name, locations)
        const params = (l?.params && typeof l.params === 'object' ? l.params : {}) as Record<string, unknown>

        const price = legPriceCents(id)
        const blocked = !check.ok
        // A per-client step with no client resolved is NOT runnable, however
        // confident the model sounded. Marking it runnable would put it behind
        // an Approve button that can only refuse it.
        const hasTarget = tokenAudienceFor(id) === 'agency' || !!match.location
        const runnable = !blocked && IMPLEMENTED.has(id) && price === 0 && hasTarget

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
          //
          // id AND name — mapping to name alone made the question unanswerable
          // when the duplicates share a name ('"RocketOpp LLC" matches RocketOpp
          // LLC, RocketOpp LLC, RocketOpp LLC'). The id is what distinguishes
          // them, and it is what the UI sends back as a pin.
          ambiguous: match.ambiguous?.map((a) => ({ id: a.id, name: a.name })),
          /** Echoed so the UI can key its pin to exactly what the model said. */
          spoken: spoken ?? undefined,
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
