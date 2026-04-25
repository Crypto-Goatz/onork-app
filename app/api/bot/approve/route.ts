import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { schedulePost } from '@/lib/ghl/client'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { queue_item_id, scheduled_at, reject } = body

  // Load queue item (verify ownership)
  const { data: item, error: itemErr } = await admin
    .from('bot_queue')
    .select('*, bot_config(*)')
    .eq('id', queue_item_id)
    .eq('user_id', user.id)
    .single()

  if (itemErr || !item) {
    return NextResponse.json({ error: 'Queue item not found' }, { status: 404 })
  }

  if (item.status !== 'pending_approval') {
    return NextResponse.json({ error: `Item is already ${item.status}` }, { status: 400 })
  }

  // Reject path
  if (reject) {
    await admin.from('bot_queue').update({ status: 'rejected' }).eq('id', queue_item_id)
    return NextResponse.json({ success: true, status: 'rejected' })
  }

  const config = item.bot_config
  const postAt = scheduled_at ?? new Date(Date.now() + 5 * 60 * 1000).toISOString()

  try {
    // Send to CRM Social Planner
    const { postId } = await schedulePost({
      locationId: config.location_id,
      content: item.content,
      scheduledAt: postAt,
      accountIds: [config.linkedin_account_id].filter(Boolean),
    })

    await admin
      .from('bot_queue')
      .update({ status: 'scheduled', crm_post_id: postId, scheduled_at: postAt })
      .eq('id', queue_item_id)

    return NextResponse.json({ success: true, status: 'scheduled', crm_post_id: postId, scheduled_at: postAt })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'CRM scheduling failed'
    await admin
      .from('bot_queue')
      .update({ status: 'failed', error_msg: msg })
      .eq('id', queue_item_id)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
