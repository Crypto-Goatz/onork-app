/**
 * Cookie-only auth read for client + server components.
 *
 * NEVER call `supabase.auth.getUser()` from a 'use client' component or a
 * server component. That call hits Supabase's /auth/v1/user endpoint and
 * triggers a refresh that races with the middleware refresh — when they
 * collide, the SDK signs the user out and we get the "click anything → log
 * out" bug.
 *
 * Use this helper instead. It reads `getSession()` (local-only, no network)
 * and unwraps to `User | null`. Middleware is the ONE place that calls
 * getUser() and refreshes the JWT — every other surface trusts the cookie.
 */

import type { User } from '@supabase/supabase-js'
import { createClient as createBrowser } from './client'

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createBrowser()
  const { data } = await supabase.auth.getSession()
  return data.session?.user ?? null
}

export type { User }
