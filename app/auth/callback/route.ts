/**
 * GET /auth/callback
 *
 * The single OAuth callback for 0ncore. Both the public /signup form
 * (Google / LinkedIn / Slack OAuth) and Supabase email-confirmation links
 * land here.
 *
 * Flow:
 *   1. Exchange the code for a Supabase session.
 *   2. Pull user from the session (NOT supabase.auth.getUser() — per the
 *      AUTH RULES memory; getUser races middleware's cookie refresh and has
 *      bitten us before).
 *   3. Bridge the OAuth provider token to user_connections so analytics /
 *      gmail / drive etc work immediately.
 *   4. Run postSignupProvision — the SAME chain the email/password API
 *      route runs. Idempotent, safe on every callback.
 *   5. Persist any referral code (first-touch wins).
 *   6. Redirect:
 *        - explicit ?next=... wins
 *        - !onboarding_complete → /onboarding
 *        - else → /dashboard
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { postSignupProvision } from '@/lib/provision/post-signup'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = await createClient()
  const { data: sessionData, error } =
    await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] code exchange failed:', error.message)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const session = sessionData?.session
  const user = session?.user
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no_session_user`)
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // ── 1. Bridge OAuth token → user_connections ─────────────────
  if (session.provider_token) {
    const identity = user.identities?.find((i) => i.provider !== 'email')
    const provider =
      identity?.provider === 'linkedin_oidc' ? 'linkedin' : identity?.provider

    if (provider && (provider === 'google' || provider === 'linkedin')) {
      try {
        await admin
          .from('user_connections')
          .upsert(
            {
              user_id: user.id,
              provider,
              provider_account_id:
                identity?.identity_data?.sub || identity?.id || '',
              provider_email:
                user.email || identity?.identity_data?.email || null,
              provider_name:
                identity?.identity_data?.full_name ||
                identity?.identity_data?.name ||
                null,
              provider_avatar:
                identity?.identity_data?.avatar_url ||
                identity?.identity_data?.picture ||
                null,
              access_token: session.provider_token,
              refresh_token: session.provider_refresh_token || null,
              token_type: 'Bearer',
              expires_at: session.expires_at
                ? new Date(session.expires_at * 1000).toISOString()
                : null,
              scopes:
                provider === 'google'
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
        console.error(
          '[auth/callback] OAuth → user_connections bridge failed:',
          err,
        )
      }
    }
  }

  // ── 2. Persist referral (first-touch wins) ───────────────────
  try {
    const metaRef =
      typeof user.user_metadata?.referred_by === 'string'
        ? user.user_metadata.referred_by
        : null
    const cookieRef = (() => {
      const m = request.headers.get('cookie')?.match(/(?:^|;\s*)0n_ref=([^;]+)/)
      return m ? decodeURIComponent(m[1]) : null
    })()
    const ref = metaRef || cookieRef
    if (ref) {
      const { data: existing } = await admin
        .from('profiles')
        .select('referred_by')
        .eq('id', user.id)
        .maybeSingle()
      if (existing && !existing.referred_by) {
        await admin
          .from('profiles')
          .update({ referred_by: ref })
          .eq('id', user.id)
      }
    }
  } catch (err) {
    console.warn(
      '[auth/callback] referral persist skipped:',
      (err as Error).message,
    )
  }

  // ── 3. Post-signup provisioning (idempotent on re-runs) ──────
  try {
    const fullName =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      null
    await postSignupProvision({
      userId: user.id,
      email: user.email || '',
      fullName,
      company: (user.user_metadata?.company as string) || null,
      source:
        user.identities?.find((i) => i.provider !== 'email')?.provider
          ? `oauth-${user.identities.find((i) => i.provider !== 'email')!.provider}`
          : '0ncore-signup',
    })
  } catch (err) {
    console.error('[auth/callback] postSignupProvision threw:', err)
    // Continue — don't block login on provisioning hiccups
  }

  // ── 4. Decide where to land ──────────────────────────────────
  if (next) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('onboarding_complete')
    .eq('id', user.id)
    .maybeSingle()

  const dest = profile?.onboarding_complete ? '/dashboard' : '/onboarding'
  return NextResponse.redirect(`${origin}${dest}`)
}
