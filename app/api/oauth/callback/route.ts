import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/crm-oauth'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  }

  try {
    const tokens = await exchangeCodeForTokens(code)

    // tokens contains: access_token, refresh_token, locationId, companyId, userId
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Store OAuth tokens and location in user metadata
      await supabase.auth.updateUser({
        data: {
          crm_access_token: tokens.access_token,
          crm_refresh_token: tokens.refresh_token,
          crm_location_id: tokens.locationId,
          crm_company_id: tokens.companyId,
          crm_user_id: tokens.userId,
          active_location_id: tokens.locationId,
        }
      })
    }

    return NextResponse.redirect(new URL('/dashboard?oauth=success', req.url))
  } catch (err) {
    console.error('[oauth] Callback failed:', err)
    return NextResponse.redirect(new URL('/dashboard?oauth=error', req.url))
  }
}
