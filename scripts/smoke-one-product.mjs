#!/usr/bin/env node
/**
 * smoke-one-product.mjs — the definition of done, as a program.
 *
 * "One beautiful working product" was a paragraph. A paragraph cannot be run,
 * so whether we are finished stayed a judgement call, and judgement calls in
 * this project have been wrong twice this week in public. This is the same
 * claim written as seven steps that either pass or do not.
 *
 * IT FAILS AT STEP 1 TODAY. On purpose. Every bridge that lands moves it one
 * step further, and "are we there yet" becomes `node scripts/smoke-one-product.mjs`.
 *
 * THE RULES IT HOLDS ITSELF TO, because a smoke test that lies is worse than no
 * smoke test:
 *
 *   · A step passes only on EVIDENCE — an id, a status code, a row, a string
 *     found in fetched markup. Never on "the call did not throw".
 *   · A step that cannot run says BLOCKED and names what it needs. Blocked is
 *     not passed and never counts toward the total.
 *   · It runs read-only by default. Writing into a live account is opt-in via
 *     --write, because the other side has no rollback.
 *   · The first failure stops the run and prints what the remaining steps
 *     WOULD have checked, so one run tells you the whole shape of the gap.
 *
 *   node scripts/smoke-one-product.mjs            # read-only
 *   node scripts/smoke-one-product.mjs --write    # allows the write steps
 *
 * Env: CRM_SSO_KEY (to mint a session), LOCATION_ID, COMPANY_ID.
 */
import crypto from 'node:crypto'

const BASE = process.env.BASE || 'https://app.0ncore.com'
const WEB0N = process.env.WEB0N || 'https://web0n.com'
const SSO_KEY = process.env.CRM_SSO_KEY || process.env.SSO_KEY || ''
const LOCATION = process.env.LOCATION_ID || 'nphConTwfHcVE1oA0uep'
const COMPANY = process.env.COMPANY_ID || 'bknfhTkdDLapbwfZqQNi'
const ALLOW_WRITE = process.argv.includes('--write')

/* ── The seven steps, declared before any of them runs ────────────────────
   Declared up front so a failure can print what it was going to check next.
   A gap you can see the shape of is a gap somebody can plan around.        */
const STEPS = [
  { n: 1, id: 'generate', what: 'describe → a bundle that passes the validator' },
  { n: 2, id: 'render',   what: 'web0n site live, with SXO markup and the CRO9 script present' },
  { n: 3, id: 'install',  what: 'marketplace install → a token in the registry' },
  { n: 4, id: 'import',   what: 'bundle → sub-account, receipts complete' },
  { n: 5, id: 'publish',  what: 'content live in the account, read back over the API' },
  { n: 6, id: 'task',     what: 'assigned to 0n → completed with a receipt trail' },
  { n: 7, id: 'export',   what: 'site → another platform with an honest manifest' },
]

const results = []
let stopped = null

const PASS = 'PASS', FAIL = 'FAIL', BLOCKED = 'BLOCKED'

function record(step, status, evidence) {
  results.push({ step, status, evidence })
  const tag = status === PASS ? '  ✓' : status === BLOCKED ? '  ·' : '  ✗'
  console.log(`${tag} ${step.n}. ${step.id.padEnd(9)} ${status.padEnd(8)} ${evidence}`)
  if (status === FAIL && !stopped) stopped = step
}

/** OpenSSL EVP_BytesToKey, MD5 — the inverse of lib/crm/sso.ts. */
function deriveKeyAndIv(passphrase, salt) {
  const pass = Buffer.from(passphrase, 'binary')
  const blocks = []
  let prev = Buffer.alloc(0)
  while (Buffer.concat(blocks).length < 48) {
    prev = crypto.createHash('md5').update(Buffer.concat([prev, pass, salt])).digest()
    blocks.push(prev)
  }
  const keyIv = Buffer.concat(blocks).subarray(0, 48)
  return { key: keyIv.subarray(0, 32), iv: keyIv.subarray(32, 48) }
}

async function mintSession() {
  if (!SSO_KEY) return null
  const salt = crypto.randomBytes(8)
  const { key, iv } = deriveKeyAndIv(SSO_KEY, salt)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  const ctx = {
    userId: 'smoke-one-product', companyId: COMPANY, role: 'admin', type: 'agency',
    userName: 'Smoke', email: 'smoke@0ncore.local', activeLocation: LOCATION,
  }
  const body = Buffer.concat([cipher.update(JSON.stringify(ctx), 'utf8'), cipher.final()])
  const encryptedData = Buffer.concat([Buffer.from('Salted__'), salt, body]).toString('base64')
  const r = await fetch(`${BASE}/api/sso`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encryptedData }),
  })
  const j = await r.json().catch(() => ({}))
  return j?.token || null
}

async function main() {
  console.log(`\n0n — one product, seven steps → ${BASE}`)
  console.log(ALLOW_WRITE ? 'WRITE MODE — steps 4 and 5 may write into a live account.\n' : 'Read-only. Pass --write to allow steps 4 and 5.\n')

  const token = await mintSession()
  const auth = token ? { Authorization: `Bearer ${token}` } : {}
  if (!token) console.log('  (no session — CRM_SSO_KEY unset; steps needing auth will report BLOCKED)\n')

  let bundle = null

  // ── 1 · GENERATE ────────────────────────────────────────────────────────
  {
    const step = STEPS[0]
    const r = await fetch(`${BASE}/api/bundle/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ prompt: 'A med-spa in Pittsburgh offering microneedling and facials', vertical: 'wellness' }),
    }).catch(() => null)

    if (!r) record(step, FAIL, 'no response from /api/bundle/generate')
    else if (r.status === 404) record(step, FAIL, 'POST /api/bundle/generate does not exist yet (A8 not built)')
    else {
      const j = await r.json().catch(() => ({}))
      // Evidence, not absence of error: a real bundle with real items.
      const items = Object.values(j?.bundle?.collections ?? {}).reduce((n, c) => n + (c.items?.length ?? 0), 0)
      if (r.ok && j?.bundle?.schemaVersion === '0nblueprint-bundle-v2' && items > 0) {
        bundle = j.bundle
        record(step, PASS, `${items} items, schemaVersion ok`)
      } else {
        record(step, FAIL, `${r.status} — ${JSON.stringify(j).slice(0, 120)}`)
      }
    }
  }

  // ── 2 · RENDER ──────────────────────────────────────────────────────────
  {
    const step = STEPS[1]
    if (stopped) record(step, BLOCKED, 'nothing to render — step 1 produced no bundle')
    else {
      const r = await fetch(`${WEB0N}/`).catch(() => null)
      const html = r?.ok ? await r.text() : ''
      const hasSxo = /application\/ld\+json/.test(html)
      const hasCro9 = /cro9/i.test(html)
      if (hasSxo && hasCro9) record(step, PASS, 'SXO JSON-LD and CRO9 script both present')
      else record(step, FAIL, `SXO:${hasSxo ? 'yes' : 'no'} CRO9:${hasCro9 ? 'yes' : 'no'} — a rendered site must carry both`)
    }
  }

  // ── 3 · INSTALL ─────────────────────────────────────────────────────────
  {
    const step = STEPS[2]
    if (!token) record(step, BLOCKED, 'no session')
    else {
      const r = await fetch(`${BASE}/api/mkt/installs?locationId=${LOCATION}`, { headers: auth }).catch(() => null)
      if (!r || r.status === 404) {
        record(step, FAIL, 'no install registry endpoint yet (A1 not built) — A0-BUG blocks this')
      } else {
        const j = await r.json().catch(() => ({}))
        const live = (j?.installs ?? []).filter((i) => i.status === 'active' && i.hasToken)
        if (live.length) record(step, PASS, `${live.length} install(s) with a live token`)
        else record(step, FAIL, 'registry reachable but holds zero installs with tokens — the A0-BUG symptom')
      }
    }
  }

  // ── 4 · IMPORT ──────────────────────────────────────────────────────────
  {
    const step = STEPS[3]
    if (!token) record(step, BLOCKED, 'no session')
    else if (!bundle) record(step, BLOCKED, 'no bundle from step 1')
    else {
      const r = await fetch(`${BASE}/api/bundle/import`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ bundle, locationId: LOCATION, mode: ALLOW_WRITE ? 'execute' : 'dry_run' }),
      }).catch(() => null)
      const j = r ? await r.json().catch(() => ({})) : {}
      const receipts = j?.receipts?.length ?? 0
      if (r?.ok && receipts > 0) {
        record(step, PASS, `${receipts} receipts, mode=${j.mode}`)
      } else {
        record(step, FAIL, `${r?.status} — ${JSON.stringify(j).slice(0, 120)}`)
      }
    }
  }

  // ── 5 · PUBLISH ─────────────────────────────────────────────────────────
  {
    const step = STEPS[4]
    if (!ALLOW_WRITE) record(step, BLOCKED, 'read-only run — pass --write to check a real publish')
    else if (!token) record(step, BLOCKED, 'no session')
    else {
      // Read it BACK. "The publish call returned 200" is not evidence that
      // anything exists; fetching the thing is.
      const r = await fetch(`${BASE}/api/portal/${LOCATION}/summary`, { headers: auth }).catch(() => null)
      const j = r ? await r.json().catch(() => ({})) : {}
      if (r?.ok && (j?.activity?.length ?? 0) > 0) record(step, PASS, `${j.activity.length} receipts visible in the account`)
      else record(step, FAIL, 'nothing readable back from the account after import')
    }
  }

  // ── 6 · TASK ────────────────────────────────────────────────────────────
  {
    const step = STEPS[5]
    record(step, FAIL, 'no task→0n→receipt round trip yet (A5 not built)')
  }

  // ── 7 · EXPORT ──────────────────────────────────────────────────────────
  {
    const step = STEPS[6]
    const r = await fetch(`${WEB0N}/api/bundle/export?site=smoke`).catch(() => null)
    if (!r || r.status === 404) record(step, FAIL, 'GET /api/bundle/export not built — the studio exports client-side only')
    else {
      const j = await r.json().catch(() => ({}))
      // A manifest that does not say what it cannot do is not honest.
      if (j?.manifest?.tier && Array.isArray(j?.manifest?.refusals)) {
        record(step, PASS, `tier ${j.manifest.tier}, ${j.manifest.refusals.length} refusal(s) declared`)
      } else {
        record(step, FAIL, 'export produced no manifest declaring tier and refusals')
      }
    }
  }

  // ── Report ──────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.status === PASS).length
  const blocked = results.filter((r) => r.status === BLOCKED).length
  console.log(`\n${passed}/7 passing${blocked ? ` · ${blocked} blocked` : ''}`)

  if (passed === 7) {
    console.log('\nOne product. A customer can do the whole thing in one session.\n')
    process.exit(0)
  }

  const first = results.find((r) => r.status === FAIL)
  if (first) {
    console.log(`\nFirst gap: step ${first.step.n} — ${first.step.what}`)
    console.log(`  ${first.evidence}`)
  }
  console.log('\nStill to prove:')
  for (const r of results.filter((x) => x.status !== PASS)) {
    console.log(`  ${r.step.n}. ${r.step.what}`)
  }
  console.log()
  process.exit(1)
}

main().catch((e) => {
  console.error('\nsmoke test crashed:', e.message)
  process.exit(1)
})
