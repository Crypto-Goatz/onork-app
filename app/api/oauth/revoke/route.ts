/**
 * POST /api/oauth/revoke — RFC 7009 token revocation.
 * Accepts either an access token or a refresh token. Per spec, returns
 * 200 even if the token is unknown to avoid info leaks.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminClient, loadClient } from '@/lib/oauth-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  let basicId: string | null = null
  let basicSecret: string | null = null
  if (auth.startsWith('Basic ')) {
    const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8')
    const idx = decoded.indexOf(':')
    basicId = decoded.slice(0, idx)
    basicSecret = decoded.slice(idx + 1)
  }
  const body = new URLSearchParams(await req.text())
  const clientId = basicId || body.get('client_id')
  const clientSecret = basicSecret || body.get('client_secret') || null
  const tokenStr = body.get('token')

  if (!clientId || !tokenStr) {
    return new NextResponse(null, { status: 200 })
  }

  const sb = adminClient()
  const client = await loadClient(sb, clientId)
  if (!client) return new NextResponse(null, { status: 200 })

  if (
    client.token_endpoint_auth_method !== 'none' &&
    client.client_secret !== clientSecret
  ) {
    return new NextResponse(null, { status: 200 })
  }

  const nowIso = new Date().toISOString()
  await sb
    .from('oauth_access_tokens')
    .update({ revoked_at: nowIso })
    .or(`token.eq.${tokenStr},refresh_token.eq.${tokenStr}`)
    .eq('client_id', clientId)

  return new NextResponse(null, { status: 200 })
}
