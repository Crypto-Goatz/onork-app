/**
 * GET /api/sxo-indexer/runs?domain_id=...  - last 30 runs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getAdmin } from '@/lib/sxo-indexer'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const server = await createServerClient()
  const { data: { session } } = await server.auth.getSession()
  const user = session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const domainId = new URL(req.url).searchParams.get('domain_id')
  if (!domainId) return NextResponse.json({ error: 'domain_id required' }, { status: 400 })

  const admin = getAdmin()
  // Confirm ownership
  const { data: dom } = await admin
    .from('sxo_indexer_domains')
    .select('customer_id')
    .eq('id', domainId)
    .single()
  if (!dom) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: cust } = await admin
    .from('sxo_indexer_customers')
    .select('user_id')
    .eq('id', dom.customer_id)
    .single()
  if (!cust || cust.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: runs } = await admin
    .from('sxo_indexer_runs')
    .select('id, run_at, urls_extracted, status_code, status_text, ms_elapsed, error')
    .eq('domain_id', domainId)
    .order('run_at', { ascending: false })
    .limit(30)

  return NextResponse.json({ runs: runs || [] })
}
