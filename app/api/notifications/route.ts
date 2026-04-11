import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('dashboard_notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const unread = (data || []).filter(n => !n.read).length

  return Response.json({ notifications: data || [], unread })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, read } = await req.json()

  if (id === 'all') {
    await supabase
      .from('dashboard_notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
  } else if (id) {
    await supabase
      .from('dashboard_notifications')
      .update({ read: read ?? true })
      .eq('id', id)
      .eq('user_id', user.id)
  }

  return Response.json({ ok: true })
}
