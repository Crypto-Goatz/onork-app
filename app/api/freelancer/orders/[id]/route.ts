import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: order } = await supabase
    .from('freelancer_orders')
    .select('*')
    .eq('id', id)
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Get delivery if exists
  const { data: delivery } = await supabase
    .from('freelancer_deliveries')
    .select('*')
    .eq('order_id', id)
    .single()

  return NextResponse.json({
    status: order.status,
    order,
    bundle: delivery ? {
      files: delivery.files,
      delivery_message: delivery.delivery_message,
      loom_script: delivery.loom_script,
      upsell_hint: delivery.upsell_hint,
    } : null,
  })
}
