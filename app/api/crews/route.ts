import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('crews')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at')

  return Response.json({ crews: data || [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, role, description, avatar_color, k_layers, tools } = await req.json()
  if (!name) return Response.json({ error: 'name required' }, { status: 400 })

  const { data, error } = await supabase.from('crews').insert({
    user_id: user.id,
    name,
    role: role || 'general',
    description: description || '',
    avatar_color: avatar_color || '#6EE05A',
    k_layers: k_layers || ['K1'],
    tools: tools || [],
    status: 'active',
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ crew: data })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...updates } = await req.json()
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('crews')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  await supabase.from('crews')
    .update({ status: 'archived' })
    .eq('id', id)
    .eq('user_id', user.id)

  return Response.json({ ok: true })
}
