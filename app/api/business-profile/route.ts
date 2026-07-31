/**
 * GET/PUT /api/business-profile — the company record and the people in it.
 *
 * This is the record everything else in 0nCore generates from. Reads and writes
 * go through the user's own session so RLS is the enforcement, not this file.
 *
 * Saving is intentionally forgiving: partial payloads merge into the existing
 * row rather than replacing it. A profile gets filled in over weeks, in pieces,
 * and a save that quietly blanks the fields you did not send this time is a
 * data-loss bug wearing an "upsert" costume.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { completeness, type BusinessProfile } from '@/lib/business-profile'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Columns a client may write. Anything else in the body is ignored. */
const PROFILE_FIELDS = [
  'legal_name', 'trading_name', 'tagline', 'founded_year', 'industry', 'company_size',
  'short_description', 'long_description', 'value_proposition', 'target_audience',
  'differentiators', 'email', 'phone', 'website', 'address_line1', 'city', 'region',
  'postal_code', 'country', 'service_areas', 'is_service_area_business',
  'logo_url', 'logo_variants', 'colors', 'fonts', 'brand_voice', 'socials', 'extras',
] as const

const PERSON_FIELDS = [
  'full_name', 'role_title', 'email', 'phone', 'headshot_url',
  'bio_short', 'bio_long', 'linkedin_url', 'socials', 'is_primary', 'sort_order', 'extras',
] as const

function pick<T extends readonly string[]>(body: Record<string, unknown>, fields: T) {
  const out: Record<string, unknown> = {}
  for (const f of fields) if (f in body) out[f] = body[f]
  return out
}

export async function GET() {
  const sb = await createClient()
  const user = (await sb.auth.getSession()).data.session?.user
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: profile }, { data: people }] = await Promise.all([
    sb.from('business_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    sb.from('business_people').select('*').eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('sort_order', { ascending: true }),
  ])

  return NextResponse.json({
    profile: profile ?? null,
    people: people ?? [],
    completeness: completeness((profile ?? {}) as BusinessProfile),
  })
}

export async function PUT(req: NextRequest) {
  const sb = await createClient()
  const user = (await sb.auth.getSession()).data.session?.user
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const patch = pick(body, PROFILE_FIELDS)

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to save.' }, { status: 400 })
  }

  // Merge, never replace — see the note at the top of this file.
  const { data: existing } = await sb
    .from('business_profiles').select('id').eq('user_id', user.id).maybeSingle()

  const { data, error } = existing
    ? await sb.from('business_profiles').update(patch).eq('user_id', user.id).select('*').single()
    : await sb.from('business_profiles').insert({ ...patch, user_id: user.id }).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({
    profile: data,
    completeness: completeness(data as BusinessProfile),
  })
}

/** POST — add or update one person. `id` present = update, absent = insert. */
export async function POST(req: NextRequest) {
  const sb = await createClient()
  const user = (await sb.auth.getSession()).data.session?.user
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const id = body.id as string | undefined
  const patch = pick(body, PERSON_FIELDS)

  if (!id && !patch.full_name) {
    return NextResponse.json({ error: 'A person needs a name.' }, { status: 400 })
  }

  // One primary per account is a partial unique index in the DB, so promoting
  // someone must demote the incumbent first or the insert fails on the index.
  if (patch.is_primary === true) {
    await sb.from('business_people').update({ is_primary: false })
      .eq('user_id', user.id).eq('is_primary', true)
  }

  const { data, error } = id
    ? await sb.from('business_people').update(patch).eq('user_id', user.id).eq('id', id).select('*').single()
    : await sb.from('business_people').insert({ ...patch, user_id: user.id }).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ person: data })
}

export async function DELETE(req: NextRequest) {
  const sb = await createClient()
  const user = (await sb.auth.getSession()).data.session?.user
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('person_id')
  if (!id) return NextResponse.json({ error: 'person_id required' }, { status: 400 })

  const { error } = await sb.from('business_people').delete().eq('user_id', user.id).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
