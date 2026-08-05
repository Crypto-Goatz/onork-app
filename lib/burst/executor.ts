import { crmGet, crmPost, crmPostRaw, crmPut } from '@/lib/crm'
import { getValidAgencyToken } from '@/lib/crm/agency-token'
import { capability, tokenAudienceFor, assertExecutable, legPriceCents } from '@/lib/crm/registry'
import { canRun, settle } from '@/lib/billing/gate'
import { publishAsBlogPost, resolveBlogTargets, slugify } from '@/lib/crm/blog'
import { createProduct, createCollection, provisionStore, STORE_BLAST_RADIUS, type SourceProduct } from '@/lib/crm/store'
import { renderPage } from '@/lib/render'


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
  /**
   * The receipt this leg is being recorded under. Doubles as the wallet
   * charge's idempotency key, so a retry cannot bill twice.
   */
  receiptId?: string
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

/**
 * Resolve exactly ONE contact, or explain why not.
 *
 * Shared because every per-person action needs it and each one getting this
 * subtly different is how a message ends up with the wrong person. Ambiguity is
 * a refusal, never a guess — texting the wrong customer cannot be undone.
 */
async function oneContact(
  locationId: string,
  query: string,
): Promise<{ contact: CrmContact } | { problem: LegResult }> {
  if (!query) return { problem: refuse('Tell me which contact you mean.') }
  const { contacts, total, error } = await findContacts(locationId, query, 5)
  if (error) return { problem: fail('Could not find that contact.', error) }
  if (total === 0) return { problem: fail(`No contact matching "${query}".`) }
  if (total > 1) return { problem: refuse(`"${query}" matches ${total} contacts. Tell me which one.`, total) }
  return { contact: contacts[0] }
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
  /* ── generated pages ── */

  'page.render': async (leg, price) => {
    const spec = leg.params?.spec as any
    if (!spec?.blocks?.length) return refuse('Give me a page design to render.')
    const target = (leg.params?.target as any) || 'document'
    const r = renderPage(spec, { target, personaliseEndpoint: '/api/personalize' })
    // Warnings ride along rather than being swallowed: an empty live block or a
    // skipped section is something the person approving needs to see.
    return ok(
      `Rendered ${r.stats.blocks} sections as ${target} HTML (${r.stats.bytes} bytes).`,
      1, price, { html: r.html, css: r.css, warnings: r.warnings, stats: r.stats }
    )
  },

  'blog.publish': async (leg, price) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client’s blog to publish to.')

    const title = String(leg.params?.title || '').trim()
    if (!title) return refuse('The post needs a title.')

    // Render here when handed a spec, so the caller cannot accidentally publish
    // class-based HTML that arrives unstyled in a blog body.
    let html = String(leg.params?.html || '')
    if (!html && leg.params?.spec) {
      html = renderPage(leg.params.spec as any, { target: 'blog' }).html
    }
    if (!html) return refuse('Give me either rendered HTML or a page design to publish.')

    const targets = await resolveBlogTargets(loc)
    if ('problem' in targets) return refuse(`${targets.problem} ${targets.fix}`)

    const result = await publishAsBlogPost({
      locationId: loc,
      title,
      description: String(leg.params?.description || title).slice(0, 300),
      rawHTML: html,
      urlSlug: String(leg.params?.slug || slugify(title)),
      imageUrl: String(leg.params?.imageUrl || ''),
      imageAltText: String(leg.params?.imageAlt || title).slice(0, 120),
      // DRAFT unless the plan explicitly asked to publish. This writes to a real
      // client's public website.
      status: leg.params?.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
      targets,
    })

    if (!result.ok) return fail('Blog post was rejected.', result.error)
    return ok(
      `Published "${title}" to ${targets.blogName} as ${result.status}.`,
      1, price, { postId: result.postId, status: result.status, slug: result.url }
    )
  },

  /* ── store ── */

  'product.create': async (leg, price) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client’s store to add to.')
    const name = String(leg.params?.name || '').trim()
    if (!name) return refuse('The product needs a name.')

    const r = await createProduct(loc, {
      name,
      price: leg.params?.price as string,
      description: leg.params?.description as string,
      image: leg.params?.image as string,
      productType: (leg.params?.productType as any) || 'PHYSICAL',
      recurring: !!leg.params?.recurring,
    })

    // A product with no price is not a success — it exists and cannot be sold.
    if (!r.ok) return fail(r.unsellable ? `"${name}" was created but has no price, so it cannot be sold.` : `Could not create "${name}".`, r.error)
    return ok(`Added "${name}" at ${r.amount}.`, 1, price, r)
  },

  'product.collection': async (leg, price) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client’s store.')
    const name = String(leg.params?.name || '').trim()
    if (!name) return refuse('The collection needs a name.')
    const r = await createCollection(loc, name)
    if (!r.ok) return fail(`Could not create collection "${name}".`, r.error)
    return ok(`Created collection "${name}".`, 1, price, r)
  },

  'store.provision': async (leg, price) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client’s store to build.')
    const products = (leg.params?.products as SourceProduct[]) || []
    if (!products.length) return refuse('Give me the products to add.')

    // Same reasoning as the contact blast radius: a generator that invented two
    // hundred products would otherwise create two hundred of them, and there is
    // no bulk delete to undo it.
    if (products.length > STORE_BLAST_RADIUS) {
      return refuse(
        `That is ${products.length} products in one go. I cap store builds at ${STORE_BLAST_RADIUS} — there is no bulk delete if the list is wrong. Send it in batches and I will run them.`,
        products.length
      )
    }

    const r = await provisionStore(loc, products, {
      currency: (leg.params?.currency as string) || 'USD',
      createCollections: leg.params?.createCollections !== false,
    })

    const { created, failed, unsellable, collections } = r.summary
    const parts = [`${created} product${created === 1 ? '' : 's'} added`]
    if (collections) parts.push(`${collections} collection${collections === 1 ? '' : 's'}`)
    if (unsellable) parts.push(`${unsellable} with NO price (unsellable)`)
    if (failed) parts.push(`${failed} failed`)

    // Partial success is reported as ok with the detail spelled out, not as a
    // clean success — the person needs to know which products need a price.
    return ok(parts.join(', ') + '.', created, price, r)
  },

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

  'agent.list': async (leg) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client and I will list their agents.')
    const { listAgents } = await import('@/lib/crm/agents')
    const { agents, error } = await listAgents(loc)
    if (error) return fail('Could not read their agents.', error)
    return ok(`${agents.length} agent${agents.length === 1 ? '' : 's'} in this account.`, agents.length, 0,
      { names: agents.slice(0, 10).map((a) => a.name) })
  },

  'agent.run': async (leg, price) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client the agent belongs to.')
    const message = str(leg.params?.message ?? leg.params?.command, 1200)
    if (!message) return refuse('Tell me what to ask the agent.')

    const { listAgents, executeAgent } = await import('@/lib/crm/agents')
    const { agents } = await listAgents(loc)
    if (!agents.length) return fail('This client has no agents yet.')

    // Match by name when one is named, otherwise use the first ACTIVE agent —
    // picking an inactive one would run something the agency switched off.
    const wanted = str(leg.params?.agent, 80).toLowerCase()
    const target = wanted
      ? agents.find((a) => a.name.toLowerCase().includes(wanted))
      : agents.find((a) => a.status === 'active') ?? agents[0]
    if (!target) return fail(`No agent matching "${wanted}".`)

    const r = await executeAgent({ locationId: loc, agentId: target.id, message, contactId: str(leg.params?.contactId, 64) || undefined })
    if (!r.ok) return fail(`"${target.name}" could not run.`, r.error)
    return ok(`${target.name}: ${(r.reply ?? '').slice(0, 220)}`, 1, price, { reply: r.reply, agent: target.name })
  },


  /* ── messaging ── */

  'sms.send': async (leg, price) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client to message from.')
    const text = str(leg.params?.message ?? leg.params?.body, 1200)
    const who = searchTerm(leg.params?.contactQuery ?? leg.params?.to)
    if (!text) return refuse('I need the text of the message.')
    const target = await oneContact(loc, who)
    if ('problem' in target) return target.problem
    // type/subType/status are all required by the API — omitting any is a 422.
    const res = await crmPostRaw('/conversations/messages', loc, {
      type: 'SMS', subType: 'manual', status: 'pending',
      contactId: target.contact.id, message: text,
    })
    if (!res.ok) return fail('Could not send the message.', `HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 140)}`)
    return ok(`Texted ${target.contact.contactName || who}.`, 1, price)
  },

  'email.send': async (leg, price) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client to email from.')
    const subject = str(leg.params?.subject, 200)
    const html = str(leg.params?.html ?? leg.params?.body ?? leg.params?.message, 8000)
    const who = searchTerm(leg.params?.contactQuery ?? leg.params?.to)
    if (!html) return refuse('I need the body of the email.')
    const target = await oneContact(loc, who)
    if ('problem' in target) return target.problem
    const res = await crmPostRaw('/conversations/messages', loc, {
      type: 'Email', subType: 'manual', status: 'pending',
      contactId: target.contact.id,
      subject: subject || 'A message for you',
      html,
    })
    if (!res.ok) return fail('Could not send the email.', `HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 140)}`)
    return ok(`Emailed ${target.contact.contactName || who}.`, 1, price)
  },

  'conversation.read': async (leg) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client to look in.')
    const res = await crmGet(`/conversations/search?limit=${count(leg.params?.limit, 10)}`, loc)
    if (!res.ok) return fail('Could not read conversations.', `HTTP ${res.status}`)
    const j = (await res.json().catch(() => ({}))) as { conversations?: { lastMessageBody?: string; contactName?: string }[] }
    const list = j.conversations ?? []
    return ok(`${list.length} recent conversation${list.length === 1 ? '' : 's'}.`, list.length, 0,
      { recent: list.slice(0, 5).map((c) => `${c.contactName ?? 'someone'}: ${(c.lastMessageBody ?? '').slice(0, 80)}`) })
  },

  /* ── the rest of the CRM ── */

  'contact.update': async (leg, price) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client the contact is in.')
    const who = searchTerm(leg.params?.contactQuery)
    const target = await oneContact(loc, who)
    if ('problem' in target) return target.problem
    const patch: Record<string, string> = {}
    for (const f of ['firstName', 'lastName', 'email', 'phone', 'address1', 'city', 'state', 'postalCode', 'website']) {
      const v = str(leg.params?.[f], 200)
      if (v) patch[f] = v
    }
    if (!Object.keys(patch).length) return refuse('Tell me what to change about them.')
    const res = await crmPut(`/contacts/${target.contact.id}`, loc, patch)
    if (!res.ok) return fail('Could not update the contact.', `HTTP ${res.status}`)
    return ok(`Updated ${target.contact.contactName || who}.`, 1, price)
  },

  'customfield.create': async (leg, price) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client to add the field to.')
    const name = str(leg.params?.name, 80)
    if (!name) return refuse('The field needs a name.')
    const res = await crmPostRaw(`/locations/${loc}/customFields`, loc, {
      name, dataType: str(leg.params?.dataType, 30) || 'TEXT', model: 'contact',
    })
    if (!res.ok) return fail('Could not create the field.', `HTTP ${res.status}`)
    return ok(`Created the field "${name}".`, 1, price)
  },

  'task.create': async (leg, price) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client this task belongs to.')
    const title = str(leg.params?.title ?? leg.params?.task, 200)
    if (!title) return refuse('The task needs a title.')
    const target = await oneContact(loc, searchTerm(leg.params?.contactQuery))
    if ('problem' in target) return target.problem
    // dueDate and completed are required — a task with no due date is rejected.
    const due = str(leg.params?.dueDate, 40) || new Date(Date.now() + 86400_000).toISOString()
    const res = await crmPostRaw(`/contacts/${target.contact.id}/tasks`, loc, {
      title, body: str(leg.params?.body, 1000), dueDate: due, completed: false,
    })
    if (!res.ok) return fail('Could not create the task.', `HTTP ${res.status}`)
    return ok(`Task "${title}" added for ${target.contact.contactName || 'the contact'}.`, 1, price)
  },

  'workflow.trigger': async (leg, price) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client to run the automation in.')
    const wanted = searchTerm(leg.params?.workflow ?? leg.params?.name)
    const target = await oneContact(loc, searchTerm(leg.params?.contactQuery))
    if ('problem' in target) return target.problem

    const wf = await crmGet('/workflows/', loc)
    if (!wf.ok) return fail('Could not read the automations.', `HTTP ${wf.status}`)
    const list = ((await wf.json().catch(() => ({}))) as { workflows?: { id?: string; name?: string }[] }).workflows ?? []
    const match = wanted
      ? list.find((w) => (w.name ?? '').toLowerCase().includes(wanted.toLowerCase()))
      : undefined
    if (!match?.id) return refuse(wanted ? `No automation matching "${wanted}".` : 'Tell me which automation to start.')

    const { enrollInWorkflow } = await import('@/lib/crm')
    const r = await enrollInWorkflow(loc, target.contact.id, match.id)
    if (!r.ok) return fail('Could not start that automation.', r.error)
    return ok(`Started "${match.name}" for ${target.contact.contactName || 'the contact'}.`, 1, price)
  },

  'opportunity.move': async (leg, price) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client the deal is in.')
    const target = await oneContact(loc, searchTerm(leg.params?.contactQuery))
    if ('problem' in target) return target.problem
    const stageWanted = searchTerm(leg.params?.stage)
    if (!stageWanted) return refuse('Tell me which stage to move it to.')

    const pRes = await crmGet('/opportunities/pipelines', loc)
    if (!pRes.ok) return fail('Could not read the pipelines.', `HTTP ${pRes.status}`)
    const pipes = ((await pRes.json().catch(() => ({}))) as {
      pipelines?: { id?: string; name?: string; stages?: { id?: string; name?: string }[] }[]
    }).pipelines ?? []

    let stageId = '', pipelineId = '', stageName = ''
    for (const p of pipes) {
      const st = (p.stages ?? []).find((x) => (x.name ?? '').toLowerCase().includes(stageWanted.toLowerCase()))
      if (st?.id) { stageId = st.id; pipelineId = p.id ?? ''; stageName = st.name ?? stageWanted; break }
    }
    if (!stageId) return refuse(`No pipeline stage matching "${stageWanted}".`)

    const oRes = await crmGet(`/opportunities/search?contact_id=${target.contact.id}&limit=1`, loc)
    const opp = oRes.ok
      ? (((await oRes.json().catch(() => ({}))) as { opportunities?: { id?: string }[] }).opportunities ?? [])[0]
      : undefined
    if (!opp?.id) return fail(`${target.contact.contactName || 'That contact'} has no deal to move.`)

    const res = await crmPut(`/opportunities/${opp.id}`, loc, { pipelineId, pipelineStageId: stageId })
    if (!res.ok) return fail('Could not move the deal.', `HTTP ${res.status}`)
    return ok(`Moved ${target.contact.contactName || 'the deal'} to "${stageName}".`, 1, price)
  },

  'appointment.book': async (leg, price) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client the booking is for.')
    const target = await oneContact(loc, searchTerm(leg.params?.contactQuery))
    if ('problem' in target) return target.problem
    const startTime = str(leg.params?.startTime ?? leg.params?.when, 60)
    if (!startTime) return refuse('Tell me when the appointment should be.')

    const cRes = await crmGet('/calendars/', loc)
    if (!cRes.ok) return fail('Could not read the calendars.', `HTTP ${cRes.status}`)
    const cals = ((await cRes.json().catch(() => ({}))) as { calendars?: { id?: string; name?: string }[] }).calendars ?? []
    const wanted = searchTerm(leg.params?.calendar)
    const cal = wanted ? cals.find((c) => (c.name ?? '').toLowerCase().includes(wanted.toLowerCase())) : cals[0]
    if (!cal?.id) return refuse(wanted ? `No calendar matching "${wanted}".` : 'This client has no calendar to book into.')

    const res = await crmPostRaw('/calendars/events/appointments', loc, {
      calendarId: cal.id, locationId: loc, contactId: target.contact.id,
      startTime, title: str(leg.params?.title, 120) || 'Appointment',
    })
    if (!res.ok) return fail('Could not book it.', `HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 140)}`)
    return ok(`Booked ${target.contact.contactName || 'the contact'} into "${cal.name}".`, 1, price)
  },

  'external.call': async (leg, price) => {
    /**
     * The bridge to everything outside the CRM.
     *
     * 0nMCP already speaks to 113 services; re-implementing any of them here
     * would be duplication with a second set of bugs. What stays OURS is the
     * decision to run at all — the plan, the approval and the receipt — which
     * is why this is a leg like any other rather than a back door.
     */
    const tool = str(leg.params?.tool, 80)
    if (!tool) return refuse('Tell me which service and action you mean.')
    try {
      const { call0nMCP } = await import('@/lib/onmcp/client')
      const args = (leg.params?.args && typeof leg.params.args === 'object' ? leg.params.args : {}) as Record<string, unknown>
      const r = await call0nMCP(tool, args)
      if (!r.ok) return fail(`${tool} did not run.`, r.error)
      return ok(`${tool} ran.`, 1, price, { result: (r.text || '').slice(0, 400) })
    } catch (err) {
      return fail(`${tool} did not run.`, err instanceof Error ? err.message : String(err))
    }
  },

  /* ── writes ── */

  'agent.create': async (leg, price) => {
    const loc = needsLocation(leg)
    if (!loc) return refuse('Tell me which client the agent is for.')
    const name = str(leg.params?.name, 80)
    const prompt = str(leg.params?.prompt ?? leg.params?.instructions, 2000)
    if (!name || !prompt) return refuse('An agent needs a name and instructions.')
    const { createAgent } = await import('@/lib/crm/agents')
    const r = await createAgent(loc, { name, prompt, description: str(leg.params?.description, 200), agencyId: leg.companyId })
    if (!r.ok) return fail('Could not create the agent.', r.detail ?? r.error)
    // Created inactive on purpose — the agency reads it before it speaks.
    return ok(`Created "${r.name}". It is switched off until you turn it on.`, 1, price, { agentId: r.agentId })
  },

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

  if (tokenAudienceFor(leg.capability) === 'location' && !leg.locationId) {
    return refuse('Pick a client for this step and I will run it.')
  }

  // The gate decides BEFORE the work: unconfigured meter, feature not switched
  // on, or a wallet that says no. It has no side effects, so a refusal here has
  // cost the agency nothing.
  const verdict = await canRun({
    companyId: leg.companyId,
    locationId: leg.locationId,
    capabilityId: leg.capability,
  })
  if (!verdict.allowed) return refuse(verdict.reason)

  let result: LegResult
  try {
    result = await handler(leg, price)
  } catch (err) {
    return fail('That step did not complete.', err instanceof Error ? err.message : String(err))
  }

  // Charge only for work that DEMONSTRABLY happened. A leg that failed or was
  // refused never reaches this, which is what makes "a failed step is never
  // billed" structural rather than a rule somebody has to remember.
  if (!verdict.free && result.status === 'ok') {
    if (!leg.receiptId) {
      // No idempotency key means a retry could double-charge. Reporting the
      // work as done-and-unbilled is the safe direction to be wrong in.
      console.error(`[executor] ${leg.capability} succeeded with no receiptId; not charging.`)
      return { ...result, billed: false }
    }
    const settled = await settle({
      companyId: leg.companyId,
      locationId: leg.locationId,
      meterKey: verdict.meterKey,
      priceCents: verdict.priceCents,
      description: result.detail,
      receiptId: leg.receiptId,
      units: 1,
    })
    return {
      ...result,
      priceCents: verdict.priceCents,
      billed: settled.billed,
      // The work happened; say so, and say it was not charged for.
      ...(settled.billed ? {} : { detail: `${result.detail} (not billed: ${settled.error ?? 'unknown'})` }),
    }
  }

  return result
}
