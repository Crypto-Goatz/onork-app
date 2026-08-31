/**
 * credsForApp — the appId → (client_id, client_secret, user_type) mapping the
 * token cron refreshes with, and the re-consent route sends people to.
 *
 * WHAT THIS GUARDS. The CRM binds a refresh_token to the client that issued it.
 * Hand it another app's pair and it answers 401 "Invalid client credentials!",
 * the row goes degraded, and ~24h later the install is dead. On 2026-08-31 that
 * was live on install 25151350 — app 69c762, the row every location token in
 * this estate is minted from — because the App A arm of credsForApp matched
 * `SUB_LOCATION_APP.appId`, which is the LEGACY MARKETPLACE app, not App A.
 *
 * THE ASSERTION IS THE INVARIANT, NOT TODAY'S ANSWER. A test that pins the two
 * live app ids to the two live client ids passes just as happily on a mapping
 * that returns one hardcoded pair for everything. The CRM writes the owning app
 * on the front of every client id (`<appId>-<suffix>`), so the general rule is
 * checkable: whatever this function returns for app X must be a client id
 * BELONGING to app X. Case 3 asserts that over every app id in the registry.
 *
 * AND IT IS PROVEN ABLE TO FIRE. Case 8 replays the pre-fix predicate verbatim
 * against the live production env shape and REQUIRES it to produce the wrong
 * pair. Without that, a rewrite that reintroduced the same alias would leave
 * every case above green.
 *
 * Run: node tools/test-app-creds.mjs
 */

import { register } from 'node:module'

const HERE = new URL('.', import.meta.url)
// lib/crm.ts imports './crm-apps' without an extension; Node will not guess.
// Registered before the first dynamic import below, which is why every import
// of the module under test in this file is dynamic.
register('./ts-ext-resolve.mjs', import.meta.url)

const CRM = new URL('../lib/crm.ts', HERE).href

// The live production env shape, read off the onork-app Vercel project on
// 2026-08-31. Secrets are placeholders — this test compares WHICH value is
// selected, never the value itself, so it needs no real credential.
const LIVE_ENV = {
  CRM_MARKETPLACE_APP_ID: '69c762225a31e1cd2f28dd4c',
  CRM_MARKETPLACE_APP_CLIENT_ID: '69c762225a31e1cd2f28dd4c-mpa19g2x',
  CRM_MARKETPLACE_CLIENT_ID: '69c762225a31e1cd2f28dd4c-mpa19g2x',
  CRM_MARKETPLACE_CLIENT_SECRET: 'secret-marketplace',
  CRM_SUBACCT_CLIENT_ID: '6a7178a4e8d7c3c038c593b3-msebefqb',
  CRM_SUBACCT_CLIENT_SECRET: 'secret-subacct',
  CRM_AGENCY_APP_CLIENT_ID: '6a71919be8d7c3c038df0839-agencyv2',
  CRM_AGENCY_APP_CLIENT_SECRET: 'secret-agency-v2',
  CRM_COURSE_APP_ID: '69801f7a533633818a22921c',
  CRM_COURSE_APP_CLIENT_ID: '69801f7a533633818a22921c-mt0s9dyk',
  CRM_COURSE_APP_CLIENT_SECRET: 'secret-course',
  CRM_AGENCY_CLIENT_ID: '69cf4d25a74f834803470537-mnsazpwc',
  CRM_AGENCY_CLIENT_SECRET: 'secret-agency-legacy',
}

const CRM_KEYS = [
  ...Object.keys(LIVE_ENV),
  'CRM_AGENCY_APP_ID',
  'AGENCY_CLIENT_ID',
  'AGENCY_CLIENT_SECRET',
]

/**
 * MARKETPLACE_APP and SUB_LOCATION_APP freeze env at IMPORT time, so a test
 * that mutates process.env after the first import is grading the first shape
 * forever. A cache-busting query gives each shape its own module instance.
 */
let gen = 0
async function loadWith(env) {
  for (const k of CRM_KEYS) delete process.env[k]
  Object.assign(process.env, env)
  return await import(`${CRM}?creds-test=${++gen}`)
}

const APP = {
  marketplace: '69c762225a31e1cd2f28dd4c',
  appA: '6a7178a4e8d7c3c038c593b3',
  agencyV2: '6a71919be8d7c3c038df0839',
  course: '69801f7a533633818a22921c',
  agencyLegacy: '69cf4d25a74f834803470537',
}

let pass = 0
const fail = []
const t = async (n, f) => {
  try { await f(); pass++; console.log('  ✓ ' + n) }
  catch (e) { fail.push(n); console.log('  ✗ ' + n + ' — ' + e.message) }
}
const eq = (got, want, what) => {
  if (got !== want) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`)
}
const ownerOf = (clientId) => (clientId || '').split('-')[0]

console.log('\ncredsForApp — every app refreshes with its OWN credential pair\n')

await t('THE LIVE INCIDENT: app 69c762 gets the marketplace pair, not App A\'s', async () => {
  const { credsForApp } = await loadWith(LIVE_ENV)
  const c = credsForApp(APP.marketplace)
  eq(c.clientId, LIVE_ENV.CRM_MARKETPLACE_APP_CLIENT_ID, 'client id')
  eq(c.clientSecret, LIVE_ENV.CRM_MARKETPLACE_CLIENT_SECRET, 'client secret')
})

await t('App A still gets App A\'s pair', async () => {
  const { credsForApp } = await loadWith(LIVE_ENV)
  const c = credsForApp(APP.appA)
  eq(c.clientId, LIVE_ENV.CRM_SUBACCT_CLIENT_ID, 'client id')
  eq(c.clientSecret, LIVE_ENV.CRM_SUBACCT_CLIENT_SECRET, 'client secret')
  eq(c.userType, 'Location', 'user_type')
})

await t('THE INVARIANT: every returned client id BELONGS to the app asked for', async () => {
  const { credsForApp } = await loadWith(LIVE_ENV)
  const wrong = []
  for (const [name, appId] of Object.entries(APP)) {
    const { clientId } = credsForApp(appId)
    if (!clientId) { wrong.push(`${name}: no client id at all`); continue }
    if (ownerOf(clientId) !== appId) wrong.push(`${name} (${appId}) → ${clientId}, owned by ${ownerOf(clientId)}`)
  }
  if (wrong.length) throw new Error(wrong.join(' | '))
})

await t('agency v2 and the course app keep Company, the sub-account apps keep Location', async () => {
  const { credsForApp } = await loadWith(LIVE_ENV)
  eq(credsForApp(APP.agencyV2).userType, 'Company', 'agency v2 user_type')
  eq(credsForApp(APP.course).userType, 'Company', 'course user_type')
  eq(credsForApp(APP.agencyLegacy).userType, 'Company', 'legacy agency user_type')
  eq(credsForApp(APP.marketplace).userType, 'Location', 'marketplace user_type')
})

await t('an unknown app falls through to the marketplace pair, not App A\'s', async () => {
  const { credsForApp } = await loadWith(LIVE_ENV)
  const c = credsForApp('deadbeefdeadbeefdeadbeef')
  eq(c.clientId, LIVE_ENV.CRM_MARKETPLACE_APP_CLIENT_ID, 'client id')
})

await t('with no CRM_SUBACCT_CLIENT_ID set, App A still matches on its literal', async () => {
  const { CRM_SUBACCT_CLIENT_ID, CRM_SUBACCT_CLIENT_SECRET, ...noSubacct } = LIVE_ENV
  const { credsForApp } = await loadWith(noSubacct)
  const c = credsForApp(APP.appA)
  // No subacct pair exists, so the arm's own fallback answers — that is the
  // pre-2026-08-12 behaviour and is deliberately unchanged. What must NOT
  // happen is App A ceasing to be recognised at all.
  eq(c.userType, 'Location', 'user_type')
  eq(c.clientId, noSubacct.CRM_MARKETPLACE_APP_CLIENT_ID, 'client id')
})

await t('the owner is DERIVED: point the subacct pair at 69c762 and 69c762 takes it', async () => {
  const { credsForApp } = await loadWith({
    ...LIVE_ENV,
    CRM_SUBACCT_CLIENT_ID: '69c762225a31e1cd2f28dd4c-newpair',
    CRM_SUBACCT_CLIENT_SECRET: 'secret-rotated',
  })
  const c = credsForApp(APP.marketplace)
  eq(c.clientId, '69c762225a31e1cd2f28dd4c-newpair', 'client id')
  eq(c.clientSecret, 'secret-rotated', 'client secret')
  if (ownerOf(c.clientId) !== APP.marketplace) throw new Error('derivation handed over a foreign pair')
})

await t('CONTROL — the pre-fix predicate is still wrong, so these cases can fire', async () => {
  const { credsForApp } = await loadWith(LIVE_ENV)
  const { SUB_LOCATION_APP } = await import(new URL('../lib/crm-apps.ts', HERE).href)
  // Verbatim pre-fix arm condition. If this no longer captures the legacy
  // marketplace app, the bug is unreachable and case 1 proves nothing.
  const preFixCaptures = (appId) => appId === APP.appA || appId === SUB_LOCATION_APP.appId
  if (!preFixCaptures(APP.marketplace)) {
    throw new Error('SUB_LOCATION_APP.appId no longer equals the marketplace app id — this control has gone blind')
  }
  const preFixPair = process.env.CRM_SUBACCT_CLIENT_ID
  if (ownerOf(preFixPair) === APP.marketplace) {
    throw new Error('the subacct pair now belongs to 69c762 — pick a different fixture, the mismatch is gone')
  }
  // And the fixed function must disagree with it.
  if (credsForApp(APP.marketplace).clientId === preFixPair) {
    throw new Error('credsForApp still returns App A\'s pair for the marketplace app')
  }
})

console.log(`\n${pass} passed, ${fail.length} failed`)
process.exit(fail.length ? 1 : 0)
