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
    area: 'Per-client feature control',
    status: 'open',
    headline:
      'Features can be switched on and off per sub-account — 25 of them. This is what lets a client pick their services and get a CRM containing only those.',
    evidence:
      'PUT /locations/{locationId}/permissions takes the exact feature set. Needs locations/write, which is on the AGENCY token — a location PIT answers 401 "not authorized for this scope", which reads like a broken endpoint and is not one.',
    verified: '2026-08-05',
  },
  {
    area: 'SaaS plans & subscriptions',
    status: 'open',
    headline:
      'Larger than it first appears: agency plans CAN be listed, SaaS enabled per location, and subscriptions updated or paused.',
    evidence:
      'GET /saas-api/public-api/agency-plans/{companyId} · POST enable-saas/{locationId} · PUT update-saas-subscription/{locationId} · POST pause/{locationId} · bulk-enable/disable. Creating a NEW plan definition is still UI-only.',
    verified: '2026-08-05',
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
    status: 'partial',
    headline:
      'The endpoints exist in the spec, but NO credential we can obtain carries the scope — every custom-menu call answers 401. A sidebar link is a by-hand action in the CRM UI, not something we can add or remove for a client.',
    evidence:
      'GET /custom-menus/ and GET /custom-menus/{id} both answer 401 "The token is not authorized for this scope" on all three token classes we hold: the location PIT, the agency PIT, and the legacy app\'s live agency OAuth token (whose grant lists 100+ scopes and contains no custom-menu scope at all). Checked live 2026-08-19, not read off the spec.',
    workaround:
      'Add, edit and remove sidebar links by hand in the CRM: Settings > Custom Menu Links. lib/crm/menu.ts and the burst executor\'s menu.link leg cannot succeed until a marketplace app is granted a custom-menu scope — they fail loudly, which is correct, but do not plan around them.',
    verified: '2026-08-19',
  },
]

export function factCounts() {
  return {
    open: PLATFORM_FACTS.filter((f) => f.status === 'open').length,
    partial: PLATFORM_FACTS.filter((f) => f.status === 'partial').length,
    closed: PLATFORM_FACTS.filter((f) => f.status === 'closed').length,
  }
}
