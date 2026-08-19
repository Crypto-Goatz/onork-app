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
 *        - else → /crm
 *
 * FAILURE POLICY (2026-08-19, AUTH OVERHAUL) — this handler used to answer
 * every failure with `redirect('/login?error=...')` and a console.error. The
 * login page never read that param, so the user saw a clean login form with no
 * explanation, clicked the same provider button again, and came straight back
 * here: an invisible infinite loop whose only trace was a console line nobody
 * reads (law #5 — silent failure is the default, so make failure loud).
 *
 * Every exit from here is now:
 *   - logged as one structured JSON line, `[auth/callback]`, carrying the
 *     PLATFORM'S OWN WORDS (error.code / error.status / error.name / message)
 *     plus the host, the flow-state cookie presence, and the destination, so
 *     the failure can be told apart from the other four candidates without
 *     re-deriving it from Supabase logs; and
 *   - answered with /auth/error, a page that STATES the reason and requires a
 *     deliberate click to retry. Never a silent bounce to /login. A loop that
 *     needs a human click is a loop that ends.
 */

import { NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { postSignupProvision, kickOffBackgroundProvision } from '@/lib/provision/post-signup'

// after() callbacks (background CRM sub-location provisioning) are bounded by maxDuration.
export const maxDuration = 60
export const runtime = 'nodejs'

// The app surface lives on app.0ncore.com; marketing + auth on www. When a login
// targets an app path, it must land on the app host — even if the code was
// exchanged on www (Supabase's Site-URL fallback). The auth cookie is shared
// across .0ncore.com, so a cross-subdomain landing carries the session cleanly.
const APP_ORIGIN = 'https://app.0ncore.com'
const APP_PATHS = ['/crm', '/clients', '/automations', '/tools', '/log', '/plans', '/portal', '/scan', '/p']
function landOn(next: string, origin: string): string {
  const onApp = APP_PATHS.some((p) => next === p || next.startsWith(p + '/'))
  return `${onApp ? APP_ORIGIN : origin}${next}`
}

/**
 * One structured log line per callback, success or failure.
 *
 * Deliberately JSON on a single line: these are read out of Vercel's runtime
 * log search, where a multi-line dump loses everything after line one.
 */
function logEvent(fields: Record<string, unknown>) {
  try {
    console.log('[auth/callback] ' + JSON.stringify(fields))
  } catch {
    console.log('[auth/callback] (unserialisable event)', fields)
  }
}

/** Whatever the platform actually said — never a generic string of ours. */
function platformWords(err: unknown): Record<string, unknown> {
  if (!err || typeof err !== 'object') return { raw: String(err) }
  const e = err as Record<string, unknown>
  return {
    name: e.name ?? null,
    code: e.code ?? null,
    status: e.status ?? null,
    message: e.message ?? null,
  }
}

/**
 * Fail LOUD.
 *
 * `reason` is a stable slug for grepping; `detail` is the platform's own text
 * shown to the user. The user lands on /auth/error — which does not re-trigger
 * anything — instead of /login, which is what closed the loop.
 */
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

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  // The four facts that distinguish the candidate causes of the login loop
  // from each other. Host tells us whether the exchange happened on www or
  // app; the flow-state cookie tells us whether the PKCE verifier survived the
  // round trip (it does not survive a host change, which is the whole reason
  // host canonicalisation matters); provider error params tell us when the
  // provider itself refused before we ever saw a code.
  const cookieHeader = request.headers.get('cookie') || ''
  const ctx = {
    host: request.headers.get('host') || null,
    origin,
    next: next || null,
    referer: request.headers.get('referer') || null,
    has_code: Boolean(code),
    // supabase-js writes `sb-<ref>-auth-token-code-verifier` before leaving for
    // the provider. Absent here = the browser that came back is not the browser
    // (or not the host) that left, and no exchange can possibly succeed.
    has_code_verifier: /sb-[a-z0-9]+-auth-token-code-verifier/.test(cookieHeader),
    provider_error: searchParams.get('error') || null,
    provider_error_description:
      searchParams.get('error_description') || null,
  }

  // The provider bounced us before any code existed (consent denied, bad
  // redirect_uri, app misconfigured). Previously this arrived as "no_code" and
  // was indistinguishable from a stray visit.
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
  const { data: sessionData, error } =
    await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // THE loop's most likely seat. Report Supabase's own words verbatim —
    // "invalid request: both auth code and code verifier should be non-empty"
    // and "invalid flow state, flow state has expired" are different bugs with
    // different owners, and the old generic `auth_failed` erased the difference.
    return fail(origin, 'exchange_failed', {
      ...ctx,
      supabase_error: platformWords(error),
    }, error.message)
  }

  const session = sessionData?.session
  const user = session?.user
  if (!user) {
    return fail(origin, 'no_session_user', {
      ...ctx,
      has_session: Boolean(session),
    }, 'The code exchanged cleanly but carried no user. The session did not stick.')
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // ── 1. Bridge OAuth token → user_connections ─────────────────
  //
  // Login and connect write the SAME row (unique on user_id+provider), so this
  // bridge can destroy a connect-time grant. It used to: it upserted the login
  // token unconditionally and stamped a hardcoded
  // `...analytics.readonly` into `scopes` no matter what was actually granted.
  // With the login page now asking identity-only, an unconditional upsert would
  // replace a real Analytics/Search Console token with an identity token that
  // still CLAIMED analytics — and /api/google/analytics reads exactly this row,
  // so it would call GA4 with a token that cannot read GA4 and fail as a Google
  // 403 rather than an honest "not connected".
  //
  // Rule: a login may never narrow an existing grant. If what we just asked for
  // is a subset of what is already stored, refresh the display fields only and
  // leave the tokens and scopes alone.
  if (session.provider_token) {
    const identity = user.identities?.find((i) => i.provider !== 'email')
    const provider =
      identity?.provider === 'linkedin_oidc' ? 'linkedin' : identity?.provider

    if (provider && (provider === 'google' || provider === 'linkedin')) {
      try {
        // What sign-in actually requested — mirrors app/login/page.tsx.
        // Keep these two in step; that is the whole point of the split.
        const grantedScopes =
          provider === 'google'
            ? 'openid email profile'
            : 'openid profile email w_member_social'

        const { data: existing } = await admin
          .from('user_connections')
          .select('scopes, status')
          .eq('user_id', user.id)
          .eq('provider', provider)
          .maybeSingle()

        const stored = new Set(
          (existing?.scopes || '').split(/\s+/).filter(Boolean),
        )
        const incoming = grantedScopes.split(' ')
        const narrower =
          existing?.status === 'active' &&
          stored.size > 0 &&
          incoming.every((sc) => stored.has(sc)) &&
          stored.size > incoming.length

        const profileFields = {
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
        }

        if (narrower) {
          // Connect-time grant is richer. Touch nothing that authorises.
          await admin
            .from('user_connections')
            .update(profileFields)
            .eq('user_id', user.id)
            .eq('provider', provider)
        } else {
          await admin.from('user_connections').upsert(
            {
              user_id: user.id,
              provider,
              provider_account_id:
                identity?.identity_data?.sub || identity?.id || '',
              ...profileFields,
              access_token: session.provider_token,
              refresh_token: session.provider_refresh_token || null,
              token_type: 'Bearer',
              expires_at: session.expires_at
                ? new Date(session.expires_at * 1000).toISOString()
                : null,
              // The truth, not an aspiration.
              scopes: grantedScopes,
              status: 'active',
              health_status: 'healthy',
              consecutive_failures: 0,
              last_error: null,
              // metadata deliberately omitted: it carries ga4_property_id and
              // friends, defaults to '{}' on insert, and survives the conflict
              // update. Sending {} here wiped a user's property selection on
              // every sign-in.
            },
            { onConflict: 'user_id,provider' },
          )
        }
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
    const result = await postSignupProvision({
      userId: user.id,
      email: user.email || '',
      fullName,
      company: (user.user_metadata?.company as string) || null,
      source:
        user.identities?.find((i) => i.provider !== 'email')?.provider
          ? `oauth-${user.identities.find((i) => i.provider !== 'email')!.provider}`
          : '0ncore-signup',
    })
    // Keep the lambda alive past the redirect response so the CRM
    // sub-location provision actually completes (PF-018 territory).
    if (result.needsBackgroundProvision) {
      after(() => kickOffBackgroundProvision(user.id))
    }
  } catch (err) {
    console.error('[auth/callback] postSignupProvision threw:', err)
    // Continue — don't block login on provisioning hiccups
  }

  // ── 4. Decide where to land ──────────────────────────────────
  // Same-origin only (guard against an open redirect), and app paths go to the
  // app host regardless of which host exchanged the code.
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    const to = landOn(next, origin)
    logEvent({ outcome: 'ok', route: 'explicit_next', to, ...ctx, user_id: user.id })
    return NextResponse.redirect(to)
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('onboarding_complete')
    .eq('id', user.id)
    .maybeSingle()

  // Land in the CRM, not the legacy /dashboard sprawl.
  const dest = profile?.onboarding_complete ? '/crm' : '/onboarding'

  // THROUGH landOn, not `${origin}${dest}`.
  //
  // This was the host split, in code. `/crm` is the first entry in APP_PATHS,
  // and the ?next branch three lines up already routed it to app.0ncore.com —
  // but the DEFAULT branch, which is the one every ordinary sign-in takes
  // (nobody arrives at /login carrying ?next=), concatenated the raw origin.
  // So a login begun on www exchanged its code on www and then landed the user
  // on www.0ncore.com/crm: a host with no app rewrite, where the sidebar links
  // and the app shell do not resolve. Cookies were never the problem here — the
  // auth cookie is set on .0ncore.com and reads fine on both — the DESTINATION
  // was. One code path honoured the app host and its twin did not, which is
  // law #4 wearing a redirect for a hat.
  const to = landOn(dest, origin)
  logEvent({
    outcome: 'ok',
    route: profile?.onboarding_complete ? 'default_crm' : 'default_onboarding',
    to,
    ...ctx,
    user_id: user.id,
  })
  return NextResponse.redirect(to)
}
