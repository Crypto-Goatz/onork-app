import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { executeApp, ExecutionContext } from '@/lib/0n-app/executor'
import { OnAppManifest } from '@/lib/0n-app/parser'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ appId: string }> }) {
  try {
    const { appId } = await params
    const body = await req.json().catch(() => ({}))
    const userId = body.user_id || req.headers.get('x-user-id')
    const triggerData = body.trigger || {}
    const variables = body.variables || {}

    if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 401 })

    const supabase = getSupabase()

    const isUuid = /^[0-9a-f]{8}-/.test(appId)
    const baseQuery = supabase.from('marketplace_apps').select('*')
    const { data: app, error: appErr } = isUuid
      ? await baseQuery.eq('id', appId).single()
      : await baseQuery.eq('slug', appId).single()

    if (appErr || !app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 })
    }

    const { data: install, error: installErr } = await supabase
      .from('user_installed_apps')
      .select('id, config_overrides, status')
      .eq('user_id', userId)
      .eq('app_id', app.id)
      .single()

    if (installErr || !install) {
      return NextResponse.json({ error: 'App not installed for this user' }, { status: 403 })
    }

    if (install.status !== 'active') {
      return NextResponse.json({ error: `Install status is ${install.status}` }, { status: 403 })
    }

    const manifest = app.app_config as OnAppManifest
    const config = (install.config_overrides as Record<string, unknown>) || {}

    const context: ExecutionContext = {
      userId,
      installationId: install.id,
      appSlug: app.slug,
      trigger: triggerData,
      outputs: {},
      variables,
      config,
    }

    const result = await executeApp(manifest, context)

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Execute error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
