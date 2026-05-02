/**
 * GET /api/oauth/authorize — OAuth 2.1 authorization endpoint.
 *
 * Validates the client + redirect_uri + PKCE challenge, then either:
 *   1. Renders the consent page at /auth/authorize (user logged in)
 *   2. Redirects to /login with return_to (user logged out)
 *
 * The consent page POSTs to /api/oauth/consent which mints the auth code
 * and redirects to redirect_uri with ?code=&state=.
 *
 * This handler also keeps the legacy CRM external-auth flow working —
 * CRM clients hit this endpoint without PKCE and we mint a code anyway.
 *
 * MCP clients are required (per OAuth 2.1) to send PKCE.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import {
  adminClient,
  isValidRedirectUri,
  loadClient,
  SUPPORTED_CODE_CHALLENGE_METHODS,
} from '@/lib/oauth-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const clientId = url.searchParams.get('client_id')
  const redirectUri = url.searchParams.get('redirect_uri')
  const responseType = url.searchParams.get('response_type') || 'code'
  const scope = url.searchParams.get('scope') || ''
  const state = url.searchParams.get('state') || ''
  const codeChallenge = url.searchParams.get('code_challenge')
  const codeChallengeMethod = url.searchParams.get('code_challenge_method')
  const nonce = url.searchParams.get('nonce')
  const prompt = url.searchParams.get('prompt') // future: 'login', 'consent'

  // ─── Required params ───────────────────────────────────────────
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'client_id and redirect_uri required' },
      { status: 400 },
    )
  }
  if (responseType !== 'code') {
    return redirectWithError(redirectUri, 'unsupported_response_type', state)
  }

  // ─── Client lookup ─────────────────────────────────────────────
  const sbAdmin = adminClient()
  const client = await loadClient(sbAdmin, clientId)
  if (!client) {
    return NextResponse.json(
      { error: 'invalid_client', error_description: 'unknown client_id' },
      { status: 401 },
    )
  }
  if (!isValidRedirectUri(client, redirectUri)) {
    // Per spec: redirect_uri mismatch must NOT bounce — render directly.
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'redirect_uri not registered' },
      { status: 400 },
    )
  }

  // ─── PKCE — required for public clients ────────────────────────
  if (client.token_endpoint_auth_method === 'none') {
    if (!codeChallenge || !codeChallengeMethod) {
      return redirectWithError(
        redirectUri,
        'invalid_request',
        state,
        'PKCE required for public clients',
      )
    }
  }
  if (codeChallengeMethod && !SUPPORTED_CODE_CHALLENGE_METHODS.includes(codeChallengeMethod as never)) {
    return redirectWithError(
      redirectUri,
      'invalid_request',
      state,
      'unsupported code_challenge_method',
    )
  }

  // ─── Session check ─────────────────────────────────────────────
  const sb = await createServerSupabase()
  const { data: { session } } = await sb.auth.getSession()
  const user = session?.user ?? null

  if (!user || prompt === 'login') {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('return_to', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // ─── Render consent page ───────────────────────────────────────
  // We pass the request through verbatim so the consent page can echo
  // it back to /api/oauth/consent. The consent handler re-validates
  // everything before minting the code.
  const consentUrl = new URL('/auth/authorize', req.url)
  consentUrl.searchParams.set('client_id', clientId)
  consentUrl.searchParams.set('redirect_uri', redirectUri)
  consentUrl.searchParams.set('response_type', responseType)
  if (scope) consentUrl.searchParams.set('scope', scope)
  if (state) consentUrl.searchParams.set('state', state)
  if (codeChallenge) consentUrl.searchParams.set('code_challenge', codeChallenge)
  if (codeChallengeMethod) consentUrl.searchParams.set('code_challenge_method', codeChallengeMethod)
  if (nonce) consentUrl.searchParams.set('nonce', nonce)
  return NextResponse.redirect(consentUrl)
}

function redirectWithError(
  redirectUri: string,
  error: string,
  state: string,
  description?: string,
) {
  try {
    const u = new URL(redirectUri)
    u.searchParams.set('error', error)
    if (description) u.searchParams.set('error_description', description)
    if (state) u.searchParams.set('state', state)
    return NextResponse.redirect(u)
  } catch {
    return NextResponse.json({ error, error_description: description }, { status: 400 })
  }
}
