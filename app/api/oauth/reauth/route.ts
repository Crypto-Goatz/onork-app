/**
 * GET /api/oauth/reauth — start a fresh marketplace install OAuth flow.
 *
 * Redirects to the CRM marketplace authorize endpoint with our client_id,
 * redirect_uri, and scope set. After the user installs (or re-installs), the
 * callback at /api/oauth/callback receives the new code, exchanges it, and
 * stores a fresh access_token + refresh_token.
 *
 * Use this for both first-time installs and reconnects when refresh_token
 * is empty / the connection expired. It is the destination of every
 * re-consent-on-open prompt — see lib/crm/reconsent.ts.
 *
 * IT TAKES ?app AND ?next, AND BOTH FIX A REAL FAILURE.
 *
 *   ?app  — the CRM app id to re-authorize. Without it this always sent the
 *           LEGACY marketplace client (69c762…), so a customer whose install
 *           belongs to the sub-account app (6a7178a4) or the agency app was
 *           re-consenting to the wrong application: the flow completes, a row
 *           is written for an app they do not use, and the dead install they
 *           were trying to fix is untouched. credsForApp already owns the
 *           appId → client mapping for refresh; this is the same mapping on the
 *           way in, so the two cannot disagree.
 *
 *   ?next  — where to land afterwards. A re-consent prompt is shown ON a page
 *            the person was trying to use; dumping them on /crm afterwards
 *            means they have to find their way back and, worse, cannot tell
 *            whether it worked. Carried in a short-lived cookie rather than in
 *            OAuth `state`, because the CRM does not reliably return state on a
 *            marketplace install and a lost return path would be silent.
 *            Same-site paths only: an open redirect on the end of an OAuth
 *            flow is a credential-harvesting hole.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { MARKETPLACE_APP, credsForApp } from '@/lib/crm'
import { SUB_LOCATION_APP, AGENCY_V2_APP } from '@/lib/crm-apps'

const CRM_AUTHORIZE_URL = 'https://marketplace.gohighlevel.com/oauth/chooselocation'

// Full scope set (140+) — this is what the marketplace app advertises.
// We list the operational subset here; the marketplace app config governs
// the actual approved scopes. Asking for more than approved is harmless.
const REQUESTED_SCOPES = [
  // Sub-account
  'locations.readonly',
  'locations.write',
  // Contacts
  'contacts.readonly',
  'contacts.write',
  // Conversations + messaging
  'conversations.readonly',
  'conversations.write',
  'conversations/message.readonly',
  'conversations/message.write',
  // Pipeline
  'opportunities.readonly',
  'opportunities.write',
  // Calendar
  'calendars.readonly',
  'calendars.write',
  'calendars/events.readonly',
  'calendars/events.write',
  // Products + payments
  'products.readonly',
  'products.write',
  'invoices.readonly',
  'invoices.write',
  'payments.readonly',
  'payments.write',
  // Social
  'socialplanner/post.readonly',
  'socialplanner/post.write',
  'socialplanner/account.readonly',
  // Custom fields/values/objects
  'custom-fields.readonly',
  'custom-fields.write',
  'custom-values.readonly',
  'custom-values.write',
  'objects.readonly',
  'objects.write',
  // Workflows
  'workflows.readonly',
  // Users
  'users.readonly',
  'users.write',
].join(' ')

/** Same-site paths only. Anything else is dropped, never repaired. */
export function safeNext(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim()
  if (!v.startsWith('/') || v.startsWith('//')) return null
  return v
}

/**
 * Which app's consent screen to send them to.
 *
 * The state prefix matters as much as the client id: the callback picks its
 * exchange candidate from it, and picking wrong spends a single-use code
 * against the wrong client — a failure the platform reports as "Invalid client
 * credentials", which is how this class of bug gets diagnosed as a bad secret.
 */
function appTarget(appId: string | null): {
  clientId: string
  redirectUri: string
  statePrefix: string
} {
  const agencyIds = [AGENCY_V2_APP.appId, '6a71919be8d7c3c038df0839']
  if (appId && agencyIds.includes(appId)) {
    return {
      clientId: process.env[AGENCY_V2_APP.clientIdEnv] || '',
      redirectUri: AGENCY_V2_APP.redirectUri,
      statePrefix: 'agency',
    }
  }

  if (appId && appId === (process.env.CRM_COURSE_APP_ID || '69801f7a533633818a22921c')) {
    return {
      clientId: process.env.CRM_COURSE_APP_CLIENT_ID || '',
      redirectUri: 'https://app.0ncore.com/api/oauth/callback',
      statePrefix: 'course',
    }
  }

  // Sub-account is the default, and credsForApp is the authority on which
  // client id that means — the same function the refresh worker uses.
  const { clientId } = credsForApp(appId || SUB_LOCATION_APP.appId)
  return {
    clientId: clientId || MARKETPLACE_APP.clientId,
    redirectUri: SUB_LOCATION_APP.redirectUri || MARKETPLACE_APP.redirectUri,
    statePrefix: 'sub',
  }
}

export async function GET(req: NextRequest) {
  // Sanity: user must be logged in to start a reconnect on their account
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  const next = safeNext(req.nextUrl.searchParams.get('next'))
  if (!user) {
    // The return path survives the login detour too. Being bounced to /crm
    // after signing in is the same lost-your-place failure, one step earlier.
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next || '/crm')}`, req.url))
  }

  const appId = (req.nextUrl.searchParams.get('app') || '').trim() || null
  const { clientId, redirectUri, statePrefix } = appTarget(appId)

  if (!clientId) {
    // Named, because "client_id missing" for an unstated app is a 500 nobody
    // can act on. Which app has no credentials in this environment IS the fix.
    return NextResponse.json(
      { error: `No client_id configured for app ${appId ?? '(default sub-account)'}.` },
      { status: 500 },
    )
  }

  const url = new URL(CRM_AUTHORIZE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', REQUESTED_SCOPES)

  // Optional state for CSRF; minimal — full session-bound state can be added later.
  // The PREFIX is load-bearing: the callback reads it to choose one app instead
  // of guessing through a list and spending the code.
  url.searchParams.set('state', `${statePrefix}:reauth:${user.id.slice(0, 8)}`)

  const res = NextResponse.redirect(url.toString())
  if (next) {
    // Ten minutes: longer than any consent screen takes, short enough that a
    // path from an abandoned attempt cannot redirect a later, unrelated install.
    res.cookies.set('oncore.reauth.next', next, {
      httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/',
    })
  }
  return res
}
