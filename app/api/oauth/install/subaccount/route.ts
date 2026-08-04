import { NextRequest, NextResponse } from 'next/server'
import { SUB_LOCATION_APP } from '@/lib/crm-apps'

/**
 * GET /api/oauth/install/subaccount — start the sub-account app install.
 *
 * The runtime half of the two-app model: this install is what mints per-location
 * tokens for contacts, conversations, calendars and opportunities. The agency
 * app cannot do that work, and this one cannot create sub-accounts or read the
 * snapshot library — hence two.
 *
 * `state=sub` so the shared callback exchanges the code with THIS app's
 * credentials. An authorisation code is single-use; without the hint the
 * callback would spend it on the wrong app.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OAUTH_BASE = process.env.CRM_OAUTH_BASE || 'https://marketplace.gohighlevel.com'

export async function GET(_req: NextRequest) {
  // Both names are accepted: the spec calls it SUBACCT_CLIENT_ID, this repo
  // already had CRM_SUBACCT_CLIENT_ID set and working. Renaming a live secret to
  // match a document is how you break a working install for no gain.
  const clientId =
    process.env.CRM_SUBACCT_CLIENT_ID ||
    process.env.SUBACCT_CLIENT_ID ||
    ''
  if (!clientId) {
    return NextResponse.json({ error: 'CRM_SUBACCT_CLIENT_ID is not set.' }, { status: 503 })
  }

  const url = new URL('/oauth/chooselocation', OAUTH_BASE)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', 'https://app.0ncore.com/api/oauth/callback')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('scope', SUB_LOCATION_APP.scopes.join(' '))
  url.searchParams.set('state', 'sub')

  return NextResponse.redirect(url.toString())
}
