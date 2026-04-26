/**
 * /api/market-intel/profile
 *
 * POST   { profile_url, pasted_text? }   — scrape a profile, store, kick off matching
 * GET                                    — list user's linked profiles
 * DELETE ?id=<uuid>                       — remove a profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { scrapeProfile } from '@/lib/market-intel/profile-scraper'
import { generateMatches } from '@/lib/market-intel/matcher'

export const runtime = 'nodejs'
export const maxDuration = 120

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await admin
    .from('market_profiles')
    .select('id, platform, profile_url, display_name, headline, skills, hourly_rate, rating, location, scraped_at')
    .eq('user_id', user.id)
    .order('scraped_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profiles: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { profile_url?: string; pasted_text?: string; skip_matching?: boolean }
  const profileUrl = body.profile_url?.trim()
  if (!profileUrl) return NextResponse.json({ error: 'profile_url required' }, { status: 400 })

  let result
  try {
    result = await scrapeProfile(user.id, profileUrl, body.pasted_text)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }

  if (result.needs_paste) {
    return NextResponse.json({
      needs_paste: true,
      reason: result.reason,
      message: 'This platform requires you to paste your profile text. Copy your headline, skills, and bio, then resubmit with `pasted_text`.',
    }, { status: 200 })
  }

  // Fire-and-forget match generation unless caller opts out
  if (!body.skip_matching) {
    generateMatches(user.id).catch(() => {/* logged downstream */})
  }

  return NextResponse.json({ ok: true, profile: result.profile })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await admin
    .from('market_profiles')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
