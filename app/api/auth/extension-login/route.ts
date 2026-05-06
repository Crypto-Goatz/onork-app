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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

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
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, business_name, tier_level, avatar_url, crm_location_id')
      .eq('access_token', token)
      .single()

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

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.session) {
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
