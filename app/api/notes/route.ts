import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/notes — Load canvas
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', `canvas_${user.id}`)
    .single()

  return NextResponse.json({ blocks: data?.value?.blocks || [] })
}

// POST /api/notes — Save canvas
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { blocks } = await req.json()

  await supabase
    .from('app_config')
    .upsert({
      key: `canvas_${user.id}`,
      value: { blocks, updated: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' })

  return NextResponse.json({ success: true })
}
