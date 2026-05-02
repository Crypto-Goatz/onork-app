/**
 * POST /api/oauth/introspect — RFC 7662 token introspection.
 *
 * Resource servers POST a token here and get back its claims (or
 * `{ active: false }` if invalid). Used by 0nMCP / external resource
 * servers to validate bearer tokens without local crypto.
 *
 * Auth: requires a registered client (Basic or POST). We don't allow
 * unauthenticated introspection because token enumeration would leak
 * whether a token exists.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminClient, loadClient, validateAccessToken } from '@/lib/oauth-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Client auth — same shape as /token
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
  const clientSecret = basicSecret || body.get('client_secret')
  const tokenStr = body.get('token')

  if (!clientId || !tokenStr) {
    return NextResponse.json({ active: false }, { status: 400 })
  }

  const sb = adminClient()
  const client = await loadClient(sb, clientId)
  if (!client) return NextResponse.json({ active: false }, { status: 401 })

  if (
    client.token_endpoint_auth_method !== 'none' &&
    client.client_secret !== clientSecret
  ) {
    return NextResponse.json({ active: false }, { status: 401 })
  }

  const validated = await validateAccessToken(sb, tokenStr)
  if (!validated) return NextResponse.json({ active: false })

  return NextResponse.json({
    active: true,
    scope: validated.scope,
    client_id: validated.client_id,
    sub: validated.user_id,
    exp: Math.floor(new Date(validated.expires_at).getTime() / 1000),
    token_type: 'Bearer',
  })
}
