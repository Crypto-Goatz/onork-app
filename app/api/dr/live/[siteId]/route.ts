import { NextRequest, NextResponse } from 'next/server'
import { drAdmin } from '@/lib/dr/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params
  if (!siteId) {
    return NextResponse.json({ ok: false, error: 'siteId required' }, { status: 400 })
  }

  const { data, error } = await drAdmin()
    .from('dr_events')
    .select('id, session_id, event_type, grade, score, url, referrer, ad_platform, click_id, behavioral_signals, created_at')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, events: data ?? [] })
}
