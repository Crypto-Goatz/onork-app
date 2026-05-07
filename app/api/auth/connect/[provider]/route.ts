import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProvider, getRedirectUri, generatePKCE } from '@/lib/oauth-providers'

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

  // PKCE for X/Twitter
  let codeVerifier: string | null = null
  if (provider.extraAuthParams?.code_challenge_method === 'S256') {
    const pkce = generatePKCE()
    codeVerifier = pkce.verifier
    stateData.cv = pkce.verifier // Store verifier in state for callback
  }

  const state = Buffer.from(JSON.stringify(stateData)).toString('base64url')

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
    const crypto = require('crypto')
    const hashBuffer = crypto.createHash('sha256').update(codeVerifier).digest()
    const challenge = Buffer.from(hashBuffer).toString('base64url')
    authParams.set('code_challenge', challenge)
  }

  const url = `${provider.authUrl}?${authParams.toString()}`

  return NextResponse.json({ url })
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
