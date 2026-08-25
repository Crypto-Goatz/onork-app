/**
 * BRAND PRESETS FOR AUTO-PROVISIONING.
 *
 * A provisioned location arrives either wired or bare, and the difference is
 * decided at ONE moment: `POST /locations/` with a `snapshotId`. There is no
 * re-push API — miss it and the client gets an empty account forever.
 *
 * So a brand here is two things bound together:
 *   1. the SNAPSHOT that carries pipelines, workflows, triggers and embeds
 *      (the platform applies these; our API token cannot — POST
 *      /opportunities/pipelines answers 401 at every scope we can hold), and
 *   2. the CUSTOM VALUES that make those workflows portable. A workflow with a
 *      hardcoded phone number works in one account; `{{custom_values.x}}` works
 *      in all of them.
 *
 * SEED KEYS EMPTY, NEVER ABSENT. A missing VALUE renders blank — recoverable and
 * visible. A missing KEY renders the raw `{{custom_values.booking_link}}` into a
 * customer's inbox. Every key below ships even when we have nothing to put in it.
 *
 * WHY TWO SNAPSHOT IDS. The account carries two snapshots with the IDENTICAL name
 * "0nMCP Sub-Location - CORE ACCOUNT" (`WHGzGLK0RKBFVAM439au` and
 * `EMpZfNjnGJStlBpYAHq6`) and the platform exposes no snapshot-detail endpoint —
 * `GET /snapshots/:id` returns `{}` — so they cannot be told apart by API.
 * Mike's ruling 2026-08-25: the marketplace keeps the one it already uses, CRO9
 * takes the other. Both are env-overridable so correcting a wrong guess is a
 * setting change, not a deploy. **They still need renaming in the dashboard;
 * until then the only thing distinguishing them is this file.**
 */

export type BrandPreset = {
  key: string
  /** Human name, prefixed onto the created location. */
  label: string
  /** Applied at creation — the only moment a snapshot can be attached. */
  snapshotId: string
  /**
   * Seeded on every provisioned location. Values may be empty; keys may not.
   */
  customValues: { key: string; value: string }[]
  /** Where the location's own branding lands (location_branding mirror). */
  branding: {
    productName: string
    primaryColor: string
    accentColor: string
    supportEmail: string
    siteUrl: string
  }
}

/**
 * CRO9. Colours are the documented CRO9 tokens (cyan/violet on void black), not
 * 0n green — our brand on a client's screen un-white-labels the agency in front
 * of their own customer.
 */
export const CRO9_BRAND: BrandPreset = {
  key: 'cro9',
  label: 'CRO9',
  snapshotId: process.env.CRO9_SNAPSHOT_ID || 'EMpZfNjnGJStlBpYAHq6',
  branding: {
    productName: 'CRO9',
    primaryColor: '#22d3ee',
    accentColor: '#a78bfa',
    supportEmail: 'support@cro9.com',
    siteUrl: 'https://www.cro9.com',
  },
  customValues: [
    // identity
    { key: 'brand_name', value: 'CRO9' },
    { key: 'brand_site', value: 'https://www.cro9.com' },
    { key: 'brand_tagline', value: 'Conversion Intelligence, Automated' },
    { key: 'support_email', value: 'support@cro9.com' },
    { key: 'support_phone', value: '' },
    // product surfaces the workflows link to
    { key: 'dashboard_url', value: 'https://www.cro9.com/dashboard' },
    { key: 'approvals_url', value: 'https://www.cro9.com/approvals' },
    { key: 'scan_url', value: 'https://www.cro9.com/' },
    { key: 'booking_link', value: '' },
    // AI voice / copy
    { key: 'ai_persona_name', value: 'Nine' },
    { key: 'ai_tone', value: 'Direct, evidence-first, never hypey. Says what was measured.' },
    // the offer
    { key: 'offer_headline', value: 'Find out whether AI can read your website' },
    { key: 'offer_price_ignite', value: '$39/mo' },
    { key: 'offer_price_amplify', value: '$99/mo' },
    { key: 'offer_price_dominate', value: '$199/mo' },
    // legal
    { key: 'legal_entity', value: 'RocketOpp LLC' },
    { key: 'privacy_url', value: 'https://www.cro9.com/privacy' },
    { key: 'terms_url', value: 'https://www.cro9.com/terms' },
  ],
}

/**
 * 0nCore / marketplace — keeps the snapshot it already provisions with. Changing
 * which snapshot this uses would silently re-shape every future marketplace
 * install, so it stays pinned to the existing env var and its existing default.
 */
export const ONCORE_BRAND: BrandPreset = {
  key: 'oncore',
  label: '0nCore',
  snapshotId: process.env.CRM_MASTER_SNAPSHOT_ID || 'WHGzGLK0RKBFVAM439au',
  branding: {
    productName: '0nCore',
    primaryColor: '#6EE05A',
    accentColor: '#5cb83a',
    supportEmail: 'support@0ncore.com',
    siteUrl: 'https://www.0ncore.com',
  },
  customValues: [
    { key: 'brand_name', value: '0nCore' },
    { key: 'brand_site', value: 'https://www.0ncore.com' },
    { key: 'support_email', value: 'support@0ncore.com' },
    { key: 'support_phone', value: '' },
    { key: 'booking_link', value: '' },
    { key: 'ai_persona_name', value: 'Jaxx' },
    { key: 'legal_entity', value: 'RocketOpp LLC' },
  ],
}

export const BRANDS: Record<string, BrandPreset> = {
  cro9: CRO9_BRAND,
  oncore: ONCORE_BRAND,
}

/** Unknown brand keys fall back to 0nCore rather than provisioning bare. */
export function brandFor(key?: string | null): BrandPreset {
  return (key && BRANDS[key.toLowerCase()]) || ONCORE_BRAND
}
