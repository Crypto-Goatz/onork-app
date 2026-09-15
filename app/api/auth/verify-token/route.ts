/**
 * POST /api/auth/verify-token — Verify a 0n_ token and return user profile.
 * Used by Chrome extension, WordPress plugin, Slack handler, etc.
 * Alternative to direct Supabase REST query (works even if RLS blocks direct access).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyTokenFormat } from '@/lib/0n-token'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const { token } = await req.json()

  // v2 tokens are 38 characters; the old length < 50 rejected every valid key.
  if (!token || !verifyTokenFormat(String(token))) {
    return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, business_name, avatar_url, tier_level, crm_location_id, website, website_scan')
    .eq('access_token', token)
    .single()

  // Separate "this token is unknown" from "this query is broken". They are not
  // the same failure and they do not have the same fix. Selecting a column that
  // does not exist makes PostgREST return an error, not an empty result — and
  // reporting that as "Token not found" sent every reader after the token.
  // The column is `website`; this select asked for `website_url` and so returned
  // 401 for EVERY valid token since it was written. The extension's syncProfile
  // swallowed the 401, so sign-in looked fine and the panel simply stayed empty.
  if (error) {
    console.error('[verify-token] profile query failed:', error.message)
    return NextResponse.json({ error: 'Profile lookup failed', detail: error.message }, { status: 500 })
  }
  if (!profile) {
    return NextResponse.json({ error: 'Token not found' }, { status: 401 })
  }

  // Get connected services
  const { data: connections } = await supabase
    .from('user_connections')
    .select('provider, provider_email, status')
    .eq('user_id', profile.id)
    .eq('status', 'active')

  // Get active add-ons
  const { data: addons } = await supabase
    .from('product_keys')
    .select('product_slug, product_name, capabilities')
    .eq('user_id', profile.id)
    .eq('status', 'active')

  return NextResponse.json({
    profile: {
      user_id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      business_name: profile.business_name,
      avatar_url: profile.avatar_url,
      plan: profile.tier_level >= 5 ? 'unlimited' : profile.tier_level >= 3 ? 'pro' : profile.tier_level >= 1 ? 'starter' : 'free',
      tier_level: profile.tier_level,
      crm_location_id: profile.crm_location_id,
      website_url: profile.website,
    },
    connections: (connections || []).map(c => ({ provider: c.provider, email: c.provider_email, status: c.status })),
    addons: (addons || []).map(a => ({ slug: a.product_slug, name: a.product_name, capabilities: a.capabilities })),
    services: {
      total_tools: 1554,
      total_services: 96,
    },
  })
}
