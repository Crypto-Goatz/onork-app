/**
 * POST /api/bridge/grant — grant a 0nTask entitlement (internal, shared-secret).
 *
 * Used by the free "Command Lifetime (Beta)" upgrade in app.0ntask.com: the studio
 * verifies the Firebase user, then calls this with the account email to unlock the
 * Command tier + enroll them in the beta. Idempotent by email; never clobbers a
 * paid Founder's row (founder/seats columns are left untouched on update).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-bridge-secret') !== process.env.INTERNAL_DISPATCH_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const email = String(body.email || '').trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const now = new Date().toISOString()
  const sb = admin()

  // Respect the control-room toggle — beta grants can be paused from there.
  const { data: flag } = await sb.from('ontask_flags').select('enabled').eq('key', 'command_beta_grant').maybeSingle()
  if (flag && flag.enabled === false) {
    return NextResponse.json({ error: 'The free Command beta is currently closed.' }, { status: 403 })
  }
  const { error } = await sb.from('ontask_entitlements').upsert(
    {
      email,
      tier: 'command',
      status: 'lifetime',
      beta: true,
      seats: 3,
      source: 'beta-grant',
      beta_since: now,
      notify_email: email,
      updated_at: now,
    },
    { onConflict: 'email' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, tier: 'command', beta: true })
}
