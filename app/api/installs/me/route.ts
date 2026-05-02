import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return NextResponse.json({ ok: false, error: { code: 'unauthorized' } }, { status: 401 })

  const sb = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data, error } = await sb
    .from('user_installs')
    .select('integration_id,status,current_step,total_steps,config,last_error,installed_at,updated_at')
    .eq('user_id', session.user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: { code: 'db_error', message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ ok: true, installs: data ?? [] })
}
