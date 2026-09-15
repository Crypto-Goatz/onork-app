/**
 * POST /api/auth/signup
 *
 * Creates an UNCONFIRMED auth user, creates the CRM contact (post-signup),
 * and sends the confirmation link through the CRM to that contact. The
 * billed sub-account is provisioned only after the click (/auth/callback,
 * token_hash branch). The /signup form then shows "check your email".
 *
 * OAuth signups DO NOT hit this route — they hit /auth/callback after the
 * provider returns. That route runs the SAME postSignupProvision call so
 * email/password users and OAuth users end up identically provisioned.
 *
 * GUARDED BY hCAPTCHA since 2026-09-15. See lib/security/captcha.ts for why the
 * per-IP counter below was not enough: a distributed script never trips it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { postSignupProvision } from '@/lib/provision/post-signup'
import { mintConfirmLink, sendConfirmEmail } from '@/lib/auth/confirm-email'
import { findOnCoreUserByEmail } from '@/lib/oauth/connections'
import { verifyCaptcha } from '@/lib/security/captcha'

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
    return NextResponse.json({ error: 'During peak promotions, registrations may briefly pause when sign-up volume exceeds what we can safely onboard at once. If that happens, try again in a few minutes — nothing you entered is lost.' }, { status: 429 })
  }
  try {
    const { email, password, full_name, company, website, mode, captchaToken } = await req.json()
    const origin = new URL(req.url).origin

    /*
      RESEND. The login page and the "check your email" screen call this with
      mode:'resend' for an address that has not clicked yet. Same response
      whether or not the address exists, so it cannot be used to enumerate.
    */
    if (mode === 'resend') {
      const em = String(email || '').trim().toLowerCase()
      if (!em) return NextResponse.json({ error: 'Email required' }, { status: 400 })
      // A resend sends real email, so it is worth a token too.
      const rc = await verifyCaptcha(captchaToken, ip)
      if (!rc.ok) return NextResponse.json({ error: rc.reason }, { status: 400 })
      try {
        const u = await findOnCoreUserByEmail(em)
        if (u) {
          const { data: full } = await supabase.auth.admin.getUserById(u.id)
          if (full?.user && !full.user.email_confirmed_at) {
            const { data: profile } = await supabase.from('profiles').select('crm_contact_id, full_name').eq('id', u.id).maybeSingle()
            if (profile?.crm_contact_id) {
              const link = await mintConfirmLink(em, origin)
              await sendConfirmEmail({ contactId: profile.crm_contact_id, firstName: String(profile.full_name || '').split(' ')[0], link })
            }
          }
        }
      } catch (e) { console.error('[auth/signup] resend failed:', e) }
      return NextResponse.json({ ok: true, sent: true })
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 },
      )
    }

    /*
      THE HUMAN CHECK, before anything is created. Everything past this line
      costs something real: an auth user, a CRM contact, and an email sent to
      whatever address was typed. Unconfigured deployments skip it rather than
      refuse everyone — see lib/security/captcha.ts.
    */
    const cap = await verifyCaptcha(captchaToken, ip)
    if (!cap.ok) {
      return NextResponse.json({ error: cap.reason, captcha: 'failed' }, { status: 400 })
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
        // UNCONFIRMED until they click the link we send through the CRM. pwu
        // refuses password sign-in for an unconfirmed address (measured
        // 2026-09-13: "Email not confirmed"), so nothing works until the click.
        email_confirm: false,
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

    /*
      THE CONFIRMATION EMAIL, THROUGH THE CRM. The contact postSignupProvision
      just created is the recipient. The billed sub-account is NOT provisioned
      here any more — /auth/callback does that after the click, so an address
      nobody owns never costs a sub-location.
    */
    let confirmationSent = false
    let confirmationError: string | null = null
    try {
      if (!result.crmContactId) throw new Error('no CRM contact for this sign-up')
      const link = await mintConfirmLink(email, origin)
      await sendConfirmEmail({ contactId: result.crmContactId, firstName: String(full_name || '').split(' ')[0], link })
      confirmationSent = true
    } catch (e) {
      confirmationError = e instanceof Error ? e.message : String(e)
      console.error('[auth/signup] confirmation email failed:', confirmationError)
    }

    return NextResponse.json({
      ok: true,
      confirmationSent,
      ...(confirmationError ? { confirmationError } : {}),
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
