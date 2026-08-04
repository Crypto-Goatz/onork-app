import type { MeterKey } from '@/lib/meters'

/**
 * The ten 0nCORE widgets — one definition each, read by the serving route, the
 * config API and the dashboard.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE CORRECTION THAT SHAPES ALL OF THIS: nothing here writes to a funnel or a
 * site page, because no such API exists. Funnel and page content are read-only
 * from outside the platform's own builder — the same wall that blocks workflow
 * authoring.
 *
 * So "inject HTML into snapshot pages" happens ONE way and only one way:
 *
 *   the snapshot page already carries a <script src=…/embed.js> tag,
 *   and that script fills itself in from us at RENDER time, per client.
 *
 * The practical difference is large and good: the agency pastes the tag once
 * (or ships it in the snapshot), and every widget on every client site updates
 * when we deploy, with no page rewriting and nothing to re-push. A design that
 * assumed server-side page writes would simply not run.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `live` is the honest flag. A widget whose backing product is not built yet
 * renders a clearly-labelled placeholder rather than a broken embed on a
 * customer's public site.
 *
 * ── DELIVERY, CORRECTED AFTER PORTAL DISCOVERY ──
 * Builder widgets are NOT registered by URL. They are BUILT BUNDLES: a zipped
 * dist folder, uploaded, which runs in an iframe inside the page builder and
 * speaks postmate. Source in widgets/src, built by widgets/build.mjs.
 *
 * ANALYTICS AND SCRIPT MANAGEMENT DO NOT FIT THAT MODEL AT ALL. They are
 * site-wide head/footer injection, and an element-level module cannot reach the
 * page head. They therefore live in the SNAPSHOT layer — a script tag baked
 * into the snapshot's pages — which is what /widgets/:key/embed.js serves.
 * Mislabelling them as builder widgets would have produced two bundles that
 * could never do the one thing they exist for.
 */

/** Every widget registers on the SUB-ACCOUNT app — the one that owns UI. */
export const CANONICAL_APP_ID = process.env.CRM_SUBACCT_APP_ID || '6a7178a4e8d7c3c038c593b3'

export type WidgetClass = 'builder' | 'injector'

/** How the widget reaches a page. */
export type Delivery =
  | 'builder'  // a .zip bundle uploaded as a custom element in the page builder
  | 'panel'    // an iframe surface inside our own dashboard
  | 'embed'    // a <script> tag baked into a snapshot page — the SNAPSHOT LAYER

export interface WidgetField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'color' | 'boolean' | 'select'
  options?: string[]
  placeholder?: string
}

export interface Widget {
  key: string
  name: string
  cls: WidgetClass
  delivery: Delivery
  /** What the agency is told it does. */
  blurb: string
  meter?: MeterKey
  fields: WidgetField[]
  /** False = renders a labelled placeholder, never a broken embed. */
  live: boolean
  /** Why it is not live yet — shown in the dashboard, never on a public page. */
  pending?: string
}

export const WIDGETS: Widget[] = [
  /* ── BUILDERS ── */
  {
    key: 'oncore_site_builder', name: '0nCORE Site Builder', cls: 'builder', delivery: 'panel',
    blurb: 'Describe a page and 0nCORE builds and deploys it, then writes the link back to the client.',
    meter: 'SITE_BUILD',
    fields: [
      { key: 'brand', label: 'Brand notes', type: 'textarea', placeholder: 'Tone, colours, what they sell' },
      { key: 'template', label: 'Starting template', type: 'text' },
    ],
    live: false,
    pending: 'The site engine is not wired to this panel yet.',
  },
  {
    key: 'oncore_lp_inject', name: '0nCORE Landing Page', cls: 'builder', delivery: 'builder',
    blurb: 'Fills a placeholder block in a snapshot funnel step with a generated landing page.',
    meter: 'SITE_BUILD',
    fields: [{ key: 'offer', label: 'What is the offer?', type: 'textarea' }],
    live: false,
    pending: 'Depends on the site engine.',
  },
  {
    key: 'oncore_booking_block', name: '0nCORE Booking Block', cls: 'builder', delivery: 'builder',
    blurb: "A booking block wired to this client's own calendar.",
    fields: [
      { key: 'calendarId', label: 'Calendar', type: 'text' },
      { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Book a time' },
    ],
    live: true,
  },
  {
    key: 'oncore_form_capture', name: '0nCORE Form Capture', cls: 'builder', delivery: 'builder',
    blurb: 'A lead form whose submissions land as contacts, tagged and ready for a burst.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Get in touch' },
      { key: 'tag', label: 'Tag new leads with', type: 'text', placeholder: 'website-lead' },
      { key: 'button', label: 'Button text', type: 'text', placeholder: 'Send' },
      // The workflow is picked, not authored — it ships in the snapshot.
      { key: 'workflowId', label: 'Start this workflow on submit', type: 'text' },
    ],
    live: true,
  },
  {
    key: 'oncore_course_embed', name: '0nCORE Course Player', cls: 'builder', delivery: 'builder',
    blurb: 'Embeds an automated course into a membership area.',
    fields: [{ key: 'courseId', label: 'Course', type: 'text' }],
    live: false,
    pending: 'Course building is on the roadmap.',
  },

  /* ── INJECTORS ── */
  {
    key: 'oncore_analytics', name: '0nCORE Analytics', cls: 'injector', delivery: 'embed',
    // House rule: every site we build or touch carries the collector.
    blurb: 'Puts the CRO9 collector on every page. Snapshot layer, not a builder element — an element cannot reach the page head.',
    fields: [],
    live: true,
  },
  {
    key: 'oncore_chat', name: '0nCORE Chat', cls: 'injector', delivery: 'builder',
    blurb: 'An AI chat bubble that answers from this client\'s own context.',
    fields: [
      { key: 'greeting', label: 'Opening line', type: 'text', placeholder: 'Hi — how can we help?' },
      { key: 'accent', label: 'Accent colour', type: 'color' },
    ],
    live: true,
  },
  {
    key: 'oncore_script_manager', name: '0nCORE Script Manager', cls: 'injector', delivery: 'panel',
    blurb: 'Choose which pixels and scripts load on which client sites. Snapshot layer — the scripts ride in the snapshot pages, not a builder element.',
    fields: [{ key: 'scripts', label: 'Scripts', type: 'textarea', placeholder: 'One script tag per line' }],
    live: true,
  },
  {
    key: 'oncore_social_proof', name: '0nCORE Social Proof', cls: 'injector', delivery: 'builder',
    blurb: 'Shows recent real activity from the client\'s CRM as social proof.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', placeholder: 'Recently' },
      { key: 'limit', label: 'How many', type: 'text', placeholder: '5' },
    ],
    live: true,
  },
  {
    key: 'oncore_conversion_bar', name: '0nCORE Conversion Bar', cls: 'injector', delivery: 'builder',
    blurb: 'A sticky offer bar you edit once and it changes on every client site.',
    fields: [
      { key: 'message', label: 'Message', type: 'text', placeholder: 'Spring offer — 20% off' },
      { key: 'ctaText', label: 'Button text', type: 'text', placeholder: 'Claim it' },
      { key: 'ctaUrl', label: 'Button link', type: 'text' },
      { key: 'accent', label: 'Accent colour', type: 'color' },
    ],
    live: true,
  },
]

const BY_KEY = new Map(WIDGETS.map((w) => [w.key, w]))
export function widget(key: string): Widget | undefined { return BY_KEY.get(key) }

/** The tag an agency pastes, or a snapshot page ships with. */
export function embedTag(key: string, locationId = '{{location.id}}'): string {
  return `<script async src="https://app.0ncore.com/widgets/${key}/embed.js?location=${locationId}"></script>`
}
