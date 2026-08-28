'use client'

import { usePathname } from 'next/navigation'
import { PublicNav } from './public-nav'
import { isAppSurface } from '@/lib/app-surfaces'

// Routes that should NOT show the public nav — the product surfaces. The list
// moved to lib/app-surfaces.ts because the splash screen needs the same answer
// and had its own, different one. See that file for why.

// Routes with their own nav (login/signup have custom designs)
const SELF_NAV_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
]

export function PublicNavWrapper() {
  const pathname = usePathname()

  // Don't show on dashboard, console, auth, or self-nav pages
  if (isAppSurface(pathname)) return null
  if (SELF_NAV_ROUTES.includes(pathname || '')) return null

  return <PublicNav />
}
