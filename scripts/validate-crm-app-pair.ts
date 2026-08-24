/**
 * VALIDATE A CRM client_id/client_secret PAIR — the only probe that actually can.
 *
 * Why this exists, and why the obvious probes do NOT work (measured 2026-08-19,
 * with controls — see [[crm-oauth-error-taxonomy]]):
 *
 *   · authorization_code grant + a FAKE code   -> "Authorization code not found"
 *     for a good pair AND a nonexistent client_id. The CRM resolves the code
 *     first and never reads credentials when that lookup fails.
 *   · refresh_token grant + a FAKE token       -> "Invalid refresh token" for a
 *     good pair AND for client_id `nope` with secret `whatever`. Same reason.
 *
 * So neither can validate a secret. What CAN: the refresh_token grant with a
 * REAL refresh token. A valid pair returns tokens; a mismatched pair returns
 * "Invalid client credentials". That is the difference we need, because
 * "Invalid client credentials" on an install has TWO opposite causes:
 *
 *   (a) the pair is wrong (e.g. the app's SHARED secret pasted into the CLIENT
 *       secret slot — both are UUIDs, so shape cannot tell them apart), or
 *   (b) the pair is fine and the authorization code was issued by a DIFFERENT
 *       app that is not in the ladder at all.
 *
 * Fix (a) by rotating; fix (b) by adding the right app. Guessing wrong burns a
 * session, which is what this script is for.
 *
 * ROTATION SAFETY: a successful exchange ROTATES the refresh token, invalidating
 * the stored one. This persists the new tokens before printing anything, so a
 * decisive answer never costs us the only working credential for the app.
 *
 *   npx tsx scripts/validate-crm-app-pair.ts <appId> <CLIENT_ID_ENV> <CLIENT_SECRET_ENV>
 */
import { createClient } from '@supabase/supabase-js'

const [appId, idEnv, secretEnv] = process.argv.slice(2)
if (!appId || !idEnv || !secretEnv) {
  console.error('usage: npx tsx scripts/validate-crm-app-pair.ts <appId> <CLIENT_ID_ENV> <CLIENT_SECRET_ENV>')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const clientId = process.env[idEnv] || ''
const clientSecret = process.env[secretEnv] || ''

if (!url || !key) { console.error('missing supabase env'); process.exit(1) }
if (!clientId || !clientSecret) {
  console.error(`missing credentials: ${idEnv}=${clientId ? 'set' : 'EMPTY'} ${secretEnv}=${clientSecret ? 'set' : 'EMPTY'}`)
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })
const fp = (s: string) => require('crypto').createHash('sha256').update(s).digest('hex').slice(0, 8)

async function main() {
  const { data: rows, error } = await supabase
    .from('crm_installations')
    .select('id, app_id, refresh_token, location_id, company_id, created_at')
    .eq('app_id', appId)
    .not('refresh_token', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw new Error(`install lookup failed: ${error.message}`)

  const install = rows?.[0]
  if (!install || !install.refresh_token?.trim()) {
    console.log(`NO REAL REFRESH TOKEN for app ${appId} — this probe cannot run, and a fake`)
    console.log('token would produce the same "Invalid refresh token" for a good and a bad pair.')
    process.exit(2)
  }

  console.log(`app_id      : ${appId}`)
  console.log(`client_id   : ${clientId}   (from ${idEnv})`)
  console.log(`secret fp   : #${fp(clientSecret)}   (from ${secretEnv}, ${clientSecret.length} chars)`)
  console.log(`install row : ${install.id} created=${install.created_at}`)
  console.log('')

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: install.refresh_token,
  })

  const res = await fetch('https://services.leadconnectorhq.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  })
  const text = await res.text()
  let json: Record<string, unknown> = {}
  try { json = JSON.parse(text) } catch { /* keep raw */ }

  if (res.ok && typeof json.access_token === 'string') {
    // PERSIST FIRST. The old refresh token is now dead; losing the new one would
    // turn a diagnostic into an outage.
    const newRefresh = typeof json.refresh_token === 'string' ? json.refresh_token : install.refresh_token
    const expiresIn = typeof json.expires_in === 'number' ? json.expires_in : 86400
    const { error: upErr } = await supabase
      .from('crm_installations')
      .update({
        access_token: json.access_token,
        refresh_token: newRefresh,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', install.id)

    console.log('VERDICT: PAIR IS VALID.')
    console.log(`  the CRM accepted ${idEnv} + ${secretEnv} and returned an access token.`)
    console.log(`  rotated refresh token persisted: ${upErr ? 'FAILED — ' + upErr.message : 'yes'}`)
    console.log('')
    console.log('  => An install failing with "Invalid client credentials" while THIS pair is')
    console.log('     valid means the authorization code was issued by a DIFFERENT app.')
    console.log('     Do NOT rotate this secret. Find the app the listing actually points at.')
    return
  }

  const msg = String((json as { message?: string }).message || text).slice(0, 200)
  console.log(`VERDICT: rejected — HTTP ${res.status}`)
  console.log(`  platform said: ${msg}`)
  console.log('')
  if (/invalid client credentials/i.test(msg)) {
    console.log('  => "Invalid client credentials" on a REAL refresh token means the PAIR itself')
    console.log('     is wrong. Most likely the app\'s SHARED secret is sitting in the CLIENT')
    console.log(`     secret slot (${secretEnv}). Re-copy BOTH halves together from the app\'s`)
    console.log('     Secrets page — a new key issues a new client_id too.')
  } else if (/invalid refresh token/i.test(msg)) {
    console.log('  => AMBIGUOUS, and this is the trap. A dead/rotated refresh token returns this')
    console.log('     for a GOOD pair and a nonexistent client_id alike. This probe cannot')
    console.log('     conclude anything; the stored token is stale. Needs a fresh install to')
    console.log('     produce a live refresh token, or the portal-side pair comparison.')
  }
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
