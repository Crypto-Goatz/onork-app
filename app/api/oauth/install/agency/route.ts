import { NextRequest, NextResponse } from 'next/server'
import { AGENCY_V2_APP } from '@/lib/crm-apps'

/**
 * GET /api/oauth/install/agency — start the agency-app install.
 *
 * THE ONE HUMAN STEP IN THE WHOLE PIPELINE. Everything else provisions itself
 * from tokens we already hold, but an agency install requires the owner to
 * authorise it once. Discovery showed why it matters: the SaaS plan endpoint and
 * the snapshot library both answer 401 "not authorized for this scope" today,
 * because the older install never held saas/company.read, snapshots.readonly or
 * companies.readonly — and scopes cannot be added to an existing install.
 *
 * Sends `state=agency` so the shared callback knows which app's credentials to
 * exchange the code with, rather than trying each in turn and inferring.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Config, not a name — the host is where the authorise screen lives. */
const OAUTH_BASE = process.env.CRM_OAUTH_BASE || 'https://marketplace.gohighlevel.com'

export async function GET(req: NextRequest) {
  const clientId = process.env[AGENCY_V2_APP.clientIdEnv]
  if (!clientId) {
    return NextResponse.json(
      { error: `${AGENCY_V2_APP.clientIdEnv} is not set.` },
      { status: 503 },
    )
  }

  const url = new URL('/oauth/chooselocation', OAUTH_BASE)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', AGENCY_V2_APP.redirectUri)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('scope', AGENCY_V2_APP.scopes.join(' '))
  url.searchParams.set('state', 'agency')

  // 302 rather than a JSON link: this is opened from a button, and an extra hop
  // through a page that shows the URL invites someone to edit the scopes.
  return NextResponse.redirect(url.toString())
}
