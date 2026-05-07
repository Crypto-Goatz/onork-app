import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

export async function GET() {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await db().from('exec_orbits').select('*, exec_formulas(id, name, icon)').eq('onmcp_user_id', user.id).order('sort_order')
  return NextResponse.json({ orbits: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await db().from('exec_orbits').insert({
    onmcp_user_id: user.id,
    name: body.name, description: body.description || '',
    color: body.color || '#6EE05A', icon: body.icon || '⬡',
    formula_id: body.formula_id || null,
    stages: body.stages || '["New","In Progress","Review","Complete"]',
    crm_pipeline_id: body.crm_pipeline_id || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orbit: data })
}
