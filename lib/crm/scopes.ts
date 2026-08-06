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
 * The AGENCY scope list is NOT here — it lives on `AGENCY_V2_APP.scopes` in
 * lib/crm-apps.ts, because that constant is what the install route actually
 * requests, and two lists drift. Import it from there. What matters about the
 * split is a portal fact learned the hard way: an agency-type app can hold
 * `custom-menu-link.*`, `saas/*`, `snapshots.*`, `locations.write` and
 * `companies.readonly`, but NOT `oauth.readonly` / `oauth.write` — the portal
 * tags those Sub-Account and marks them Unavailable on an agency app. Minting
 * location tokens therefore needs a separate sub-account app; it can never come
 * from the agency install, no matter how many times you reinstall.
 */

export type CrmScope = (typeof SUBACCOUNT_SCOPES)[number]

/**
 * Build the `scope=` value for an install URL.
 *
 * The CRM's authorize endpoint wants scopes space-delimited, and a `+` in a
 * query string IS an encoded space — so the join is deliberate, not a
 * concatenation bug. The `Set` guards any accidental duplicate.
 */
export function scopeString(scopes: readonly string[]): string {
  return Array.from(new Set(scopes)).join('+')
}

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
