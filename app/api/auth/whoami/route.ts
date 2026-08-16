import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  let userId: string | null = null
  let email: string | null = null

  // Try server-side cookie session first
  try {
    const server = await createServerClient()
    const { data: { session } } = await server.auth.getSession()
  const user = session?.user ?? null
    if (user) {
      userId = user.id
      email = user.email || null
    }
  } catch {}

  // Fallback to bearer token
  if (!userId) {
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace(/^Bearer\s+/i, '').trim()
    if (token) {
      const admin = getSupabase()
      // Try 0n_ token
      if (token.startsWith('0n_')) {
        const { data } = await admin
          .from('profiles')
          .select('id, email')
          .eq('access_token', token)
          .single()
        if (data) { userId = data.id; email = data.email }
      }
    }
  }

  if (!userId) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const admin = getSupabase()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, full_name, plan, is_admin, is_vip, tier_level, crm_location_id')
    .eq('id', userId)
    .single()

  return NextResponse.json({
    authenticated: true,
    user_id: userId,
    email: profile?.email || email,
    full_name: profile?.full_name || null,
    plan: profile?.plan || 'starter',
    is_admin: !!profile?.is_admin,
    is_vip: !!profile?.is_vip,
    tier_level: profile?.tier_level || 0,
    crm_location_id: profile?.crm_location_id || null,
  })
}
