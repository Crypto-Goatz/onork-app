/**
 * GET /api/lead-magnet/builtwith
 *
 * Powers the builtwith page — public, no auth.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: all } = await sb
    .from('builtwith_showcase')
    .select('id, display_order, name, title, company, bio, avatar_url, profile_url, subscriber_count, use_case, category, is_featured')
    .eq('is_active', true)
    .order('display_order')

  const featured = (all ?? []).filter((s) => s.is_featured)
  return NextResponse.json({ featured, all: all ?? [] })
}
