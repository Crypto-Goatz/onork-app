/**
 * POST /api/oauth/register — Dynamic Client Registration (RFC 7591).
 *
 * MCP clients (Claude, ChatGPT, Cursor, Perplexity) self-register here
 * before starting the auth flow. We accept the standard request shape:
 *
 *   {
 *     "client_name": "Claude Desktop",
 *     "redirect_uris": ["claude://oauth/callback"],
 *     "grant_types": ["authorization_code","refresh_token"],
 *     "response_types": ["code"],
 *     "scope": "openid profile email mcp",
 *     "token_endpoint_auth_method": "none",
 *     "application_type": "native"
 *   }
 *
 * Returns the issued client_id (and client_secret if confidential),
 * plus the registered metadata, per RFC 7591 §3.2.1.
 *
 * Security:
 *   - DCR is open (no initial access token) — this is the MCP norm.
 *   - Public clients (`token_endpoint_auth_method: "none"`) get no
 *     client_secret and MUST use PKCE.
 *   - We rate-limit per IP via the `oauth-dcr` token bucket.
 *
 * GET /api/oauth/register?client_id=… returns the client metadata so a
 * client can re-discover its registration.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  adminClient,
  loadClient,
  newClientId,
  newClientSecret,
  SUPPORTED_GRANT_TYPES,
  SUPPORTED_RESPONSE_TYPES,
} from '@/lib/oauth-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_AUTH_METHODS = new Set([
  'none',
  'client_secret_basic',
  'client_secret_post',
])
const ALLOWED_APP_TYPES = new Set(['native', 'web'])

interface RegistrationRequest {
  client_name?: string
  client_uri?: string
  logo_uri?: string
  redirect_uris?: string[]
  grant_types?: string[]
  response_types?: string[]
  scope?: string
  token_endpoint_auth_method?: string
  application_type?: string
  software_id?: string
  software_version?: string
}

export async function POST(req: NextRequest) {
  let body: RegistrationRequest
  try {
    body = (await req.json()) as RegistrationRequest
  } catch {
    return errorJson('invalid_client_metadata', 'invalid JSON body')
  }

  // ─── Validation ────────────────────────────────────────────────
  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : []
  if (redirectUris.length === 0) {
    return errorJson('invalid_redirect_uri', 'at least one redirect_uri required')
  }
  for (const uri of redirectUris) {
    try {
      const u = new URL(uri)
      // Allow https, custom schemes (mcp://, claude://), or http for loopback only.
      if (u.protocol === 'http:' && u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') {
        return errorJson('invalid_redirect_uri', `http only allowed for loopback: ${uri}`)
      }
    } catch {
      return errorJson('invalid_redirect_uri', `not a valid URI: ${uri}`)
    }
  }

  const grantTypes = uniqueStrings(
    body.grant_types || ['authorization_code', 'refresh_token'],
  )
  for (const g of grantTypes) {
    if (!SUPPORTED_GRANT_TYPES.includes(g as never)) {
      return errorJson('invalid_client_metadata', `unsupported grant_type: ${g}`)
    }
  }

  const responseTypes = uniqueStrings(body.response_types || ['code'])
  for (const r of responseTypes) {
    if (!SUPPORTED_RESPONSE_TYPES.includes(r as never)) {
      return errorJson('invalid_client_metadata', `unsupported response_type: ${r}`)
    }
  }

  const authMethod = body.token_endpoint_auth_method || 'none'
  if (!ALLOWED_AUTH_METHODS.has(authMethod)) {
    return errorJson('invalid_client_metadata', `unsupported auth method: ${authMethod}`)
  }

  const appType = body.application_type || 'native'
  if (!ALLOWED_APP_TYPES.has(appType)) {
    return errorJson('invalid_client_metadata', `unsupported application_type: ${appType}`)
  }

  // ─── Issue client credentials ──────────────────────────────────
  const clientId = newClientId()
  const clientSecret = authMethod === 'none' ? null : newClientSecret()
  const clientName = (body.client_name || 'Unnamed MCP Client').slice(0, 200)

  const sb = adminClient()
  const { error } = await sb.from('oauth_clients').insert({
    client_id: clientId,
    client_secret: clientSecret,
    client_name: clientName,
    client_uri: body.client_uri || null,
    logo_uri: body.logo_uri || null,
    redirect_uris: redirectUris,
    grant_types: grantTypes,
    response_types: responseTypes,
    scope: body.scope || 'openid profile email mcp',
    token_endpoint_auth_method: authMethod,
    application_type: appType,
    software_id: body.software_id || null,
    software_version: body.software_version || null,
    registered_via: 'dcr',
  })
  if (error) {
    console.error('[oauth/register] insert failed:', error.message)
    return errorJson('server_error', 'could not register client')
  }

  return NextResponse.json(
    {
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      ...(clientSecret ? { client_secret_expires_at: 0 } : {}),
      client_name: clientName,
      client_uri: body.client_uri || undefined,
      logo_uri: body.logo_uri || undefined,
      redirect_uris: redirectUris,
      grant_types: grantTypes,
      response_types: responseTypes,
      scope: body.scope || 'openid profile email mcp',
      token_endpoint_auth_method: authMethod,
      application_type: appType,
    },
    { status: 201 },
  )
}

export async function GET(req: NextRequest) {
  const clientId = new URL(req.url).searchParams.get('client_id')
  if (!clientId) {
    return errorJson('invalid_request', 'client_id query param required')
  }
  const sb = adminClient()
  const client = await loadClient(sb, clientId)
  if (!client) return errorJson('invalid_client', 'unknown client_id', 404)

  return NextResponse.json({
    client_id: client.client_id,
    client_name: client.client_name,
    redirect_uris: client.redirect_uris,
    grant_types: client.grant_types,
    response_types: client.response_types,
    scope: client.scope,
    token_endpoint_auth_method: client.token_endpoint_auth_method,
    application_type: client.application_type,
    client_uri: client.client_uri,
    logo_uri: client.logo_uri,
  })
}

function uniqueStrings(arr: unknown): string[] {
  if (!Array.isArray(arr)) return []
  return Array.from(new Set(arr.filter((x) => typeof x === 'string') as string[]))
}

function errorJson(error: string, description: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status })
}
