/**
 * Admin gate — checks if the current Supabase session belongs to a user
 * with profiles.is_admin = true. Reusable across admin-only API routes.
 */

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

interface AdminCheck {
  ok: boolean
  userId?: string
  error?: string
}

export async function verifyAdmin(): Promise<AdminCheck> {
  const serverClient = await createServerClient()
  const { data: { session } } = await serverClient.auth.getSession()
  const user = session?.user ?? null
  if (!user) return { ok: false, error: 'Not authenticated' }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { ok: false, error: 'Not admin', userId: user.id }
  return { ok: true, userId: user.id }
}
