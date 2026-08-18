/**
 * GET /api/cron/refresh-tokens — Proactively refresh CRM OAuth tokens
 *
 * Runs on a Vercel cron schedule (every 6 hours).
 * Refreshes any CRM installation token expiring within the next 12 hours.
 *
 * THE WINDOW MUST EXCEED THE CADENCE, and it did not. This ran every 6 hours
 * and renewed only what expired within 2 — so a token expiring 5 hours after a
 * run was skipped, and by the next run it had been dead for an hour. Any expiry
 * landing in that 4-hour blind spot died, every cycle, and the row looked like
 * a customer problem rather than a scheduling one.
 *
 * 12 hours gives two full runs of margin before anything can expire. With a
 * 24-hour token life that is generous on purpose: a refresh that runs early
 * costs one API call, and one that runs late costs a reinstall.
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
  // Two full cron cycles of margin. See the note at the top of this file for
  // why anything shorter than the cadence guarantees misses.
  const renewBefore = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()

  const { data: expiring } = await admin
    .from('crm_installations')
    .select('id, location_id, access_token, refresh_token, expires_at, app_id, metadata')
    .eq('status', 'active')
    .eq('auto_reconnect', true)
    .lt('expires_at', renewBefore)

  if (!expiring || expiring.length === 0) {
    return NextResponse.json({ refreshed: 0, message: 'No tokens expiring soon' })
  }

  const results: { id: string; status: string; error?: string }[] = []

  for (const install of expiring) {
    if (!install.refresh_token) {
      // SKIPPING IS NOT SILENCE. 27 rows sat here holding health_status
      // 'healthy' — written once by an older callback that assumed a successful
      // exchange meant a healthy install — and were never touched again,
      // because the only code that writes health is the code that ATTEMPTS a
      // refresh, and these are skipped before that. So the rows that could
      // never recover were the ones advertising themselves as fine, while the
      // three that were merely revoked read as 'degraded'. Anyone triaging by
      // this column would have started at exactly the wrong end.
      //
      // An install with no refresh token cannot be recovered by any amount of
      // retrying. Say so, on the row, every time we pass it.
      await admin.from('crm_installations').update({
        health_status: 'unrecoverable',
        last_health_check: new Date().toISOString(),
        metadata: {
          ...((install as { metadata?: Record<string, unknown> }).metadata || {}),
          last_refresh_error: 'No refresh token on file — only a reinstall can restore this install.',
        },
      }).eq('id', install.id)

      results.push({ id: install.id, status: 'skipped', error: 'No refresh token' })
      continue
    }

    // Credentials + user_type are chosen from THIS install's issuing app. A
    // hardcoded marketplace client_id refreshes only legacy 69c762 tokens; App A
    // (6a7178a4) and the agency app each need their own client, and the CRM
    // requires the matching user_type to return a rotated token.
    const { clientId, clientSecret, userType: configuredType } = credsForApp(install.app_id)
    // The user_type the ORIGINAL exchange actually used, recorded on the install
    // by the callback. It wins over the app's configured value: Location and
    // Company are not interchangeable, and refreshing with the wrong one is
    // rejected in a way that reads as a bad credential rather than a mismatch.
    const meta = (install as { metadata?: Record<string, unknown> }).metadata
    const userType = (typeof meta?.user_type === 'string' && meta.user_type) || configuredType
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

        // THE STATUS CODE ALONE COST DAYS. This recorded `error: '401'` and
        // dropped the body, so one number stood in for four different causes —
        // wrong secret, wrong client for the token, wrong user_type, and a
        // token the CRM has revoked. They need four different responses, and
        // three of them are code changes while the fourth needs a human to
        // reinstall. Reading the body separates them in one call:
        //
        //   "Invalid client credentials!"  with a VALID secret ⇒ REVOKED.
        //     Proven by sending a deliberately fake refresh_token: a valid
        //     secret answers "Invalid refresh token", so anything still
        //     complaining about CREDENTIALS has cleared that check and is
        //     objecting to the token's binding, not to us.
        //   "Invalid refresh token"        ⇒ the stored token is malformed.
        //
        // Revoked is terminal. Retrying it every six hours forever is how a
        // dead install stays invisible inside a growing failure count.
        let description = ''
        try { description = String(JSON.parse(text)?.error_description || '') } catch { /* keep the raw text */ }
        const revoked = /invalid client credentials/i.test(description)

        await admin.from('crm_installations').update({
          health_status: revoked ? 'revoked' : 'degraded',
          consecutive_failures: (install as Record<string, unknown>).consecutive_failures
            ? ((install as Record<string, unknown>).consecutive_failures as number) + 1
            : 1,
          last_health_check: new Date().toISOString(),
          metadata: {
            ...(meta || {}),
            last_refresh_error: description || text.slice(0, 200),
            last_refresh_status: res.status,
            ...(revoked
              ? { unrecoverable_reason: 'The CRM has revoked this authorization. The credentials are valid and the client matches the token — only a reinstall restores it.' }
              : {}),
          },
        }).eq('id', install.id)

        await logHealth({
          connectionId: install.id,
          connectionType: 'crm',
          status: 'degraded',
          latencyMs: 0,
          error: `Refresh failed: ${res.status} ${text.slice(0, 200)}`,
        })

        results.push({
          id: install.id,
          status: revoked ? 'revoked' : 'failed',
          error: `${res.status} ${description}`.trim(),
        })
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
  // Counted apart from `failed` because they are a different kind of problem.
  // A failure might clear on the next run; a revoked or token-less install
  // never will, and burying both in one number is how 27 accounts that needed
  // a human stayed indistinguishable from transient noise.
  const revoked = results.filter(r => r.status === 'revoked').length
  const noRefreshToken = results.filter(r => r.error === 'No refresh token').length
  const needsReinstall = revoked + noRefreshToken

  return NextResponse.json({
    refreshed,
    failed,
    revoked,
    noRefreshToken,
    // The number a person should act on. Retrying cannot move it.
    needsReinstall,
    total: expiring.length,
    ...(needsReinstall
      ? { action: `${needsReinstall} install(s) cannot be recovered by retrying and need the account to reinstall the app.` }
      : {}),
    results,
  })
}
