/**
 * POST /api/services/stack-scan/submit  { session_id, urls: string[] | text }
 * GET  /api/services/stack-scan/submit?session_id=...   → order status + results
 *
 * Verifies the Stripe Checkout session is paid, stores the buyer's URL list
 * (capped to the paid allowance), scans the first batch inline, and lets a cron
 * drain the rest. No login required — the paid session_id is the access key.
 */
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { CONTACTS_PER_BLOCK, INLINE_BATCH, processOrderBatch } from '@/lib/services/stack-scan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' as any })
}
function admin() {
  return createAdmin(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '')
}

function parseUrls(input: unknown): string[] {
  let raw: string[] = []
  if (Array.isArray(input)) raw = input.map(String)
  else if (typeof input === 'string') raw = input.split(/[\n,\s]+/)
  const seen = new Set<string>()
  const out: string[] = []
  for (let u of raw) {
    u = u.trim()
    if (!u) continue
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u
    try {
      const host = new URL(u).hostname
      if (!host.includes('.')) continue
      if (seen.has(u)) continue
      seen.add(u)
      out.push(u)
    } catch { /* skip invalid */ }
  }
  return out
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

  // Resolve allowance from Stripe (so the submit page can show it pre-upload)
  let order: any = null
  const { data } = await admin().from('scan_orders').select('*').eq('stripe_session_id', sessionId).maybeSingle()
  order = data
  let contactsPaid = order?.contacts_paid ?? null
  let paid = !!order
  if (!order) {
    try {
      const s = await getStripe().checkout.sessions.retrieve(sessionId)
      paid = s.payment_status === 'paid'
      contactsPaid = Number(s.metadata?.contacts_paid) || CONTACTS_PER_BLOCK
    } catch { paid = false }
  }
  return NextResponse.json({
    paid,
    contactsPaid,
    status: order?.status ?? (paid ? 'awaiting_list' : 'unpaid'),
    scanned: order?.scanned_count ?? 0,
    total: Array.isArray(order?.urls) ? order.urls.length : 0,
    results: order?.results ?? [],
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const sessionId = String(body.session_id || '')
  if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

  // Verify payment
  let session: Stripe.Checkout.Session
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId)
  } catch {
    return NextResponse.json({ error: 'Invalid checkout session' }, { status: 400 })
  }
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Payment not completed for this session' }, { status: 402 })
  }

  const contactsPaid = Number(session.metadata?.contacts_paid) || CONTACTS_PER_BLOCK
  const email = session.customer_details?.email || session.customer_email || null
  const amount = session.amount_total ?? 0

  let urls = parseUrls(body.urls ?? body.text)
  if (urls.length === 0) return NextResponse.json({ error: 'No valid URLs found in your list' }, { status: 400 })
  const overage = Math.max(0, urls.length - contactsPaid)
  urls = urls.slice(0, contactsPaid) // enforce paid allowance

  const db = admin()
  // Upsert the order (idempotent on session id) — only set the list once.
  const { data: existing } = await db.from('scan_orders').select('id,status').eq('stripe_session_id', sessionId).maybeSingle()
  let orderId = existing?.id
  if (!orderId) {
    const { data: created, error } = await db
      .from('scan_orders')
      .insert({
        stripe_session_id: sessionId,
        email,
        contacts_paid: contactsPaid,
        amount_cents: amount,
        urls,
        results: [],
        scanned_count: 0,
        status: 'scanning',
      })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    orderId = created.id
  } else if (existing && (existing.status === 'submitted' || existing.status === 'awaiting_list')) {
    await db.from('scan_orders').update({ urls, status: 'scanning' }).eq('id', orderId)
  }

  // Scan the first batch inline for instant feedback; cron drains the rest.
  const { data: order } = await db.from('scan_orders').select('id,urls,results,scanned_count').eq('id', orderId).single()
  const progress = await processOrderBatch(db as any, order as any, INLINE_BATCH)

  return NextResponse.json({
    ok: true,
    orderId,
    accepted: urls.length,
    overageDropped: overage,
    contactsPaid,
    scanned: progress.scanned,
    total: progress.total,
    done: progress.done,
    message: progress.done
      ? 'Scan complete.'
      : `Scanning started — ${progress.scanned}/${progress.total} done. The rest process automatically; refresh to see progress.`,
  })
}
