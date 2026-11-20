import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uninstallApp, setInstallStatus } from '@/lib/0n-app/installer'
import { sessionUserId } from '@/lib/auth/session-user'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}


export async function GET(req: NextRequest) {
  const userId = await sessionUserId()
  if (!userId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('user_installed_apps')
    .select(`
      id, app_id, status, config_overrides, total_executions, last_executed_at, installed_at,
      marketplace_apps(id, slug, name, description, category, icon, version, vendor_name)
    `)
    .eq('user_id', userId)
    .order('installed_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ installations: data || [], count: data?.length || 0 })
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const userId = await sessionUserId()
    const appId = body.app_id
    const configOverrides = body.config_overrides
    const status = body.status

    if (!userId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
    if (!appId) return NextResponse.json({ error: 'app_id required' }, { status: 400 })

    const supabase = getSupabase()

    if (status && (status === 'active' || status === 'paused')) {
      const result = await setInstallStatus(userId, appId, status)
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
    }

    if (configOverrides && typeof configOverrides === 'object') {
      const { error } = await supabase
        .from('user_installed_apps')
        .update({ config_overrides: configOverrides })
        .eq('user_id', userId)
        .eq('app_id', appId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url)
  const userId = await sessionUserId()
  const appId = url.searchParams.get('app_id')

  if (!userId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  if (!appId) return NextResponse.json({ error: 'app_id required' }, { status: 400 })

  const result = await uninstallApp(userId, appId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ uninstalled: true })
}
