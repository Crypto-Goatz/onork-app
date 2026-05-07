/**
 * GET /api/auth/token — Get user's 0n_ token
 * POST /api/auth/token — Regenerate token
 *
 * This is the universal auth token used by Chrome extension, Slack, WordPress, etc.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin
    .from('profiles')
    .select('access_token')
    .eq('id', user.id)
    .single()

  if (!profile?.access_token) {
    // Generate one if missing
    const { data: token } = await admin.rpc('assign_profile_token', { p_user_id: user.id })
    return NextResponse.json({ token })
  }

  return NextResponse.json({ token: profile.access_token })
}

export async function POST() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Force regenerate by clearing first then reassigning
  await admin
    .from('profiles')
    .update({ access_token: null })
    .eq('id', user.id)

  const { data: token } = await admin.rpc('assign_profile_token', { p_user_id: user.id })

  return NextResponse.json({ token, regenerated: true })
}
