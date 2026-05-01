/**
 * GET /api/scans/list
 *
 * Returns the authenticated user's recent stack scans, sorted by stack_gap_score desc.
 * Used by /dashboard/scans.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200)

  const { data, error } = await admin()
    .from('stack_scans')
    .select('id, hostname, url, gaps, stack_gap_score, recommendations, saved_lead_contact_id, created_at')
    .eq('user_id', user.id)
    .order('stack_gap_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const scans = (data || []).map((s) => {
    const recs = Array.isArray(s.recommendations) ? s.recommendations : []
    const top = recs[0] as { service_id?: string; why?: string } | undefined
    return {
      id: s.id,
      hostname: s.hostname,
      url: s.url,
      gaps: s.gaps || [],
      stack_gap_score: s.stack_gap_score,
      top_recommendation: top ? { service_id: top.service_id, why: top.why } : null,
      saved: !!s.saved_lead_contact_id,
      contact_id: s.saved_lead_contact_id || null,
      created_at: s.created_at,
    }
  })

  return NextResponse.json({ scans, count: scans.length })
}
