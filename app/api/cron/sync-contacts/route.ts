/**
 * /api/cron/sync-contacts — THE DRAIN.
 *
 * Measured 2026-09-14: 188 accounts, 20 with a CRM contact id; 81 signed up in
 * the last 30 days and 1 of them was synced. Capture was never the problem —
 * every new profile lands in provision_pipeline in the same transaction — the
 * drain was: ensureIdentity() upserts the contact and writes the id back, but
 * only the marketplace OAuth callback ever called it. Direct signups never
 * reached the CRM.
 *
 * This runs every 10 minutes, takes the oldest accounts with no contact id,
 * and calls the same ensureIdentity() the marketplace door uses. Upsert, never
 * create; no tags on the backfill (a tag can fire a workflow, and 168 contacts
 * at once is exactly the bulk-tag failure the doctrine records). Failures are
 * returned with the CRM's own words and logged; the next run retries them
 * because the id is still null.
 *
 * Test-shaped addresses are skipped, same list as provision-repair.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ensureIdentity } from '@/lib/identity/ensure'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function admin() {
  return createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${secret}` && req.nextUrl.searchParams.get('secret') !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get('limit') || 25)))
  const db = admin()
  const { data: rows, error } = await db
    .from('profiles')
    .select('id, email, full_name, company, created_at')
    .is('crm_contact_id', null)
    .not('email', 'is', null)
    .not('email', 'ilike', '%e2e%')
    .not('email', 'ilike', '%@example.%')
    .not('email', 'ilike', '%+test%')
    .not('email', 'ilike', '%@test.%')
    .not('email', 'ilike', '%@evil.%')
    // Two rows hold a value the CRM rejects with 422 "email must be an email"; they
    // are not contacts and retrying them every 10 minutes forever is noise.
    .like('email', '%@%.%')
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rows?.length) return NextResponse.json({ ok: true, synced: 0, attempted: 0, remaining: 0 })

  const started = Date.now()
  const results: Array<{ id: string; ok: boolean; contactId?: string | null; created?: boolean; error?: string }> = []
  for (const p of rows) {
    if (Date.now() - started > 45_000) break
    const r = await ensureIdentity({ userId: p.id, email: p.email!, fullName: p.full_name, company: p.company, door: 'direct', tags: [] })
    results.push({ id: p.id, ok: !!r.contactId, contactId: r.contactId, created: r.created, error: r.error || undefined })
    if (!r.contactId) console.error('[sync-contacts]', p.id, r.error)
  }
  const { count } = await db.from('profiles').select('id', { count: 'exact', head: true }).is('crm_contact_id', null)
  return NextResponse.json({ ok: true, synced: results.filter((r) => r.ok).length, attempted: results.length, remaining: count ?? null, results })
}
