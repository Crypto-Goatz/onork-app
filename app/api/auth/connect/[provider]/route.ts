import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProvider, getRedirectUri, generatePKCE } from '@/lib/oauth-providers'
import { createHmac, createHash } from 'crypto'

/** state = base64url(json).hmac — forgeable before 2026-09-12, now bound to our secret. */
function signState(data: Record<string, string>): string {
  const body = Buffer.from(JSON.stringify(data)).toString('base64url')
  const mac = createHmac('sha256', process.env.APP_JWT_SECRET || '').update(body).digest('base64url')
  return `${body}.${mac}`
}

// GET /api/auth/connect/[provider] — Start OAuth flow for any provider
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  // Slack can be used for login (no existing session required)
  if (!user && providerId !== 'slack') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const provider = getProvider(providerId)
  if (!provider) {
    return NextResponse.json({ error: `Unknown provider: ${providerId}` }, { status: 400 })
  }

  const clientId = process.env[provider.clientIdEnv]
  if (!clientId) {
    return NextResponse.json({
      error: `${provider.name} not configured. Missing ${provider.clientIdEnv} env var.`,
    }, { status: 500 })
  }

  const redirectUri = getRedirectUri(providerId)

  // Build state with user ID + timestamp
  const stateData: Record<string, string> = {
    userId: user?.id || 'login',
    ts: String(Date.now()),
    mode: user ? 'connect' : 'login',
  }

  if (!process.env.APP_JWT_SECRET) {
    return NextResponse.json({ error: 'APP_JWT_SECRET is not configured.' }, { status: 500 })
  }

  // PKCE for X/Twitter. The verifier stays in an httpOnly cookie on THIS
  // browser; putting it in `state` sent it to the provider in the authorize
  // URL, which is the one place PKCE exists to keep it out of.
  let codeVerifier: string | null = null
  if (provider.extraAuthParams?.code_challenge_method === 'S256') {
    codeVerifier = generatePKCE().verifier
  }

  const state = signState(stateData)

  // Build authorization URL
  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: provider.scopes.join(' '),
    state,
    ...(provider.extraAuthParams || {}),
  })

  // Add PKCE challenge if needed
  if (codeVerifier) {
    const challenge = createHash('sha256').update(codeVerifier).digest().toString('base64url')
    authParams.set('code_challenge', challenge)
  }

  const url = `${provider.authUrl}?${authParams.toString()}`

  const res = NextResponse.json({ url })
  if (codeVerifier) {
    res.cookies.set('oncore.oauth.cv', codeVerifier, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 })
  }
  return res
}

// DELETE /api/auth/connect/[provider] — Disconnect a provider
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('user_connections')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', providerId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ disconnected: providerId })
}
