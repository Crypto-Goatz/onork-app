/**
 * GET /api/auth/token — Get user's 0n_ token
 * POST /api/auth/token — Regenerate token
 *
 * This is the universal auth token used by Chrome extension, Slack, WordPress, etc.
 */

import { NextResponse } from 'next/server'
import { generateProfileToken, rotateProfileToken } from '@/lib/0n-token'
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
    // generateProfileToken also registers the key for device/exchange; the SQL
    // RPC did not, which produced keys that passed extension-login and 401'd
    // exchange (lib/0n-token.ts).
    const token = await generateProfileToken(user.id)
    return NextResponse.json({ token })
  }

  return NextResponse.json({ token: profile.access_token })
}

export async function POST() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = await rotateProfileToken(user.id)

  return NextResponse.json({ token, regenerated: true })
}
