import { NextRequest, NextResponse } from 'next/server'
import { BLUEPRINT_APP } from '@/lib/crm-apps'

/**
 * GET /api/oauth/install/blueprint — start the 0nBlueprint install.
 *
 * B1 OF THE RUNBOOK: the install/token service, built before the portal step so
 * that the portal step has somewhere to point. The Course Builder submission
 * taught this order the expensive way — the shared callback understood
 * `state=course` for weeks while nothing in the product could produce it, so the
 * gate that says "one real install must produce a registry row" had no button to
 * press until someone noticed.
 *
 * `state=blueprint` so the callback exchanges the code with THIS app's
 * credentials rather than guessing. An authorisation code is single-use: a wrong
 * guess does not merely fail, it SPENDS the code, and every later attempt then
 * reports "code not found" — which reads like an expiry problem and is not one.
 *
 * THE HOST IS marketplace.gohighlevel.com, NOT services.leadconnectorhq.com.
 * Measured, not assumed: `services…/oauth/chooselocation` answers 404 for every
 * client_id and every redirect_uri.
 *
 * IT FAILS CLOSED AND SAYS WHY. The app is not registered in the developer
 * portal yet. Rather than 302 into an authorise screen that will reject an empty
 * client_id with the platform's own unhelpful wording, this returns 503 naming
 * the two environment variables and who sets them. A route that redirects into a
 * dead end is how "the install is broken" gets reported for three days before
 * anyone discovers nothing was ever configured.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OAUTH_BASE = process.env.CRM_OAUTH_BASE || 'https://marketplace.gohighlevel.com'

export async function GET(_req: NextRequest) {
  const clientId = process.env[BLUEPRINT_APP.clientIdEnv] || ''
  const missing = [
    clientId ? null : BLUEPRINT_APP.clientIdEnv,
    BLUEPRINT_APP.appId ? null : 'CRM_BLUEPRINT_APP_ID',
  ].filter(Boolean)

  if (missing.length) {
    return NextResponse.json(
      {
        error: 'The 0nBlueprint marketplace app has not been created yet, so there is nothing to install.',
        missing,
        // Named, because the next person here should not have to reconstruct
        // which half of the work is outstanding or whose it is.
        nextStep:
          'Create the app in the developer portal (Public, Sub-Account distribution, Custom Page = the ' +
          'upload tool), then set the client id, client secret and app id in Vercel. This route, the ' +
          'shared callback and the /x/0nblueprint frame are already built and waiting on those values.',
        scopesThisRouteWillRequest: BLUEPRINT_APP.scopes,
        redirectUri: BLUEPRINT_APP.redirectUri,
      },
      { status: 503 },
    )
  }

  const url = new URL('/oauth/chooselocation', OAUTH_BASE)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', BLUEPRINT_APP.redirectUri)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('scope', BLUEPRINT_APP.scopes.join(' '))
  url.searchParams.set('state', 'blueprint')

  return NextResponse.redirect(url.toString())
}
