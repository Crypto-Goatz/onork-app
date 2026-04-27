import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseOnApp } from '@/lib/0n-app/parser'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const userId = body.user_id || req.headers.get('x-user-id')
    const appConfig = body.app_config
    const metadata = body.metadata || {}
    const screenshots = body.screenshots || []
    const demoUrl = body.demo_url
    const priceCents = Number(body.price_cents || 0)
    const priceType = body.price_type || 'one_time'
    const isUpdate = Boolean(body.app_id)

    if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 401 })
    if (!appConfig) return NextResponse.json({ error: 'app_config (.0n manifest) required' }, { status: 400 })

    const parsed = parseOnApp(appConfig)
    if (!parsed.ok || !parsed.app) {
      return NextResponse.json({ error: 'Invalid .0n app', details: parsed.errors }, { status: 400 })
    }

    const manifest = parsed.app
    const supabase = getSupabase()

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, company, is_admin, is_vip')
      .eq('id', userId)
      .single()

    const isVip = Boolean(profile?.is_admin || profile?.is_vip)
    const vendorName = metadata.vendor_name || profile?.company || profile?.full_name || 'Vendor'

    const row = {
      name: manifest.name,
      slug: manifest.slug,
      description: manifest.description,
      long_description: metadata.long_description || null,
      category: manifest.category,
      tags: manifest.tags || [],
      version: manifest.version || '1.0.0',
      vendor_id: userId,
      vendor_name: vendorName,
      vendor_verified: isVip,
      app_config: manifest,
      required_services: manifest.required_services || [],
      required_plan: manifest.required_plan || 'starter',
      price_cents: priceCents,
      price_type: priceType,
      icon: manifest.icon || null,
      screenshots,
      demo_url: demoUrl || null,
      review_status: isVip ? 'approved' : 'pending',
      status: isVip ? 'active' : 'draft',
      updated_at: new Date().toISOString(),
    }

    if (isUpdate) {
      const { data, error } = await supabase
        .from('marketplace_apps')
        .update(row)
        .eq('id', body.app_id)
        .eq('vendor_id', userId)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ updated: true, app: data })
    }

    const { data, error } = await supabase
      .from('marketplace_apps')
      .insert(row)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ published: true, app: data, status: row.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Publish error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
