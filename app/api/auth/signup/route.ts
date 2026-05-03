/**
 * POST /api/auth/signup
 *
 * Creates an auth user (admin API, email auto-confirmed) and runs the full
 * post-signup provisioning chain via lib/provision/post-signup.
 *
 * The public /signup form calls this, then signs the user in via
 * supabase.auth.signInWithPassword on the client to establish a session,
 * then redirects to /onboarding.
 *
 * OAuth signups DO NOT hit this route — they hit /auth/callback after the
 * provider returns. That route runs the SAME postSignupProvision call so
 * email/password users and OAuth users end up identically provisioned.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { postSignupProvision } from '@/lib/provision/post-signup'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name, company, website } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 },
      )
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be 8+ characters' },
        { status: 400 },
      )
    }

    // Create auth user — handle_new_user trigger creates the profiles row.
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // skip the confirmation email — user is here, signing up
        user_metadata: {
          full_name: full_name || '',
          company: company || '',
        },
      })

    if (authError) {
      if (authError.message?.toLowerCase().includes('already')) {
        return NextResponse.json(
          {
            error:
              'An account with this email already exists. Try signing in.',
          },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }
    if (!authData?.user) {
      return NextResponse.json(
        { error: 'Auth user creation returned no user' },
        { status: 500 },
      )
    }

    const userId = authData.user.id

    // Run shared post-signup provisioning (profile + family match + CRM
    // contact + sub-location queue + onboarding event)
    const result = await postSignupProvision({
      userId,
      email,
      fullName: full_name || null,
      company: company || null,
      website: website || null,
      source: '0ncore-signup',
    })

    return NextResponse.json({
      ok: true,
      userId,
      token: result.token,
      familyMatched: result.familyMatched,
      familyLocation: result.familyLocationName,
      vip: result.vip,
      crmContactId: result.crmContactId,
      crmLocationId: result.crmLocationId,
    })
  } catch (err) {
    console.error('[auth/signup] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Signup failed' },
      { status: 500 },
    )
  }
}
