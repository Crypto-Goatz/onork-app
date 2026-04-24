/**
 * POST /api/auth/verify-token — Verify a 0n_ token and return user profile.
 * Used by Chrome extension, WordPress plugin, Slack handler, etc.
 * Alternative to direct Supabase REST query (works even if RLS blocks direct access).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const { token } = await req.json()

  if (!token || !token.startsWith('0n_') || token.length < 50) {
    return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, business_name, avatar_url, tier_level, crm_location_id, website_url, website_scan')
    .eq('access_token', token)
    .single()

  if (error || !profile) {
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
      website_url: profile.website_url,
    },
    connections: (connections || []).map(c => ({ provider: c.provider, email: c.provider_email, status: c.status })),
    addons: (addons || []).map(a => ({ slug: a.product_slug, name: a.product_name, capabilities: a.capabilities })),
    services: {
      total_tools: 1554,
      total_services: 96,
    },
  })
}
