import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

/**
 * OAuth Authorization Endpoint — CRM External Auth
 *
 * The CRM sends users here when they install/use the 0nCore marketplace app.
 * Flow:
 * 1. CRM redirects user to: https://0ncore.com/api/oauth/authorize?client_id=...&redirect_uri=...&response_type=code&state=...
 * 2. We check if the user is logged into 0nCore (Supabase session)
 * 3. If logged in → generate auth code → redirect back to CRM with code
 * 4. If not logged in → redirect to /login with return URL
 * 5. CRM exchanges the code at /api/oauth/token
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('client_id')
  const redirectUri = searchParams.get('redirect_uri')
  const responseType = searchParams.get('response_type') || 'code'
  const state = searchParams.get('state') || ''
  const scope = searchParams.get('scope') || ''

  // Validate required params
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'client_id and redirect_uri required' }, { status: 400 })
  }

  // Check if user is authenticated with 0nCore
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Not logged in — redirect to login page with return URL
    const returnUrl = req.url
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('return_to', returnUrl)
    return NextResponse.redirect(loginUrl)
  }

  // User is authenticated — generate authorization code
  const code = crypto.randomBytes(32).toString('hex')
  const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minute expiry

  // Store the code temporarily (in-memory for now, should be Redis/DB in production)
  // Using a cookie as a simple store since it's single-use
  const codeData = JSON.stringify({
    code,
    userId: user.id,
    email: user.email,
    clientId,
    scope,
    expiresAt,
  })

  // Store in Supabase for the token exchange to read
  const sb = createClient as any
  try {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await admin.from('oauth_codes').upsert({
      code,
      user_id: user.id,
      email: user.email,
      client_id: clientId,
      scope,
      expires_at: new Date(expiresAt).toISOString(),
    })
  } catch {
    // Table might not exist — store in profile metadata as fallback
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await admin.from('profiles').update({
      access_token: code,
      token_created_at: new Date().toISOString(),
    }).eq('id', user.id)
  }

  // Redirect back to CRM with the authorization code
  const callbackUrl = new URL(redirectUri)
  callbackUrl.searchParams.set('code', code)
  if (state) callbackUrl.searchParams.set('state', state)

  return NextResponse.redirect(callbackUrl)
}
