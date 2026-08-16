/**
 * POST /api/sxo-indexer/verify  { domain_id }
 * Checks that /public/{KEY}.txt is reachable on the customer's domain and matches.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getAdmin, verifyKeyFile } from '@/lib/sxo-indexer'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const server = await createServerClient()
  const { data: { session } } = await server.auth.getSession()
  const user = session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { domain_id } = await req.json().catch(() => ({}))
  if (!domain_id) return NextResponse.json({ error: 'domain_id required' }, { status: 400 })

  const admin = getAdmin()
  const { data: dom } = await admin
    .from('sxo_indexer_domains')
    .select('id, host, customer_id')
    .eq('id', domain_id)
    .single()
  if (!dom) return NextResponse.json({ error: 'Domain not found' }, { status: 404 })

  const { data: cust } = await admin
    .from('sxo_indexer_customers')
    .select('user_id, indexnow_key')
    .eq('id', dom.customer_id)
    .single()
  if (!cust || cust.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ok = await verifyKeyFile(dom.host, cust.indexnow_key)
  await admin
    .from('sxo_indexer_domains')
    .update({
      verified: ok,
      verified_at: ok ? new Date().toISOString() : null,
      status: ok ? 'verified' : 'failed',
      next_run_at: ok ? new Date(Date.now() + 60 * 1000).toISOString() : null,
    })
    .eq('id', dom.id)

  return NextResponse.json({
    verified: ok,
    expected_url: `https://${dom.host}/${cust.indexnow_key}.txt`,
    expected_content: cust.indexnow_key,
    message: ok
      ? 'Verified — first submission scheduled within 1 minute'
      : 'File not reachable or content mismatch — re-check that the file is deployed and contains exactly the key',
  })
}
