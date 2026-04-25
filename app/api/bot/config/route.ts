import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: config } = await admin.from('bot_config').select('*').eq('user_id', user.id).single()

  // Also get queue stats
  const { data: queue } = await admin.from('bot_queue').select('id, status, content_type, vpis_score, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)

  const stats = {
    pending: queue?.filter(q => q.status === 'pending_approval').length || 0,
    approved: queue?.filter(q => q.status === 'approved').length || 0,
    posted: queue?.filter(q => q.status === 'posted').length || 0,
    rejected: queue?.filter(q => q.status === 'rejected').length || 0,
    avgScore: queue?.length ? Math.round(queue.reduce((s, q) => s + (Number(q.vpis_score) || 0), 0) / queue.length) : 0,
  }

  return NextResponse.json({ config: config || null, queue: queue || [], stats })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await admin.from('bot_config').upsert({
    user_id: user.id,
    ...body,
  }, { onConflict: 'user_id' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}
