import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { issueAppJwt } from '@/lib/auth/app-jwt'

/**
 * POST /api/auth/standalone-token — mint an app JWT for a signed-in agency,
 * OUTSIDE the GHL iframe.
 *
 * WHY THIS EXISTS. Inside GHL, the Custom Page SSO handshake mints the app JWT
 * (see /api/sso + useSso). Opened directly in a browser there is no parent to
 * hand over a payload, so the dashboard had no token and every tool 401'd. This
 * is the other front door: a normal Supabase login, then a token minted from
 * WHO THAT USER ACTUALLY IS — not from anything they send.
 *
 * SECURITY. The companyId is resolved from crm_installations by the
 * authenticated user_id, exactly like /api/burst/run derives it from the JWT.
 * It is NEVER read from the request body — otherwise anyone signed in could mint
 * a token for someone else's agency. getSession (not getUser) per the repo rule:
 * this is not middleware, and getSession validates the cookie JWT locally.
 *
 * The token is the SAME shape the iframe path issues, so it lands in the same
 * sessionStorage slot and every downstream tool works identically.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function POST() {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Sign in first.' }, { status: 401 })
  }

  // The agency this user belongs to — the newest active install we hold for
  // them. Resolved server-side from their identity, never from input.
  const { data: install } = await admin()
    .from('crm_installations')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .not('company_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const companyId = install?.company_id
  if (!companyId) {
    return NextResponse.json(
      { ok: false, error: 'This account is not linked to an agency yet. Install 0nCORE from the marketplace first.' },
      { status: 403 },
    )
  }

  // 8-hour session for a standalone browser. Shorter than a normal web session
  // on purpose, longer than the 15-min iframe token because there is no parent
  // to silently re-handshake — an expired token here re-mints via this same
  // endpoint on the next dashboard mount.
  const token = issueAppJwt({ sub: user.id, companyId }, 60 * 60 * 8)

  return NextResponse.json({
    ok: true,
    token,
    user: {
      name: user.user_metadata?.full_name ?? null,
      email: user.email ?? null,
      role: 'agency',
      type: 'standalone',
    },
  })
}
