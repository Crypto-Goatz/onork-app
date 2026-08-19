import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/oauth/install/course — start the 0n Course Builder install.
 *
 * THE MISSING FRONT DOOR. The shared callback has understood `state=course`
 * since the app was added to it, but nothing in the product ever produced that
 * state — there was no route that started a Course Builder install at all. The
 * only way to get one was to reach the marketplace listing, which is exactly
 * what is still in review. So the gate that says "one real install must produce
 * a registry row" had no button to press.
 *
 * `state=course` so the callback exchanges the code with THIS app's credentials
 * rather than guessing. An authorisation code is single-use: a wrong guess does
 * not just fail, it spends the code, and every later attempt then reports
 * "code not found" — a message that reads like an expiry problem and is not one.
 *
 * THE HOST IS marketplace.gohighlevel.com, NOT services.leadconnectorhq.com.
 * Measured, not assumed: `services…/oauth/chooselocation` answers 404 for every
 * client_id and every redirect_uri. `/api/marketplace/install-url` was handing
 * out that dead host, so the one install link the product already had could
 * never have completed.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OAUTH_BASE = process.env.CRM_OAUTH_BASE || 'https://marketplace.gohighlevel.com'

/**
 * The two scopes the listing declares, and only those. Over-requesting is not
 * free here: the authorise screen refuses a scope the app was never approved
 * for, and a reviewer reading a consent screen wider than the listing has a
 * reason to reject. Overridable because the portal is the source of truth for
 * what this app actually holds, and it can change without a deploy.
 */
const SCOPES = (process.env.CRM_COURSE_APP_SCOPES || 'courses.readonly courses.write')
  .split(/[\s,]+/)
  .filter(Boolean)

export async function GET(_req: NextRequest) {
  const clientId = process.env.CRM_COURSE_APP_CLIENT_ID || ''
  if (!clientId) {
    return NextResponse.json({ error: 'CRM_COURSE_APP_CLIENT_ID is not set.' }, { status: 503 })
  }

  const url = new URL('/oauth/chooselocation', OAUTH_BASE)
  url.searchParams.set('response_type', 'code')
  // Must match the callback's own origin exactly — the apex 308s to www, and a
  // redirect_uri that does not match the authorise step is reported by the
  // platform as "Invalid client credentials", which sends you hunting secrets.
  url.searchParams.set('redirect_uri', 'https://app.0ncore.com/api/oauth/callback')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('scope', SCOPES.join(' '))
  url.searchParams.set('state', 'course')

  return NextResponse.redirect(url.toString())
}
