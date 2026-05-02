/**
 * GET /api/auth/debug — admin-only diagnostic endpoint.
 *
 * Reports per-provider env-var presence + redirect URIs the connect flow
 * expects. Adds OAuth-server health: tables present, registered client
 * count, and the issuer + discovery URLs MCP clients should use.
 *
 * Never returns secret values, only booleans for "is set". Gated behind
 * getSession (rule 16) + profiles.is_admin OR mike@rocketopp.com.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient, getIssuer } from '@/lib/oauth-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, email')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin =
    user.email === 'mike@rocketopp.com' || profile?.is_admin === true
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseRedirectUri = supabaseUrl ? `${supabaseUrl}/auth/v1/callback` : ''
  const issuer = getIssuer()

  // OAuth server health — table reachability + registered client count
  const sb = adminClient()
  let oauthServer: Record<string, unknown> = {
    issuer,
    discovery_url: `${issuer}/.well-known/oauth-authorization-server`,
    discovery_url_alt: `${issuer}/api/oauth/.well-known/oauth-authorization-server`,
    authorize_endpoint: `${issuer}/api/oauth/authorize`,
    token_endpoint: `${issuer}/api/oauth/token`,
    register_endpoint: `${issuer}/api/oauth/register`,
    userinfo_endpoint: `${issuer}/api/oauth/userinfo`,
    introspection_endpoint: `${issuer}/api/oauth/introspect`,
    revocation_endpoint: `${issuer}/api/oauth/revoke`,
    consent_page: `${issuer}/auth/authorize`,
    jwt_mirror_enabled: !!process.env.SUPABASE_JWT_SECRET,
  }
  try {
    const { count: clientCount, error: cErr } = await sb
      .from('oauth_clients')
      .select('*', { count: 'exact', head: true })
    const { count: tokenCount, error: tErr } = await sb
      .from('oauth_access_tokens')
      .select('*', { count: 'exact', head: true })
      .is('revoked_at', null)
    oauthServer = {
      ...oauthServer,
      tables: {
        oauth_clients: cErr ? `error: ${cErr.message}` : 'ok',
        oauth_access_tokens: tErr ? `error: ${tErr.message}` : 'ok',
      },
      registered_clients: clientCount ?? 0,
      active_tokens: tokenCount ?? 0,
    }
  } catch (e) {
    oauthServer.tables_error = (e as Error).message
  }

  return NextResponse.json({
    ok: true,
    app_url: process.env.NEXT_PUBLIC_APP_URL,
    auth_cookie_domain: process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN,
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    providers: {
      google: {
        client_id_set: !!process.env.GOOGLE_CLIENT_ID,
        client_secret_set: !!process.env.GOOGLE_CLIENT_SECRET,
        connect_redirect_uri: 'https://0ncore.com/api/auth/connect/google/callback',
        supabase_redirect_uri: supabaseRedirectUri,
        login_path: '/login (uses supabase.auth.signInWithOAuth, provider=google)',
        connect_path: '/api/auth/connect/google',
      },
      linkedin: {
        client_id_set: !!process.env.LINKEDIN_CLIENT_ID,
        client_secret_set: !!process.env.LINKEDIN_CLIENT_SECRET,
        connect_redirect_uri: 'https://0ncore.com/api/auth/connect/linkedin/callback',
        supabase_redirect_uri: supabaseRedirectUri,
        login_path: '/login (uses supabase.auth.signInWithOAuth, provider=linkedin_oidc)',
        connect_path: '/api/auth/connect/linkedin',
      },
      slack: {
        client_id_set: !!process.env.SLACK_CLIENT_ID,
        client_secret_set: !!process.env.SLACK_CLIENT_SECRET,
        connect_redirect_uri: 'https://0ncore.com/api/auth/connect/slack/callback',
        bot_install_redirect_uri: 'https://0ncore.com/api/slack/oauth',
        supabase_redirect_uri: supabaseRedirectUri,
        login_path: '/login (uses CUSTOM /api/auth/connect/slack flow + magic link)',
        connect_path: '/api/auth/connect/slack',
      },
    },
    oauth_server: oauthServer,
    notes: [
      'Google/LinkedIn login go through Supabase auth (signInWithOAuth)',
      'Slack login uses the custom /api/auth/connect/slack flow + magic link',
      'Slack BOT install uses /api/slack/oauth (separate redirect URI)',
      'OAuth server endpoints under oauth_server are for MCP / external clients to authenticate users via 0nCore',
      'JWT mirror is only available when SUPABASE_JWT_SECRET is set on Vercel',
    ],
  })
}
