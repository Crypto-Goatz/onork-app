/**
 * Service-role Supabase client for the connection tables.
 *
 * `cache: 'no-store'` on the underlying fetch is deliberate and load-bearing.
 * Next's Data Cache has previously frozen Supabase reads across redeploys in
 * this stack, so revoking access kept serving the old answer — and
 * `force-dynamic` did NOT prevent it. These tables decide whether we may act
 * inside a paying customer's CRM; a stale read here means a disconnected
 * account keeps working.
 *
 * Returns null rather than throwing when env is absent, so a misconfigured
 * preview deploy degrades to "nothing is connected" instead of a 500.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: 'no-store' }),
    },
  })
}
