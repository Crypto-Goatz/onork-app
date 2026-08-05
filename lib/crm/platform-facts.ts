/**
 * What the CRM's API actually permits — verified, not assumed.
 *
 * WHY THIS IS A FILE AND NOT A CONVERSATION. Every one of these was established
 * by reading the OpenAPI specs in `~/Downloads/highlevel-api-docs-main` and, for
 * the blog, by publishing to a live location and reading the result back. Each
 * one has cost real time to rediscover at least once, usually because someone
 * assumed a write endpoint existed and designed a feature around it.
 *
 * Shown on the Tools page so an agency owner can see the shape of the platform
 * before promising a client something the platform will not do.
 *
 * `verified` is the date the claim was last checked against the specs or a live
 * call. Anything here is a claim about someone else's API and can change.
 */

export type FactStatus = 'open' | 'closed' | 'partial'

export interface PlatformFact {
  area: string
  status: FactStatus
  /** The one-line truth. */
  headline: string
  /** The endpoints that prove it. */
  evidence: string
  /** What to do given the constraint. Only for closed/partial. */
  workaround?: string
  verified: string
}

export const PLATFORM_FACTS: PlatformFact[] = [
  {
    area: 'Store & products',
    status: 'open',
    headline:
      'Fully writable — the most open surface on the platform. Products, prices, collections, inventory, shipping and store settings can all be created.',
    evidence:
      'POST /products/ · POST /products/{id}/price · POST /products/collections · POST /products/inventory · POST /store/shipping-zone · POST /store/store-setting — 23 write endpoints across products-v3 and store-v3.',
    verified: '2026-08-05',
  },
  {
    area: 'Blog posts',
    status: 'open',
    headline:
      'The one native, indexable page type we can create. Verified end to end: a generated page published to a live location came back byte-for-byte identical, inline styles intact.',
    evidence:
      'POST /blogs/posts — requires 12 fields, three of which are ids that must be looked up first (blog site, author, category). None of those three can be created via API.',
    verified: '2026-08-05',
  },
  {
    area: 'Contacts & messaging',
    status: 'open',
    headline: 'Full CRUD on contacts, tags, notes, custom fields, SMS, email and conversations.',
    evidence: 'contacts-v3, conversations-v3 — the strongest native area and the one most things are built on.',
    verified: '2026-08-04',
  },
  {
    area: 'AI agents',
    status: 'open',
    headline:
      'Agent Studio is writable — native agents can be created, configured and published. The only authoring surface the platform leaves open.',
    evidence:
      'POST /agent-studio/agent (SINGULAR) → PATCH the version graph → publish. Three calls; a populated `nodes` on create fails.',
    verified: '2026-08-04',
  },
  {
    area: 'Funnels & funnel pages',
    status: 'closed',
    headline:
      'Read-only for everyone. There is no create-page or create-funnel endpoint anywhere in the API — not gated, not undocumented, absent.',
    evidence: '/funnels/page and /funnels/funnel/list are GET only. Swept every POST across all specs.',
    workaround:
      'Build the page with 0nCORE and host it, publish it as a blog post, or embed it into an existing funnel page as a widget.',
    verified: '2026-08-05',
  },
  {
    area: 'Storefront pages',
    status: 'closed',
    headline:
      'The store CATALOGUE is writable but the page that displays it is part of the funnel builder, so it cannot be created.',
    evidence: 'store-v3 contains only shipping and settings paths — no page endpoints.',
    workaround: 'Stock the store via API, then build the storefront page separately and link it.',
    verified: '2026-08-05',
  },
  {
    area: 'Workflows',
    status: 'partial',
    headline:
      'Cannot be created or edited — but contacts CAN be enrolled into an existing one. We decide who enters a workflow, never what it does.',
    evidence: 'workflows-v3 exposes exactly one path: GET /workflows/. POST /contacts/{id}/workflow/{workflowId} works.',
    workaround: 'Ship workflows in a snapshot at sub-account creation, then drive enrolment from 0nCORE.',
    verified: '2026-08-04',
  },
  {
    area: 'Snapshots',
    status: 'partial',
    headline:
      'Cannot be created by API, and cannot be pushed into an existing client. A snapshot CAN be loaded at sub-account creation, and share links can be generated.',
    evidence: 'GET /snapshots/ only. POST /snapshots/share/link exists. POST /locations/ accepts a snapshotId.',
    workaround:
      'Not impossible, just not automatable — updating a snapshot and pushing it is a manual step in the CRM UI.',
    verified: '2026-08-04',
  },
  {
    area: 'Media library',
    status: 'open',
    headline: 'Files can be uploaded and organised into folders — generated images and assets have a home.',
    evidence: 'POST /medias/upload-file · POST /medias/folder · PUT /medias/update-files',
    verified: '2026-08-05',
  },
  {
    area: 'Sub-account menu',
    status: 'open',
    headline:
      'A custom sidebar link can be added programmatically — this is how the builder reaches an agent without leaving the CRM.',
    evidence: 'POST /custom-menus/ · PUT /custom-menus/{id}',
    verified: '2026-08-05',
  },
]

export function factCounts() {
  return {
    open: PLATFORM_FACTS.filter((f) => f.status === 'open').length,
    partial: PLATFORM_FACTS.filter((f) => f.status === 'partial').length,
    closed: PLATFORM_FACTS.filter((f) => f.status === 'closed').length,
  }
}
