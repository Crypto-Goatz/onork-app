import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const orderId = url.searchParams.get('order_id')
  const sessionId = url.searchParams.get('session_id')
  const buyerEmail = url.searchParams.get('buyer_email')
  const buyerUserId = url.searchParams.get('buyer_user_id')

  if (!orderId && !sessionId && !buyerEmail && !buyerUserId) {
    return NextResponse.json({
      error: 'order_id, session_id, buyer_email, or buyer_user_id required',
    }, { status: 400 })
  }

  const supabase = getSupabase()

  if (orderId) {
    const { data, error } = await supabase
      .from('ucp_orders')
      .select('*, ucp_products(slug, name, fulfillment_type, price_cents)')
      .eq('id', orderId)
      .single()
    if (error || !data) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    return NextResponse.json({ order: data })
  }

  if (sessionId) {
    const { data, error } = await supabase
      .from('ucp_orders')
      .select('*, ucp_products(slug, name, fulfillment_type, price_cents)')
      .eq('stripe_session_id', sessionId)
      .single()
    if (error || !data) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    return NextResponse.json({ order: data })
  }

  let query = supabase
    .from('ucp_orders')
    .select('id, product_id, buyer_email, buyer_name, amount_cents, currency, status, deliverable, created_at, fulfilled_at, ucp_products(slug, name, fulfillment_type)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (buyerUserId) query = query.eq('buyer_user_id', buyerUserId)
  if (buyerEmail) query = query.eq('buyer_email', buyerEmail)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    orders: data || [],
    count: data?.length || 0,
  }, { headers: { 'Access-Control-Allow-Origin': '*' } })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
