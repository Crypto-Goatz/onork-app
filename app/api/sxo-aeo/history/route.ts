import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET() {
  const cookieStore = await cookies()
  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  )
  const { data: { session } } = await supa.auth.getSession()
  const userId = session?.user?.id

  let query = admin
    .from('sxo_aeo_scans')
    .select('id, url, domain, page_title, sxo_score, aeo_score, combined_score, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (userId) query = query.eq('user_id', userId)
  else query = query.is('user_id', null).limit(10) // anonymous: show recent shared

  const { data, error } = await query
  if (error) return NextResponse.json({ scans: [], error: error.message }, { status: 200 })
  return NextResponse.json({ scans: data || [] })
}
