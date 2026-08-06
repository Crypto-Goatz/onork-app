/**
 * The capability registry — what 0nCORE can do, and HOW each thing is done.
 *
 * This is the spine of the whole dashboard. Three consumers read it and none of
 * them should ever hold their own copy of this knowledge:
 *
 *   planner   what the LLM is allowed to choose from. It picks IDs from here,
 *             so it cannot invent a capability the executor has no handler for.
 *   gate      which meter a leg bills to and what it costs.
 *   executor  which mechanism to run — a direct call, a snapshot clone, or one
 *             of our own products.
 *
 * WHY THE MECHANISM IS A FIRST-CLASS FIELD. The platform's API is read-only for
 * workflows, funnels, forms and surveys — no create or edit endpoints exist.
 * Any design that pretends otherwise produces a flow that plans beautifully and
 * fails at execution. Encoding the mechanism means an impossible request is
 * caught at PLAN time, where the assistant can offer the honest alternative,
 * instead of at run time where it is just a broken promise.
 *
 * `blocked` capabilities are listed deliberately rather than omitted. The
 * planner needs to recognise the intent in order to explain why it cannot be
 * done and what it will do instead — silence would make the assistant look
 * stupid rather than honest.
 */

import { METERS, type MeterKey } from '@/lib/meters'

/** How a capability is actually delivered. */
export type Mechanism =
  | 'native'    // a direct write API exists
  | 'snapshot'  // read-only object — cloned from the agency's own template
  | 'onmcp'     // one of our connected services, outside the CRM
  | 'product'   // built by a 0n product (sites, social, tasks)
  | 'blocked'   // not possible for anyone today; must offer an alternative

export interface Capability {
  id: string
  /** What a person would say they want. Feeds the planner's intent matching. */
  intent: string
  mechanism: Mechanism
  /** Billing meter. Omitted = free. */
  meter?: MeterKey
  /** Required connection key, checked before a plan is offered. */
  requires?: 'crm' | 'onmcp' | 'social'
  /**
   * For `blocked` — what we offer instead, in the assistant's own words. This
   * text is user-facing; it must never blame the platform or over-promise.
   */
  insteadOffer?: string
  /** For `snapshot` — the kind of template to match against snapshot_index. */
  snapshotKind?: 'workflow' | 'funnel' | 'agents' | 'full'
  /**
   * True when the capability can ONLY happen while a sub-account is being
   * created. Snapshot loading is the case: POST /locations/ takes a snapshotId,
   * and no endpoint exists to push one into a client that already exists.
   * The planner must refuse these against an existing location rather than
   * producing a leg the executor cannot run.
   */
  atCreateOnly?: boolean
  /**
   * WHICH INSTALL'S TOKEN RUNS THIS.
   *
   * The platform splits by token type and the split is not negotiable:
   *   'location' — per-client work: contacts, conversations, calendars,
   *                opportunities. Minted per location from the sub-account app.
   *   'agency'   — locations.write (create + load snapshot), snapshots.*,
   *                companies.readonly, saas/company.*. Agency token only; no
   *                location-token variant of these endpoints exists.
   * Two installs, one router, keyed off this field.
   */
  tokenAudience?: 'location' | 'agency'
}

export const CAPABILITIES: Capability[] = [
  // ── contacts & leads — the strongest native area ──
  { id: 'contact.create', intent: 'add or create a contact', mechanism: 'native', requires: 'crm' },
  { id: 'contact.update', intent: 'update a contact or its custom fields', mechanism: 'native', requires: 'crm' },
  { id: 'contact.search', intent: 'find or segment contacts', mechanism: 'native', requires: 'crm' },
  { id: 'contact.tag', intent: 'tag or untag contacts, in bulk', mechanism: 'native', requires: 'crm' },
  { id: 'contact.note', intent: 'add a note to a contact', mechanism: 'native', requires: 'crm' },
  { id: 'customfield.create', intent: 'create a custom field or object', mechanism: 'native', requires: 'crm' },

  // ── messaging ──
  { id: 'sms.send', intent: 'send an SMS', mechanism: 'native', requires: 'crm' },
  { id: 'email.send', intent: 'send an email', mechanism: 'native', requires: 'crm' },
  { id: 'conversation.read', intent: 'read or summarise conversation history', mechanism: 'native', requires: 'crm' },

  // ── calendar & pipeline ──
  { id: 'appointment.book', intent: 'book, reschedule or cancel an appointment', mechanism: 'native', requires: 'crm' },
  { id: 'opportunity.move', intent: 'move or update a deal', mechanism: 'native', requires: 'crm' },

  // ── provisioning ──
  { tokenAudience: 'agency', id: 'location.create', intent: 'create a new client sub-account', mechanism: 'native', meter: 'CLIENT_PROVISION', requires: 'crm' },
  { tokenAudience: 'agency', id: 'snapshot.list', intent: 'see which snapshots the agency has', mechanism: 'native', requires: 'crm' },
  {
    // Snapshot application is bound to sub-account CREATION. The only endpoint
    // that loads a snapshot is POST /locations/ with `snapshotId` — agency
    // token, locations.write, and a plan that permits sub-account creation.
    tokenAudience: 'agency',
    id: 'snapshot.apply_at_create',
    intent: 'create a client with one of my snapshots already loaded',
    mechanism: 'native', meter: 'CLIENT_PROVISION', requires: 'crm',
  },
  {
    /**
     * BLOCKED FOR US, NOT FOR THE AGENCY. Updating a snapshot and pushing that
     * update to existing sub-accounts is a real feature — it just lives in the
     * platform's own UI, with no API behind it. So this is not "impossible",
     * it is "not automatable", and the wording must say the second thing.
     * Telling an agency owner it cannot be done when they can see the button is
     * how the assistant loses their trust in one sentence.
     */
    id: 'snapshot.repush',
    intent: 'push an updated snapshot into a client that already exists',
    mechanism: 'blocked',
    insteadOffer:
      "I can't push a snapshot update from here — that one's a manual step in your CRM, where you update the snapshot and push it to the sub-accounts you choose. Worth knowing: 0nCORE's own steps and widgets update centrally, so those change everywhere the moment we ship, snapshot untouched.",
  },
  { tokenAudience: 'agency', id: 'user.create', intent: 'add a team member or assign work to one', mechanism: 'native', requires: 'crm' },

  // ── workflows: read + trigger + clone, never author ──
  { id: 'workflow.list', intent: 'see what automations a client has', mechanism: 'native', requires: 'crm' },
  { id: 'workflow.trigger', intent: 'start an existing workflow for contacts', mechanism: 'native', requires: 'crm' },
  {
    // Only at provision time — see snapshot.repush. Deploying into an EXISTING
    // client is not an API operation; the planner must offer the share link.
    id: 'workflow.deploy', intent: 'give a NEW client one of my standard automations',
    mechanism: 'snapshot', snapshotKind: 'workflow', requires: 'crm', atCreateOnly: true,
  },
  {
    id: 'workflow.author', intent: 'build a brand-new workflow from a description',
    mechanism: 'blocked',
    insteadOffer:
      "I can deploy one of your existing workflow templates into that client, or build this as a 0nCORE flow that drives your CRM — I can't write a new native workflow.",
  },

  // ── funnels & sites ──
  { id: 'funnel.clone', intent: 'give a NEW client one of my funnels', mechanism: 'snapshot', snapshotKind: 'funnel', requires: 'crm', atCreateOnly: true },
  { id: 'site.build', intent: 'build a website or landing page', mechanism: 'product', meter: 'SITE_BUILD' },
  {
    id: 'funnel.edit', intent: 'edit the content of an existing funnel page',
    mechanism: 'blocked',
    insteadOffer: "I can't edit a native funnel's content. I can build the equivalent page for you instead and hand back the link.",
  },

  // ── generated pages ──
  // We render the HTML ourselves; the only question is where it lands.
  { id: 'page.render', intent: 'turn a page design into HTML', mechanism: 'product' },
  {
    // The one native, indexable page type the platform lets us CREATE.
    // Verified end to end against a live location: the body survives the
    // sanitiser byte for byte, inline styles included.
    id: 'blog.publish',
    intent: 'publish a generated page as a blog post on the client’s site',
    mechanism: 'native', requires: 'crm',
  },

  {
    // THE ENDPOINT THAT MAKES THE CONFIGURATOR REAL. Until this, a plan was a
    // priced list and the sub-account still arrived with all 25 features
    // whether they were paid for or not.
    tokenAudience: 'agency',
    id: 'location.features',
    intent: 'turn a client’s CRM features on or off to match their plan',
    mechanism: 'native', requires: 'crm',
  },

  // ── store & commerce ──
  // The most writable surface on the platform, and the inverse of funnels: we
  // cannot create a page for anyone, but we can stock, price and categorise an
  // entire storefront.
  {
    // How an agent REACHES the builder without leaving the CRM. openMode:'iframe'
    // renders our app inside their chrome; combined with Custom Page SSO they
    // land signed in.
    tokenAudience: 'agency',
    id: 'menu.link',
    intent: 'add 0nCORE to a client’s CRM sidebar',
    mechanism: 'native', requires: 'crm',
  },

  { id: 'product.create', intent: 'add a product with a price to the client’s store', mechanism: 'native', requires: 'crm' },
  { id: 'product.collection', intent: 'create a product category or collection', mechanism: 'native', requires: 'crm' },
  { id: 'store.provision', intent: 'build out a whole store from a list of products', mechanism: 'native', requires: 'crm' },
  {
    id: 'store.page',
    intent: 'create the storefront page that displays the products',
    mechanism: 'blocked',
    insteadOffer:
      "Store *pages* are part of the funnel builder, which has no create API — so I can't make that page. What I can do is stock the store itself with real products, prices and categories, and build you the storefront page separately with a link you can point anywhere.",
  },

  // ── social ──
  { id: 'social.schedule', intent: 'schedule or write social posts', mechanism: 'product', meter: 'SOCIAL_POST', requires: 'social' },

  // ── agents ──
  { id: 'agents.deploy', intent: 'deploy an agent team to a NEW client', mechanism: 'snapshot', snapshotKind: 'agents', requires: 'crm', atCreateOnly: true },
  {
    id: 'agents.author', intent: 'create a brand-new native agent from a description',
    mechanism: 'blocked',
    insteadOffer: "Native agents can only be created in the CRM's own builder. I can deploy your existing agent team now, or build a 0nCORE agent instead.",
  },

  // ── tasks & commerce ──
  { id: 'task.create', intent: 'add a task, for a person or an agent', mechanism: 'product' },
  { id: 'invoice.create', intent: 'create or send an invoice', mechanism: 'native', requires: 'crm' },

  // ── agents ──
  // Writable, unlike workflows and funnels — so the planner may genuinely
  // choose these rather than explaining why it cannot.
  { id: 'agent.list', intent: 'see what AI agents a client has', mechanism: 'native', requires: 'crm' },
  { id: 'agent.run', intent: 'ask an AI agent to do something or answer', mechanism: 'native', requires: 'crm' },
  { id: 'agent.create', intent: 'create a new AI agent for a client', mechanism: 'native', requires: 'crm' },

  // ── beyond the CRM ──
  { id: 'external.call', intent: 'do something in another service — mail, payments, docs', mechanism: 'onmcp', requires: 'onmcp' },

  // ── our side only ──
  { id: 'report.rollup', intent: 'report across every client at once', mechanism: 'product' },
]

const BY_ID = new Map(CAPABILITIES.map((c) => [c.id, c]))

/** Which install's token a capability needs. Defaults to per-location. */
export function tokenAudienceFor(id: string): 'location' | 'agency' {
  return BY_ID.get(id)?.tokenAudience ?? 'location'
}

/**
 * Refuse a capability that can only run at sub-account creation when the
 * planner has aimed it at an existing client.
 */
export function violatesAtCreateOnly(id: string, targetIsExistingLocation: boolean): boolean {
  return targetIsExistingLocation && BY_ID.get(id)?.atCreateOnly === true
}

export function capability(id: string): Capability | undefined {
  return BY_ID.get(id)
}

/** Price a leg. Free when the capability has no meter. */
export function legPriceCents(id: string): number {
  const cap = BY_ID.get(id)
  if (!cap?.meter) return 0
  const m = METERS.find((x) => x.key === cap.meter)
  if (!m) return 0
  return m.launchFree ? 0 : m.priceCents
}

export function isBillable(id: string): boolean {
  return legPriceCents(id) > 0
}

/**
 * The catalogue handed to the planner.
 *
 * Blocked capabilities are INCLUDED, with their alternative, so the model can
 * recognise the request and answer it honestly. What it must never do is emit a
 * blocked id as an executable leg — the executor refuses those, and the plan
 * route turns them into a spoken alternative instead.
 */
export function plannerCatalogue(): { id: string; intent: string; mechanism: Mechanism; priceCents: number; insteadOffer?: string }[] {
  return CAPABILITIES.map((c) => ({
    id: c.id,
    intent: c.intent,
    mechanism: c.mechanism,
    priceCents: legPriceCents(c.id),
    ...(c.insteadOffer ? { insteadOffer: c.insteadOffer } : {}),
  }))
}

/**
 * Can this leg be executed at all?
 *
 * Called by BOTH the plan route and the executor. Two checks rather than one is
 * deliberate: the plan check produces a good conversation, and the executor
 * check is what actually protects the CRM if a plan is ever replayed, forged or
 * mutated between approval and execution.
 */
export function assertExecutable(id: string): { ok: true; cap: Capability } | { ok: false; reason: string; insteadOffer?: string } {
  const cap = BY_ID.get(id)
  if (!cap) return { ok: false, reason: `Unknown capability "${id}".` }
  if (cap.mechanism === 'blocked') {
    return { ok: false, reason: `"${cap.intent}" cannot be done through the API.`, insteadOffer: cap.insteadOffer }
  }
  return { ok: true, cap }
}
