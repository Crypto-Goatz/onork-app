/**
 * GET /api/oauth/userinfo — OIDC-style userinfo endpoint.
 *
 * Validates the Bearer access token, looks up the Supabase user, and
 * returns standard userinfo claims. Resource servers (0nMCP) can use
 * this to resolve a token → user without minting their own JWT.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminClient, validateAccessToken } from '@/lib/oauth-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ')) {
    return unauthorized('missing_token')
  }
  const token = auth.slice(7).trim()
  if (!token) return unauthorized('missing_token')

  const sb = adminClient()
  const validated = await validateAccessToken(sb, token)
  if (!validated) return unauthorized('invalid_token')

  const { data: userRes } = await sb.auth.admin.getUserById(validated.user_id)
  const u = userRes?.user
  if (!u) return unauthorized('invalid_token')

  // Pull profile metadata (best-effort).
  const { data: profile } = await sb
    .from('profiles')
    .select('full_name, avatar_url, email, crm_location_id')
    .eq('id', u.id)
    .maybeSingle()

  return NextResponse.json({
    sub: u.id,
    email: u.email || profile?.email || null,
    email_verified: !!u.email_confirmed_at,
    name: profile?.full_name || u.user_metadata?.full_name || null,
    picture: profile?.avatar_url || u.user_metadata?.avatar_url || null,
    // 0n-specific claims
    onork_user_id: u.id,
    crm_location_id: profile?.crm_location_id || null,
    scope: validated.scope,
    client_id: validated.client_id,
  })
}

function unauthorized(error: string) {
  return new NextResponse(
    JSON.stringify({ error, error_description: error }),
    {
      status: 401,
      headers: {
        'content-type': 'application/json',
        'www-authenticate': `Bearer error="${error}"`,
      },
    },
  )
}
