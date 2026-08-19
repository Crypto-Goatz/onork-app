/**
 * Canonical CRM marketplace app + operation mapping.
 *
 * We have two CRM marketplace apps registered with the platform:
 *
 *   0nAGENCY            — Company-level. Use for anything that touches
 *                         multiple sub-accounts (provisioning, snapshot
 *                         deploys, billing, agency-wide reports).
 *
 *   0nCORE Marketplace  — Sub-account level. Use for everything that
 *                         operates inside a single location (contacts,
 *                         conversations, opportunities, calendars,
 *                         invoices, social planner, workflows, etc.).
 *
 * Every operation we issue against the CRM falls into one of these
 * categories. This file is the single source of truth for which app +
 * which token gets used. lib/crm.ts and lib/crm-router.ts both read from
 * here.
 *
 * Token precedence (within an app):
 *   1. Stored OAuth access_token (auto-refreshing) for that location/company
 *   2. Per-location PIT (env: CRM_PIT_<NAME>)
 *   3. Agency PIT fallback (env: CRM_AGENCY_PIT_NEW)
 *
 * The Vercel rule: ALL PIT tokens must be type:plain. Encrypted tokens
 * double-wrap and break Bearer auth.
 */

export type CrmAppKey = 'agency' | 'sub_location'

export type CrmOperationCategory =
  // Sub-location ops
  | 'contacts'
  | 'conversations'
  | 'opportunities'
  | 'calendars'
  | 'invoices'
  | 'payments'
  | 'products'
  | 'social'
  | 'tags'
  | 'custom_fields'
  | 'custom_values'
  | 'workflows'
  | 'forms'
  | 'campaigns'
  | 'objects'
  | 'media'
  | 'courses'
  | 'users'
  | 'locations_read' // single-location read
  // Agency ops
  | 'sub_accounts' // create / list / update sub-locations
  | 'snapshot_deploy'
  | 'agency_billing'
  | 'agency_users'
  | 'agency_settings'
  // Cross-cutting
  | 'oauth_install' // the OAuth flow itself
  | 'webhooks_register'

export interface CrmApp {
  key: CrmAppKey
  name: string
  appId: string
  clientIdEnv: string
  clientSecretEnv: string
  pitEnv: string
  authClass: 'Company' | 'Location'
  redirectUri: string
  scopes: string[]
}

export const AGENCY_APP: CrmApp = {
  key: 'agency',
  name: '0nAGENCY',
  appId: process.env.CRM_AGENCY_APP_ID || '69cf4d25a74f834803470537',
  clientIdEnv: 'CRM_AGENCY_CLIENT_ID',
  clientSecretEnv: 'CRM_AGENCY_CLIENT_SECRET',
  pitEnv: 'CRM_AGENCY_PIT_NEW',
  authClass: 'Company',
  redirectUri: 'https://0ncore.com/api/oauth/callback',
  scopes: [
    'oauth.write',
    'oauth.readonly',
    'businesses.readonly',
    'businesses.write',
    'locations.readonly',
    'locations.write',
    'users.readonly',
    'users.write',
    'snapshots.readonly',
    'saas/company.read',
    'saas/company.write',
    'saas/location.read',
    'saas/location.write',
  ],
}

export const SUB_LOCATION_APP: CrmApp = {
  key: 'sub_location',
  name: '0nCORE Marketplace',
  appId: process.env.CRM_MARKETPLACE_APP_ID || '69c762225a31e1cd2f28dd4c',
  clientIdEnv: 'CRM_MARKETPLACE_APP_CLIENT_ID',
  clientSecretEnv: 'CRM_MARKETPLACE_CLIENT_SECRET',
  pitEnv: 'CRM_PIT_ONCORE',
  authClass: 'Location',
  // MUST byte-match the live sub-account app (6a7178a4) and the install route,
  // or the token exchange 400s on redirect_uri mismatch. The app allows only
  // app.0ncore.com; install/subaccount already sends that — this is the other half.
  redirectUri: 'https://app.0ncore.com/api/oauth/callback',
    // LEAN marketplace scope set (~32) for fast GHL approval. The heavy/
  // sensitive per-location scopes (payments, conversations, invoices,
  // objects, voice-ai, social write) are intentionally NOT here — they are
  // delivered through a MINTED location token from the broad agency/company
  // OAuth token (which holds oauth.write), verified working. Keep this in
  // sync with the marketplace app's configured scopes.
  // ONLY the scopes the marketplace app is actually configured to OFFER in the
  // GHL portal. Requesting any scope the app doesn't offer makes GHL reject the
  // WHOLE install ("Invalid scope(s)"). These 12 are verified accepted; the rest
  // (custom fields/values, tags, forms, products, links, tasks, campaigns,
  // businesses, locations, webhooks) must be ENABLED on the app in the developer
  // portal first — and with GHL's real names (locations/customFields.*, not
  // custom-fields.*; webhooks are a separate page, not a scope) — before they
  // can be added back here.
  scopes: [
    'contacts.readonly',
    'contacts.write',
    'opportunities.readonly',
    'opportunities.write',
    'calendars.readonly',
    'calendars.write',
    'calendars/events.readonly',
    'calendars/events.write',
    'workflows.readonly',
    'users.readonly',
    'medias.readonly',
    'medias.write',
  ],
}

export const CRM_APPS: Record<CrmAppKey, CrmApp> = {
  agency: AGENCY_APP,
  sub_location: SUB_LOCATION_APP,
}

const OP_TO_APP: Record<CrmOperationCategory, CrmAppKey> = {
  // Sub-location ops → 0nCORE Marketplace
  contacts: 'sub_location',
  conversations: 'sub_location',
  opportunities: 'sub_location',
  calendars: 'sub_location',
  invoices: 'sub_location',
  payments: 'sub_location',
  products: 'sub_location',
  social: 'sub_location',
  tags: 'sub_location',
  custom_fields: 'sub_location',
  custom_values: 'sub_location',
  workflows: 'sub_location',
  forms: 'sub_location',
  campaigns: 'sub_location',
  objects: 'sub_location',
  media: 'sub_location',
  courses: 'sub_location',
  users: 'sub_location',
  locations_read: 'sub_location',
  webhooks_register: 'sub_location',

  // Agency ops → 0nAGENCY
  sub_accounts: 'agency',
  snapshot_deploy: 'agency',
  agency_billing: 'agency',
  agency_users: 'agency',
  agency_settings: 'agency',

  // OAuth installs use whichever app is doing the install
  oauth_install: 'sub_location',
}

/**
 * Pick the right CRM app for an operation category. Backbone of every
 * routing decision. Used by lib/crm-router.ts.
 */
export function pickApp(category: CrmOperationCategory): CrmApp {
  return CRM_APPS[OP_TO_APP[category]]
}

/** Infer category from a CRM API path. */
export function categoryForPath(path: string): CrmOperationCategory | null {
  const p = path.toLowerCase()
  if (p.startsWith('/contacts')) return 'contacts'
  if (p.startsWith('/conversations')) return 'conversations'
  if (p.startsWith('/opportunities')) return 'opportunities'
  if (p.startsWith('/calendars')) return 'calendars'
  if (p.startsWith('/invoices')) return 'invoices'
  if (p.startsWith('/payments')) return 'payments'
  if (p.startsWith('/products')) return 'products'
  if (p.includes('socialplanner')) return 'social'
  if (p.includes('/tags')) return 'tags'
  if (p.includes('customfields') || p.includes('custom-fields')) return 'custom_fields'
  if (p.includes('customvalues') || p.includes('custom-values')) return 'custom_values'
  if (p.startsWith('/workflows')) return 'workflows'
  if (p.startsWith('/forms') || p.startsWith('/surveys')) return 'forms'
  if (p.startsWith('/campaigns') || p.startsWith('/emails')) return 'campaigns'
  if (p.startsWith('/objects')) return 'objects'
  if (p.startsWith('/medias') || p.startsWith('/media')) return 'media'
  if (p.startsWith('/courses') || p.startsWith('/blogs')) return 'courses'
  if (p.startsWith('/users')) return 'users'

  // Agency-level paths
  if (p.includes('snapshot')) return 'snapshot_deploy'
  if (p.includes('saas')) return 'agency_billing'
  if (p.includes('businesses')) return 'sub_accounts'
  // /locations/{id} on its own = sub-account read (agency operation)
  if (p === '/locations' || p === '/locations/') return 'sub_accounts'

  // Default: sub-location read
  return 'locations_read'
}

/**
 * The AGENCY app — provisioning, snapshots and the agency's SaaS/rebilling data.
 *
 * SEPARATE FROM THE OLDER AGENCY APP (69cf4d25…) above, and from the
 * sub-account app. The platform splits capability by token type: per-client work
 * (contacts, conversations, calendars) can only be done with a location token,
 * while creating sub-accounts, reading the snapshot library and reading SaaS
 * plans are agency-token operations with scopes that are simply not offered on a
 * sub-account target.
 *
 * WHY IT HAD TO BE A NEW APP: discovery showed the existing agency install 401s
 * on both /saas-api/public-api/locations and /snapshots/ — "the token is not
 * authorized for this scope". Those endpoints exist and answer; the older app
 * was never granted saas/company.read, snapshots.readonly or companies.readonly,
 * and scopes cannot be added to an install after the fact. A fresh install is
 * the only way to hold them.
 */
export const AGENCY_V2_APP: CrmApp = {
  key: 'agency',
  name: '0nCORE Agency',
  appId: process.env.CRM_AGENCY_V2_APP_ID || '6a71919be8d7c3c038df0839',
  clientIdEnv: 'CRM_AGENCY_APP_CLIENT_ID',
  clientSecretEnv: 'CRM_AGENCY_APP_CLIENT_SECRET',
  pitEnv: 'CRM_AGENCY_V2_PIT',
  authClass: 'Company',
  redirectUri: 'https://app.0ncore.com/api/oauth/callback',
  // The install grants ONLY what it requests, and only what the app offers.
  // v2.0.0 of this app additionally offers custom-menu-link.* and
  // saas/location.* — so they are requested here, or a fresh install lands back
  // at eight. oauth.readonly / oauth.write are deliberately absent: the portal
  // tags them Sub-Account and marks them 🔒 Unavailable on an agency-type app.
  // They cannot be granted here at all — location-token minting (oauth.write)
  // and installed-location listing (oauth.readonly) belong to a separate
  // sub-account app, which is what the legacy 69c762… app appears to be for.
  scopes: [
    'locations.write',
    'locations.readonly',
    'snapshots.readonly',
    'snapshots.write',
    'companies.readonly',
    'saas/company.read',
    'saas/company.write',
    'saas/location.read',
    'saas/location.write',
    'custom-menu-link.readonly',
    'custom-menu-link.write',
    'marketplace-installer-details.readonly',
  ],
}

/**
 * The scopes the 0nBlueprint install asks for.
 *
 * Overridable because the developer portal — not this file — is the source of
 * truth for what the app is configured to OFFER, and asking for one it does not
 * offer fails the entire install rather than that one permission.
 */
export const BLUEPRINT_SCOPES: string[] = (
  process.env.CRM_BLUEPRINT_APP_SCOPES ||
  'locations.readonly locations/customValues.readonly locations/customValues.write'
)
  .split(/[\s,]+/)
  .filter(Boolean)

/**
 * 0nBlueprint — the describe→bundle→import app. Public, sub-account distribution.
 *
 * ITS OWN LISTING, THEREFORE ITS OWN APP. A bundle import writes into a client's
 * live account, and the runbook sells that as a product somebody buys — so an
 * install of the sub-account app must not open it, and a 0nBlueprint install
 * must not silently widen what the sub-account app may touch. Separate app,
 * separate credentials, separate consent screen.
 *
 * EVERY FIELD IS ENV, AND appId HAS NO DEFAULT. The app does not exist in the
 * developer portal yet — that step is a browser step, driven with Mike. A
 * plausible-looking placeholder ID here is worse than an empty string: it would
 * make the install route look configured, the callback match rows against an ID
 * nobody registered, and the entitlement gate hand out access on the strength of
 * a number someone typed. Empty means "not created yet", and every consumer of
 * this record is written to say so out loud rather than guess.
 *
 * SCOPES ARE WHAT THE IMPORT ENGINE ACTUALLY CALLS, and nothing else. Requesting
 * a scope the app was never configured to offer makes the platform reject the
 * WHOLE install with "Invalid scope(s)" — the lesson already paid for on the
 * sub-account app above. app/api/bundle/import today reads and writes exactly
 * one family, /locations/customValues, and names the location it is importing
 * into. The wider Tier A set (blogs, products, pipelines, calendars, emails) is
 * the v1.1 expansion and must be ENABLED ON THE APP in the portal before it can
 * be added here — which is why this is overridable without a deploy.
 */
export const BLUEPRINT_APP: CrmApp = {
  key: 'sub_location',
  name: '0nBlueprint',
  appId: process.env.CRM_BLUEPRINT_APP_ID || '',
  clientIdEnv: 'CRM_BLUEPRINT_APP_CLIENT_ID',
  clientSecretEnv: 'CRM_BLUEPRINT_APP_CLIENT_SECRET',
  pitEnv: 'CRM_BLUEPRINT_PIT',
  authClass: 'Location',
  // Byte-matches the shared callback's own origin. The apex 308s to www, and a
  // redirect_uri that does not match the authorise step is reported by the
  // platform as "Invalid client credentials" — the failure that sends you
  // hunting through secrets that are perfectly fine.
  redirectUri: 'https://app.0ncore.com/api/oauth/callback',
  scopes: BLUEPRINT_SCOPES,
}

/** True once the portal step has happened and the credentials are in env. */
export function blueprintAppConfigured(): boolean {
  return Boolean(process.env[BLUEPRINT_APP.clientIdEnv] && BLUEPRINT_APP.appId)
}

// ── RETIRED APPS — recorded, never deleted ───────────────────────────────────
//
// A retired app ID is not a deleted one. Deleting the record is how the same
// duplicate gets re-created, re-wired, or quoted back as canonical six weeks
// later by someone reading a table that no longer mentions it. It stays here,
// in the file lib/crm.ts and lib/crm-router.ts already read, so anything that
// resolves an app ID can see that this one is dead on purpose.
//
// Registry state at the time of recording (crm_installations, service role,
// 2026-08-19): 30 rows, three app IDs only — 69c762…×28, 6a7178a4…×1,
// 6a71919b…×1. ZERO rows for either Course Builder app. So there was nothing
// to archive in the database; the retirement is a record-of-truth fact, and
// this file plus STATE.md §2 is where it lives.

export interface RetiredCrmApp {
  /** Full app ID, or null when only the portal-visible prefix is confirmed. */
  appId: string | null
  /** Always populated — matching is prefix-safe for exactly this reason. */
  appIdPrefix: string
  name: string
  /** ISO date the retirement was recorded. */
  retiredOn: string
  recordedBy: string
  reason: string
  /** Rows this app held in crm_installations when retired. */
  installsAtRetirement: number
  notes: string
}

export const RETIRED_CRM_APPS: RetiredCrmApp[] = [
  {
    appId: null,
    appIdPrefix: '6a7ea3e8',
    name: 'Course Builder (second/duplicate registration)',
    retiredOn: '2026-08-19',
    recordedBy: 'cece',
    reason:
      'Duplicate registration of the Course Builder app. The canonical Course ' +
      'Builder app is 69801f7a533633818a22921c — the one the callback, the ' +
      '/api/oauth/install/course route and the marketplace submission all use.',
    installsAtRetirement: 0,
    notes:
      'RETIRED, NOT DELETED — do not delete the listing, do not install it, do ' +
      'not point env vars at it. The full app ID is NOT known to this repo: only ' +
      'the 6a7ea3e8 prefix was ever captured, and the marketplace app-read ' +
      'endpoints answer 404/401 to our PIT (no marketplace scope), so the full ' +
      'value is portal-only. Fill appId in from the developer portal when someone ' +
      'is next in there; the prefix is what matching keys off until then.',
  },
]

/**
 * True when an app ID is retired. Matches on the full ID when we know it and
 * on the recorded prefix when we do not — an unknown-but-retired app must not
 * pass a check just because we never captured its last 16 characters.
 */
export function isRetiredCrmApp(appId: string | null | undefined): boolean {
  if (!appId) return false
  return RETIRED_CRM_APPS.some(
    (app) => app.appId === appId || appId.startsWith(app.appIdPrefix)
  )
}
