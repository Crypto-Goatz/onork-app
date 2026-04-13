import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await db()
    .from('exec_ai_patterns')
    .select('*')
    .eq('onmcp_user_id', user.id)
    .eq('is_dismissed', false)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ patterns: data || [] })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, action } = await req.json()
  if (!id || !action) return NextResponse.json({ error: 'id and action required' }, { status: 400 })

  if (action === 'dismiss') {
    await db().from('exec_ai_patterns').update({ is_dismissed: true, dismissed_at: new Date().toISOString() }).eq('id', id).eq('onmcp_user_id', user.id)
  } else if (action === 'act') {
    await db().from('exec_ai_patterns').update({ is_acted_on: true, acted_on_at: new Date().toISOString() }).eq('id', id).eq('onmcp_user_id', user.id)
  }

  return NextResponse.json({ success: true })
}
