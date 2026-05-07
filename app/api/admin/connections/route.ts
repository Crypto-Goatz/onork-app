import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/connections — Load connection link configs
 * POST /api/admin/connections — Save connection link configs
 *
 * Admin-only. Stores default URLs and affiliate URLs per service.
 * The /dashboard/connections page reads these to override hardcoded links.
 */

const ADMIN_EMAIL = 'mike@rocketopp.com'

// GET — Load all connection configs
export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin && user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  // Try to load from Supabase
  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'connection_links')
    .single()

  return NextResponse.json({ config: data?.value || {} })
}

// POST — Save connection configs
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin && user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  const { config } = await req.json()

  // Upsert into app_config table
  const { error } = await supabase
    .from('app_config')
    .upsert({
      key: 'connection_links',
      value: config,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' })

  if (error) {
    // Table might not exist yet — try creating it
    return NextResponse.json({ error: error.message, hint: 'app_config table may need to be created' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
