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
 *   · EVIDENCE MUST BE TRACEABLE TO THIS RUN. A row that was already there
 *     proves the account is old, not that we just did something. Step 5 learned
 *     this the hard way; see the note there.
 *   · A step that cannot run says BLOCKED and names what it needs. Blocked is
 *     not passed and never counts toward the total.
 *   · It runs read-only by default. Writing into a live account is opt-in via
 *     --write, because the other side has no rollback. A dry run is not a pass.
 *   · Every step reports, even after a failure — one run tells you the whole
 *     shape of the gap, and the first failure is named as THE gap at the end.
 *
 *   node scripts/smoke-one-product.mjs            # read-only
 *   node scripts/smoke-one-product.mjs --write    # allows the write steps
 *
 * CREDENTIALS, because a smoke test nobody can run is a smoke test nobody runs:
 *   CRM_SSO_KEY   mints the app session (steps 3–5). Lives in Vercel prod:
 *                 `vercel env pull /tmp/onork.env --environment=production`
 *                 then `set -a; . /tmp/onork.env; set +a`.
 *   ONTASK_API_KEY  step 6. Falls back to ~/.0n/ontask-key if that file exists.
 *   LOCATION_ID / COMPANY_ID  which sub-account counts as "the customer".
 *
 * ── CURRENT AS OF 2026-08-18, every line below re-verified against live ──────
 *   1 generate  POST /api/bundle/generate → 404. A8 unbuilt. Genuinely red.
 *   2 render    web0n.com serves JSON-LD + a CRO9 script today, but there is no
 *               bundle to render, so this reports BLOCKED with that readiness
 *               signal attached rather than passing on the homepage's markup.
 *   3 install   registry is LIVE and truthful (A0-BUG closed 2026-08-18). It is
 *               no longer "zero installs with tokens": 30 rows, 1 usable — and
 *               that one is COMPANY-scoped with an empty locationId, so a
 *               location-scoped query cannot see it. This step now reads the
 *               ladder in lib/crm/install-verdict.ts instead of status='active',
 *               which the 29-row archive ruling made meaningless.
 *   4 import    /api/bundle/import is live (405 on GET). Dry run no longer
 *               counts as a pass — see the rule above.
 *   5 publish   /api/portal/[id]/summary returns activity going back months.
 *               Asserting "activity.length > 0" passed on contacts added in
 *               2026-08-11 by something else entirely. Now scoped to after the
 *               import started.
 *   6 task      was a hardcoded FAIL string. Now a real call to the 0nTask API.
 *   7 export    GET web0n /api/bundle/export → 404. A6/A3 outbound unbuilt.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const BASE = process.env.BASE || 'https://app.0ncore.com'
const WEB0N = process.env.WEB0N || 'https://web0n.com'
const ONTASK = process.env.ONTASK || 'https://app.0ntask.com'
const SSO_KEY = process.env.CRM_SSO_KEY || process.env.SSO_KEY || ''
const LOCATION = process.env.LOCATION_ID || 'nphConTwfHcVE1oA0uep'
const COMPANY = process.env.COMPANY_ID || 'bknfhTkdDLapbwfZqQNi'
const ALLOW_WRITE = process.argv.includes('--write')

/** The operator's key already exists on disk; make them not have to export it. */
function ontaskKey() {
  if (process.env.ONTASK_API_KEY) return process.env.ONTASK_API_KEY.trim()
  try {
    return fs.readFileSync(path.join(os.homedir(), '.0n', 'ontask-key'), 'utf8').trim()
  } catch {
    return ''
  }
}

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
  if (!token) {
    console.log('  (no session — CRM_SSO_KEY unset or rejected; steps 3–5 will report BLOCKED)')
    console.log('   vercel env pull /tmp/onork.env --environment=production && set -a && . /tmp/onork.env\n')
  }

  let bundle = null
  let importedAt = null   // step 5 will not accept evidence older than this
  let created = 0

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
  //
  // THE PROBE RUNS EVEN WITH NOTHING TO RENDER, and that is the change. This
  // step used to skip itself the moment step 1 failed, which is every run there
  // has ever been — so the check had never executed once and nobody knew
  // whether the render half was ready or also broken. A blocked step that
  // reports nothing teaches nothing. It still does not PASS on the homepage's
  // markup: the claim is that OUR GENERATED SITE carries SXO and CRO9, and a
  // hand-built homepage is not that site.
  {
    const step = STEPS[1]
    const r = await fetch(`${WEB0N}/`).catch(() => null)
    const html = r?.ok ? await r.text() : ''
    const hasSxo = /application\/ld\+json/.test(html)
    const hasCro9 = /cro9/i.test(html)
    const shell = `render shell: SXO ${hasSxo ? 'yes' : 'no'}, CRO9 ${hasCro9 ? 'yes' : 'no'}`

    if (!bundle) record(step, BLOCKED, `no bundle from step 1 to render — ${shell}`)
    else if (hasSxo && hasCro9) record(step, PASS, 'SXO JSON-LD and CRO9 script both present')
    else record(step, FAIL, `${shell} — a rendered site must carry both`)
  }

  // ── 3 · INSTALL ─────────────────────────────────────────────────────────
  //
  // READS THE VERDICT LADDER, NOT status='active'. The 29 dead rows were flipped
  // to 'archived' under the archive-with-receipts ruling, so status now answers
  // "is this row still counted" and says nothing about whether it can write.
  // lib/crm/install-verdict.ts owns that question and /api/mkt/installs exposes
  // it as `verdict` + `hasToken`.
  //
  // AND IT ASKS THE REGISTRY-WIDE QUESTION FIRST. The one usable install on file
  // is company-scoped with an EMPTY locationId — a location-scoped query returns
  // nothing and would report the whole registry dead. That distinction is the
  // finding, not noise: the agency can mint, the customer's sub-account cannot.
  {
    const step = STEPS[2]
    if (!token) record(step, BLOCKED, 'no session — CRM_SSO_KEY unset')
    else {
      const r = await fetch(`${BASE}/api/mkt/installs`, { headers: auth }).catch(() => null)
      if (!r || r.status === 404) {
        record(step, FAIL, 'no install registry endpoint — /api/mkt/installs is gone (it was live 2026-08-18)')
      } else if (r.status === 401) {
        record(step, BLOCKED, 'session rejected by the registry')
      } else {
        const j = await r.json().catch(() => ({}))
        const all = j?.installs ?? []
        const here = all.filter((i) => i.locationId === LOCATION)
        const usableHere = here.filter((i) => i.hasToken)
        const usableAnywhere = all.filter((i) => i.hasToken)

        if (usableHere.length) {
          record(step, PASS, `${usableHere.length} usable install on ${LOCATION} (${usableHere.map((i) => i.verdict).join(', ')})`)
        } else if (!all.length) {
          record(step, FAIL, 'registry reachable and empty — no install has ever been recorded')
        } else {
          // Say what is actually wrong with THIS account, in the registry's own
          // words, rather than a summary number that fits every failure mode.
          const why = here.length
            ? here.map((i) => `${i.appId?.slice(-6) ?? 'no-app'}:${i.verdict}`).join(', ')
            : 'no row at all'
          const elsewhere = usableAnywhere.length
            ? ` — ${usableAnywhere.length} usable elsewhere (${usableAnywhere.map((i) => i.locationId || 'company-level').join(', ')}), so the exchange works and this account is not connected`
            : ' — and nothing in the registry is usable, which is a token exchange that has never succeeded'
          record(step, FAIL, `${LOCATION}: ${why}${elsewhere}. ${j.total} rows, ${j.live} usable.`)
        }
      }
    }
  }

  // ── 4 · IMPORT ──────────────────────────────────────────────────────────
  //
  // A DRY RUN IS NOT A PASS. It used to be: any 200 with receipts counted, so a
  // default read-only run could report step 4 green having written nothing into
  // any account. The step claims "bundle → sub-account", and a dry run is
  // precisely the thing that does not reach the sub-account.
  {
    const step = STEPS[3]
    if (!token) record(step, BLOCKED, 'no session')
    else if (!bundle) record(step, BLOCKED, 'no bundle from step 1')
    else {
      importedAt = Date.now()
      const r = await fetch(`${BASE}/api/bundle/import`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ bundle, locationId: LOCATION, mode: ALLOW_WRITE ? 'execute' : 'dry_run' }),
      }).catch(() => null)
      const j = r ? await r.json().catch(() => ({})) : {}
      const receipts = j?.receipts?.length ?? 0
      created = j?.created ?? 0

      if (!r?.ok) record(step, FAIL, `${r?.status} — ${JSON.stringify(j).slice(0, 120)}`)
      else if (!ALLOW_WRITE) record(step, BLOCKED, `dry run only: would create ${j.willCreate ?? receipts}, refuse ${j.willRefuse ?? 0}. Pass --write to prove the write.`)
      else if (created > 0) record(step, PASS, `${created} created, ${j.failed ?? 0} failed, ${j.refused ?? 0} refused`)
      else record(step, FAIL, `execute wrote nothing: ${receipts} receipts, ${j.failed ?? 0} failed, ${j.refused ?? 0} refused`)
    }
  }

  // ── 5 · PUBLISH ─────────────────────────────────────────────────────────
  //
  // READ IT BACK, AND ONLY COUNT WHAT THIS RUN PUT THERE. "The publish call
  // returned 200" was never evidence; neither is "the account has activity".
  // The old assertion — activity.length > 0 — passed against contacts added on
  // 2026-08-11 by something else entirely, on an account whose install holds no
  // token and cannot be written to at all. An account that has been alive for
  // months will satisfy that check forever, including on the day the import
  // silently stops working. So: nothing older than the import counts.
  {
    const step = STEPS[4]
    if (!ALLOW_WRITE) record(step, BLOCKED, 'read-only run — pass --write to check a real publish')
    else if (!token) record(step, BLOCKED, 'no session')
    else if (!importedAt || created === 0) record(step, BLOCKED, 'step 4 wrote nothing, so there is nothing to read back')
    else {
      const r = await fetch(`${BASE}/api/portal/${LOCATION}/summary`, { headers: auth }).catch(() => null)
      const j = r ? await r.json().catch(() => ({})) : {}
      if (!r?.ok) {
        record(step, FAIL, `account not readable: ${r?.status} ${JSON.stringify(j).slice(0, 100)}`)
      } else {
        const activity = j?.activity ?? []
        const fresh = activity.filter((a) => a.at && Date.parse(a.at) >= importedAt - 60_000)
        if (fresh.length) record(step, PASS, `${fresh.length} of ${activity.length} activity entries postdate the import`)
        else record(step, FAIL, `${activity.length} activity entries, none since the import began — older activity is not evidence of this publish`)
      }
    }
  }

  // ── 6 · TASK ────────────────────────────────────────────────────────────
  //
  // THIS WAS A HARDCODED FAIL STRING — "A5 not built" — which is an opinion in a
  // file that claims to only report evidence. It also could not notice the day
  // it stopped being true. It now makes a real call and asserts on both halves
  // of the round trip, because they fail independently:
  //
  //   RETURN  a task assigned to 0n reaches completed carrying a receipt.
  //           This half works today and is done by hand.
  //   DISPATCH the assignment reaches 0n without a human carrying it —
  //           task.updated webhook → receiver → wake (ops-wake-loop).
  //
  // CONVENTION, so the dispatch half is machine-checkable rather than argued:
  // the receipt written back by a woken worker contains the literal token
  // WAKE-RECEIPT. Whoever lands ops-wake-loop writes that token and this step
  // turns green by itself. A receipt a human typed after being told in chat is
  // the return half only, and this step keeps saying so.
  {
    const step = STEPS[5]
    const key = ontaskKey()
    if (!key) record(step, BLOCKED, 'no ONTASK_API_KEY and no ~/.0n/ontask-key')
    else {
      const r = await fetch(`${ONTASK}/api/v1/tasks?limit=100`, {
        headers: { Authorization: `Bearer ${key}` },
      }).catch(() => null)
      const j = r ? await r.json().catch(() => ({})) : {}
      const tasks = j?.tasks ?? []

      if (!r?.ok) {
        record(step, FAIL, `0nTask API ${r?.status ?? 'unreachable'} — ${JSON.stringify(j).slice(0, 100)}`)
      } else if (!tasks.length) {
        record(step, FAIL, 'the queue is empty — nothing has ever been assigned to 0n')
      } else {
        const mine = tasks.filter((t) => t.assignee === 'ai')
        const returned = mine.filter((t) => t.status === 'completed' && /receipt/i.test(t.notes || ''))
        const dispatched = returned.filter((t) => /WAKE-RECEIPT/.test(t.notes || ''))

        if (returned.length && dispatched.length) {
          record(step, PASS, `${dispatched.length} task(s) woken and completed with receipts`)
        } else if (returned.length) {
          record(step, FAIL, `return half proven — ${returned.length}/${mine.length} assigned tasks completed with receipts — but zero carry WAKE-RECEIPT: a human still carries every assignment to 0n (ops-wake-loop unbuilt)`)
        } else {
          record(step, FAIL, `${mine.length} task(s) assigned to 0n, none completed with a receipt trail (A5 not built)`)
        }
      }
    }
  }

  // ── 7 · EXPORT ──────────────────────────────────────────────────────────
  {
    const step = STEPS[6]
    const r = await fetch(`${WEB0N}/api/bundle/export?site=smoke`).catch(() => null)
    if (!r || r.status === 404) record(step, FAIL, 'GET /api/bundle/export not built — the studio exports client-side only (A6/A3)')
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
    console.log('SMOKE 7/7 first-gap=none')
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
  // One line the bridge can paste after each phase without reading the rest.
  const gap = first ? `step${first.step.n}:${first.step.id}` : `blocked:${results.find((r) => r.status === BLOCKED)?.step.id ?? 'none'}`
  console.log(`\nSMOKE ${passed}/7 first-gap=${gap}\n`)
  process.exit(1)
}

main().catch((e) => {
  console.error('\nsmoke test crashed:', e.message)
  process.exit(1)
})
