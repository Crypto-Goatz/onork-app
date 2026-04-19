/**
 * CRM OAuth Callback — handles marketplace app installations
 *
 * Flow:
 * 1. User installs 0nCore from CRM marketplace
 * 2. CRM redirects to https://0ncore.com/api/oauth/callback?code=XXX
 * 3. Exchange code for access_token + refresh_token
 * 4. Store tokens in crm_installations (linked to user)
 * 5. Generate persistent 0n token for cross-channel auth
 * 6. Update profile with crm_location_id
 * 7. Redirect to dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { MARKETPLACE_APP } from '@/lib/crm'
import { generateToken } from '@/lib/0n-token'
import { logHealth } from '@/lib/connection-health'

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
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Store installation linked to user
    const installPayload = {
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
      health_status: 'healthy',
      last_health_check: new Date().toISOString(),
      consecutive_failures: 0,
      user_id: user?.id || null,
      metadata: {
        installed_via: 'marketplace',
        installed_at: new Date().toISOString(),
        company_id: companyId,
        crm_user_id: crmUserId,
      },
    }

    const { data: installRow, error: installErr } = await admin
      .from('crm_installations')
      .upsert(installPayload, { onConflict: 'location_id,app_id' })
      .select('id')
      .single()

    if (installErr) console.error('[oauth/callback] Installation upsert error:', installErr)

    // Log initial health as healthy (we just got a fresh token)
    if (installRow?.id) {
      await logHealth({
        connectionId: installRow.id,
        connectionType: 'crm',
        status: 'healthy',
        latencyMs: 0,
      })
    }

    if (user) {
      // Update profile with CRM location
      await admin.from('profiles').update({
        crm_location_id: locationId,
      }).eq('id', user.id)

      // Generate persistent 0n token for this user
      const onToken = await generateToken(user.id, 'crm', ['read', 'write', 'execute'], {
        crm_location_id: locationId,
        company_id: companyId,
        installed_app: MARKETPLACE_APP.appId,
      }).catch(err => {
        console.error('[oauth/callback] Token generation failed:', err)
        return null
      })

      // Notify user
      await admin.from('dashboard_notifications').insert({
        user_id: user.id,
        type: 'success',
        title: 'CRM Connected',
        message: `0nCore marketplace app installed. Location: ${locationId}. Full API access enabled. Your 0n token has been generated for cross-channel access.`,
        metadata: {
          locationId,
          companyId,
          app: '0ncore-marketplace',
          tokenGenerated: !!onToken,
        },
      })

      // Redirect to dashboard with location context
      const dashUrl = new URL('/dashboard', req.url)
      dashUrl.searchParams.set('crm', 'connected')
      if (locationId) dashUrl.searchParams.set('locationId', locationId)

      if (onToken) {
        const response = NextResponse.redirect(dashUrl)
        response.cookies.set('0n_token_once', onToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 300,
          path: '/dashboard',
        })
        return response
      }
    }

    const dashUrl = new URL('/dashboard', req.url)
    dashUrl.searchParams.set('crm', 'connected')
    if (tokenData.locationId) dashUrl.searchParams.set('locationId', tokenData.locationId)
    return NextResponse.redirect(dashUrl)
  } catch (error) {
    console.error('[oauth/callback] Error:', error)
    return NextResponse.redirect(new URL('/dashboard?error=oauth_failed', req.url))
  }
}
