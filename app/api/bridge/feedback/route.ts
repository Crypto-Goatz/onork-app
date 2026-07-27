/**
 * POST /api/bridge/feedback — store 0nTask beta feedback (internal, shared-secret).
 * Called by app.0ntask.com after it verifies the Firebase user.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-bridge-secret') !== process.env.INTERNAL_DISPATCH_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const email = String(body.email || '').trim().toLowerCase()
  const message = String(body.message || '').trim()
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })
  const rating = Number.isFinite(Number(body.rating)) ? Number(body.rating) : null
  const context = body.context ? String(body.context).slice(0, 200) : null

  const sb = admin()
  const { data: flag } = await sb.from('ontask_flags').select('enabled').eq('key', 'beta_feedback').maybeSingle()
  if (flag && flag.enabled === false) {
    return NextResponse.json({ error: 'Feedback is currently closed.' }, { status: 403 })
  }

  const { error } = await sb
    .from('ontask_feedback')
    .insert({ email: email || null, message: message.slice(0, 5000), rating, context })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
