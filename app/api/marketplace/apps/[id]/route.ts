import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getSupabase()

  const isUuid = /^[0-9a-f]{8}-/.test(id)
  const appQuery = supabase.from('marketplace_apps').select('*').eq('status', 'active')
  const { data: app, error } = isUuid
    ? await appQuery.eq('id', id).single()
    : await appQuery.eq('slug', id).single()

  if (error || !app) {
    return NextResponse.json({ error: 'App not found' }, { status: 404 })
  }

  const { data: reviews } = await supabase
    .from('marketplace_reviews')
    .select('id, user_id, rating, title, body, created_at')
    .eq('app_id', app.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ app, reviews: reviews || [] })
}
