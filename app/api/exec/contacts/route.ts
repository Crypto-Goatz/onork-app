import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { scoreContact } from '@/lib/exec/formula-runtime'

function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orbitId = req.nextUrl.searchParams.get('orbit_id')
  let query = db().from('exec_contacts').select('*').eq('onmcp_user_id', user.id)
  if (orbitId) query = query.eq('orbit_id', orbitId)
  const { data } = await query.order('current_score', { ascending: false })
  return NextResponse.json({ contacts: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.orbit_id || !body.name || !body.stage) {
    return NextResponse.json({ error: 'orbit_id, name, and stage required' }, { status: 400 })
  }

  const initials = body.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  const { data, error } = await db().from('exec_contacts').insert({
    orbit_id: body.orbit_id,
    onmcp_user_id: user.id,
    name: body.name, company: body.company || '', email: body.email || '',
    phone: body.phone || '', avatar_initials: initials,
    crm_contact_id: body.crm_contact_id || null,
    stage: body.stage, assigned_to: body.assigned_to || '',
    variable_values: body.variable_values || {},
    deal_value: body.deal_value || '', deal_value_cents: body.deal_value_cents || 0,
    notes: body.notes || '', tags: body.tags || [],
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (data) await scoreContact(data.id).catch(() => {})

  return NextResponse.json({ contact: data })
}
