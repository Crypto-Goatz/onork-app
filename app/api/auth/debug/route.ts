/**
 * GET /api/auth/debug — admin-only diagnostic endpoint.
 *
 * Reports per-provider env-var presence + the redirect URI the connect
 * flow expects on the Vercel side. Never returns secret values, only
 * booleans for "is set". Gated behind getSession (rule 16) +
 * profiles.is_admin OR mike@rocketopp.com.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, email')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin =
    user.email === 'mike@rocketopp.com' || profile?.is_admin === true
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseRedirectUri = supabaseUrl ? `${supabaseUrl}/auth/v1/callback` : ''

  return NextResponse.json({
    ok: true,
    app_url: process.env.NEXT_PUBLIC_APP_URL,
    auth_cookie_domain: process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN,
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    providers: {
      google: {
        client_id_set: !!process.env.GOOGLE_CLIENT_ID,
        client_secret_set: !!process.env.GOOGLE_CLIENT_SECRET,
        connect_redirect_uri: 'https://0ncore.com/api/auth/connect/google/callback',
        supabase_redirect_uri: supabaseRedirectUri,
        login_path: '/login (uses supabase.auth.signInWithOAuth, provider=google)',
        connect_path: '/api/auth/connect/google',
      },
      linkedin: {
        client_id_set: !!process.env.LINKEDIN_CLIENT_ID,
        client_secret_set: !!process.env.LINKEDIN_CLIENT_SECRET,
        connect_redirect_uri: 'https://0ncore.com/api/auth/connect/linkedin/callback',
        supabase_redirect_uri: supabaseRedirectUri,
        login_path: '/login (uses supabase.auth.signInWithOAuth, provider=linkedin_oidc)',
        connect_path: '/api/auth/connect/linkedin',
      },
      slack: {
        client_id_set: !!process.env.SLACK_CLIENT_ID,
        client_secret_set: !!process.env.SLACK_CLIENT_SECRET,
        connect_redirect_uri: 'https://0ncore.com/api/auth/connect/slack/callback',
        supabase_redirect_uri: supabaseRedirectUri,
        login_path: '/login (uses CUSTOM /api/auth/connect/slack flow + magic link)',
        connect_path: '/api/auth/connect/slack',
      },
    },
    notes: [
      'Google/LinkedIn login go through Supabase auth (signInWithOAuth)',
      'Slack login uses the custom /api/auth/connect/slack flow + magic link',
      'Vercel env vars are NOT what Supabase uses — Supabase needs separate config in dashboard',
    ],
  })
}
