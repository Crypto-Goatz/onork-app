/**
 * GET /api/lead-magnet/recommendations?funnel_id=<slug>
 *
 * Returns the funnel config + active recommendations for the modal to render.
 * Public — no auth required (the modal lives on the public thank-you page).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const funnelId = req.nextUrl.searchParams.get('funnel_id') || 'default'
  const sb = admin()

  const [config, recs] = await Promise.all([
    sb.from('funnel_config').select('*').eq('funnel_id', funnelId).maybeSingle(),
    sb
      .from('recommendations')
      .select('*')
      .eq('funnel_id', funnelId)
      .eq('is_active', true)
      .order('slot_order'),
  ])

  if (!config.data) {
    return NextResponse.json({ error: 'funnel not found' }, { status: 404 })
  }

  const max = (config.data.max_recommendation_slots as number) ?? 5
  return NextResponse.json({
    config: config.data,
    recommendations: (recs.data ?? []).slice(0, max),
  })
}
