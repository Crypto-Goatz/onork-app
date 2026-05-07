/**
 * GET/POST /api/addons/[slug]/config — Read/save add-on configuration.
 * Generic for ALL add-ons. Config schema defined in lib/addon-registry.ts.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getAddonConfigSchema } from '@/lib/addon-registry'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schema = getAddonConfigSchema(slug)
  if (!schema.length) {
    return NextResponse.json({ error: `Unknown add-on: ${slug}` }, { status: 404 })
  }

  const { data } = await admin
    .from('addon_configs')
    .select('*')
    .eq('user_id', user.id)
    .eq('addon_slug', slug)
    .single()

  return NextResponse.json({
    config: data?.config || {},
    enabled: data?.enabled ?? false,
    schedule: data?.schedule || 'daily',
    lastRunAt: data?.last_run_at,
    runCount: data?.run_count || 0,
    lastResult: data?.last_result,
    schema,
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { config, enabled, schedule } = body

  const { data, error } = await admin
    .from('addon_configs')
    .upsert(
      {
        user_id: user.id,
        addon_slug: slug,
        config: config || {},
        enabled: enabled ?? true,
        schedule: schedule || 'daily',
      },
      { onConflict: 'user_id,addon_slug' },
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ config: data })
}
