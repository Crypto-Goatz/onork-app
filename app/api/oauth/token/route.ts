/**
 * POST /api/oauth/token — OAuth 2.1 token endpoint.
 *
 * Supports:
 *   grant_type=authorization_code  + code_verifier (PKCE) → access+refresh
 *   grant_type=refresh_token       + refresh_token       → rotated pair
 *
 * Client authentication:
 *   - confidential clients: client_secret_basic OR client_secret_post
 *   - public clients (token_endpoint_auth_method=none): client_id only,
 *     PKCE proof binds the request to the auth code
 *
 * Backwards-compat: legacy CRM clients are seeded from env vars and
 * authenticate via client_secret_post; their auth codes are minted by
 * the same /authorize endpoint, so this handler serves both flows
 * without a code branch.
 */
import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  adminClient,
  consumeAuthCode,
  issueTokens,
  loadClient,
  rotateRefreshToken,
  verifyPkce,
  type OAuthClient,
} from '@/lib/oauth-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Body — accept form-urlencoded (spec) or JSON (convenience).
  const ct = req.headers.get('content-type') || ''
  const params: Record<string, string> = {}
  if (ct.includes('application/json')) {
    const body = (await req.json()) as Record<string, string>
    Object.assign(params, body)
  } else {
    const text = await req.text()
    new URLSearchParams(text).forEach((v, k) => {
      params[k] = v
    })
  }

  const grantType = params.grant_type
  if (!grantType) return errorJson('invalid_request', 'grant_type required')

  // Client auth — Basic header takes precedence over body.
  const auth = req.headers.get('authorization') || ''
  let basicId: string | null = null
  let basicSecret: string | null = null
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8')
      const idx = decoded.indexOf(':')
      basicId = decoded.slice(0, idx)
      basicSecret = decoded.slice(idx + 1)
    } catch {
      return errorJson('invalid_client', 'malformed Basic header', 401)
    }
  }
  const clientId = basicId || params.client_id
  const clientSecret = basicSecret || params.client_secret || null
  if (!clientId) return errorJson('invalid_client', 'client_id required', 401)

  const sb = adminClient()
  const client = await loadClient(sb, clientId)
  if (!client) return errorJson('invalid_client', 'unknown client_id', 401)

  if (!authenticateClient(client, clientSecret)) {
    return errorJson('invalid_client', 'client authentication failed', 401)
  }

  if (grantType === 'authorization_code') {
    return handleAuthCode(sb, client, params)
  }
  if (grantType === 'refresh_token') {
    return handleRefresh(sb, client, params)
  }
  return errorJson('unsupported_grant_type', `unsupported: ${grantType}`)
}

// ─────────────────────────────────────────────────────────────────────
// Grant handlers
// ─────────────────────────────────────────────────────────────────────

async function handleAuthCode(
  sb: SupabaseClient,
  client: OAuthClient,
  params: Record<string, string>,
) {
  const code = params.code
  const redirectUri = params.redirect_uri
  const verifier = params.code_verifier
  if (!code) return errorJson('invalid_request', 'code required')
  if (!redirectUri) return errorJson('invalid_request', 'redirect_uri required')

  const consumed = await consumeAuthCode(sb, code)
  if (!consumed) return errorJson('invalid_grant', 'code invalid, expired, or already used')
  if (consumed.client_id !== client.client_id) {
    return errorJson('invalid_grant', 'code issued to a different client')
  }
  if (consumed.redirect_uri !== redirectUri) {
    return errorJson('invalid_grant', 'redirect_uri mismatch')
  }

  // PKCE — required for public clients, optional for confidential.
  if (consumed.code_challenge) {
    if (!verifier) return errorJson('invalid_grant', 'code_verifier required')
    if (consumed.code_challenge_method !== 'S256') {
      return errorJson('invalid_grant', 'unsupported code_challenge_method')
    }
    if (!verifyPkce(verifier, consumed.code_challenge)) {
      return errorJson('invalid_grant', 'PKCE verification failed')
    }
  } else if (client.token_endpoint_auth_method === 'none') {
    return errorJson('invalid_grant', 'PKCE required for public clients')
  }

  // Resolve user email for the JWT mirror — best effort, don't fail the
  // grant on a profile-fetch hiccup.
  let email: string | null = null
  try {
    const { data } = await sb.auth.admin.getUserById(consumed.user_id)
    email = data.user?.email ?? null
  } catch {
    /* ignore */
  }

  const issued = await issueTokens(sb, {
    clientId: client.client_id,
    userId: consumed.user_id,
    email,
    scope: consumed.scope,
    withRefresh: client.grant_types.includes('refresh_token'),
  })

  return tokenJson(issued)
}

async function handleRefresh(
  sb: SupabaseClient,
  client: OAuthClient,
  params: Record<string, string>,
) {
  const refresh = params.refresh_token
  if (!refresh) return errorJson('invalid_request', 'refresh_token required')

  const rotated = await rotateRefreshToken(sb, refresh)
  if (!rotated) return errorJson('invalid_grant', 'refresh_token invalid or expired')
  if (rotated.client_id !== client.client_id) {
    return errorJson('invalid_grant', 'refresh_token bound to a different client')
  }

  let email: string | null = null
  try {
    const { data } = await sb.auth.admin.getUserById(rotated.user_id)
    email = data.user?.email ?? null
  } catch {
    /* ignore */
  }

  const issued = await issueTokens(sb, {
    clientId: client.client_id,
    userId: rotated.user_id,
    email,
    scope: rotated.scope,
    withRefresh: true,
  })
  return tokenJson(issued)
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function authenticateClient(client: OAuthClient, secret: string | null): boolean {
  if (client.token_endpoint_auth_method === 'none') return true
  if (!client.client_secret) return false
  if (!secret) return false
  // Constant-time comparison
  if (secret.length !== client.client_secret.length) return false
  let diff = 0
  for (let i = 0; i < secret.length; i++) {
    diff |= secret.charCodeAt(i) ^ client.client_secret.charCodeAt(i)
  }
  return diff === 0
}

function tokenJson(t: {
  access_token: string
  refresh_token: string | null
  token_type: 'Bearer'
  expires_in: number
  scope: string
  jwt: string | null
}) {
  // Per RFC 6749 §5.1, response is JSON with no-store cache headers.
  const body: Record<string, unknown> = {
    access_token: t.access_token,
    token_type: t.token_type,
    expires_in: t.expires_in,
    scope: t.scope,
  }
  if (t.refresh_token) body.refresh_token = t.refresh_token
  if (t.jwt) body.id_token = t.jwt
  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      pragma: 'no-cache',
    },
  })
}

function errorJson(error: string, description: string, status = 400) {
  return new NextResponse(
    JSON.stringify({ error, error_description: description }),
    {
      status,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
        pragma: 'no-cache',
      },
    },
  )
}
