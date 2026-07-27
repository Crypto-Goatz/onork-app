// app/api/hub/inside/route.ts
// Serves the vault interior data (0n token + connected app count) — but ONLY to a
// session that has already passed the door (trusted device or VIP/admin). The
// token is never handed out before verification.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { hubTrustToken } from '@/lib/hub-gate'
import { generateProfileToken } from '@/lib/0n-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

export async function GET() {
  const supabase = await createServer()
  const { data: sess } = await supabase.auth.getSession()
  const user = sess.session?.user
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const sb = admin()
  const { data: p } = await sb.from('profiles').select('access_token, is_vip, is_admin').eq('id', user.id).single()

  // Gate: must be through the door (trusted device) or VIP/admin.
  const cookieStore = await cookies()
  const trusted = !!(p?.is_vip || p?.is_admin) || cookieStore.get('0n_trusted')?.value === hubTrustToken(user.id)
  if (!trusted) return NextResponse.json({ error: 'not_verified' }, { status: 403 })

  let token = p?.access_token as string | null
  if (!token) { try { token = await generateProfileToken(user.id) } catch { token = null } }

  const { data: rows } = await sb.from('user_vaults').select('service').eq('user_id', user.id)
  const connected = new Set((rows || []).map((r: { service: string }) => r.service).filter(Boolean)).size

  return NextResponse.json({ token, connected })
}
