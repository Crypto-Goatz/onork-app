import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name, company, website } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be 8+ characters' }, { status: 400 })
    }

    // Create auth user via Supabase Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Require email verification
      user_metadata: {
        full_name: full_name || '',
        company: company || '',
      },
    })

    if (authError) {
      if (authError.message?.includes('already')) {
        return NextResponse.json({ error: 'An account with this email already exists. Try signing in.' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // Generate 0n_ token
    const token = `0n_${crypto.randomBytes(24).toString('hex')}`

    // Update profile with additional fields
    await supabase.from('profiles').upsert({
      id: userId,
      email,
      full_name: full_name || null,
      company: company || null,
      access_token: token,
      tier_level: 0,
      plan: 'free',
      onboarding_completed: false,
      onboarding_step: 0,
      business_name: company || null,
    }, { onConflict: 'id' })

    // If website provided, scrape brand data in background
    if (website) {
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'}/api/brand/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, website }),
      }).catch(() => {})
    }

    // Fire CRM provisioning in background
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'}/api/provision/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, email, full_name, company }),
    }).catch(() => {})

    // Track onboarding event
    await supabase.from('onboarding_events').insert({
      user_id: userId,
      step: 'signup_complete',
      metadata: { email, has_website: !!website, has_company: !!company },
    })

    return NextResponse.json({
      ok: true,
      user_id: userId,
      token,
      needs_confirmation: true,
    })
  } catch (err) {
    console.error('[auth/signup] Error:', err)
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 })
  }
}
