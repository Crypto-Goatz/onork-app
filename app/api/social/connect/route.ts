import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const OAUTH_PATHS: Record<string, string> = {
  google: '/social-media-posting/oauth/google/start',
  facebook: '/social-media-posting/oauth/facebook/start',
  instagram: '/social-media-posting/oauth/instagram/start',
  linkedin: '/social-media-posting/oauth/linkedin/start',
  twitter: '/social-media-posting/oauth/twitter/start',
  tiktok: '/social-media-posting/oauth/tiktok/start',
  tiktok_business: '/social-media-posting/oauth/tiktok-business/start',
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('crm_location_id').eq('id', user.id).single()
  const locationId = profile?.crm_location_id
  if (!locationId) return NextResponse.json({ error: 'No CRM location linked' }, { status: 400 })

  const { platform, reconnect } = await req.json()
  const oauthPath = OAUTH_PATHS[platform]
  if (!oauthPath) return NextResponse.json({ error: `Unknown platform: ${platform}` }, { status: 400 })

  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''
  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'

  const res = await fetch(`${CRM_API}${oauthPath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${pit}`, Version: CRM_VERSION, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locationId,
      userId: user.id,
      page: 'social-planner',
      reconnect: reconnect ? 'true' : 'false',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`[social/connect] ${platform} OAuth failed:`, res.status, err)
    return NextResponse.json({ error: 'OAuth initialization failed' }, { status: 502 })
  }

  const data = await res.json()
  return NextResponse.json({ url: data.url || data.authUrl || data.oauthUrl || data, platform })
}
