/**
 * Admin LinkedIn approval queue.
 * GET                      → pending + recent posts
 * POST { id, action }      → 'approve' | 'reject' | 'publish'
 *
 * ADMIN-GATED HERE, IN THE HANDLER. This previously said it was covered by the
 * dashboard middleware — it was not. The matcher lists /dashboard/:path* and
 * friends; it has never included /api/admin/*. So every handler below was
 * reachable unauthenticated, on the service-role client:
 *
 *   GET               returned 11 rows including user_id and post content
 *   POST reject       deleted any user's queued post
 *   POST approve      approved it
 *   POST publish      looked up that user's stored LinkedIn token and posted
 *                     to their real account
 *
 * Found by an audit on 2026-08-04 and confirmed live (HTTP 200, 10 KB). An API
 * route is never protected by a page matcher — it protects itself.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/admin-gate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET() {
  const gate = await verifyAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.userId ? 403 : 401 })

  const { data, error } = await admin
    .from('bot_queue')
    .select('id, user_id, content_type, content_text, vpis_score, hook_archetype, status, created_at, posted_at, linkedin_post_id')
    .order('created_at', { ascending: false })
    .limit(60)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ posts: data })
}

export async function POST(req: NextRequest) {
  const gate = await verifyAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.userId ? 403 : 401 })

  const { id, action } = await req.json().catch(() => ({}))
  if (!id || !['approve', 'reject', 'publish'].includes(action)) {
    return NextResponse.json({ error: 'id and valid action required' }, { status: 400 })
  }

  if (action === 'reject') {
    const { error } = await admin.from('bot_queue').delete().eq('id', id)
    return NextResponse.json({ ok: !error, error: error?.message })
  }

  if (action === 'approve') {
    const { error } = await admin.from('bot_queue')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', id)
    return NextResponse.json({ ok: !error, error: error?.message })
  }

  // publish → needs a connected LinkedIn account
  const { data: post } = await admin.from('bot_queue').select('user_id, content_text').eq('id', id).single()
  if (!post) return NextResponse.json({ error: 'post not found' }, { status: 404 })
  const { data: conn } = await admin.from('user_connections')
    .select('access_token').eq('user_id', post.user_id).ilike('provider_name', '%linkedin%').maybeSingle()
  if (!conn?.access_token) {
    return NextResponse.json({ ok: false, needsConnection: true, error: 'No LinkedIn account connected — connect one in Integrations first.' })
  }
  // Delegate to the existing publish path.
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://www.0ncore.com'
  const r = await fetch(`${base}/api/linkedin-bot`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'approve', queue_id: id, user_id: post.user_id, publish_now: true }),
  })
  const out = await r.json().catch(() => ({}))
  return NextResponse.json({ ok: r.ok, ...out })
}
