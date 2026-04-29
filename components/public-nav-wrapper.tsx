'use client'

import { usePathname } from 'next/navigation'
import { PublicNav } from './public-nav'

// Routes that should NOT show the public nav
const EXCLUDED_PREFIXES = [
  '/dashboard',
  '/console',
  '/crm',
  '/canvas',
  '/auth',
  '/import',
  '/install',
  '/0nexec-demo',
]

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
  if (EXCLUDED_PREFIXES.some(p => pathname?.startsWith(p))) return null
  if (SELF_NAV_ROUTES.includes(pathname || '')) return null

  return <PublicNav />
}
