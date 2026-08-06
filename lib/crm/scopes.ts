/**
 * CRM OAuth scopes, in version control.
 *
 * WHY THIS FILE EXISTS. Until now the scope list lived inline in the connect
 * route and, for everything else, in the CRM developer portal — a screen only
 * one person can see. When an install came back missing a capability, there was
 * nothing to diff: you could not tell from the repo what the app even asked
 * for. A scope list is a security surface. It belongs where it can be reviewed.
 *
 * WHAT A SCOPE IS AND IS NOT. A scope here is a *request* — a string the app
 * hands the CRM at install time. It becomes a capability only when (a) the
 * marketplace app is configured to offer it in the portal AND (b) the installer
 * consents. Adding a string below asks for more; it grants nothing on its own,
 * and an existing token never gains a scope retroactively. The grant is what
 * comes back on the token, which is why `grantedFrom` / `missingFrom` exist:
 * trust what the CRM returned, not what we asked for.
 *
 * THE TWO-APP SPLIT IS THE WHOLE POINT. Some capabilities are sub-account
 * scoped and some are agency scoped, and the CRM decides which by HOW the app
 * is installed, not by what the list says:
 *
 *   SUBACCOUNT — installed per-location via `chooselocation`. Contacts,
 *                calendars, blogs, products, the day-to-day of one account.
 *   AGENCY     — installed once at the company level. Custom menu links, SaaS
 *                configurator, snapshots, writing a location's feature
 *                permissions. A sub-account install can NEVER hold these; the
 *                CRM silently drops them from the grant. That is the
 *                `installed locations: 0` wall, restated as a scope fact.
 *
 * So the agency scopes below are not "more of the same list" — they are only
 * grantable to AGENCY_APP_CLIENT_ID installed at the agency. Putting them here
 * documents the target; it does not change it.
 */

/**
 * Sub-account scopes — the marketplace app, installed per location.
 *
 * This is the list the connect route builds its install URL from. Everything
 * here is grantable to a `chooselocation` install and has been observed to
 * come back on the token.
 */
export const SUBACCOUNT_SCOPES = [
  'contacts.readonly', 'contacts.write',
  'conversations.readonly', 'conversations.write',
  'conversations/message.readonly', 'conversations/message.write',
  'calendars.readonly', 'calendars.write',
  'calendars/events.readonly', 'calendars/events.write',
  'opportunities.readonly', 'opportunities.write',
  'invoices.readonly', 'invoices.write',
  'payments/orders.readonly', 'payments/orders.write', 'payments/transactions.readonly',
  'socialplanner/oauth.readonly', 'socialplanner/oauth.write',
  'socialplanner/post.readonly', 'socialplanner/post.write',
  'socialplanner/account.readonly', 'socialplanner/account.write',
  'socialplanner/csv.readonly', 'socialplanner/csv.write',
  'socialplanner/category.readonly', 'socialplanner/category.write',
  'emails/builder.readonly', 'emails/builder.write',
  'forms.readonly', 'forms.write',
  'funnels/funnel.readonly', 'funnels/page.readonly',
  'funnels/redirect.readonly', 'funnels/redirect.write',
  'locations.readonly',
  'locations/customFields.readonly', 'locations/customFields.write',
  'locations/customValues.readonly', 'locations/customValues.write',
  'locations/tasks.readonly', 'locations/tasks.write',
  'locations/tags.readonly', 'locations/tags.write',
  'medias.readonly', 'medias.write',
  'users.readonly', 'users.write',
  'products.readonly', 'products.write',
  'campaigns.readonly',
  'workflows.readonly',
  'phonenumbers.read', 'phonenumbers.write',
  'objects/schema.readonly', 'objects/schema.write',
  'objects/record.readonly', 'objects/record.write',
  'knowledge-bases.readonly', 'knowledge-bases.write',
  'blogs/posts.readonly', 'blogs/post.write', 'blogs/list.readonly',
  'brand-boards/design-kit.readonly', 'brand-boards/design-kit.write',
  'voice-ai-agents.readonly', 'voice-ai-agents.write',
  'courses.readonly', 'courses.write',
  'surveys.readonly',
  'businesses.readonly', 'businesses.write',
  'oauth.readonly', 'oauth.write',
] as const

/**
 * Agency-only scopes — the agency app, installed once at the company level.
 *
 * These are the six-plus that a sub-account install cannot hold, and the reason
 * menu links, the SaaS configurator, snapshot deploys, and writing a location's
 * feature permissions all return 401 today. Each line is annotated with what it
 * unlocks so a future reader knows why removing one breaks a feature.
 */
export const AGENCY_SCOPES = [
  'custom-menu-link.readonly', 'custom-menu-link.write', // POST /custom-menus/ — the marketplace menu links
  'saas/company.read', 'saas/company.write',            // agency-level SaaS configurator
  'saas/location.read', 'saas/location.write',           // per-client plan assignment / rebilling
  'snapshots.readonly',                                  // load + deploy the master snapshot on provision
  'locations.write',                                     // PUT /locations/{id}/permissions — 25 feature toggles
  'companies.readonly',                                  // list installed locations, mint location tokens
  'oauth.readonly', 'oauth.write',                       // POST /oauth/locationToken from the agency token
] as const

export type CrmScope = (typeof SUBACCOUNT_SCOPES)[number] | (typeof AGENCY_SCOPES)[number]

/**
 * Build the `scope=` value for an install URL.
 *
 * The CRM's authorize endpoint wants scopes space-delimited, and a `+` in a
 * query string IS an encoded space — so the join is deliberate, not a
 * concatenation bug. `dedupe` guards the overlap (`oauth.*` is on both lists).
 */
export function scopeString(scopes: readonly string[]): string {
  return Array.from(new Set(scopes)).join('+')
}

/** What an agency-app install URL should request: sub-account work PLUS the agency-only set. */
export const AGENCY_INSTALL_SCOPES = Array.from(
  new Set([...SUBACCOUNT_SCOPES, ...AGENCY_SCOPES]),
) as string[]

/**
 * Read the scopes a token actually came back with.
 *
 * The CRM returns them space-delimited on the `scope` field of the token
 * response. This is the only honest source of what an install can do — the
 * request list is a wish, this is the grant.
 */
export function grantedFrom(tokenScope: string | null | undefined): Set<string> {
  return new Set((tokenScope ?? '').split(/[\s+]+/).filter(Boolean))
}

/** Requested-but-not-granted — the actionable gap when a capability 401s. */
export function missingFrom(
  requested: readonly string[],
  tokenScope: string | null | undefined,
): string[] {
  const granted = grantedFrom(tokenScope)
  return requested.filter((s) => !granted.has(s))
}
