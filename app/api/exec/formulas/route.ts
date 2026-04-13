import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

export async function GET() {
  const { data } = await db().from('exec_formulas').select('*').or('is_template.eq.true,is_published.eq.true').order('created_at', { ascending: false })
  return NextResponse.json({ formulas: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await db().from('exec_formulas').insert({
    onmcp_user_id: user.id,
    name: body.name,
    description: body.description || '',
    category: body.category || 'custom',
    icon: body.icon || '⬡',
    formula_json: {
      numerator: body.numerator || [],
      denominator: body.denominator || [],
      normalize: true, clamp_min: 1, clamp_max: 100,
    },
    threshold_critical: body.threshold_critical || 40,
    threshold_review: body.threshold_review || 60,
    threshold_monitor: body.threshold_monitor || 80,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ formula: data })
}
