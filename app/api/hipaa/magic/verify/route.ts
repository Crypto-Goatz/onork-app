/**
 * POST /api/hipaa/magic/verify
 * Body: { token }
 * Validates the magic token, marks it used, creates a 30-day session,
 * returns a `session_token` cookie value the caller should store.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes, createHash } from 'node:crypto'

const WEBHOOK_SECRET = process.env.HIPAA_WEBHOOK_SECRET || ''

export const runtime = 'nodejs'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function hashCookie(v: string): string {
  return createHash('sha256').update(v).digest('hex')
}

export async function POST(req: NextRequest) {
  const wh = req.headers.get('x-hipaa-webhook-secret') || ''
  if (!WEBHOOK_SECRET || wh !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const token = String(body?.token || '')
  if (!token) return NextResponse.json({ error: 'token_required' }, { status: 400 })

  const sb = admin()
  const { data: row } = await sb
    .from('hipaa_magic_tokens')
    .select('email, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (!row) return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
  if (row.used_at) return NextResponse.json({ error: 'already_used' }, { status: 400 })
  if (new Date(row.expires_at).getTime() < Date.now()) return NextResponse.json({ error: 'expired' }, { status: 400 })

  await sb.from('hipaa_magic_tokens').update({ used_at: new Date().toISOString() }).eq('token', token)

  const sessionCookie = randomBytes(32).toString('base64url')
  await sb.from('hipaa_sessions').insert({
    cookie_hash: hashCookie(sessionCookie),
    email: row.email,
  })

  return NextResponse.json({ ok: true, email: row.email, sessionCookie })
}

/** Helper: GET /api/hipaa/magic/verify?cookie=XYZ verifies a session and returns email */
export async function GET(req: NextRequest) {
  const wh = req.headers.get('x-hipaa-webhook-secret') || ''
  if (!WEBHOOK_SECRET || wh !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 })
  }
  const url = new URL(req.url)
  const cookie = url.searchParams.get('cookie') || ''
  if (!cookie) return NextResponse.json({ error: 'cookie_required' }, { status: 400 })

  const sb = admin()
  const { data } = await sb
    .from('hipaa_sessions')
    .select('email, expires_at')
    .eq('cookie_hash', hashCookie(cookie))
    .maybeSingle()
  if (!data) return NextResponse.json({ email: null }, { status: 200 })
  if (new Date(data.expires_at).getTime() < Date.now()) return NextResponse.json({ email: null }, { status: 200 })

  // List the user's orders
  const { data: orders } = await sb
    .from('hipaa_orders')
    .select('id, tier, company_name, status, report_status, report_view_token, report_generated_at, support_call_expires_at, created_at, source_site')
    .eq('customer_email', data.email)
    .order('created_at', { ascending: false })

  return NextResponse.json({ email: data.email, orders: orders || [] })
}
