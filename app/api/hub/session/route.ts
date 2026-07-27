// app/api/hub/session/route.ts
// The vault door's brain, on 0ncore.com. Reads the 0ncore session (cookie-only,
// per auth rules), returns first name + whether THIS device is trusted, and — if
// not — a logical IKY challenge drawn from the user's own profile. VIP/admin bypass.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { hubTrustToken, buildChallenge } from '@/lib/hub-gate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

export async function GET() {
  const supabase = await createServer()
  const { data: sess } = await supabase.auth.getSession()
  const user = sess.session?.user
  if (!user) return NextResponse.json({ authed: false })

  const sb = admin()
  const { data: p } = await sb
    .from('profiles')
    .select('full_name, display_name, username, company, business_name, business_type, website, is_vip, is_admin')
    .eq('id', user.id)
    .single()

  const full = p?.full_name || p?.display_name || p?.username || (user.email || '').split('@')[0] || 'there'
  const firstName = String(full).trim().split(/\s+/)[0]

  const bypass = !!(p?.is_vip || p?.is_admin)
  const cookieStore = await cookies()
  const trusted = bypass || cookieStore.get('0n_trusted')?.value === hubTrustToken(user.id)

  let challenge: { id: string; question: string } | null = null
  if (!trusted) {
    const { data: rows } = await sb.from('user_vaults').select('service').eq('user_id', user.id)
    const services = Array.from(new Set((rows || []).map((r: { service: string }) => r.service).filter(Boolean)))
    challenge = buildChallenge(p || {}, services, user.email || '')
  }

  return NextResponse.json({ authed: true, firstName, deviceKnown: trusted, challenge })
}
