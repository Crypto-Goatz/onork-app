/**
 * POST /api/oauth/consent — finalize the authorization decision.
 *
 * Body (form or JSON):
 *   decision: "approve" | "deny"
 *   client_id, redirect_uri, response_type, scope, state,
 *   code_challenge, code_challenge_method, nonce
 *
 * On approve → mint an auth code and redirect to redirect_uri with
 *   ?code=&state=
 * On deny    → redirect to redirect_uri with
 *   ?error=access_denied&state=
 *
 * Re-validates client + redirect_uri (the authorize page can be tampered
 * with — never trust the form). The user is taken from the Supabase
 * session, not the form.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import {
  adminClient,
  clampScope,
  isValidRedirectUri,
  issueAuthCode,
  loadClient,
} from '@/lib/oauth-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ct = req.headers.get('content-type') || ''
  let body: Record<string, string> = {}
  if (ct.includes('application/json')) {
    body = (await req.json()) as Record<string, string>
  } else {
    const fd = await req.formData()
    fd.forEach((v, k) => {
      if (typeof v === 'string') body[k] = v
    })
  }

  const decision = (body.decision || 'deny').toLowerCase()
  const clientId = body.client_id
  const redirectUri = body.redirect_uri
  const state = body.state || ''
  const scope = body.scope || ''
  const codeChallenge = body.code_challenge || null
  const codeChallengeMethod = body.code_challenge_method || null
  const nonce = body.nonce || null

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'client_id and redirect_uri required' },
      { status: 400 },
    )
  }

  const sbAdmin = adminClient()
  const client = await loadClient(sbAdmin, clientId)
  if (!client) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401 })
  }
  if (!isValidRedirectUri(client, redirectUri)) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'redirect_uri not registered' },
      { status: 400 },
    )
  }

  // Session — never trust a user_id from the form.
  const sb = await createServerSupabase()
  const { data: { session } } = await sb.auth.getSession()
  const user = session?.user
  if (!user) {
    return NextResponse.json({ error: 'login_required' }, { status: 401 })
  }

  if (decision !== 'approve') {
    return bounce(redirectUri, { error: 'access_denied', state })
  }

  // Mint code + bounce to client.
  try {
    const code = await issueAuthCode(sbAdmin, {
      clientId,
      userId: user.id,
      redirectUri,
      scope: clampScope(scope) || client.scope,
      codeChallenge,
      codeChallengeMethod,
      state,
      nonce,
    })
    return bounce(redirectUri, { code, state })
  } catch (e) {
    console.error('[oauth/consent] issue failed:', (e as Error).message)
    return bounce(redirectUri, {
      error: 'server_error',
      error_description: (e as Error).message,
      state,
    })
  }
}

function bounce(redirectUri: string, params: Record<string, string>) {
  const u = new URL(redirectUri)
  for (const [k, v] of Object.entries(params)) {
    if (v) u.searchParams.set(k, v)
  }
  return NextResponse.redirect(u)
}
