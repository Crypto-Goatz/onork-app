/**
 * GET /api/oauth/reauth — start a fresh marketplace install OAuth flow.
 *
 * Redirects to the CRM marketplace authorize endpoint with our marketplace
 * client_id, redirect_uri, and full scope set. After the user installs (or
 * re-installs), the callback at /api/oauth/callback receives the new code,
 * exchanges with user_type=Location (per the OAuth refresh fix), and stores
 * a fresh access_token + refresh_token.
 *
 * Use this for both first-time installs and reconnects when refresh_token
 * is empty / connection expired.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { MARKETPLACE_APP } from '@/lib/crm'

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

export async function GET(req: NextRequest) {
  // Sanity: user must be logged in to start a reconnect on their account
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) {
    return NextResponse.redirect(new URL('/login?next=/crm', req.url))
  }

  const clientId = MARKETPLACE_APP.clientId
  const redirectUri = MARKETPLACE_APP.redirectUri

  if (!clientId) {
    return NextResponse.json({ error: 'Marketplace client_id missing.' }, { status: 500 })
  }

  const url = new URL(CRM_AUTHORIZE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', REQUESTED_SCOPES)

  // Optional state for CSRF; minimal — full session-bound state can be added later
  url.searchParams.set('state', `reauth:${user.id.slice(0, 8)}`)

  return NextResponse.redirect(url.toString())
}
