import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processOrder } from '@/lib/freelancer/engine'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { gig_id, platform_order_id, buyer_handle, buyer_brief_raw, user_id } = body

    if (!gig_id || !buyer_brief_raw || buyer_brief_raw.length < 10) {
      return NextResponse.json({ error: 'gig_id and buyer_brief_raw (min 10 chars) required' }, { status: 400 })
    }

    // Resolve user — from body or auth header
    const resolvedUserId = user_id || req.headers.get('x-user-id')
    if (!resolvedUserId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 401 })
    }

    // Insert order
    const { data: order, error } = await supabase
      .from('freelancer_orders')
      .insert({
        user_id: resolvedUserId,
        gig_id,
        platform_order_id: platform_order_id || null,
        buyer_handle: buyer_handle || null,
        buyer_brief_raw,
        status: 'received',
      })
      .select('id')
      .single()

    if (error) {
      console.error('[freelancer/ingest] Insert error:', error)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Fire-and-forget fulfillment
    processOrder(order.id).catch(err => {
      console.error('[freelancer/ingest] processOrder failed:', err)
      supabase.from('freelancer_orders').update({ status: 'failed' }).eq('id', order.id)
    })

    return NextResponse.json({ ok: true, order_id: order.id })
  } catch (err) {
    console.error('[freelancer/ingest] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
