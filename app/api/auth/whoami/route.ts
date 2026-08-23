import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isVipEmail } from '@/lib/billing/vip'

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

  // Self-healing VIP flag.
  //
  // The pre-signup allowlist in lib/billing/vip.ts is the single source of
  // truth, but it cannot write a `profiles` row that does not exist yet. The
  // other surfaces in this app read `profiles.is_vip` directly, so the flag is
  // reconciled here — the first authenticated call after signup — rather than
  // duplicating the allowlist into the signup trigger, where the two copies
  // would immediately start disagreeing.
  let isVip = !!profile?.is_vip
  if (!isVip && isVipEmail(profile?.email || email)) {
    const { error } = await admin.from('profiles').update({ is_vip: true }).eq('id', userId)
    if (error) console.error('[whoami] VIP backfill failed:', error.message)
    else isVip = true
  }

  return NextResponse.json({
    authenticated: true,
    user_id: userId,
    email: profile?.email || email,
    full_name: profile?.full_name || null,
    plan: profile?.plan || 'starter',
    is_admin: !!profile?.is_admin,
    is_vip: isVip,
    tier_level: profile?.tier_level || 0,
    crm_location_id: profile?.crm_location_id || null,
  })
}
