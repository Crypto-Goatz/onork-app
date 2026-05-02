import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getWalkthroughForIntegration } from '@/lib/install/walkthroughs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: { code: 'unauthorized' } }, { status: 401 })
  }

  let body: { integration_id?: string; step_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'bad_json' } }, { status: 400 })
  }

  const integrationId = body.integration_id || ''
  const stepId = body.step_id || ''
  const walkthrough = getWalkthroughForIntegration(integrationId)
  if (!walkthrough) {
    return NextResponse.json({ ok: false, error: { code: 'unknown_integration' } }, { status: 400 })
  }

  const stepIndex = walkthrough.steps.findIndex((s) => s.id === stepId)
  if (stepIndex < 0) {
    return NextResponse.json({ ok: false, error: { code: 'unknown_step' } }, { status: 400 })
  }

  const totalSteps = walkthrough.steps.length
  const newStep = stepIndex + 1
  const installed = newStep >= totalSteps

  const sb = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const update: Record<string, unknown> = {
    user_id: session.user.id,
    integration_id: integrationId,
    current_step: newStep,
    total_steps: totalSteps,
    status: installed ? 'installed' : 'in_progress',
  }
  if (installed) update.installed_at = new Date().toISOString()

  const { data, error } = await sb
    .from('user_installs')
    .upsert(update, { onConflict: 'user_id,integration_id' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ ok: false, error: { code: 'db_error', message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ ok: true, install: data, completed: installed })
}
