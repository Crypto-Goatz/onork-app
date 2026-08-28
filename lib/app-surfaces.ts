/**
 * Which routes are the PRODUCT and which are the SITE.
 *
 * WHY THIS IS ONE FILE. Two components already had to answer this question and
 * each carried its own answer: `public-nav-wrapper.tsx` held EXCLUDED_PREFIXES
 * ("don't put the marketing header here") and `loading-screen.tsx` held
 * SKIP_PREFIXES ("don't cover this route with the splash"). They disagreed —
 * the nav knew /hub, /console and /crm were product, the splash did not, and so
 * the splash covered every marketing page on the site while the nav correctly
 * stayed off the dashboard. A shared question answered in two places is a
 * question that will be answered differently the first time somebody edits one
 * of them, which is exactly what happened here.
 *
 * THE SPLIT IS BY SURFACE, NOT BY HOST. app.0ncore.com is entirely product, and
 * the root layout reads that from the host server-side. But www.0ncore.com
 * serves BOTH — /pricing is the site, /console is the product — so on the
 * marketing host the decision has to come from the path.
 */

/**
 * Product surfaces. Marketing chrome (the public nav) does not belong here, and
 * these are the only routes the splash screen may cover.
 */
export const APP_SURFACE_PREFIXES = [
  '/dashboard',
  '/console',
  '/crm',
  '/canvas',
  '/welcome',
  '/tools',
  '/auth',
  '/import',
  '/install',
  '/0nexec-demo',
  '/admin',
  '/embed', // iframe-embed pages — host provides chrome
  '/vip',   // VIP dashboards — branded per-client
  '/hub',   // 0nVault door — standalone, fully self-contained
] as const

/**
 * Routes with their own full-page design, which must never be covered or
 * decorated by anything global. A subset of these are also app surfaces
 * (/canvas, /auth, /embed): being product does not earn you a splash if the
 * page owns its whole viewport.
 */
export const OWNS_VIEWPORT_PREFIXES = [
  '/canvas',
  '/auth',
  '/embed',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
] as const

export function isAppSurface(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return APP_SURFACE_PREFIXES.some((p) => pathname.startsWith(p))
}

export function ownsViewport(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return OWNS_VIEWPORT_PREFIXES.some((p) => pathname.startsWith(p))
}
