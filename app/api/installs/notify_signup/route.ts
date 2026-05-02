import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getIntegrationById } from '@/lib/install/registry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  let body: { email?: string; integration_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'bad_json' } }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  const integrationId = (body.integration_id || '').trim()

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: { code: 'bad_email' } }, { status: 400 })
  }
  if (!getIntegrationById(integrationId)) {
    return NextResponse.json({ ok: false, error: { code: 'unknown_integration' } }, { status: 400 })
  }

  // If signed in, attach user_id; otherwise leave null and we'll match on email later.
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id ?? null

  const sb = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { error } = await sb
    .from('install_notify')
    .upsert(
      {
        email,
        integration_id: integrationId,
        source: 'install_hub',
        user_id: userId,
      },
      { onConflict: 'email,integration_id', ignoreDuplicates: true },
    )

  if (error) {
    return NextResponse.json({ ok: false, error: { code: 'db_error', message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
