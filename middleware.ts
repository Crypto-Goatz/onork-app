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

/**
 * The vault host — THE ONE DOOR FOR CONNECTING AN APP (Mike's ruling,
 * 2026-08-23: www is the user front end, /dashboard is LEGACY and must not be
 * extended, this is where you connect things).
 *
 * The domain has been verified on the Vercel project for a while and did
 * nothing: `next.config.ts` carried a `rewrites()` entry for it, but a plain
 * `rewrites()` array is afterFiles, and "/" already has a filesystem match
 * (the marketing page), so the rewrite could never fire. vault.0ncore.com
 * served marketing — 200, same <title> as www, no error anywhere to notice.
 * Middleware runs before filesystem routing, which is why the routing has to
 * live here.
 *
 * ROOT ONLY, deliberately. Every other path on this host serves as itself, so
 * /login, /auth/callback, /api/* and /downloads/* keep working on the
 * subdomain and the shared `.0ncore.com` auth cookie carries the session in.
 * It also sidesteps the trap documented on the matcher below: a full-host
 * rewrite means every vault path must be listed there or it 404s. One door,
 * one path, nothing to forget.
 */
const VAULT_HOST = 'vault.0ncore.com'

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

  // The path this request must be rewritten to on the app host, decided below
  // and APPLIED AT THE END. It used to be applied with an immediate
  // `return NextResponse.rewrite(...)`, which returned before the auth block
  // further down had run — so every protected route was gated on www and
  // ungated on app.0ncore.com. `/dashboard` answered 200 with the agency shell
  // to a logged-out visitor while www correctly 307'd to /login, and the
  // difference was invisible in the code because both hosts read the same
  // protected list. A rewrite is a destination, not a decision: decide first,
  // rewrite last.
  let appRewritePath: string | null = null

  /** Same contract for the vault host: decided here, applied by passThrough(). */
  let vaultRewritePath: string | null = null

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
    // /hub is the CUSTOMER home and a standalone page (app/hub), not a /crm
    // surface — and it is where the owner gate below sends every non-owner. It
    // is excluded here for the day someone adds it to the matcher: rewritten,
    // it would resolve to /crm/hub, which does not exist, and the gate would
    // redirect people to a 404.
    const isAuthPage = p === '/login' || p === '/signup' || p.startsWith('/auth') || p.startsWith('/forgot-password') || p.startsWith('/reset-password')
    if (!isAuthPage && !p.startsWith('/api') && !p.startsWith('/_next') && !p.startsWith('/crm') && !p.startsWith('/portal') && !p.startsWith('/widgets') && !p.startsWith('/p/') && !p.startsWith('/scan') && !p.startsWith('/decisions') && !p.startsWith('/hub')) {
      appRewritePath = p === '/' ? '/crm' : `/crm${p}`
    }
  }

  // ── Vault host ────────────────────────────────────────────────────
  // vault.0ncore.com/ → /vault. Decided here, applied at the end by
  // passThrough(), for the same reason the app host is: an immediate
  // `return NextResponse.rewrite()` here would return before the auth block
  // below and serve the connect surface — a page whose whole job is holding
  // credentials — to anyone who typed the address. That is precisely the
  // outage /dashboard had.
  if (host === VAULT_HOST && request.nextUrl.pathname === '/') {
    vaultRewritePath = '/vault'
  }

  /**
   * The vault door, as the auth block below must see it.
   *
   * The protected list is path-based and CANNOT see this case: on the vault
   * host the door's path is literally "/", which no prefix check will ever
   * match. Without this flag the gate reads "/" as a public marketing root and
   * the door opens for a logged-out visitor.
   */
  const isVaultDoor = vaultRewritePath !== null

  /**
   * A pass-through response that still carries the app-host rewrite.
   *
   * Every `NextResponse.next()` in this file has to go through here. A bare
   * next() on the app host means "serve /dashboard itself" — which is a 404,
   * because the page lives at /crm/dashboard. That is the trap the old
   * early-return hid: nothing else could return without also losing the rewrite.
   */
  function passThrough(): NextResponse {
    // Mutually exclusive — a request has one host, and each host decides at
    // most one destination.
    const rewritePath = appRewritePath ?? vaultRewritePath
    if (!rewritePath) return NextResponse.next({ request })
    const url = request.nextUrl.clone()
    url.pathname = rewritePath
    return NextResponse.rewrite(url, { request })
  }

  // ── Bare app paths on www ─────────────────────────────────────────
  // The sidebar links to /clients, /tools, /log and friends because on
  // app.0ncore.com the whole host is rewritten into /crm. On www there is no
  // such rewrite, so every one of those links was a 404 — /clients included,
  // which is the main screen of the product. Redirect (not rewrite) so the
  // address bar shows where you actually are.
  if (host !== APP_HOST) {
    const p = request.nextUrl.pathname
    const bare = ['/clients', '/automations', '/tools', '/log', '/plans']
    if (bare.some((b) => p === b || p.startsWith(b + '/'))) {
      const url = request.nextUrl.clone()
      url.pathname = `/crm${p}`
      return NextResponse.redirect(url)
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
    const cleanup = passThrough()
    for (const c of staleCookies) {
      cleanup.cookies.set(c.name, '', { maxAge: 0, path: '/' })
    }
    // Bounce to /login if hitting a protected route, else just continue
    const path = request.nextUrl.pathname
    if (isVaultDoor || path.startsWith('/vault') || path.startsWith('/dashboard') || path.startsWith('/console') || path.startsWith('/canvas') || path.startsWith('/welcome') || path.startsWith('/profile') || path.startsWith('/admin')) {
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

  let supabaseResponse = passThrough()

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
          supabaseResponse = passThrough()
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
    (isVaultDoor
      // /vault is the same page reached by path on www/app and in local dev.
      // Gated by path AND by host so neither address can serve it open.
      || request.nextUrl.pathname.startsWith('/vault')
      || request.nextUrl.pathname.startsWith('/dashboard')
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

  // ── The old connect page folds into the vault ─────────────────────
  //
  // /dashboard/settings/groq was the only place to paste an AI key, and since
  // the owner gate below landed it has been unreachable by the people it was
  // built for: a signed-in customer following the onboarding tour hit the gate
  // and got bounced to /hub, never seeing the form. Two doors, one of them
  // shut. Now there is one.
  //
  // Deliberately ABOVE the owner gate — below it, a non-owner is redirected to
  // /hub before this ever runs and the bookmark stays broken. Deliberately
  // BELOW the logged-out check, so this cannot become a second way to reach a
  // credential surface without a session. Same-host path, not an absolute
  // vault.0ncore.com URL, so previews and local dev do not jump to production.
  // Temporary, not permanent: a 308 would be cached in browsers long after any
  // future change of mind.
  if (request.nextUrl.pathname.startsWith('/dashboard/settings/groq')) {
    const url = request.nextUrl.clone()
    url.pathname = '/vault'
    url.search = ''
    return withCookies(NextResponse.redirect(url))
  }

  // ── H1: /dashboard/* is OWNER-ONLY ────────────────────────────────
  //
  // /dashboard is the operator surface — every client's live CRM data, the
  // install registry, the AI console. It was never a customer surface, but it
  // was the only surface, so it stayed reachable while the customer home was
  // being built. The customer home is /hub; this closes the door behind it.
  //
  // Logged out is already handled above (redirect to /login). Here we handle
  // the case the old code had no answer for at all: a real, signed-in customer
  // typing /dashboard. They land on /hub, not on someone else's data.
  //
  // An env allowlist rather than a profiles.is_admin read on purpose —
  // middleware runs on every matched request, and a database round trip in the
  // gate means the gate is the slowest thing on the site. Falls back to Mike so
  // a missing env var locks the door rather than opening it.
  const OWNER_EMAILS = (process.env.OWNER_EMAILS || 'mike@rocketopp.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const email = (user.email || '').toLowerCase()
    if (!OWNER_EMAILS.includes(email)) {
      const url = request.nextUrl.clone()
      url.pathname = '/hub'
      url.search = ''
      return withCookies(NextResponse.redirect(url))
    }
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
    // The vault door. "/" above is what makes it work on vault.0ncore.com —
    // these two are the same page reached by path on www/app and in local dev,
    // and they must be matched or the auth gate never runs on them.
    '/vault',
    '/vault/:path*',
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
