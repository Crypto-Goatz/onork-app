/**
 * The internal app registry — every 0n app the Hub can show.
 *
 * DATA, NOT PAGES. Adding an app is an entry here; the Hub index and the detail
 * page both render from this list. Hand-built pages per app are how a catalogue
 * starts disagreeing with itself — the same failure as the five connection
 * surfaces nobody could choose between.
 *
 * `soon[]` is deliberately part of the record rather than a separate roadmap
 * doc. Ideas arrive while looking at the thing they belong to, and a roadmap
 * kept somewhere else is a roadmap nobody updates. Anything in `soon` is
 * explicitly NOT built — the UI must render it as such, never as a feature.
 */

export interface AppCapability {
  title: string
  body: string
}

export interface OnApp {
  slug: string
  name: string
  tagline: string
  /** shipped | beta | building | idea — drives the badge and honest copy. */
  status: 'shipped' | 'beta' | 'building' | 'idea'
  version?: string
  /** Where it runs, in plain words. */
  surface: string
  /** Direct download, when the app is something you install. */
  download?: { href: string; label: string; note?: string }
  /** Where you use it, if it is hosted. */
  open?: { href: string; label: string }
  can: AppCapability[]
  /** NOT BUILT. Rendered as "coming soon", never as a capability. */
  soon: string[]
  /** Stated plainly so nobody tests the wrong thing. */
  limits?: string[]
}

export const APPS: OnApp[] = [
  {
    slug: 'extension',
    name: '0n Extension',
    tagline: 'The Agency Command Center, inside the browser you already work in.',
    status: 'shipped',
    version: '7.2.1',
    surface: 'Chrome (Manifest V3) — side panel on any tab',
    download: {
      href: '/downloads/0n-extension.zip',
      label: 'Download 0n Extension 7.2.1',
      note: 'Unzip, then chrome://extensions → Developer mode → Load unpacked → select the folder.',
    },
    can: [
      { title: 'One key, everywhere', body: 'Connect once with a 0n_live_ device key from CRM Setup. Keys are shown once, listed per browser, and revocable one device at a time.' },
      { title: 'Stack Scanner', body: 'Detect the CRM, marketing and analytics tools running on any site you are looking at. Results are kept so you can compare a prospect before the call.' },
      { title: 'LinkedIn workflow', body: 'Scrape a profile, save it as a lead, push it to the CRM, compose a reply in your voice, and export or sync the batch — without leaving the tab.' },
      { title: 'CRM quick-add', body: 'Create a contact from whatever page you are on, into the client account the device key is scoped to.' },
      { title: 'Ask 0n', body: 'A prompt box wired to the same brain the dashboard uses, with the page you are on as context.' },
      { title: '0nTask surface', body: 'See and add tasks against the one 0n key, so what you capture in the browser lands where the work is tracked.' },
    ],
    soon: [
      'Capture any page as a CRO9 brief — send the current URL straight into the SXO engine',
      'One-click "approve and publish" for a pending CRO9 brief, from the tab you are reading',
      'Read the vault: use the agency Groq key automatically instead of asking for one',
      'Meeting mode — summarise a call tab and file the notes against the right contact',
      'Site-health overlay — CRO9 signals drawn on the live page you are viewing',
      'Firefox and Edge builds',
    ],
    limits: [
      'Loaded unpacked today — not yet in the Chrome Web Store, so it updates by re-downloading.',
      'A device key is scoped to one client account. Switching clients means a new key.',
    ],
  },
  {
    slug: 'cro9',
    name: 'CRO9',
    tagline: 'The SXO engine: it reads your Search Console, decides what to fix, and waits for you to approve it.',
    status: 'beta',
    surface: 'cro9.com — dashboard + daily engine',
    open: { href: 'https://www.cro9.com/approvals', label: 'Open approvals' },
    can: [
      { title: 'Daily analysis', body: 'Pulls 28 days of Search Console and GA4 for every connected site and scores each page against tunable weights.' },
      { title: 'Briefs, not guesses', body: 'Produces a brief per page — title options, meta description, sections to add, priority tasks — with the live metrics that justified it.' },
      { title: 'Human in the loop', body: 'Nothing reaches a site without an approval. Approve, reject, or leave it; auto-publish is off by default and per-site.' },
      { title: 'WordPress arm', body: 'The CRO9 SXO Sync plugin applies approved changes through normal WordPress revisions, so any change rolls back in one click.' },
      { title: 'Receipts', body: 'Every publish writes what changed, when, by whom — and whether the change was actually visible on the live page afterwards.' },
    ],
    soon: [
      'Brief → copy: turn a brief into the actual rewritten page body',
      'Google Sheet mirror so a client can approve from a spreadsheet',
      'The agency roster view — every client, pending count, auto-publish state',
      'Tuning panel: the scoring weights as plain-English sliders',
      'Automatic GA4 property provisioning at signup',
    ],
    limits: [
      'The engine writes briefs, not finished copy — approving records the decision and does not yet rewrite a page body.',
      'Two sites are connected today (rocketopp.com, sxowebsite.com).',
    ],
  },
  {
    slug: 'vault',
    name: '0nVault',
    tagline: 'One encrypted place for every key your agency connects.',
    status: 'beta',
    surface: 'vault.0ncore.com',
    open: { href: 'https://vault.0ncore.com/', label: 'Open your vault' },
    can: [
      { title: 'Encrypted at rest', body: 'AES-256-GCM. Nothing here is readable from the browser, and every read is written to an audit trail.' },
      { title: 'Agency-scoped', body: 'A credential belongs to the agency, not to whoever happened to paste it, so the team shares one working connection.' },
      { title: 'Bring your own AI key', body: 'Connect a free Groq key and lead scoring runs on your account instead of a shared allowance.' },
    ],
    soon: [
      'Every service in one door — Stripe, GA4, Vercel, the CRM',
      'Health per connection: last verified, what is using it, what breaks if it is revoked',
      'Rotate a key from the UI and have every app pick up the new one',
      'Extend BYO-key beyond lead scoring to the rest of the dashboard',
    ],
    limits: ['A connected Groq key currently powers lead scoring only.'],
  },
  {
    slug: 'ontask',
    name: '0nTask',
    tagline: 'Where the work is tracked — for people, automations, and AI alike.',
    status: 'shipped',
    surface: 'app.0ntask.com',
    open: { href: 'https://app.0ntask.com', label: 'Open 0nTask' },
    can: [
      { title: 'One queue, three kinds of worker', body: 'A task can be assigned to you, to an automation, or to an AI, and it is tracked the same way either way.' },
      { title: 'Public API + webhooks', body: 'Signed, live, and already how work reaches the agents that do it.' },
      { title: 'Flows', body: 'Build an automation by describing the outcome, or by dragging the steps.' },
    ],
    soon: [
      'The assignment hub for every 0n agent, with results posted back automatically',
      'Its own knowledge layer, fed by what the agents actually did',
    ],
  },
]

export const getApp = (slug: string) => APPS.find((a) => a.slug === slug) ?? null
