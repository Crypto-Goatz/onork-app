import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const admin = createAdmin(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )

        // Bridge OAuth login → user_connections
        // When signing in with Google/LinkedIn, auto-create a connection entry
        // so their analytics, workspace, etc. work immediately
        const session = sessionData?.session
        if (session?.provider_token) {
          const identity = user.identities?.find(i => i.provider !== 'email')
          const provider = identity?.provider === 'linkedin_oidc' ? 'linkedin' : identity?.provider

          if (provider && (provider === 'google' || provider === 'linkedin')) {
            try {
              await admin
                .from('user_connections')
                .upsert(
                  {
                    user_id: user.id,
                    provider,
                    provider_account_id: identity?.identity_data?.sub || identity?.id || '',
                    provider_email: user.email || identity?.identity_data?.email || null,
                    provider_name: identity?.identity_data?.full_name || identity?.identity_data?.name || null,
                    provider_avatar: identity?.identity_data?.avatar_url || identity?.identity_data?.picture || null,
                    access_token: session.provider_token,
                    refresh_token: session.provider_refresh_token || null,
                    token_type: 'Bearer',
                    expires_at: session.expires_at
                      ? new Date(session.expires_at * 1000).toISOString()
                      : null,
                    scopes: provider === 'google'
                      ? 'openid email profile https://www.googleapis.com/auth/analytics.readonly'
                      : 'openid profile email',
                    status: 'active',
                    health_status: 'healthy',
                    consecutive_failures: 0,
                    last_error: null,
                    metadata: {},
                  },
                  { onConflict: 'user_id,provider' },
                )
            } catch (err) {
              console.error('[auth/callback] Failed to bridge OAuth to user_connections:', err)
            }
          }
        }

        // Check onboarding status
        const { data: profile } = await admin
          .from('profiles')
          .select('onboarding_complete')
          .eq('id', user.id)
          .single()

        // If explicit next param, honor it
        if (next) {
          return NextResponse.redirect(`${origin}${next}`)
        }
      }

      // Straight to /dashboard. No welcome redirect chain.
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
