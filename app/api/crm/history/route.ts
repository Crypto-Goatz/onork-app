/**
 * GET /api/crm/history — every receipt, newest first.
 *
 * This is the trust surface. When something went wrong inside a client's
 * account, this is the only screen that can answer what happened, so it returns
 * the raw detail and error verbatim rather than a tidied summary — a receipt
 * that has been prettied up is not evidence.
 *
 * Scoped to the caller's agency. A receipt names a real client and what was
 * done inside it; it must never be readable across agencies.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/connect/service-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage is not configured.' }, { status: 500 })

  const { data: agency } = await db
    .from('agency_connections')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!agency) return NextResponse.json({ receipts: [], filters: emptyFilters() })

  const sp = req.nextUrl.searchParams
  const days = Number(sp.get('days') || '7')
  const since = new Date(Date.now() - Math.max(1, days) * 86_400_000).toISOString()

  let q = db
    .from('burst_receipts')
    .select('id, run_id, location_id, location_name, capability, intent, status, price_cents, billed, targets, detail, error, created_at, settled_at, source')
    .eq('company_id', agency.company_id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(400)

  const loc = sp.get('client')
  const cap = sp.get('capability')
  const st = sp.get('status')
  if (loc && loc !== 'all') q = q.eq('location_id', loc)
  if (cap && cap !== 'all') q = q.eq('capability', cap)
  if (st && st !== 'all') q = q.eq('status', st)

  const { data, error } = await q
  if (error) {
    console.error('[crm/history] read failed:', error.message)
    return NextResponse.json({ error: 'Could not read the receipts.' }, { status: 500 })
  }

  const rows = data ?? []
  return NextResponse.json({
    receipts: rows,
    // Built from what is actually present, so a filter can never offer an
    // option that returns nothing.
    filters: {
      clients: dedupe(rows.map((r) => ({ id: r.location_id, name: r.location_name }))),
      capabilities: [...new Set(rows.map((r) => r.capability))].filter(Boolean).sort(),
      statuses: [...new Set(rows.map((r) => r.status))].filter(Boolean).sort(),
    },
  })
}

function dedupe(list: { id: string | null; name: string | null }[]) {
  const seen = new Map<string, string>()
  for (const l of list) if (l.id && !seen.has(l.id)) seen.set(l.id, l.name || l.id)
  return [...seen].map(([id, name]) => ({ id, name }))
}
function emptyFilters() {
  return { clients: [], capabilities: [], statuses: [] }
}
