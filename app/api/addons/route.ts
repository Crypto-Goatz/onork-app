// GET /api/addons — List user's purchased add-ons
// POST /api/addons — Check if user has access to a specific add-on

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Add-on catalog
const ADDON_CATALOG = [
  { slug: 'linkedin-scraper-pro', name: 'LinkedIn Scraper Pro', price_cents: 2900, type: 'one_time' },
  { slug: 'ai-composer-pro', name: 'AI Composer Pro (6 tones)', price_cents: 4900, type: 'one_time' },
  { slug: 'crm-sync', name: 'CRM Sync Module', price_cents: 900, type: 'subscription' },
  { slug: 'site-manager', name: 'Site Manager (Blog/HIPAA/CRO9)', price_cents: 1900, type: 'one_time' },
  { slug: 'lead-export', name: 'Lead Export + Analytics', price_cents: 0, type: 'free' },
]

export async function GET() {
  const serverSupabase = await createServerClient()
  const { data: { session } } = await serverSupabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get user's add-ons
  const { data: userAddons } = await supabase
    .from('user_addons')
    .select('addon_slug, addon_id, status, purchased_at, expires_at, payment_type')
    .eq('user_id', user.id)
    .eq('status', 'active')

  // Get user plan
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, tier_level')
    .eq('id', user.id)
    .single()

  // Pro plan unlocks all add-ons
  const isPro = profile?.plan === 'pro' || profile?.plan === 'unlimited' || (profile?.tier_level || 0) >= 3

  const enriched = ADDON_CATALOG.map(addon => {
    const owned = userAddons?.some(ua => ua.addon_slug === addon.slug || ua.addon_id === addon.slug)
    const unlocked = isPro || addon.type === 'free' || owned
    return {
      ...addon,
      owned: owned || false,
      unlocked,
      unlock_reason: isPro ? 'pro_plan' : addon.type === 'free' ? 'free' : owned ? 'purchased' : null,
    }
  })

  return NextResponse.json({ addons: enriched, plan: profile?.plan || 'free' })
}

export async function POST(req: NextRequest) {
  const { addon_slug } = await req.json()
  if (!addon_slug) return NextResponse.json({ error: 'addon_slug required' }, { status: 400 })

  const serverSupabase = await createServerClient()
  const { data: { session } } = await serverSupabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const addon = ADDON_CATALOG.find(a => a.slug === addon_slug)
  if (!addon) return NextResponse.json({ error: 'Unknown add-on' }, { status: 404 })

  // Free add-ons auto-activate
  if (addon.type === 'free') {
    await supabase.from('user_addons').upsert({
      user_id: user.id,
      addon_slug: addon.slug,
      status: 'active',
      payment_type: 'free',
    }, { onConflict: 'user_id,addon_slug' })
    return NextResponse.json({ activated: true })
  }

  return NextResponse.json({
    needs_payment: true,
    addon,
    checkout_url: `/api/addons/checkout?addon=${addon.slug}`,
  })
}
