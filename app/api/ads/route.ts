import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('crm_location_id').eq('id', user.id).single()
  const locationId = profile?.crm_location_id
  if (!locationId) return NextResponse.json({ accounts: [], adData: null })

  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''
  const headers = { Authorization: `Bearer ${pit}`, Version: CRM_VERSION }

  // Fetch social accounts (includes ad platform connections)
  let accounts: any[] = []
  try {
    const res = await fetch(`${CRM_API}/social-media-posting/${locationId}/accounts`, { headers })
    if (res.ok) {
      const data = await res.json()
      accounts = data.accounts || data || []
    }
  } catch {
    // Silent fail — accounts will be empty
  }

  // Fetch Google Ads reporting if available
  let googleAds = null
  try {
    const res = await fetch(`${CRM_API}/reporting/google-ads?locationId=${locationId}`, { headers })
    if (res.ok) {
      googleAds = await res.json()
    }
  } catch {
    // Google Ads reporting not available
  }

  // Fetch Facebook Ads reporting if available
  let facebookAds = null
  try {
    const res = await fetch(`${CRM_API}/reporting/facebook-ads?locationId=${locationId}`, { headers })
    if (res.ok) {
      facebookAds = await res.json()
    }
  } catch {
    // Facebook Ads reporting not available
  }

  // Fetch attribution reporting (covers all ad sources)
  let attribution = null
  try {
    const res = await fetch(`${CRM_API}/reporting/attribution?locationId=${locationId}`, { headers })
    if (res.ok) {
      attribution = await res.json()
    }
  } catch {
    // Attribution reporting not available
  }

  // Categorize accounts by platform type
  const adAccounts = accounts.filter((a: any) => {
    const type = (a.type || a.platform || '').toLowerCase()
    return ['google', 'facebook', 'instagram', 'tiktok', 'linkedin', 'meta'].some(p => type.includes(p))
  })

  return NextResponse.json({
    accounts: adAccounts,
    allAccounts: accounts,
    googleAds,
    facebookAds,
    attribution,
    locationId,
  })
}
