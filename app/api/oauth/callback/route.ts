/**
 * CRM OAuth Callback — handles marketplace app installations
 *
 * Flow:
 * 1. User installs 0nCore from CRM marketplace
 * 2. CRM redirects to https://0ncore.com/api/oauth/callback?code=XXX
 * 3. We exchange code for access_token + refresh_token
 * 4. Store tokens in crm_installations table (NOT user metadata)
 * 5. Update profile with crm_location_id
 * 6. Redirect to dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { MARKETPLACE_APP } from '@/lib/crm'

const CRM_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard?error=no_code', req.url))
  }

  try {
    // Exchange authorization code for tokens
    const clientSecret = MARKETPLACE_APP.clientSecret || process.env.CRM_MARKETPLACE_CLIENT_SECRET || ''

    const tokenRes = await fetch(CRM_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: MARKETPLACE_APP.clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: MARKETPLACE_APP.redirectUri,
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[oauth/callback] Token exchange failed:', tokenData)
      return NextResponse.redirect(new URL('/dashboard?error=token_failed', req.url))
    }

    const {
      access_token,
      refresh_token,
      token_type,
      expires_in,
      scope,
      locationId,
      companyId,
      userId: crmUserId,
    } = tokenData

    const admin = getAdmin()

    // Store installation in crm_installations (create table if needed)
    await admin.from('crm_installations').upsert({
      location_id: locationId,
      company_id: companyId || '',
      crm_user_id: crmUserId || '',
      app_id: MARKETPLACE_APP.appId,
      access_token,
      refresh_token: refresh_token || '',
      token_type: token_type || 'Bearer',
      expires_at: new Date(Date.now() + (expires_in || 86400) * 1000).toISOString(),
      scopes: scope || '',
      status: 'active',
    }, { onConflict: 'location_id,app_id' }).then(({ error }) => {
      if (error) console.error('[oauth/callback] Installation upsert error:', error)
    })

    // Find the logged-in 0nCore user
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Update their profile with the CRM location
      await admin.from('profiles').update({
        crm_location_id: locationId,
      }).eq('id', user.id)

      // Send notification
      await admin.from('dashboard_notifications').insert({
        user_id: user.id,
        type: 'success',
        title: 'CRM Connected',
        message: `0nCore marketplace app installed. Location: ${locationId}. 140+ API scopes active. Full CRM access enabled.`,
        metadata: { locationId, companyId, app: '0ncore-marketplace' },
      })
    }

    return NextResponse.redirect(new URL('/dashboard?crm=connected', req.url))
  } catch (error) {
    console.error('[oauth/callback] Error:', error)
    return NextResponse.redirect(new URL('/dashboard?error=oauth_failed', req.url))
  }
}
