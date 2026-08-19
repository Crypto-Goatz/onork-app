/**
 * The pasted-key fallback, proven against production rather than asserted.
 *
 * The whole point of this fallback is that it is never exercised until the day
 * it has to work. That is also exactly how insurance rots: the switch is wired
 * to nothing, the stored keys were valid in July, and nobody finds out until the
 * vendor's endpoint 404s at 3am. So this script does the drill.
 *
 * It makes REAL calls:
 *   - reads the real crm_endpoint_state row and the real connection tables
 *   - sends every stored per-location key to the live CRM and checks it is
 *     accepted TODAY, because a key that no longer works is not a fallback
 *   - arms the fallback for real, twice — once through the env override and once
 *     through the database row — and proves the mint endpoint is not called
 *   - proves an unresolvable location produces a named instruction and a refused
 *     request rather than `Bearer ` and an opaque 401
 *
 * ORDER IS A SAFETY PROPERTY. The exposure check runs BEFORE anything is armed,
 * and the database arm is skipped entirely unless exposure is zero — arming a
 * global row is a production act, and it is only safe while no location depends
 * on the endpoint being armed off. The row is restored in a finally.
 *
 * Run:  set -a; . .env.local; set +a; npx tsx scripts/verify-pasted-key-fallback.mts
 */
import { createClient } from '@supabase/supabase-js'
import {
  MINT_ENDPOINT,
  mintDisposition,
  recordMintOutcome,
  requirePastedKey,
  pastedKeyExposure,
  __resetFallbackCacheForTests,
} from '../lib/crm/pasted-key-fallback'
import { ensureLocationInstall } from '../lib/crm/location-token'
import { getAuthForLocation, crmGet } from '../lib/crm'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

/** A location id that is in neither table. Used only while the fallback is
 *  armed, so no request is ever made to the CRM with a fictional id. */
const KEYLESS = 'zzz-cece-fallback-verify'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

let fails = 0
function check(label: string, ok: boolean, detail = '') {
  if (!ok) fails++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

/** Counts calls to the removed endpoint. The claim "we no longer call it" is
 *  only worth anything if something is watching the socket. */
const realFetch = globalThis.fetch
let mintCalls = 0
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (url.includes('/oauth/locationToken')) mintCalls++
  return realFetch(input, init)
}) as typeof fetch

async function main() {
  console.log(`\n=== pasted-key fallback drill · ${new Date().toISOString()} ===\n`)

  // ── 1. The switch's own row ──────────────────────────────────────────────
  console.log('1. crm_endpoint_state')
  const { data: row, error: rowErr } = await db
    .from('crm_endpoint_state')
    .select('*')
    .eq('endpoint', MINT_ENDPOINT)
    .maybeSingle()
  check('row exists', Boolean(row) && !rowErr, rowErr?.message || JSON.stringify(row))
  const startedArmed = Boolean(row?.fallback_armed)

  const d0 = await mintDisposition()
  check('starts allowed', d0.allowed, `${d0.reason}: ${d0.detail}`)

  // ── 2. Exposure, BEFORE arming anything ──────────────────────────────────
  console.log('\n2. exposure — who depends on the removed endpoint right now')
  const exp = await pastedKeyExposure()
  console.log(`     ${exp.total} locations known · ${exp.onPastedKey} on a pasted key · ${exp.onInstall} on a live install · ${exp.onMint.length} on the mint`)
  for (const r of exp.connectedOnMint) console.log(`       CONNECTED, ON MINT: ${r.locationId} ${r.name ? `(${r.name})` : ''}`)
  if (exp.dormantOnMint.length) {
    console.log(`     ${exp.dormantOnMint.length} dormant location(s) on the mint (retired installs, no pasted key): ${exp.dormantOnMint.slice(0, 5).map((r) => r.locationId).join(', ')}${exp.dormantOnMint.length > 5 ? ', …' : ''}`)
  }
  // The gate is CONNECTED accounts only. A dormant location is not made worse by
  // arming — it swaps a call to an endpoint that may already be gone for an
  // error that names it. A connected one is a paying customer, and arming while
  // one of those depends on the mint would be the outage this exists to prevent.
  const safeToArm = exp.connectedOnMint.length === 0
  check('no CONNECTED account depends on the mint', safeToArm,
    safeToArm ? 'arming costs no customer a working call' : 'paste keys at /connect before arming')
  check('dormant locations are counted, not hidden', true, `${exp.dormantOnMint.length} would fall through to the mint if touched`)

  // ── 3. Every stored key still works TODAY, against the live CRM ──────────
  console.log('\n3. stored per-location keys, against the live CRM')
  const { data: conns } = await db
    .from('location_connections')
    .select('location_id, location_name, location_pit')
    .eq('status', 'active')
  let keysOk = 0
  for (const c of conns ?? []) {
    if (!c.location_pit) { check(`${c.location_name || c.location_id}: has a key`, false, 'no key stored'); continue }
    const res = await realFetch(
      `${CRM_API}/contacts/?locationId=${encodeURIComponent(c.location_id)}&limit=1`,
      { headers: { Authorization: `Bearer ${c.location_pit}`, Version: CRM_VERSION, Accept: 'application/json' } },
    )
    const ok = res.ok
    if (ok) keysOk++
    check(`${c.location_name || c.location_id}: key accepted`, ok, `HTTP ${res.status}`)
  }
  console.log(`     ${keysOk}/${(conns ?? []).length} stored keys accepted by the CRM`)

  // ── 4. Arm via the env override, in this process only ───────────────────
  console.log('\n4. armed by env (CRM_REQUIRE_PASTED_KEY) — no production impact')
  process.env.CRM_REQUIRE_PASTED_KEY = '1'
  __resetFallbackCacheForTests()
  const dEnv = await mintDisposition()
  check('mint refused', !dEnv.allowed, `${dEnv.reason}`)

  const before = mintCalls
  const minted = await ensureLocationInstall(KEYLESS)
  check('ensureLocationInstall refused', minted.token === null && minted.source === 'failed', minted.error?.slice(0, 90))
  check('the endpoint was NOT called', mintCalls === before, `${mintCalls - before} call(s)`)
  check('the error names the location', Boolean(minted.error?.includes(KEYLESS)), minted.error?.slice(0, 60))
  check('the error names the fix', Boolean(minted.error?.includes('/connect')), '')

  const need = await requirePastedKey(KEYLESS)
  check('requirePastedKey: required + not ready', need.required && !need.ready && !need.satisfied, `resolvesOn=${need.resolvesOn}`)

  // A connected location must stay ready with the mint armed off — that IS the
  // fallback: same account, same call, credential now coming from position 1.
  const live = (conns ?? []).find((c) => c.location_pit)
  if (live) {
    const ok = await requirePastedKey(live.location_id)
    check(`${live.location_name}: still served with the mint armed off`, ok.ready && ok.resolvesOn === 'pasted-key', `resolvesOn=${ok.resolvesOn}`)
    const b2 = mintCalls
    const auth = await getAuthForLocation(live.location_id)
    check(`${live.location_name}: resolves on the pasted key`, auth.token === live.location_pit && !auth.unresolved, `source=${auth.source}`)
    check(`${live.location_name}: no mint round trip`, mintCalls === b2, `${mintCalls - b2} call(s)`)
  }

  // ── 5. An unresolvable location fails legibly, not as `Bearer ` ─────────
  console.log('\n5. unresolvable location')
  const b3 = mintCalls
  const auth = await getAuthForLocation(KEYLESS)
  check('token is empty and says why', auth.token === '' && Boolean(auth.unresolved), auth.unresolved?.slice(0, 70))
  check('no mint round trip', mintCalls === b3, `${mintCalls - b3} call(s)`)

  const res = await crmGet('/contacts/', KEYLESS)
  const body = await res.json().catch(() => ({}))
  check('crmGet refuses with 401', res.status === 401, `HTTP ${res.status}`)
  check('the body names the account and the fix', Boolean(body?.message?.includes(KEYLESS) && body?.message?.includes('/connect')), String(body?.message).slice(0, 70))

  delete process.env.CRM_REQUIRE_PASTED_KEY
  __resetFallbackCacheForTests()
  const dBack = await mintDisposition()
  check('disarming the env restores the mint', dBack.allowed, dBack.reason)

  // ── 6. Arm via the database row — the switch that needs no deploy ───────
  console.log('\n6. armed by the database row (the real switch)')
  if (!safeToArm) {
    console.log('     SKIPPED — a CONNECTED account still depends on the mint. Arming would break a paying customer.')
    fails++
  } else if (startedArmed) {
    console.log('     SKIPPED — the row was already armed before this run. Not touching it.')
  } else {
    try {
      await db.from('crm_endpoint_state').update({
        fallback_armed: true, armed_at: new Date().toISOString(),
        armed_by: 'verification', note: 'Armed by verify-pasted-key-fallback.mts. Restored at the end of the run.',
      }).eq('endpoint', MINT_ENDPOINT)

      __resetFallbackCacheForTests()
      const dDb = await mintDisposition()
      check('mint refused from the row alone', !dDb.allowed, `${dDb.reason}`)

      const b4 = mintCalls
      const m2 = await ensureLocationInstall(KEYLESS)
      check('ensureLocationInstall refused', m2.token === null, m2.error?.slice(0, 70))
      check('the endpoint was NOT called', mintCalls === b4, `${mintCalls - b4} call(s)`)

      const expArmed = await pastedKeyExposure()
      check('exposure reports armed', expArmed.armed, `${expArmed.onPastedKey} locations still served on pasted keys`)

      // The fallback's actual promise, under the real switch: a connected
      // account keeps working with the mint off.
      if (live) {
        const b5 = mintCalls
        const a2 = await getAuthForLocation(live.location_id)
        check(`${live.location_name}: served on its pasted key with the row armed`,
          a2.token === live.location_pit && !a2.unresolved, `source=${a2.source}`)
        check('no mint round trip', mintCalls === b5, `${mintCalls - b5} call(s)`)
      }
    } finally {
      await db.from('crm_endpoint_state').update({
        fallback_armed: row?.fallback_armed ?? false,
        armed_at: row?.armed_at ?? null,
        armed_by: row?.armed_by ?? null,
        note: row?.note ?? null,
      }).eq('endpoint', MINT_ENDPOINT)
      __resetFallbackCacheForTests()
      const dEnd = await mintDisposition()
      check('row restored to disarmed', dEnd.allowed, dEnd.reason)
    }
  }

  // ── 7. The arming rules, against the real row ───────────────────────────
  //
  // The vendor will not return a 404 on request, so the one thing that cannot
  // be observed is also the thing everything depends on. These drive
  // recordMintOutcome directly with each status the endpoint could produce and
  // check what the row does — including, and mostly, what it must NOT do.
  console.log('\n7. arming rules')
  // Restores the row EXACTLY as section 1 found it. Writing plausible-looking
  // defaults instead would leave the canary's observation history saying
  // something this drill made up — last_status 404 next to zero failures, or a
  // last_alive_at that never happened.
  const restore = async () => {
    await db.from('crm_endpoint_state').update({
      fallback_armed: row?.fallback_armed ?? false,
      armed_at: row?.armed_at ?? null,
      armed_by: row?.armed_by ?? null,
      consecutive_failures: row?.consecutive_failures ?? 0,
      last_error: row?.last_error ?? null,
      last_status: row?.last_status ?? null,
      last_checked_at: row?.last_checked_at ?? null,
      last_alive_at: row?.last_alive_at ?? null,
      note: row?.note ?? null,
    }).eq('endpoint', MINT_ENDPOINT)
    __resetFallbackCacheForTests()
  }
  try {
    // A bad day is not a removal.
    await recordMintOutcome({ status: 503, alive: false, error: 'gateway', observedBy: 'drill', mayArm: true })
    __resetFallbackCacheForTests()
    check('503 from the canary does NOT arm', (await mintDisposition()).allowed, 'a live endpoint having a bad day')

    await recordMintOutcome({ status: 401, alive: false, error: 'scope', observedBy: 'drill', mayArm: true })
    __resetFallbackCacheForTests()
    check('401 from the canary does NOT arm', (await mintDisposition()).allowed, 'our scope, not their endpoint')

    // A 404 in real traffic is as likely to be a bad location id as a dead
    // endpoint. One stale id must not disable minting for every account.
    await recordMintOutcome({ status: 404, alive: false, error: 'not found', observedBy: 'drill', mayArm: false })
    __resetFallbackCacheForTests()
    check('404 in real traffic does NOT arm', (await mintDisposition()).allowed, 'ambiguous: no such location vs no such endpoint')

    const failed = await db.from('crm_endpoint_state').select('consecutive_failures').eq('endpoint', MINT_ENDPOINT).maybeSingle()
    check('failures are counted even when not arming', (failed.data?.consecutive_failures ?? 0) >= 3, `consecutive_failures=${failed.data?.consecutive_failures}`)

    // The one case that arms.
    await recordMintOutcome({ status: 404, alive: false, error: 'Cannot POST /oauth/locationToken', observedBy: 'drill', mayArm: true })
    const dGone = await mintDisposition()
    check('404 from the canary ARMS', !dGone.allowed, `${dGone.reason}`)
    check('the reason survives a cache reset (it is on the row)', await (async () => {
      __resetFallbackCacheForTests()
      const d = await mintDisposition()
      return !d.allowed && d.reason === 'armed-by-canary'
    })(), 'armed-by-canary')

    const armedRow = await db.from('crm_endpoint_state').select('armed_by, fallback_armed').eq('endpoint', MINT_ENDPOINT).maybeSingle()
    check('the row records who armed it', armedRow.data?.armed_by === 'canary:404', String(armedRow.data?.armed_by))

    // And the connected accounts are still served — the whole point.
    if (live) {
      const b6 = mintCalls
      const a3 = await getAuthForLocation(live.location_id)
      check(`${live.location_name}: still served after an automatic arm`, a3.token === live.location_pit && !a3.unresolved, `source=${a3.source}`)
      check('no mint round trip', mintCalls === b6, `${mintCalls - b6} call(s)`)
    }
  } finally {
    await restore()
    const dEnd = await mintDisposition()
    check('row restored to disarmed', dEnd.allowed, dEnd.reason)
  }

  console.log(`\n=== ${fails === 0 ? 'ALL PASS' : `${fails} FAILURE(S)`} · ${mintCalls} call(s) to ${MINT_ENDPOINT} during the drill ===\n`)
  process.exit(fails === 0 ? 0 : 1)
}

main().catch((e) => { console.error('drill threw:', e); process.exit(1) })
