/**
 * GET /api/oauth/.well-known/oauth-authorization-server
 *
 * RFC 8414 OAuth 2.0 Authorization Server Metadata.
 * Mirrored at /.well-known/oauth-authorization-server (root) for spec
 * compliance — both URLs return the same document.
 */
import { NextResponse } from 'next/server'
import {
  getIssuer,
  SUPPORTED_AUTH_METHODS,
  SUPPORTED_CODE_CHALLENGE_METHODS,
  SUPPORTED_GRANT_TYPES,
  SUPPORTED_RESPONSE_TYPES,
  SUPPORTED_SCOPES,
} from '@/lib/oauth-server'

export const runtime = 'nodejs'
export const dynamic = 'force-static'
export const revalidate = 3600

export async function GET() {
  const issuer = getIssuer()
  return NextResponse.json(
    {
      issuer,
      authorization_endpoint: `${issuer}/api/oauth/authorize`,
      token_endpoint: `${issuer}/api/oauth/token`,
      registration_endpoint: `${issuer}/api/oauth/register`,
      userinfo_endpoint: `${issuer}/api/oauth/userinfo`,
      revocation_endpoint: `${issuer}/api/oauth/revoke`,
      introspection_endpoint: `${issuer}/api/oauth/introspect`,
      jwks_uri: `${issuer}/.well-known/jwks.json`,

      response_types_supported: [...SUPPORTED_RESPONSE_TYPES],
      grant_types_supported: [...SUPPORTED_GRANT_TYPES],
      scopes_supported: [...SUPPORTED_SCOPES],
      token_endpoint_auth_methods_supported: [...SUPPORTED_AUTH_METHODS],
      code_challenge_methods_supported: [...SUPPORTED_CODE_CHALLENGE_METHODS],
      response_modes_supported: ['query'],

      service_documentation: `${issuer}/docs/oauth`,
      ui_locales_supported: ['en'],

      // MCP-specific metadata advertised so clients can self-configure.
      authorization_response_iss_parameter_supported: true,
      require_pushed_authorization_requests: false,
    },
    {
      headers: {
        'cache-control': 'public, max-age=3600, s-maxage=3600',
      },
    },
  )
}
