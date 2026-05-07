/**
 * POST /api/admin/create-demo — Create a demo/test account.
 * Auto-provisions with demo-N naming.
 * Admin only (mike@rocketopp.com).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null

  // Admin check
  if (!user || user.email !== 'mike@rocketopp.com') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  // Find next demo number
  const { data: existing } = await admin
    .from('profiles')
    .select('email')
    .like('email', 'demo-%@0ncore.com')
    .order('email', { ascending: false })
    .limit(1)

  let nextNum = 1
  if (existing && existing.length > 0) {
    const match = existing[0].email.match(/demo-(\d+)@/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }

  const email = `demo-${nextNum}@0ncore.com`
  const password = `demo${nextNum}pass${Date.now().toString(36)}`

  // Create auth user
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `Demo Account ${nextNum}`,
    },
  })

  if (createError || !newUser.user) {
    return NextResponse.json({ error: createError?.message || 'Failed to create user' }, { status: 500 })
  }

  // Update profile with demo info
  await admin
    .from('profiles')
    .update({
      full_name: `Demo Account ${nextNum}`,
      business_name: `Demo Business ${nextNum}`,
      tier_level: 1,
    })
    .eq('id', newUser.user.id)

  // Get the auto-generated token
  const { data: profile } = await admin
    .from('profiles')
    .select('access_token')
    .eq('id', newUser.user.id)
    .single()

  return NextResponse.json({
    created: true,
    account: {
      email,
      password,
      user_id: newUser.user.id,
      token: profile?.access_token,
      login_url: `https://0ncore.com/login`,
    },
  })
}
