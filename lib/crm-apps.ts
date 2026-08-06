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
  scopes: [
    // Operational sub-location scopes — the 140+ figure on the marketplace app
    'contacts.readonly',
    'contacts.write',
    'conversations.readonly',
    'conversations.write',
    'conversations/message.readonly',
    'conversations/message.write',
    'opportunities.readonly',
    'opportunities.write',
    'calendars.readonly',
    'calendars.write',
    'calendars/events.readonly',
    'calendars/events.write',
    'invoices.readonly',
    'invoices.write',
    'invoices/schedule.readonly',
    'invoices/schedule.write',
    'invoices/template.readonly',
    'invoices/template.write',
    'payments/orders.readonly',
    'payments/orders.write',
    'payments/transactions.readonly',
    'payments/subscriptions.readonly',
    'payments/integration.readonly',
    'payments/integration.write',
    'products.readonly',
    'products.write',
    'products/prices.readonly',
    'products/prices.write',
    'products/collection.readonly',
    'products/collection.write',
    'socialplanner/post.readonly',
    'socialplanner/post.write',
    'socialplanner/account.readonly',
    'socialplanner/account.write',
    'socialplanner/category.readonly',
    'socialplanner/csv.readonly',
    'socialplanner/csv.write',
    'socialplanner/media.readonly',
    'socialplanner/oauth.readonly',
    'socialplanner/oauth.write',
    'socialplanner/setting.readonly',
    'socialplanner/setting.write',
    'socialplanner/statistics.readonly',
    'socialplanner/tag.readonly',
    'socialplanner/tag.write',
    'medias.readonly',
    'medias.write',
    'custom-fields.readonly',
    'custom-fields.write',
    'custom-values.readonly',
    'custom-values.write',
    'objects.readonly',
    'objects.write',
    'objects/schema.readonly',
    'objects/schema.write',
    'objects/record.readonly',
    'objects/record.write',
    'forms.readonly',
    'forms.write',
    'surveys.readonly',
    'surveys.write',
    'campaigns.readonly',
    'workflows.readonly',
    'links.readonly',
    'links.write',
    'tags.readonly',
    'tags.write',
    'lc-email.readonly',
    'emails/builder.readonly',
    'emails/builder.write',
    'emails/schedule.readonly',
    'emails/schedule.write',
    'courses.readonly',
    'courses.write',
    'blogs.readonly',
    'blogs.write',
    'businesses.readonly',
    'locations.readonly',
    'locations/customFields.readonly',
    'locations/customFields.write',
    'locations/customValues.readonly',
    'locations/customValues.write',
    'locations/tags.readonly',
    'locations/tags.write',
    'locations/templates.readonly',
    'locations/tasks.readonly',
    'locations/tasks.write',
    'users.readonly',
    'voiceai.readonly',
    'voiceai.write',
    'webhooks.write',
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
