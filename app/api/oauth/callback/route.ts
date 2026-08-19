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
import { AGENCY_V2_APP, BLUEPRINT_APP } from '@/lib/crm-apps'
import { generateToken } from '@/lib/0n-token'
import { issueAppJwt } from '@/lib/auth/app-jwt'
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
    return NextResponse.redirect(new URL('/install/failed?error=no_code', req.url))
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
      {
        // The agency app that actually holds saas/company.read, snapshots.* and
        // companies.readonly. See AGENCY_V2_APP in lib/crm-apps.ts.
        name: 'agency-v2',
        clientId: process.env[AGENCY_V2_APP.clientIdEnv] || '',
        clientSecret: process.env[AGENCY_V2_APP.clientSecretEnv] || '',
        redirectUri: AGENCY_V2_APP.redirectUri,
        appId: AGENCY_V2_APP.appId,
        userType: 'Company' as const,
      },
    ]

    // The CURRENT sub-account app. Its absence was a real bug: `state=sub`
    // resolved to `marketplace`, which is the OLDER app (69c762…) registered
    // against https://0ncore.com — so a sub-account install could never succeed,
    // whatever the credentials were.
    apps.push({
      name: 'subaccount-v2',
      clientId: process.env.CRM_SUBACCT_CLIENT_ID || process.env.SUBACCT_CLIENT_ID || '',
      clientSecret: process.env.CRM_SUBACCT_CLIENT_SECRET || process.env.SUBACCT_CLIENT_SECRET || '',
      redirectUri: 'https://app.0ncore.com/api/oauth/callback',
      appId: '6a7178a4e8d7c3c038c593b3',
      userType: 'Location' as const,
    })

    // The 0n Course Builder — a Conversation AI app installed per sub-account,
    // listed separately in the marketplace and heading for public approval. It
    // is its own app with its own credentials, so it needs its own entry here;
    // borrowing another app's pair is what produced "Invalid client
    // credentials" on the agency install.
    apps.push({
      name: 'course-builder',
      clientId: process.env.CRM_COURSE_APP_CLIENT_ID || '',
      clientSecret: process.env.CRM_COURSE_APP_CLIENT_SECRET || '',
      redirectUri: 'https://app.0ncore.com/api/oauth/callback',
      appId: process.env.CRM_COURSE_APP_ID || '69801f7a533633818a22921c',
      userType: 'Location' as const,
    })

    /**
     * 0nBlueprint — the describe→bundle→import app, installed per sub-account.
     *
     * Registered here BEFORE the app exists in the developer portal, on purpose:
     * the credentials arrive as environment variables from a browser step, and
     * the loop below already skips any app with no secret in env by name. So
     * this entry is inert until the portal step lands and correct the moment it
     * does — no deploy sits between the two.
     *
     * appId has no fallback. Every other app here can name a real registered ID;
     * this one cannot yet, and a placeholder would be written into
     * crm_installations as though it were real. See BLUEPRINT_APP.
     */
    apps.push({
      name: 'blueprint',
      clientId: process.env[BLUEPRINT_APP.clientIdEnv] || '',
      clientSecret: process.env[BLUEPRINT_APP.clientSecretEnv] || '',
      redirectUri: BLUEPRINT_APP.redirectUri,
      appId: BLUEPRINT_APP.appId,
      userType: 'Location' as const,
    })

    /**
     * ONE APP, chosen by state — never a sequence.
     *
     * An authorisation code is SINGLE-USE, and `redirect_uri` must match the
     * one the authorise step used exactly. The legacy apps are registered
     * against https://0ncore.com while our install routes send
     * https://app.0ncore.com, so trying them first both fails AND spends the
     * code — every later attempt then returns "Authorization code not found",
     * which reads like a credential problem and is not one.
     *
     * When our own install route started the flow it told us which app this is.
     * Guessing after that is strictly worse than failing with a clear message.
     * No state means the flow began somewhere else (a marketplace listing), and
     * only then is the legacy sequence the right behaviour.
     */
    const state = req.nextUrl.searchParams.get('state') || ''
    const only = state.startsWith('agency') ? 'agency-v2'
      : state.startsWith('course') ? 'course-builder'
      : state.startsWith('blueprint') ? 'blueprint'
      : state.startsWith('sub') ? 'subaccount-v2'
      : null

    // NO STATE MEANS A MARKETPLACE-LISTING INSTALL, and those are the CURRENT
    // apps — so try the current apps FIRST and keep the legacy pair as the tail.
    // Ordering this the other way round is what produced
    // `marketplace(401): Invalid client credentials` on a fresh agency install:
    // the flow never reached the agency app at all, and the error named the one
    // app the user had not installed.
    //
    // COURSE-BUILDER LEADS. Installs from its marketplace listing arrive with no
    // state at all, so this list is the only thing deciding which app gets the
    // code — and every app tried before it is a chance for the code to be spent
    // or code-shape-rejected, which breaks the loop before the right app is ever
    // reached. It is also the app currently in review, so it is the one a
    // stateless install is most likely to be.
    const candidates = only
      ? apps.filter((a) => a.name === only)
      : ['course-builder', 'blueprint', 'agency-v2', 'subaccount-v2', 'marketplace', 'marketplace-alt']
          .map((n) => apps.find((a) => a.name === n))
          .filter((a): a is (typeof apps)[number] => Boolean(a))

    let tokenData: Record<string, unknown> | null = null
    let usedApp = candidates[0] || apps[0]
    // WHICH combination actually worked. Scoped to the loop before, which meant
    // the install row could not record it — and refresh has to send the same
    // user_type the exchange used or it fails for a reason nobody can see.
    let usedUri = ''
    let usedType = ''
    const failures: string[] = []
    const skipped: string[] = []

    /**
     * REDIRECT_URI MUST MATCH THE AUTHORISE STEP EXACTLY, and we were guessing.
     *
     * Each app carried one hardcoded value. But the apex 308s to www
     * (0ncore.com/api/oauth/callback → www.0ncore.com/...), so depending on
     * which host is registered in the portal, the code may have been issued
     * against a URL that is not the one we send back. A mismatch is reported by
     * the platform as **"Invalid client credentials"** — a message that sends
     * you to check secrets that are perfectly fine. Five apps all reporting it
     * at once is the tell: five wrong secrets is not a thing, one wrong
     * redirect_uri is.
     *
     * So every plausible URI is tried. A mismatch fails BEFORE the code is
     * redeemed — same class as a rejected credential — so the code survives to
     * the next attempt. The one that works is logged by name, and the failures
     * name which URI they used, so this is diagnosed once and then pinned.
     */
    const REDIRECT_CANDIDATES = [
      ...new Set([
        // The URL this request actually arrived on, first: if the portal is
        // configured correctly, this is the answer by construction.
        `${req.nextUrl.origin}/api/oauth/callback`,
        'https://app.0ncore.com/api/oauth/callback',
        'https://www.0ncore.com/api/oauth/callback',
        'https://0ncore.com/api/oauth/callback',
      ]),
    ]

    for (const app of candidates) {
      if (!app.clientSecret) { skipped.push(`${app.name}(no secret in env)`); continue }

      /**
       * user_type is the last free variable, so it gets swept too.
       *
       * Location vs Company decides whether a refresh_token comes back at all,
       * and sending the wrong one for how the app is actually distributed is
       * another thing the platform can report as a credentials problem. The
       * app's configured value goes first; the other is a single extra attempt
       * on a failure that has already cost us the round trip.
       */
      const uris = [...new Set([app.redirectUri, ...REDIRECT_CANDIDATES])]
      const userTypes = [...new Set([app.userType, app.userType === 'Location' ? 'Company' : 'Location'])]
      const attempts = uris.flatMap((uri) => userTypes.map((ut) => ({ uri, ut })))

      let data: Record<string, unknown> = {}
      let tokenRes: Response | null = null
      usedUri = app.redirectUri
      usedType = app.userType

      for (const { uri, ut } of attempts) {
        tokenRes = await fetch(CRM_TOKEN_URL, {
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
            redirect_uri: uri,
            user_type: ut,
          }),
        })
        data = await tokenRes.json()
        usedUri = uri
        usedType = ut
        if (tokenRes.ok && data.access_token) break
        // A spent or rejected CODE is terminal — no other redirect_uri will
        // help, and continuing only buries the real message.
        if (/code (?:not found|is invalid|expired)|invalid_grant|authorization code/i.test(JSON.stringify(data))) break
      }
      if (!tokenRes) { skipped.push(`${app.name}(no attempt made)`); continue }

      if (tokenRes.ok && data.access_token) {
        tokenData = data
        usedApp = app
        console.log(
          `[oauth/callback] Token exchanged via ${app.name} app (user_type=${usedType}, redirect_uri=${usedUri}). ` +
          `Response keys: ${Object.keys(data).join(',')} | ` +
          `refresh_token: ${data.refresh_token ? 'PRESENT' : 'MISSING'} | ` +
          `locationId: ${data.locationId || 'none'} | companyId: ${data.companyId || 'none'}`
        )
        break
      }

      // The RAW response, not a summary. "token exchange failed" told us
      // nothing; the platform's own error_description is what identifies
      // whether it is the client, the secret, the redirect_uri or the code.
      const raw = JSON.stringify(data).slice(0, 240)
      // The URI is named in the failure. "Invalid client credentials" with no
      // redirect_uri attached is what sent us hunting through secrets.
      // Both variables named. An error that does not say which combination
      // produced it is an error you have to reproduce before you can read it.
      failures.push(`${app.name}(${tokenRes.status}) uri=${usedUri.replace('https://', '')} type=${usedType}: ${raw}`)
      console.warn(`[oauth/callback] ${app.name} exchange failed ${tokenRes.status}: ${raw}`)

      /**
       * TRYING THE NEXT APP IS ONLY SAFE WHILE THE CODE IS STILL UNSPENT.
       *
       * Rejected credentials fail BEFORE the code is redeemed, so the code
       * survives and the next app gets a fair attempt. A rejected *code* is the
       * opposite: it is gone, every later attempt returns "code not found", and
       * that message then buries the real first failure — which is exactly how a
       * credentials problem ends up looking like an expired-code problem.
       *
       * So on any code-shaped rejection we stop here and report the failure we
       * actually have.
       */
      if (/code (?:not found|is invalid|expired)|invalid_grant|authorization code/i.test(raw)) {
        console.error(`[oauth/callback] ${app.name} consumed or rejected the code — not trying further apps.`)
        break
      }
    }

    if (!tokenData || !tokenData.access_token) {
      console.error('[oauth/callback] all exchanges failed |', JSON.stringify({ state, skipped, failures }))
      // The reason travels back in the URL. A bare `token_failed` sent us
      // hunting through logs that only stream live; the platform's own message
      // says immediately whether this is a secret, a redirect_uri or the code.
      /**
       * EVERY failure, not just the first.
       *
       * Reporting failures[0] named whichever app happened to be first in the
       * list and buried the rest — a real install reported
       * `agency-v2(401): Invalid client credentials` while the app actually
       * being installed had been tried afterwards and its verdict thrown away.
       * That is the same "the message names the wrong app" bug this block was
       * written to fix, one level up.
       *
       * Each entry is trimmed so a long chain still fits in a URL, and skipped
       * apps are listed too — "no secret in env" is a different fix from a
       * rejection and must not look like one.
       */
      const attempts = [...failures, ...skipped]
      const why = (attempts.length ? attempts.map((f) => f.slice(0, 150)).join(' · ') : 'no apps had credentials').slice(0, 900)
      // /install/failed, NOT /crm. /crm needs a session to render, and the
      // audience for this redirect is precisely the people who do not have
      // one — so the reason was being reported to a page incapable of showing
      // it. That is what a reviewer saw as "an unauthorized error".
      const url = new URL('/install/failed', req.url)
      url.searchParams.set('error', 'token_failed')
      url.searchParams.set('why', why)
      return NextResponse.redirect(url)
    }

    /**
     * A marketplace install is a person arriving, so it creates a 0n account
     * like every other entry path. Without this an installer has an install and
     * no identity — nothing to own the add-on they just bought.
     *
     * Fire-and-forget: a failure here must never break the install itself.
     */
    void (async () => {
      try {
        const { ensureOnAccount } = await import('@/lib/account/ensure')
        await ensureOnAccount({
          email: (tokenData.userEmail as string) || null,
          companyId: (tokenData.companyId as string) || null,
          locationId: (tokenData.locationId as string) || null,
          source: 'marketplace_install',
        })
      } catch (err) {
        console.error('[oauth/callback] account provisioning failed:', err)
      }
    })()

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
    const user = (await supabase.auth.getSession()).data.session?.user ?? null

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

    /**
     * AN INSTALL WITH NO REFRESH TOKEN IS ALREADY DYING, and until now it was
     * written as active/healthy anyway. That is how 26 rows became silent
     * orphans: the access token works for a day, everything looks installed,
     * and by the time anyone notices there is nothing left to refresh with —
     * only a reinstall recovers it.
     *
     * The console.error above was the only trace, and console errors are not a
     * surface anyone checks.
     *
     * STATUS STAYS 'active' DELIBERATELY. The token genuinely works right now,
     * and getAuthForLocation filters on status — flipping it would break a
     * working install for the 24 hours it has left, which trades a silent
     * future failure for a loud immediate one. The health field is what
     * carries the warning, so this is findable BEFORE expiry rather than
     * diagnosed after it.
     */
    const canRefresh = Boolean(preservedRefresh)

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
      // Honest at write time. 'degraded' means "works now, cannot survive
      // expiry" — a state the registry can find today instead of tomorrow.
      health_status: canRefresh ? 'healthy' : 'degraded',
      last_health_check: new Date().toISOString(),
      consecutive_failures: 0,
      user_id: user?.id || null,
      metadata: {
        installed_via: 'marketplace',
        installed_at: new Date().toISOString(),
        company_id: companyId,
        crm_user_id: crmUserId,
        // The user_type that actually produced this token. Refresh has to send
        // the same one, and guessing it again later is how a refresh fails for
        // a reason nobody can see.
        user_type: usedType,
        redirect_uri: usedUri,
        can_refresh: canRefresh,
        ...(canRefresh ? {} : {
          refresh_gap_reason:
            'The token exchange returned no refresh_token and none was on file. This install stops working at expiry and needs a reinstall.',
          refresh_gap_at: new Date().toISOString(),
        }),
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

      void onToken // persisted by generateToken; the /dashboard one-time cookie
                   // is superseded by the app-JWT boot cookie set below.
    }

    // Land the installer INTO the dashboard, ALREADY AUTHENTICATED. This is the
    // fix for "install finishes but dumps me on a login gate": a GHL install has
    // no 0nCORE Supabase session, so useSso would read 'standalone' and gate.
    // Mint the app JWT from the verified companyId (from the token exchange) and
    // hand it over in a short-lived, NON-httpOnly boot cookie that useSso moves
    // into sessionStorage on first load — same shape as the iframe/standalone
    // token, so the whole dashboard just works.
    /**
     * LAND THEM WHERE THEY WERE, when we know where that was.
     *
     * A re-consent prompt is shown ON the page someone was trying to use, so
     * finishing the flow on /crm means they have to navigate back and — worse —
     * cannot tell whether the reconnect actually worked. /api/oauth/reauth
     * writes the origin path into a ten-minute cookie; this spends it.
     *
     * Re-validated here rather than trusted: the cookie is ours, but a path
     * that is not same-site is dropped, because an open redirect on the end of
     * an OAuth flow is a credential-harvesting hole. Absent or invalid falls
     * back to the existing /crm landing, which is the behaviour every
     * marketplace install still gets.
     */
    const rawNext = req.cookies.get('oncore.reauth.next')?.value ?? ''
    const nextPath = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : ''

    const dashUrl = new URL(nextPath || '/crm', req.url)
    dashUrl.searchParams.set('connected', 'true')
    if (locationId) dashUrl.searchParams.set('locationId', locationId)
    const response = NextResponse.redirect(dashUrl)
    // Spent, whether or not it was used. A stale return path is how an
    // unrelated install later lands somewhere surprising.
    if (rawNext) response.cookies.set('oncore.reauth.next', '', { maxAge: 0, path: '/' })
    if (companyId) {
      const bootJwt = issueAppJwt({ sub: crmUserId || companyId, companyId }, 60 * 60 * 8)
      response.cookies.set('oncore.boot.jwt', bootJwt, { httpOnly: false, secure: true, sameSite: 'lax', maxAge: 300, path: '/' })
    }
    return response
  } catch (error) {
    console.error('[oauth/callback] Error:', error)
    return NextResponse.redirect(new URL('/install/failed?error=oauth_failed', req.url))
  }
}
