/**
 * POST /api/scanner/save-lead
 *
 * Loads a stack_scans row by id, harvests a contact email from
 * scan.detected (none yet — we use a derived placeholder), and
 * upserts a CRM contact tagged 'stack-scan' + per-gap tags.
 *
 * v1: persists the contact intent into the scan row only. The full
 * CRM upsert path goes through lib/crm.ts which requires a user CRM
 * location and OAuth token — wire that in next pass.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken } from '@/lib/0n-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function POST(req: NextRequest) {
  // Resolve user
  const auth = req.headers.get('authorization') || ''
  const tokenMatch = auth.match(/^Bearer\s+(0n_\S+)/)
  const ctx = tokenMatch ? await validateToken(tokenMatch[1]) : null
  if (!ctx?.userId) {
    return NextResponse.json(
      { ok: false, error: 'auth required — extension must include Bearer 0n_ token' },
      { status: 401 },
    )
  }

  let body: { scanId?: string; location_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 })
  }
  if (!body.scanId) {
    return NextResponse.json({ ok: false, error: 'scanId required' }, { status: 400 })
  }

  const sb = admin()
  const { data: scan } = await sb
    .from('stack_scans')
    .select('id, hostname, gaps, stack_gap_score, user_id')
    .eq('id', body.scanId)
    .maybeSingle()
  if (!scan) {
    return NextResponse.json({ ok: false, error: 'scan not found' }, { status: 404 })
  }
  if (scan.user_id !== ctx.userId) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
  }

  // Build the lead payload — derived email placeholder for now
  const safeHost = (scan.hostname || 'unknown').replace(/[^a-z0-9.-]/gi, '')
  const derivedEmail = `lead+${safeHost}@onork.io`
  const tags = ['stack-scan', ...scan.gaps.map((g: string) => `gap:${g}`)]

  // v1: stub contactId — full CRM integration requires user OAuth path
  const contactId = `derived:${safeHost}:${Date.now()}`

  const { error: updErr } = await sb
    .from('stack_scans')
    .update({ saved_lead_contact_id: contactId })
    .eq('id', body.scanId)
  if (updErr) {
    return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    contactId,
    derivedEmail,
    scanId: body.scanId,
    tags,
    note: 'v1: contact intent saved. CRM upsert wires through user OAuth in next pass.',
  })
}
