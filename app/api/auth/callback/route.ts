/**
 * GET /api/auth/callback
 *
 * The older twin of /auth/callback: same code-for-session exchange, plus a
 * fire-and-forget /api/provision kick. Still linked from the admin route
 * inventory, so it is reachable and must fail the same way its twin does.
 *
 * FAILURE POLICY (2026-08-19, AUTH OVERHAUL) — every failure here used to fall
 * through to one `redirect('/login?error=auth_callback_failed')`, which erased
 * the difference between "the provider sent no code" and "Supabase refused the
 * exchange", and landed the user on a form whose only affordance is to press
 * the same button again. Now each exit names its own reason, logs one
 * structured line, and answers with /auth/error — a page that STATES the reason
 * and re-triggers nothing. Slugs are shared with /auth/callback on purpose:
 * `no_code` and `exchange_failed` mean the same thing in both, so /auth/error
 * explains them once and a log grep covers both routes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** One structured line per exit — same shape and reader as /auth/callback. */
function logEvent(fields: Record<string, unknown>) {
  try {
    console.log('[api/auth/callback] ' + JSON.stringify(fields))
  } catch {
    console.log('[api/auth/callback] (unserialisable event)', fields)
  }
}

/** Fail loud: name the reason, quote the platform, land on /auth/error. */
function fail(
  origin: string,
  reason: string,
  ctx: Record<string, unknown>,
  detail?: string,
) {
  logEvent({ outcome: 'fail', reason, ...ctx })
  const url = new URL('/auth/error', origin)
  url.searchParams.set('reason', reason)
  if (detail) url.searchParams.set('detail', detail.slice(0, 300))
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  const ctx = {
    host: request.headers.get('host') || null,
    origin,
    has_code: Boolean(code),
    provider_error: searchParams.get('error') || null,
    provider_error_description: searchParams.get('error_description') || null,
  }

  // The provider gave up before a code existed (consent declined, redirect_uri
  // not registered). Distinct from a stray visit, which is `no_code`.
  if (ctx.provider_error) {
    return fail(
      origin,
      'provider_rejected',
      ctx,
      ctx.provider_error_description || ctx.provider_error,
    )
  }

  if (!code) {
    return fail(
      origin,
      'no_code',
      ctx,
      'The sign-in provider returned no authorization code to exchange.',
    )
  }

  const supabase = await createClient()
  const { error, data } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // Supabase's own words, not a generic string of ours — "invalid flow state"
    // and "code verifier should be non-empty" are different bugs.
    return fail(
      origin,
      'exchange_failed',
      { ...ctx, supabase_error: { name: error.name, code: (error as { code?: string }).code ?? null, status: error.status ?? null, message: error.message } },
      error.message,
    )
  }

  const user = data?.session?.user
  if (!user) {
    return fail(
      origin,
      'no_session_user',
      { ...ctx, has_session: Boolean(data?.session) },
      'The code exchanged cleanly but carried no user. The session did not stick.',
    )
  }

  let redirectTo = '/console'

  // Check if user has completed onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_complete, provisioned_at')
    .eq('id', user.id)
    .single()

  // Trigger provisioning if not yet provisioned
  if (!profile?.provisioned_at) {
    fetch(`${origin}/api/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name || '',
      }),
    }).catch(() => {})
  }

  // New users go to welcome, returning users go to console
  if (!profile?.onboarding_complete) {
    redirectTo = '/console/welcome'
  }

  const to = `${origin}${redirectTo}`
  logEvent({ outcome: 'ok', to, ...ctx, user_id: user.id })
  return NextResponse.redirect(to)
}
