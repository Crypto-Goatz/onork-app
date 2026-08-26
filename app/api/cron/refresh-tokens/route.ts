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
import { runLocationTokenCanary } from '@/lib/crm/location-token-canary'

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

  // The canary rides this cron because it needs exactly what this cron already
  // has: a six-hourly heartbeat that someone reads. It probes an endpoint the
  // platform removed from its docs with no notice period and which still
  // answers — see lib/crm/location-token-canary.ts. It runs on EVERY invocation,
  // including the one below where nothing needs refreshing, because "no tokens
  // expiring soon" is the most common outcome and hanging the probe off the
  // rare path would mean it almost never ran.
  const canary = await runLocationTokenCanary()

  if (!expiring || expiring.length === 0) {
    return NextResponse.json({ refreshed: 0, message: 'No tokens expiring soon', canary })
  }

  const results: { id: string; status: string; error?: string }[] = []

  for (const snapshot of expiring) {
    // RE-READ BEFORE ATTEMPTING, BECAUSE THIS FUNCTION RACES ITSELF.
    //
    // The select above happens BEFORE runLocationTokenCanary(), and the canary
    // calls getValidAgencyToken() -> refreshAgencyToken(), which refreshes the
    // agency install and ROTATES its refresh token. By the time this loop
    // reaches that same row, the token in `snapshot` is one generation stale.
    //
    // Measured on 2026-08-26 (install 25151350, app 69c762): a successful
    // refresh wrote expires_at 06:03:08.919, and 1.3s later this loop wrote
    // health_status 'revoked' and "only a reinstall restores it" — onto a row
    // whose brand-new token answered 200 on /locations/search and 201 on
    // POST /oauth/locationToken. Two code paths renewing one row is the
    // "two sources of truth" law in its auth costume; re-reading is the cheap
    // half of the fix, and the row another path already renewed is skipped.
    const { data: fresh } = await admin
      .from('crm_installations')
      .select('id, location_id, access_token, refresh_token, expires_at, app_id, metadata, consecutive_failures')
      .eq('id', snapshot.id)
      .maybeSingle()
    const install = (fresh || snapshot) as typeof snapshot & { consecutive_failures?: number }

    if (install.expires_at && new Date(install.expires_at).getTime() >= new Date(renewBefore).getTime()) {
      results.push({ id: install.id, status: 'already-renewed' })
      continue
    }

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
      //
      // EXCEPT WHEN IT CAN, AND ONE WHOLE CLASS OF ROW CAN. A token from
      // POST /oauth/locationToken never HAS a refresh token — that is the
      // design, not a defect — and ensureLocationInstall() re-mints and revives
      // the row the next time anything asks for that location. Calling those
      // rows 'unrecoverable' sent install-verdict to 'expired-dead', which
      // isTerminal() reports as needing a human, so the re-consent prompt would
      // tell a customer to reinstall an account that a background call fixes
      // for free. Measured 2026-08-26: row 4fc791bc (location OCq0PTnwBUJLyBZlEv2b)
      // carried "only a reinstall can restore this install" while the mint
      // endpoint answered 201 for that exact location on the first attempt.
      //
      // The row records how its token was obtained. Trust that, not the absence
      // of a column the mint lane never fills.
      const meta = (install as { metadata?: Record<string, unknown> }).metadata || {}
      const remintable = meta.installed_via === 'agency-token-mint'

      await admin.from('crm_installations').update({
        health_status: remintable ? 'expired-remintable' : 'unrecoverable',
        last_health_check: new Date().toISOString(),
        metadata: {
          ...meta,
          last_refresh_error: remintable
            ? 'Minted token, expired. Mint tokens carry no refresh token by design — the next call for this location re-mints it. No human action.'
            : 'No refresh token on file — only a reinstall can restore this install.',
        },
      }).eq('id', install.id)

      results.push({
        id: install.id,
        status: remintable ? 'remintable' : 'skipped',
        error: remintable ? undefined : 'No refresh token',
      })
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
        //   "Invalid client credentials!"  ⇒ the credential pair does not match
        //     this token's binding. NOT, on its own, evidence of revocation.
        //   "Invalid refresh token"        ⇒ the stored token is malformed,
        //     stale, or already rotated by another code path.
        //
        // THE CONTROL THIS USED TO REST ON DOES NOT WORK, MEASURED 2026-08-26.
        // The comment here claimed a fake refresh_token answers "Invalid
        // refresh token" only for a VALID secret, so a surviving credentials
        // complaint proved revocation. Run against the live platform with a
        // deliberately fake refresh_token, EVERY pair answered "Invalid refresh
        // token" — the current client, both sibling client ids, and a client id
        // from an entirely different app paired with this app's secret. The
        // platform validates the token before the credentials, so that probe
        // cannot distinguish a good secret from a bad one and the inference
        // built on it was unfounded.
        //
        // So corroborate against the thing revocation would actually break. A
        // revoked authorization cannot serve an API call; if the access token we
        // already hold still answers, the word 'revoked' is false whatever the
        // refresh endpoint says. This is the same law as everywhere else here:
        // assert against the served surface, never a string that could be true
        // for another reason.
        let description = ''
        try { description = String(JSON.parse(text)?.error_description || '') } catch { /* keep the raw text */ }
        const credentialsRejected = /invalid client credentials/i.test(description)

        let livenessStatus: number | null = null
        if (credentialsRejected && install.access_token) {
          try {
            const probe = await fetch(
              install.location_id
                ? `https://services.leadconnectorhq.com/contacts/?locationId=${encodeURIComponent(install.location_id)}&limit=1`
                : `https://services.leadconnectorhq.com/locations/search?limit=1`,
              { headers: { Authorization: `Bearer ${install.access_token}`, Version: '2021-07-28', Accept: 'application/json' } },
            )
            livenessStatus = probe.status
          } catch { livenessStatus = null }
        }
        // Only claim revoked when the token itself is also refused. A 2xx here
        // means the install is alive and something about OUR refresh call is
        // wrong — a real problem, but a different one, and 'degraded' is the
        // honest label for it.
        const revoked = credentialsRejected && livenessStatus !== null && livenessStatus >= 400

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
            ...(livenessStatus !== null ? { access_token_probe: livenessStatus } : {}),
            ...(revoked
              ? { unrecoverable_reason: `The CRM refused the refresh AND refused the stored access token (${livenessStatus}). Only a reinstall restores it.` }
              : {}),
            ...(credentialsRejected && !revoked
              ? { degraded_reason: `Refresh rejected as "invalid client credentials", but the stored access token still answered ${livenessStatus ?? 'unprobed'}. The install is alive; our refresh call is what is wrong. Not a reinstall.` }
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
    // Reported next to the refresh counts on purpose. Both answer the same
    // question — "can we still get a token for a location tomorrow" — and one
    // of them is the failure mode nobody is watching for.
    canary,
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
