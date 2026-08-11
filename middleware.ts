import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Auth middleware — the canonical Supabase SSR pattern.
 *
 * The critical bit: when supabase.auth.getUser() refreshes the session,
 * Supabase asks us to write new cookies back. We MUST attach those cookies
 * to whatever response we return, including redirects. Returning a bare
 * NextResponse.redirect() discards them and causes infinite loops.
 *
 * The helper `withCookies(target)` copies whatever cookies the supabase
 * client wrote onto `supabaseResponse` over to any new response we make.
 */

/** Project ref the app is currently configured for. Used to detect stale
 *  cookies from a previous Supabase project switch. */
const CURRENT_PROJECT_REF = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const m = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)
  return m ? m[1] : ''
})()

/** The app-surface host. Marketing lives on www; the CRM app lives here. */
const APP_HOST = 'app.0ncore.com'

export async function middleware(request: NextRequest) {
  // ── Host routing ──────────────────────────────────────────────────
  // app.0ncore.com serves the CRM app surface; www.0ncore.com serves
  // marketing. Same deployment, split by hostname — which keeps SSO, the CRM
  // SDK, the token vault and the Phase 1 libs in ONE place rather than porting
  // them to a second project. Splitting into its own project later is a
  // hosting decision and costs no code change.
  //
  // A REWRITE, never a redirect: the marketplace Custom Page loads this in an
  // iframe, and a redirect inside an iframe is how you end up staring at a
  // login page nested in someone's CRM.
  const host = request.headers.get('host') || ''

  // ── OAuth rescue ──────────────────────────────────────────────────
  // Supabase redirects an OAuth ?code to the requested redirect_to ONLY if it is
  // in the project's allow-list; otherwise it falls back to the Site URL and
  // strands the code on the site root, where nothing exchanges it. Catch a code
  // at "/" and hand it to /auth/callback (which does the exchange). The real fix
  // is allow-listing app.0ncore.com/auth/callback — this makes login work
  // meanwhile, on either host.
  if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.get('code')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    if (!url.searchParams.get('next')) url.searchParams.set('next', '/crm')
    return NextResponse.redirect(url)
  }

  if (host === APP_HOST) {
    const p = request.nextUrl.pathname
    // /api and Next internals pass through untouched — the SSO handshake and
    // every data call must behave identically on both hosts.
    // /portal is for MEMBERS — the agency's customers — not the agency
    // dashboard, so it must not be rewritten into /crm. It is the one public
    // surface on this host.
    // /p and /scan are standalone surfaces like /portal — they must NOT be
    // rewritten under /crm. Adding them to the matcher without adding them here
    // turned a working page into a 404: the matcher makes middleware RUN, and
    // running middleware is what applies the rewrite.
    // Auth pages must serve as-is on the app host too, or the standalone login
    // (app.0ncore.com/login?next=/crm) rewrites to /crm/login and 404s — the
    // exact break that made "log in outside GHL" impossible.
    const isAuthPage = p === '/login' || p === '/signup' || p.startsWith('/auth') || p.startsWith('/forgot-password') || p.startsWith('/reset-password')
    if (!isAuthPage && !p.startsWith('/api') && !p.startsWith('/_next') && !p.startsWith('/crm') && !p.startsWith('/portal') && !p.startsWith('/widgets') && !p.startsWith('/p/') && !p.startsWith('/scan')) {
      const url = request.nextUrl.clone()
      url.pathname = p === '/' ? '/crm' : `/crm${p}`
      return NextResponse.rewrite(url)
    }
  }

  // ── Stale-cookie sweep ────────────────────────────────────────────
  // If the request carries `sb-<otherproject>-auth-token` but no cookie for
  // CURRENT_PROJECT_REF, the user has dead cookies from a previous Supabase
  // project. Server can't decode them — every check returns "no session" —
  // user gets stuck in an infinite redirect loop. Wipe them and proceed.
  const allCookies = request.cookies.getAll()
  const sbCookies = allCookies.filter((c) => /^sb-[a-z0-9]+-auth-token/.test(c.name))
  const hasRightProject = sbCookies.some((c) => c.name.includes(CURRENT_PROJECT_REF))
  const staleCookies = sbCookies.filter((c) => !c.name.includes(CURRENT_PROJECT_REF))

  if (staleCookies.length > 0 && !hasRightProject) {
    const cleanup = NextResponse.next({ request })
    for (const c of staleCookies) {
      cleanup.cookies.set(c.name, '', { maxAge: 0, path: '/' })
    }
    // Bounce to /login if hitting a protected route, else just continue
    const path = request.nextUrl.pathname
    if (path.startsWith('/dashboard') || path.startsWith('/console') || path.startsWith('/canvas') || path.startsWith('/welcome') || path.startsWith('/profile') || path.startsWith('/admin')) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', path)
      url.searchParams.set('cleared', '1')
      const redirect = NextResponse.redirect(url)
      for (const c of staleCookies) redirect.cookies.set(c.name, '', { maxAge: 0, path: '/' })
      return redirect
    }
    return cleanup
  }

  let supabaseResponse = NextResponse.next({ request })

  // Cross-subdomain cookie share — when set to `.0ncore.com`, the auth cookie
  // is visible to www.0ncore.com AND dispatch.0ncore.com so signing in once
  // works everywhere.
  const AUTH_COOKIE_DOMAIN = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      cookieOptions: AUTH_COOKIE_DOMAIN
        ? { domain: AUTH_COOKIE_DOMAIN, path: '/', sameSite: 'lax', secure: true }
        : undefined,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              ...(AUTH_COOKIE_DOMAIN ? { domain: AUTH_COOKIE_DOMAIN } : {}),
            })
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  /** Build a response that carries the refreshed session cookies. */
  function withCookies(target: NextResponse): NextResponse {
    supabaseResponse.cookies.getAll().forEach((c) => {
      target.cookies.set(c.name, c.value, {
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        maxAge: c.maxAge,
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite,
      })
    })
    return target
  }

  // Protected routes — redirect to login if not authenticated.
  // /vip/* is in here because each VIP dashboard renders live customer data
  // (CRM contacts, appointment lists, revenue) — must NEVER fail open.
  if (
    !user &&
    (request.nextUrl.pathname.startsWith('/dashboard')
      || request.nextUrl.pathname.startsWith('/console')
      || request.nextUrl.pathname.startsWith('/canvas')
      || request.nextUrl.pathname.startsWith('/welcome')
      || request.nextUrl.pathname.startsWith('/profile')
      || request.nextUrl.pathname.startsWith('/vip')
      // /admin renders live CRM data for three real client locations. It was
      // reachable unauthenticated until 2026-08-04 — 200, no redirect — because
      // it had never been added here. The API routes behind it are gated now
      // too, but a public admin shell still leaks the client list and the
      // surface itself.
      || request.nextUrl.pathname.startsWith('/admin'))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return withCookies(NextResponse.redirect(url))
  }

  // REMOVED 2026-08-11 — the daily briefing gate.
  //
  // It bounced EVERY /dashboard request to /dashboard/recap until a client-side
  // cookie happened to match today, and it did `url.search = ''` on the way,
  // which threw away the `next=` param login had just set. The result was that
  // signing in never landed where you asked for; it landed on the recap, every
  // time the cookie failed to stick. An interstitial that eats the destination
  // is not a briefing, it is a trap.
  //
  // 0ncore.com is a CRM now. The working surface is /crm, so there is nothing
  // for a /dashboard-only gate to usefully guard.

  // /dashboard/ai is locked to mike@rocketopp.com only
  if (request.nextUrl.pathname.startsWith('/dashboard/ai')) {
    if (!user || user.email !== 'mike@rocketopp.com') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return withCookies(NextResponse.redirect(url))
    }
  }

  // Common typo redirects
  if (request.nextUrl.pathname === '/hippa' || request.nextUrl.pathname.startsWith('/hippa/')) {
    const url = request.nextUrl.clone()
    url.pathname = request.nextUrl.pathname.replace('/hippa', '/hipaa')
    return withCookies(NextResponse.redirect(url, 301))
  }

  // Logged in user hitting /login or /signup — honour ?next (same-origin only),
  // else /crm. 0ncore.com is a CRM; /crm is the working surface.
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const next = request.nextUrl.searchParams.get('next')
    const url = request.nextUrl.clone()
    url.pathname = next && next.startsWith('/') && !next.startsWith('//') ? next : '/crm'
    url.search = ''
    return withCookies(NextResponse.redirect(url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/console/:path*',
    '/canvas/:path*',
    '/welcome/:path*',
    '/profile/:path*',
    '/profile',
    '/vip/:path*',
    '/admin',
    '/admin/:path*',
    '/login',
    '/signup',
    '/hippa',
    '/hippa/:path*',
    // Needed for the app-host rewrite above. On www these paths fall straight
    // through the auth block (none of them is in the protected list), so adding
    // them changes nothing for the marketing site.
    //
    // EVERY app.0ncore.com ROUTE MUST BE LISTED HERE. The rewrite lives inside
    // middleware, and middleware only runs for paths the matcher covers — so a
    // page added under app/crm/ that is not listed here 404s on the app host
    // while working perfectly in the codebase. /clients and /automations did
    // exactly that; /dashboard only worked because it was already matched for
    // an unrelated reason.
    '/',
    '/crm/:path*',
    '/clients',
    '/clients/:path*',
    '/automations',
    '/automations/:path*',
    '/tools',
    '/tools/:path*',
    '/log',
    '/log/:path*',
    '/plans',
    '/plans/:path*',
    '/scan',
    '/scan/:path*',
    '/p/:path*',
    '/portal',
    '/portal/:path*',
  ],
}
