import { NextRequest, NextResponse } from 'next/server'
import { sessionUserId } from '@/lib/auth/session-user'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const userId = await sessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 401 })
  }

  const { data: orders, error } = await supabase
    .from('freelancer_orders')
    .select('id, gig_id, platform_order_id, buyer_handle, status, ingested_at, fulfilled_at, crm_contact_id, crm_opportunity_id')
    .eq('user_id', userId)
    .order('ingested_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ orders })
}
