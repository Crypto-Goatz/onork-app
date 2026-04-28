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
import { MARKETPLACE_APP, AGENCY_APP } from '@/lib/crm'
import { generateToken } from '@/lib/0n-token'
import { logHealth } from '@/lib/connection-health'
import { syncSnapshotToLocation } from '@/lib/snapshot-sync'

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
    return NextResponse.redirect(new URL('/crm?error=no_code', req.url))
  }

  try {
    // Try marketplace app first, then agency app
    // The OAuth code is tied to whichever app started the flow
    // CRM's /oauth/token REQUIRES user_type to return refresh_token:
    //   Location = sub-account install, Company = agency install
    const marketplaceSecret = MARKETPLACE_APP.clientSecret || process.env.CRM_MARKETPLACE_CLIENT_SECRET || ''
    const apps = [
      {
        name: 'marketplace',
        clientId: MARKETPLACE_APP.clientId,
        clientSecret: marketplaceSecret,
        redirectUri: MARKETPLACE_APP.redirectUri,
        appId: MARKETPLACE_APP.appId,
        userType: 'Location' as const,
      },
      {
        name: 'marketplace-alt',
        clientId: MARKETPLACE_APP.altClientId || '69c762225a31e1cd2f28dd4c-mnsa16jo',
        clientSecret: marketplaceSecret,
        redirectUri: MARKETPLACE_APP.redirectUri,
        appId: MARKETPLACE_APP.appId,
        userType: 'Location' as const,
      },
      {
        name: 'agency',
        clientId: AGENCY_APP.clientId,
        clientSecret: AGENCY_APP.clientSecret || process.env.CRM_AGENCY_CLIENT_SECRET || '',
        redirectUri: AGENCY_APP.redirectUri,
        appId: AGENCY_APP.appId,
        userType: 'Company' as const,
      },
    ]

    let tokenData: Record<string, unknown> | null = null
    let usedApp = apps[0]

    for (const app of apps) {
      if (!app.clientSecret) continue

      const tokenRes = await fetch(CRM_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          client_id: app.clientId,
          client_secret: app.clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: app.redirectUri,
          user_type: app.userType,
        }),
      })

      const data = await tokenRes.json()

      if (tokenRes.ok && data.access_token) {
        tokenData = data
        usedApp = app
        console.log(
          `[oauth/callback] Token exchanged via ${app.name} app (user_type=${app.userType}). ` +
          `Response keys: ${Object.keys(data).join(',')} | ` +
          `refresh_token: ${data.refresh_token ? 'PRESENT' : 'MISSING'} | ` +
          `locationId: ${data.locationId || 'none'} | companyId: ${data.companyId || 'none'}`
        )
        break
      }

      console.warn(`[oauth/callback] ${app.name} app token exchange failed:`, data.error || data.message || 'unknown')
    }

    if (!tokenData || !tokenData.access_token) {
      console.error('[oauth/callback] All token exchanges failed')
      return NextResponse.redirect(new URL('/crm?error=token_failed', req.url))
    }

    const access_token = tokenData.access_token as string
    const refresh_token = (tokenData.refresh_token || '') as string
    const token_type = (tokenData.token_type || 'Bearer') as string
    const expires_in = (tokenData.expires_in || 86400) as number
    const scope = (tokenData.scope || '') as string
    const locationId = (tokenData.locationId || '') as string
    const companyId = (tokenData.companyId || '') as string
    const crmUserId = (tokenData.userId || '') as string

    const admin = getAdmin()
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Preserve any existing refresh_token if the new exchange didn't return one.
    // CRM occasionally returns a token without refresh_token on re-auth — never let
    // that wipe a working one.
    let preservedRefresh = refresh_token
    if (!preservedRefresh && locationId) {
      const { data: existing } = await admin
        .from('crm_installations')
        .select('refresh_token')
        .eq('location_id', locationId)
        .eq('app_id', usedApp.appId)
        .maybeSingle()
      if (existing?.refresh_token) {
        preservedRefresh = existing.refresh_token
        console.warn(`[oauth/callback] CRM returned no refresh_token; preserving existing one for ${locationId}`)
      } else {
        console.error(`[oauth/callback] CRITICAL: No refresh_token from CRM and none on file for ${locationId}/${usedApp.appId}. Auto-refresh will fail.`)
      }
    }

    // Store installation linked to user
    const installPayload = {
      location_id: locationId,
      company_id: companyId || '',
      crm_user_id: crmUserId || '',
      app_id: usedApp.appId,
      access_token,
      refresh_token: preservedRefresh || '',
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
        user_type: usedApp.userType,
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

    // Deploy starter snapshot to the new location
    if (locationId && access_token) {
      try {
        const syncResult = await syncSnapshotToLocation(locationId, access_token, 0)
        console.log(`[oauth/callback] Snapshot sync v${syncResult.newVersion} for ${locationId}: ${syncResult.fieldsCreated} fields, ${syncResult.tagsCreated} tags, ${syncResult.pipelinesCreated} pipelines, ${syncResult.customValuesCreated} custom values`)
        if (syncResult.errors.length > 0) {
          console.warn('[oauth/callback] Snapshot sync partial errors:', syncResult.errors)
        }
      } catch (err) {
        console.error('[oauth/callback] Snapshot sync failed (non-blocking):', err)
      }
    }

    if (user) {
      // Update profile with CRM location
      await admin.from('profiles').update({
        crm_location_id: locationId,
      }).eq('id', user.id)

      // Generate persistent 0n token bound to (user, location). This is the
      // public credential used across every 0n surface — locationId = ID,
      // 0n token = secret. S3 router resolves to the right CRM credential
      // per call.
      const onToken = await generateToken({
        userId: user.id,
        locationId,
        name: 'Marketplace install',
        channel: 'crm',
        scopes: ['read', 'write', 'execute'],
        metadata: {
          company_id: companyId,
          installed_app: MARKETPLACE_APP.appId,
          source: 'oauth_callback',
        },
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
          app: usedApp.name,
          tokenGenerated: !!onToken,
        },
      })

      // Redirect to CRM dashboard with location context
      const dashUrl = new URL('/crm', req.url)
      dashUrl.searchParams.set('connected', 'true')
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

    const dashUrl = new URL('/crm', req.url)
    dashUrl.searchParams.set('connected', 'true')
    if (locationId) dashUrl.searchParams.set('locationId', locationId)
    return NextResponse.redirect(dashUrl)
  } catch (error) {
    console.error('[oauth/callback] Error:', error)
    return NextResponse.redirect(new URL('/crm?error=oauth_failed', req.url))
  }
}
