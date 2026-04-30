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

export async function middleware(request: NextRequest) {
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
    if (path.startsWith('/dashboard') || path.startsWith('/console') || path.startsWith('/canvas') || path.startsWith('/welcome')) {
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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
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

  // Protected routes — redirect to login if not authenticated
  if (
    !user &&
    (request.nextUrl.pathname.startsWith('/dashboard')
      || request.nextUrl.pathname.startsWith('/console')
      || request.nextUrl.pathname.startsWith('/canvas')
      || request.nextUrl.pathname.startsWith('/welcome'))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return withCookies(NextResponse.redirect(url))
  }

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

  // Logged in user hitting /login or /signup — bounce to /welcome
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/welcome'
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
    '/login',
    '/signup',
    '/hippa',
    '/hippa/:path*',
  ],
}
