/**
 * GET /api/conversation-ai/logs — recent Jaxx interactions for the user's location.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .maybeSingle()

  const locationId = req.nextUrl.searchParams.get('locationId') || profile?.crm_location_id
  if (!locationId) return NextResponse.json({ logs: [] })

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 200)

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await admin
    .from('conversation_ai_logs')
    .select(
      'id, conversation_id, contact_id, surface, trust_score, iky_triggered, iky_outcome, inbound_message, ai_response_redacted, tool_calls, required_confirmation, latency_ms, status, responded_at'
    )
    .eq('location_id', locationId)
    .order('responded_at', { ascending: false })
    .limit(limit)

  return NextResponse.json({ logs: data ?? [] })
}
