import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exchangeCode } from '@/lib/google/workspace'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/auth/google-connect/callback — OAuth callback
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/dashboard/analytics?error=oauth_denied', req.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard/analytics?error=missing_params', req.url))
  }

  // Decode state
  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    userId = decoded.userId
  } catch {
    return NextResponse.redirect(new URL('/dashboard/analytics?error=invalid_state', req.url))
  }

  // Exchange code for tokens
  try {
    const tokens = await exchangeCode(code)

    // Store tokens in profiles (encrypted by Supabase)
    await supabase
      .from('profiles')
      .update({
        google_tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
          scope: tokens.scope,
          token_type: tokens.token_type,
          connected_at: new Date().toISOString(),
        },
      })
      .eq('id', userId)

    return NextResponse.redirect(new URL('/dashboard/analytics?google=connected', req.url))
  } catch (err) {
    console.error('[google-connect/callback] Token exchange failed:', err)
    return NextResponse.redirect(new URL('/dashboard/analytics?error=token_exchange', req.url))
  }
}
