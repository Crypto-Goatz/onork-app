import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// CRM social OAuth start endpoints
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
  // Try session auth first, then Bearer token
  let userId: string | null = null

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token)
    userId = user?.id || null
  }

  // Fallback: cookie-based session auth
  if (!userId) {
    const { createClient: createServerClient } = await import('@/lib/supabase/server')
    const serverSupa = await createServerClient()
    const { data: { session } } = await serverSupa.auth.getSession()
  const sessionUser = session?.user ?? null
    userId = sessionUser?.id || null
  }

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('crm_location_id').eq('id', userId).single()
  const locationId = profile?.crm_location_id

  const { platform, reconnect } = await req.json()

  // Alias user for downstream code
  const user = { id: userId }

  // For platforms we support via direct OAuth (no CRM needed), redirect to our connect flow
  const DIRECT_OAUTH_PLATFORMS: Record<string, boolean> = { linkedin: true, facebook: true, google: true }
  if (!locationId && DIRECT_OAUTH_PLATFORMS[platform]) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
    return NextResponse.json({ url: `${baseUrl}/api/auth/connect/${platform}`, platform })
  }

  if (!locationId) {
    return NextResponse.json({ error: 'CRM not connected yet. Go to Settings → Connected Accounts to link Google, LinkedIn, or Facebook directly. For full social planner access, connect your CRM.' }, { status: 400 })
  }

  const oauthPath = OAUTH_PATHS[platform]
  if (!oauthPath) return NextResponse.json({ error: `Unknown platform: ${platform}` }, { status: 400 })

  // Check for installed OAuth token first (has social scopes)
  const { data: installation } = await supabase
    .from('crm_installations')
    .select('access_token, expires_at')
    .eq('location_id', locationId)
    .eq('status', 'active')
    .single()

  // Build token list — OAuth token first (has social scopes), then PITs as fallback
  const pitTokens = [
    installation?.access_token,
    process.env.CRM_PIT_RAW,
    process.env.CRM_PIT,
    process.env.CRM_AGENCY_PIT,
    process.env.CRM_AGENCY_PIT_NEW,
  ].filter(Boolean) as string[]

  let lastError = ''

  for (const pit of pitTokens) {
    try {
      // Try POST method first (newer API)
      const postRes = await fetch(`${CRM_API}${oauthPath}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pit}`,
          Version: CRM_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId,
          userId: user.id,
          page: 'social-planner',
          reconnect: reconnect ? 'true' : 'false',
        }),
      })

      if (postRes.ok) {
        const data = await postRes.json()
        const url = data.url || data.authUrl || data.oauthUrl || data.redirectUrl
        if (url) {
          return NextResponse.json({ url, platform })
        }
        // If no URL in response, return the raw data for debugging
        return NextResponse.json({ url: null, platform, raw: data, method: 'POST' })
      }

      const postErr = await postRes.text()
      lastError = `POST ${postRes.status}: ${postErr.slice(0, 200)}`

      // Try GET method with query params (older API)
      const getUrl = `${CRM_API}${oauthPath}?locationId=${locationId}&userId=${user.id}&page=social-planner${reconnect ? '&reconnect=true' : ''}`
      const getRes = await fetch(getUrl, {
        headers: {
          Authorization: `Bearer ${pit}`,
          Version: CRM_VERSION,
        },
      })

      if (getRes.ok) {
        const data = await getRes.json()
        const url = data.url || data.authUrl || data.oauthUrl || data.redirectUrl
        if (url) {
          return NextResponse.json({ url, platform })
        }
        return NextResponse.json({ url: null, platform, raw: data, method: 'GET' })
      }

      const getErr = await getRes.text()
      lastError = `GET ${getRes.status}: ${getErr.slice(0, 200)}`
    } catch (err) {
      lastError = `Error: ${err instanceof Error ? err.message : 'Unknown'}`
    }
  }

  console.error(`[social/connect] All PIT tokens failed for ${platform}:`, lastError)
  return NextResponse.json({
    error: `Social connect failed for ${platform}. The CRM social OAuth requires the platform to be configured in your CRM location settings first. Go to your CRM → Social Planner → Connect Account.`,
    debug: lastError,
  }, { status: 502 })
}
