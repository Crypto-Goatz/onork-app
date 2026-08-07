/**
 * GET /api/cron/refresh-tokens — Proactively refresh CRM OAuth tokens
 *
 * Runs on a Vercel cron schedule (every 6 hours).
 * Refreshes any CRM installation token expiring within the next 2 hours.
 * Logs health status for every refresh attempt.
 *
 * Auth: Vercel cron secret header
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logHealth } from '@/lib/connection-health'
import { credsForApp } from '@/lib/crm'

const CRM_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('authorization')
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdmin()
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

  const { data: expiring } = await admin
    .from('crm_installations')
    .select('id, location_id, access_token, refresh_token, expires_at, app_id')
    .eq('status', 'active')
    .eq('auto_reconnect', true)
    .lt('expires_at', twoHoursFromNow)

  if (!expiring || expiring.length === 0) {
    return NextResponse.json({ refreshed: 0, message: 'No tokens expiring soon' })
  }

  const results: { id: string; status: string; error?: string }[] = []

  for (const install of expiring) {
    if (!install.refresh_token) {
      results.push({ id: install.id, status: 'skipped', error: 'No refresh token' })
      continue
    }

    // Credentials + user_type are chosen from THIS install's issuing app. A
    // hardcoded marketplace client_id refreshes only legacy 69c762 tokens; App A
    // (6a7178a4) and the agency app each need their own client, and the CRM
    // requires the matching user_type to return a rotated token.
    const { clientId, clientSecret, userType } = credsForApp(install.app_id)
    if (!clientId || !clientSecret) {
      results.push({ id: install.id, status: 'skipped', error: `No creds for app ${install.app_id}` })
      continue
    }

    try {
      const res = await fetch(CRM_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: install.refresh_token,
          user_type: userType,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        await admin.from('crm_installations').update({
          health_status: 'degraded',
          consecutive_failures: (install as Record<string, unknown>).consecutive_failures
            ? ((install as Record<string, unknown>).consecutive_failures as number) + 1
            : 1,
        }).eq('id', install.id)

        await logHealth({
          connectionId: install.id,
          connectionType: 'crm',
          status: 'degraded',
          latencyMs: 0,
          error: `Refresh failed: ${res.status} ${text.slice(0, 200)}`,
        })

        results.push({ id: install.id, status: 'failed', error: `${res.status}` })
        continue
      }

      const data = await res.json()

      await admin.from('crm_installations').update({
        access_token: data.access_token,
        refresh_token: data.refresh_token || install.refresh_token,
        expires_at: new Date(Date.now() + (data.expires_in || 86400) * 1000).toISOString(),
        health_status: 'healthy',
        consecutive_failures: 0,
        last_health_check: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', install.id)

      await logHealth({
        connectionId: install.id,
        connectionType: 'crm',
        status: 'healthy',
        latencyMs: 0,
      })

      results.push({ id: install.id, status: 'refreshed' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      results.push({ id: install.id, status: 'error', error: msg })
    }
  }

  const refreshed = results.filter(r => r.status === 'refreshed').length
  const failed = results.filter(r => r.status === 'failed' || r.status === 'error').length

  return NextResponse.json({ refreshed, failed, total: expiring.length, results })
}
