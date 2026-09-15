/**
 * POST /api/auth/extension-login — Chrome extension authentication
 *
 * Supports two auth methods:
 * 1. Email + password → Supabase sign-in → returns session token
 * 2. 0n_ token paste → validates against profiles.access_token → returns profile
 *
 * The extension calls this on login. Token is stored in chrome.storage.local.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken } from '@/lib/0n-token'

// Service-role client for READS only. A module-level client that signs a user
// in keeps that user's session for the life of the lambda, and every later
// query in the instance runs as that user under RLS.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)
// Per-request, anon, non-persisting client for the password check.
function signInClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Pull token from anywhere it might land — old extension versions, copy-
  // paste mishaps, header-style auth. If anything looks like a 0n_ token,
  // treat it as one. This is forward-compat protection against the v3.1.0
  // bug where the old background.js shipped { email, password } from a
  // password-typed input that contained a 0n_ token (Desktop unpacked
  // extension that bit Mike on 2026-05-05).
  const authHeader = req.headers.get('authorization') || ''
  const headerBearer = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : ''

  const candidates = [
    body?.token,
    body?.access_token,
    body?.api_key,
    body?.password,
    body?.email,
    headerBearer,
  ]
  const tokenFromAny = candidates.find(
    (v) => typeof v === 'string' && v.trim().startsWith('0n_'),
  ) as string | undefined

  const token: string | undefined =
    (typeof body?.token === 'string' && body.token.startsWith('0n_')
      ? body.token
      : tokenFromAny)

  const email: string | undefined =
    typeof body?.email === 'string' && !body.email.startsWith('0n_')
      ? body.email
      : undefined
  const password: string | undefined =
    typeof body?.password === 'string' && !body.password.startsWith('0n_')
      ? body.password
      : undefined

  // Method 1: 0n_ token authentication (paste token)
  if (token && token.startsWith('0n_')) {
    // TWO STORES, ONE CONCEPT — this is why pasting a freshly generated device
    // key always failed.
    //
    // The "New device key" button issues a `0n_live_…` via /api/auth/device and
    // stores it HASHED in agency_connections. This route only ever compared it
    // in PLAINTEXT against profiles.access_token — a different column, in a
    // different table, holding a different token. So a key the UI had just
    // shown, with a working Revoke button next to it, could never authenticate.
    // "Issued" and "accepted" were two different states.
    //
    // validateToken() is the one validator that knows about hashed device keys
    // (it is what /api/extension/auth/verify already uses). Try it FIRST, and
    // keep the legacy profiles.access_token path as a fallback so tokens issued
    // before device keys existed keep working.
    let profile: {
      id: string; email?: string | null; full_name?: string | null
      business_name?: string | null; tier_level?: number | null
      avatar_url?: string | null; crm_location_id?: string | null
    } | null = null

    const ctx = await validateToken(token).catch(() => null)
    if (ctx?.userId) {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, business_name, tier_level, avatar_url, crm_location_id')
        .eq('id', ctx.userId)
        .single()
      profile = data
    }

    if (!profile) {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, business_name, tier_level, avatar_url, crm_location_id')
        .eq('access_token', token)
        .single()
      profile = data
    }

    if (!profile) {
      return NextResponse.json({ error: 'Invalid token. Check 0ncore.com/dashboard/downloads for your token.' }, { status: 401 })
    }

    // Get addons
    const { data: addons } = await supabase
      .from('product_keys')
      .select('product_slug, product_name, capabilities')
      .eq('user_id', profile.id)
      .eq('status', 'active')

    return NextResponse.json({
      token, // Return the same 0n_ token — extension stores it
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        businessName: profile.business_name,
        tierLevel: profile.tier_level,
        avatarUrl: profile.avatar_url,
        locationId: profile.crm_location_id,
      },
      addons: (addons || []).map(a => ({
        slug: a.product_slug,
        name: a.product_name,
        capabilities: a.capabilities,
      })),
      expires_in: 30 * 24 * 60 * 60, // 30 days
    })
  }

  // Method 2: Email + password authentication
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required, or paste your 0n_ token.' }, { status: 400 })
  }

  const { data: authData, error: authError } = await signInClient().auth.signInWithPassword({
    email,
    password,
    // A captcha token, when the caller could produce one. Supabase bot
    // protection is on for this project and refuses password sign-in without it.
    ...(typeof body?.captchaToken === 'string' && body.captchaToken
      ? { options: { captchaToken: body.captchaToken as string } }
      : {}),
  })

  if (authError || !authData.session) {
    /*
      TELL THE TRUTH ABOUT THIS ONE. Supabase's own refusal reads "captcha
      protection: request disallowed (no captcha_token found)", which to a
      person in a browser extension looks exactly like a wrong password — so
      they retype it, fail again, and conclude the product is broken.

      An extension has no page on which to tick a box, so the honest answer is
      to name the door that DOES work: the 0n token, which this same route
      accepts above and which is unaffected by bot protection.
    */
    if (authError && /captcha/i.test(authError.message)) {
      return NextResponse.json({
        error: 'Signing in with an email and password is not available from the extension. Paste your 0n token instead — copy it from 0ncore.com/dashboard/downloads.',
        useToken: true,
      }, { status: 400 })
    }
    return NextResponse.json({ error: authError?.message || 'Invalid credentials' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, business_name, tier_level, avatar_url, crm_location_id, access_token')
    .eq('id', authData.user.id)
    .single()

  // Get addons
  const { data: addons } = await supabase
    .from('product_keys')
    .select('product_slug, product_name, capabilities')
    .eq('user_id', authData.user.id)
    .eq('status', 'active')

  return NextResponse.json({
    token: profile?.access_token || authData.session.access_token,
    // Honest lifetime: a raw Supabase JWT is not a 30-day key.
    ...(profile?.access_token ? {} : { expires_in: authData.session.expires_in }),
    user: {
      id: authData.user.id,
      email: authData.user.email,
      name: profile?.full_name,
      businessName: profile?.business_name,
      tierLevel: profile?.tier_level,
      avatarUrl: profile?.avatar_url,
      locationId: profile?.crm_location_id,
    },
    addons: (addons || []).map(a => ({
      slug: a.product_slug,
      name: a.product_name,
      capabilities: a.capabilities,
    })),
    expires_in: authData.session.expires_in || 30 * 24 * 60 * 60,
  })
}
