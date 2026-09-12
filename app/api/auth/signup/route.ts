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

import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { postSignupProvision, kickOffBackgroundProvision } from '@/lib/provision/post-signup'

// Vercel bounds total execution (including after() callbacks) by maxDuration.
// CRM sub-location create + master snapshot deploy can take 20-40s, so set 60.
export const maxDuration = 60
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * A brake on scripted signups. Each signup auto-confirms the address and
 * queues a BILLED CRM sub-account, so "as fast as you can POST" is a cost.
 * In-process, per instance: it stops a loop against one lambda; a captcha is
 * the real wall and is a product decision (see the review, 2026-09-12).
 */
const signupAttempts = new Map<string, { n: number; resetAt: number }>()
function signupThrottled(ip: string): boolean {
  const now = Date.now()
  const rec = signupAttempts.get(ip)
  if (!rec || rec.resetAt < now) { signupAttempts.set(ip, { n: 1, resetAt: now + 10 * 60 * 1000 }); return false }
  rec.n += 1
  return rec.n > 5
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (signupThrottled(ip)) {
    return NextResponse.json({ error: 'Too many sign-ups from this network. Try again in a few minutes.' }, { status: 429 })
  }
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

    // Non-family signup → fire CRM sub-location provisioning AFTER the response
    // ships. after() (Next 16 stable) keeps the Vercel lambda alive past response
    // so the background promise actually completes — fire-and-forget alone does
    // NOT work on serverless (lambda dies on response).
    if (result.needsBackgroundProvision) {
      after(() => kickOffBackgroundProvision(userId))
    }

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
