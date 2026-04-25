import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { queue_id, action, rejection_reason, edited_text } = await req.json()

  if (!queue_id || !action) return NextResponse.json({ error: 'queue_id and action required' }, { status: 400 })

  const { data: item } = await admin.from('bot_queue').select('*').eq('id', queue_id).eq('user_id', user.id).single()
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'approve') {
    const updates: Record<string, unknown> = {
      status: 'approved',
      approved_at: new Date().toISOString(),
    }
    if (edited_text) updates.content_text = edited_text

    await admin.from('bot_queue').update(updates).eq('id', queue_id)
    return NextResponse.json({ status: 'approved', queue_id })
  }

  if (action === 'reject') {
    await admin.from('bot_queue').update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejection_reason: rejection_reason || 'Rejected by user',
    }).eq('id', queue_id)
    return NextResponse.json({ status: 'rejected', queue_id })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
