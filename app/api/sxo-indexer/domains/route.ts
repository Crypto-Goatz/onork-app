/**
 * POST   /api/sxo-indexer/domains            - add a domain (host required)
 * DELETE /api/sxo-indexer/domains?id=...     - remove a domain
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getAdmin } from '@/lib/sxo-indexer'

export const dynamic = 'force-dynamic'

async function getUser() {
  const server = await createServerClient()
  const { data: { user } } = await server.auth.getUser()
  return user
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const rawHost = (body.host as string | undefined) || ''
  const host = rawHost.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim()
  if (!host || !host.includes('.')) {
    return NextResponse.json({ error: 'Valid host required (e.g. example.com)' }, { status: 400 })
  }

  const admin = getAdmin()
  const { data: cust } = await admin
    .from('sxo_indexer_customers')
    .select('id, domain_cap')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!cust) return NextResponse.json({ error: 'Activate the add-on first' }, { status: 400 })

  const { count } = await admin
    .from('sxo_indexer_domains')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', cust.id)
  if ((count || 0) >= cust.domain_cap) {
    return NextResponse.json({ error: `Plan limit: ${cust.domain_cap} domain(s)` }, { status: 403 })
  }

  const { data, error } = await admin
    .from('sxo_indexer_domains')
    .insert({ customer_id: cust.id, host, status: 'pending' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ domain: data })
}

export async function DELETE(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = getAdmin()
  const { data: cust } = await admin
    .from('sxo_indexer_customers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!cust) return NextResponse.json({ error: 'No customer record' }, { status: 404 })

  await admin
    .from('sxo_indexer_domains')
    .delete()
    .eq('id', id)
    .eq('customer_id', cust.id)

  return NextResponse.json({ ok: true })
}
