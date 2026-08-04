import { crmGet, crmPost, crmPostRaw } from '@/lib/crm'
import { getValidAgencyToken } from '@/lib/crm/agency-token'
import { capability, tokenAudienceFor, assertExecutable, legPriceCents } from '@/lib/crm/registry'

/**
 * The executor — the only code in 0nCORE that changes a client's account.
 *
 * THREE THINGS IT REFUSES TO DO, and each one is here because the alternative
 * has a real cost:
 *
 *  1. It runs nothing it does not have a handler for. A capability the registry
 *     lists but this file does not implement comes back `unsupported`, never
 *     billed and never silently reported as done. A plan that claims success for
 *     work that never happened is worse than one that admits the gap.
 *
 *  2. It will not touch more records than BLAST_RADIUS in a single leg. This is
 *     not a theoretical limit: a bulk tag on this very CRM once matched ~172,000
 *     contacts, and tags are workflow TRIGGERS — the tag fired drip campaigns
 *     that sent on the order of 294,000 emails and cost about $300 before anyone
 *     could stop it. A cap that refuses and reports the count is the difference
 *     between a mistake and an incident.
 *
 *  3. It never trusts a price off the wire. Cost is re-derived from the registry
 *     at execution time, so a tampered plan cannot discount itself.
 *
 * A failed leg is never billed. `billed` is returned per leg and is only ever
 * true alongside status 'ok'.
 */

/** The most records one leg may touch. Beyond this it refuses and says so. */
export const BLAST_RADIUS = 25

export type LegStatus = 'ok' | 'failed' | 'refused' | 'unsupported'

export interface LegResult {
  status: LegStatus
  /** What happened, in words a person can read. */
  detail: string
  error?: string
  targets: number
  priceCents: number
  billed: boolean
  /** Small, non-sensitive payload for read capabilities. */
  data?: unknown
}

export interface LegInput {
  capability: string
  locationId?: string
  locationName?: string
  params?: Record<string, unknown>
  companyId: string
}

const str = (v: unknown, max = 300): string => (typeof v === 'string' ? v.slice(0, max) : '')

/**
 * Clamped, because a planner-supplied 0 is a real thing that happens — "how
 * many contacts are there" produced `limit: 0`, which the CRM rejects. A plain
 * `?? default` does not catch it: 0 is a perfectly good number.
 */
export const count = (v: unknown, d: number, min = 1, max = 100): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : d
  return Math.min(Math.max(n, min), max)
}

/**
 * The model says "*" or "all" when it means "no filter". Passing that through
 * as a literal search term finds nothing, which then reads as "you have no
 * contacts" — a wrong answer delivered confidently.
 */
export const searchTerm = (v: unknown): string => {
  let s = str(v, 120).trim()
  if (/^(\*|all|any|everyone|everything)$/i.test(s)) return ''

  // Models reach for query LANGUAGE when asked for a search term — this one
  // emitted `email = 'john@example.com'` and the CRM, quite reasonably, found
  // nobody by that name. The prompt asks for plain text; this is the belt to
  // that braces, because the failure is silent and reads as "no such contact".
  const quoted = s.match(/["']([^"']+)["']/)
  if (quoted) s = quoted[1]
  else {
    const rhs = s.match(/^[\w.]+\s*(?:=|==|:|\blike\b)\s*(.+)$/i)
    if (rhs) s = rhs[1].trim()
  }
  return s.replace(/^["']|["']$/g, '').trim()
}

/* ────────────────────────── contact resolution ────────────────────────── */

interface CrmContact { id: string; contactName?: string; firstName?: string; email?: string }

/**
 * Find the contacts a leg should act on.
 *
 * Returns the FULL match count, not just the page, so the cap is applied to
 * what the query really matches rather than to whatever the first page happened
 * to contain. Capping a page would let a 5,000-contact query slip through
 * looking like 20.
 */
async function findContacts(
  locationId: string,
  query: string,
  limit: number,
): Promise<{ contacts: CrmContact[]; total: number; error?: string }> {
  // NO locationId HERE. crmGet appends it to every URL, and the CRM answers a
  // duplicated locationId with 403 "the token does not have access to this
  // location" — a message that sends you hunting for a scope problem that does
  // not exist. Same for crmPost, which merges locationId into the body.
  const qs = new URLSearchParams({ limit: String(limit) })
  if (query) qs.set('query', query)
  const res = await crmGet(`/contacts/?${qs.toString()}`, locationId)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return { contacts: [], total: 0, error: `Contact search failed (${res.status}). ${body.slice(0, 120)}` }
  }
  const json = (await res.json().catch(() => ({}))) as {
    contacts?: CrmContact[]
    meta?: { total?: number }
  }
  const contacts = Array.isArray(json.contacts) ? json.contacts : []
  // Fall back to the page length when the API omits a total — never to 0, which
  // would read as "nothing matched" and wave the cap through.
  const total = typeof json.meta?.total === 'number' ? json.meta.total : contacts.length
  return { contacts, total }
}

/* ────────────────────────────── handlers ──────────────────────────────── */

type Handler = (leg: LegInput, price: number) => Promise<LegResult>

const ok = (detail: string, targets: number, price: number, data?: unknown): LegResult =>
  ({ status: 'ok', detail, targets, priceCents: price, billed: price > 0, data })

const fail = (detail: string, error?: string): LegResult =>
  // Price is deliberately dropped to 0 on failure: a leg that did not happen
  // cannot be charged for, and carrying the price forward invites a later
  // rollup from summing it.
  ({ status: 'failed', detail, error, targets: 0, priceCents: 0, billed: false })

const refuse = (detail: string, targets = 0): LegResult =>
  ({ status: 'refused', detail, targets, priceCents: 0, billed: false })

function needsLocation(leg: LegInput): string | null {
  if (!leg.locationId) return null
  return leg.locationId
}

const HANDLERS: Record<string, Handler> = {
  /* ── reads ── */

  'contact.search': async (leg) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client to search and I will run it.')
    const q = searchTerm(leg.params?.query)
    const { contacts, total, error } = await findContacts(loc, q, count(leg.params?.limit, 20))
    if (error) return fail('Could not search contacts.', error)
    return ok(
      `Found ${total} contact${total === 1 ? '' : 's'}${q ? ` matching "${q}"` : ''}.`,
      total, 0,
      { sample: contacts.slice(0, 5).map((c) => c.contactName || c.firstName || c.email || c.id) },
    )
  },

  'workflow.list': async (leg) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client and I will list their automations.')
    const res = await crmGet('/workflows/', loc)
    if (!res.ok) return fail('Could not read automations.', `HTTP ${res.status}`)
    const json = (await res.json().catch(() => ({}))) as { workflows?: { name?: string }[] }
    const list = Array.isArray(json.workflows) ? json.workflows : []
    return ok(`${list.length} automation${list.length === 1 ? '' : 's'} in this account.`, list.length, 0,
      { names: list.slice(0, 10).map((w) => w.name).filter(Boolean) })
  },

  'snapshot.list': async (leg) => {
    const agency = await getValidAgencyToken(leg.companyId)
    if (!agency.token) return fail('Could not read your snapshots.', agency.error)
    const res = await fetch(
      `https://services.leadconnectorhq.com/snapshots/?companyId=${encodeURIComponent(leg.companyId)}`,
      { headers: { Authorization: `Bearer ${agency.token}`, Version: '2021-07-28' }, cache: 'no-store' },
    )
    if (!res.ok) return fail('Could not read your snapshots.', `HTTP ${res.status}`)
    const json = (await res.json().catch(() => ({}))) as { snapshots?: { name?: string }[] }
    const list = Array.isArray(json.snapshots) ? json.snapshots : []
    return ok(`${list.length} snapshot${list.length === 1 ? '' : 's'} on your agency.`, list.length, 0,
      { names: list.slice(0, 10).map((s) => s.name).filter(Boolean) })
  },

  /* ── writes ── */

  'contact.create': async (leg, price) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client this contact belongs to.')
    const p = leg.params ?? {}
    const firstName = str(p.firstName, 60)
    const email = str(p.email, 120)
    const phone = str(p.phone, 40)
    if (!firstName && !email && !phone) {
      return refuse('I need at least a name, an email or a phone number to create a contact.')
    }
    const res = await crmPost('/contacts/', loc, {
      ...(firstName ? { firstName } : {}),
      ...(str(p.lastName, 60) ? { lastName: str(p.lastName, 60) } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return fail('Could not create the contact.', `HTTP ${res.status} ${body.slice(0, 140)}`)
    }
    const who = firstName || email || phone
    return ok(`Created ${who} in ${leg.locationName || 'the account'}.`, 1, price)
  },

  'contact.note': async (leg, price) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client this note is for.')
    const note = str(leg.params?.note, 2000)
    const query = searchTerm(leg.params?.contactQuery)
    if (!note) return refuse('I need the text of the note.')
    if (!query) return refuse('I need to know which contact to add the note to.')

    const { contacts, total, error } = await findContacts(loc, query, 5)
    if (error) return fail('Could not find that contact.', error)
    if (total === 0) return fail(`No contact matching "${query}".`)
    if (total > 1) {
      // Guessing between people is how a private note lands on a stranger.
      return refuse(`"${query}" matches ${total} contacts. Tell me which one.`, total)
    }
    // crmPostRaw, not crmPost: sub-resources reject an injected locationId.
    const res = await crmPostRaw(`/contacts/${contacts[0].id}/notes`, loc, { body: note })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return fail('Could not add the note.', `HTTP ${res.status} ${detail.slice(0, 160)}`)
    }
    return ok(`Note added to ${contacts[0].contactName || query}.`, 1, price)
  },

  'contact.tag': async (leg, price) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client to tag contacts in.')
    const tag = str(leg.params?.tag, 60)
    const query = searchTerm(leg.params?.contactQuery)
    if (!tag) return refuse('I need the tag to apply.')

    const { contacts, total, error } = await findContacts(loc, query, BLAST_RADIUS)
    if (error) return fail('Could not find contacts to tag.', error)
    if (total === 0) return fail(`No contacts matching "${query || 'that'}".`)

    if (total > BLAST_RADIUS) {
      // The incident this exists for: tags are workflow triggers, so a wide tag
      // is a wide SEND. Naming the number is the point — it turns an abstract
      // refusal into a decision the owner can actually make.
      return refuse(
        `That would tag ${total} contacts. Tags can trigger automations, so I stop above ${BLAST_RADIUS} — ` +
        `narrow it down, or tag them in the CRM if you have checked which workflows the tag starts.`,
        total,
      )
    }

    let applied = 0
    const failures: string[] = []
    for (const c of contacts) {
      const res = await crmPostRaw(`/contacts/${c.id}/tags`, loc, { tags: [tag] })
      if (res.ok) applied += 1
      else failures.push(`${c.id}:${res.status} ${(await res.text().catch(() => '')).slice(0, 90)}`)
    }
    if (applied === 0) return fail(`Could not apply "${tag}".`, failures.slice(0, 3).join(', '))
    // Partial success is reported as success WITH the shortfall named, because
    // the tags that did apply are real and may already have fired something.
    const detail = failures.length
      ? `Tagged ${applied} of ${contacts.length} with "${tag}" — ${failures.length} failed.`
      : `Tagged ${applied} contact${applied === 1 ? '' : 's'} with "${tag}".`
    return ok(detail, applied, price)
  },
}

/** Which capabilities can actually run today. The UI reads this to be honest up front. */
export const IMPLEMENTED = new Set(Object.keys(HANDLERS))

/**
 * Run one leg. Never throws — every failure becomes a LegResult, because a
 * thrown error mid-burst would leave the remaining legs unrecorded.
 */
export async function executeLeg(leg: LegInput): Promise<LegResult> {
  const cap = capability(leg.capability)
  if (!cap) return refuse(`I do not have a step called "${leg.capability}".`)

  // Re-checked here even though the plan route already checked. The plan check
  // makes a good conversation; THIS check is what protects the CRM if a plan is
  // ever replayed or mutated between approval and execution.
  const executable = assertExecutable(leg.capability)
  if (!executable.ok) {
    return refuse(executable.insteadOffer || executable.reason)
  }

  const handler = HANDLERS[leg.capability]
  if (!handler) {
    return {
      status: 'unsupported',
      detail: `"${cap.intent}" is planned but not wired up yet — nothing was run and nothing was charged.`,
      targets: 0, priceCents: 0, billed: false,
    }
  }

  // Price from the registry, never from the request.
  const price = legPriceCents(leg.capability)

  // Anything billable stays off until the billing gate exists. Running paid work
  // for free is a decision nobody made, and charging with no billing rail is
  // worse.
  if (price > 0) {
    return refuse(`"${cap.intent}" costs money and billing is not switched on yet, so I did not run it.`)
  }

  if (tokenAudienceFor(leg.capability) === 'location' && !leg.locationId) {
    return refuse('Pick a client for this step and I will run it.')
  }

  try {
    return await handler(leg, price)
  } catch (err) {
    return fail('That step did not complete.', err instanceof Error ? err.message : String(err))
  }
}
