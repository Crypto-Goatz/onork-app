import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getIntegrationById } from '@/lib/install/registry'
import { getWalkthroughForIntegration } from '@/lib/install/walkthroughs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: { code: 'unauthorized' } }, { status: 401 })
  }

  let body: { integration_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'bad_json' } }, { status: 400 })
  }

  const integrationId = (body.integration_id || '').trim()
  const integration = getIntegrationById(integrationId)
  if (!integration) {
    return NextResponse.json({ ok: false, error: { code: 'unknown_integration' } }, { status: 400 })
  }

  const walkthrough = getWalkthroughForIntegration(integrationId)
  const totalSteps = walkthrough?.steps.length ?? 0

  const sb = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data, error } = await sb
    .from('user_installs')
    .upsert(
      {
        user_id: session.user.id,
        integration_id: integrationId,
        status: 'in_progress',
        current_step: 0,
        total_steps: totalSteps,
      },
      { onConflict: 'user_id,integration_id' },
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ ok: false, error: { code: 'db_error', message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ ok: true, install: data })
}
