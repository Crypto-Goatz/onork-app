#!/usr/bin/env node
/**
 * m4-receipt.mjs — the parity receipt for M4, "one content truth per site".
 *
 * Stage B does not open on an assertion that a merge landed. It opens on a
 * receipt: a program someone else can run that either prints PASS on evidence
 * or prints what it actually got. This is M4's.
 *
 * M4, from the master plan, verbatim: "the bundle carries a `canonicalRenderer`
 * field per site; the importer refuses any write to a site owned by the other
 * renderer with an honest refusal naming the owner. A rule that only lives in a
 * document loses to a deadline — this one lives in the validator."
 *
 * So the receipt checks the rule where it now lives, against the deployed
 * importer, not against the source in this working copy:
 *
 *   A  a bundle owned by web0n            → 409, names web0n, PLANS NOTHING
 *   B  a bundle that declares no owner    → 422 from the validator
 *   C  a bundle owned by an unknown name  → 422, refuses rather than guessing
 *   D  a bundle owned by 0nCore           → 200, a dry run that echoes the owner
 *
 * WHY D MATTERS AS MUCH AS A: a check that refuses everything also passes A, B
 * and C. D is what proves the gate is a gate and not a wall.
 *
 * WHY A ASSERTS "PLANS NOTHING": a 409 whose body still contains "would create
 * 40 pages" is a refusal in the status line and an invitation in the body. The
 * refusal has to happen before the target is read.
 *
 *   vercel env pull /tmp/onork.env --environment=production
 *   set -a && . /tmp/onork.env && set +a
 *   node scripts/m4-receipt.mjs
 *
 * BASE defaults to production. Point it at localhost to check a branch first.
 */
import crypto from 'node:crypto'

const BASE = process.env.BASE || 'https://app.0ncore.com'
const SSO_KEY = process.env.CRM_SSO_KEY || process.env.SSO_KEY || ''
const LOCATION = process.env.LOCATION_ID || 'nphConTwfHcVE1oA0uep'
const COMPANY = process.env.COMPANY_ID || 'bknfhTkdDLapbwfZqQNi'

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
    userId: 'm4-receipt', companyId: COMPANY, role: 'admin', type: 'agency',
    userName: 'M4 receipt', email: 'm4@0ncore.local', activeLocation: LOCATION,
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

/**
 * One page, valid in every respect except the thing under test. If the bundle
 * were malformed the importer would refuse it for that instead, and the receipt
 * would pass for the wrong reason — the failure mode this whole file exists to
 * avoid.
 */
function bundleOwnedBy(owner) {
  const b = {
    name: 'M4 receipt site',
    version: '2.0',
    schemaVersion: '0nblueprint-bundle-v2',
    meta: { generatedBy: 'm4-receipt.mjs', generatedAt: new Date().toISOString() },
    customValues: [{ key: '0n_site_name', label: 'Site name', value: 'M4 receipt site' }],
    sections: {},
    collections: {
      pages: {
        template: 'page',
        label: 'Pages',
        items: [{ externalId: 'page:m4-receipt', title: 'M4 receipt', slug: '/m4-receipt', content: '<p>never written</p>' }],
      },
    },
  }
  if (owner !== undefined) b.canonicalRenderer = owner
  return b
}

async function importCall(token, owner) {
  const r = await fetch(`${BASE}/api/bundle/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    // mode omitted → dry run. Nothing in this file may write to a live account.
    body: JSON.stringify({ bundle: bundleOwnedBy(owner), locationId: LOCATION }),
  })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}

const checks = []
function check(id, what, ok, evidence) {
  checks.push({ id, ok })
  console.log(`  ${ok ? '✓' : '✗'} ${id}  ${what}\n      ${evidence}`)
}

/** What the response actually said, trimmed — printed on failure, never guessed at. */
function shape(res) {
  const p = res.body?.problems?.[0]
  return `HTTP ${res.status} · ${res.body?.error ?? '(no error field)'}${p ? ` · ${p.path}: ${String(p.message).slice(0, 120)}` : ''}`
}

async function main() {
  console.log(`\nM4 — one content truth per site · parity receipt → ${BASE}\n`)

  const token = await mintSession()
  if (!token) {
    console.log('BLOCKED — no session. CRM_SSO_KEY is unset or was rejected, so the importer')
    console.log('cannot be reached past its auth gate. This is not a failure of M4; it is this')
    console.log('receipt refusing to report on a call it never made.')
    console.log('  vercel env pull /tmp/onork.env --environment=production && set -a && . /tmp/onork.env && set +a\n')
    console.log('M4 RECEIPT: BLOCKED (no session)')
    process.exit(2)
  }

  // A — owned by the other renderer.
  const a = await importCall(token, 'web0n')
  const aNamesOwner = a.status === 409
    && a.body?.canonicalRenderer === 'web0n'
    && a.body?.thisRenderer === 'crm'
    && a.body?.problems?.[0]?.path === 'canonicalRenderer'
    && /web0n/.test(a.body?.problems?.[0]?.message ?? '')
  check('A', 'a site owned by web0n is refused, by name', aNamesOwner, aNamesOwner
    ? `409 · owner named: ${JSON.stringify(a.body.problems[0].message).slice(0, 150)}`
    : shape(a))

  // A2 — and refused before anything was planned.
  const plannedAnyway = 'willCreate' in (a.body ?? {}) || Array.isArray(a.body?.receipts)
  check('A2', 'the refusal plans nothing — no import preview in the body', !plannedAnyway,
    plannedAnyway
      ? `body still carried a plan: willCreate=${a.body.willCreate}, receipts=${a.body.receipts?.length}`
      : 'no willCreate, no receipts — the target was never read')

  // B — no owner at all.
  const b = await importCall(token, undefined)
  const bRefused = b.status === 422 && (b.body?.problems ?? []).some((p) => p.path === 'canonicalRenderer')
  check('B', 'a bundle declaring no owner fails the validator', bRefused, bRefused
    ? `422 · ${b.body.problems.find((p) => p.path === 'canonicalRenderer').message.slice(0, 130)}`
    : shape(b))

  // C — an owner nobody has heard of.
  const c = await importCall(token, 'wordpress')
  const cRefused = c.status === 422 && (c.body?.problems ?? []).some((p) => p.path === 'canonicalRenderer')
  check('C', 'an unknown renderer is refused, not guessed at', cRefused, cRefused
    ? `422 · ${c.body.problems.find((p) => p.path === 'canonicalRenderer').message.slice(0, 130)}`
    : shape(c))

  // D — the gate opens for its own renderer.
  const d = await importCall(token, 'crm')
  const dAllowed = d.status === 200
    && d.body?.mode === 'dry_run'
    && d.body?.bundle?.canonicalRenderer === 'crm'
    && typeof d.body?.willCreate === 'number'
  check('D', 'a site owned by 0nCore still imports — this is a gate, not a wall', dAllowed, dAllowed
    ? `200 · dry_run · willCreate=${d.body.willCreate}, willRefuse=${d.body.willRefuse}, owner echoed on the receipt`
    : shape(d))

  const passed = checks.filter((c) => c.ok).length
  console.log(`\n${passed}/${checks.length} checks passing`)
  const verdict = passed === checks.length ? 'PASS' : 'FAIL'
  console.log(`M4 RECEIPT: ${verdict} (${passed}/${checks.length}) · ${BASE} · ${new Date().toISOString()}\n`)
  process.exit(verdict === 'PASS' ? 0 : 1)
}

main().catch((e) => {
  console.error(`\nM4 RECEIPT: ERROR — ${e.message}\n`)
  process.exit(1)
})
