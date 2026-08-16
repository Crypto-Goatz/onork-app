#!/usr/bin/env node
/**
 * Marketplace smoke test — drive a Custom Page exactly as the platform does.
 *
 * WHY THIS CAN EXIST AT ALL. The SSO handshake is symmetric: the platform
 * encrypts a user context with the app's shared secret and the app decrypts it.
 * Holding that same secret means this script can ENCRYPT a context in the
 * identical wire format, post it to /api/sso, and receive a genuine app JWT —
 * the same token a real installer's browser would get.
 *
 * WHAT THAT BUYS. Everything downstream is then testable from a terminal: the
 * session, the course API, generation, publishing. It is the reviewer's journey
 * without a browser, which means a failing app is caught before submission
 * rather than by the reviewer.
 *
 * WHAT IT DOES NOT PROVE. It cannot verify the marketplace portal config —
 * whether the redirect URI, scopes and Custom Page URL were saved correctly, or
 * that the platform actually posts the context in an iframe. Those need one real
 * install. This proves the half we own: given a valid context, does the product
 * work end to end.
 *
 *   node scripts/marketplace-smoke.mjs                    # session only
 *   node scripts/marketplace-smoke.mjs --full             # + publish a course
 *
 * Requires: SSO_KEY, and optionally BASE (defaults to production).
 */
import crypto from 'node:crypto'

const BASE = process.env.BASE || 'https://app.0ncore.com'
const SSO_KEY = process.env.SSO_KEY
const COMPANY = process.env.COMPANY_ID || 'bknfhTkdDLapbwfZqQNi'
const LOCATION = process.env.LOCATION_ID || 'nphConTwfHcVE1oA0uep'
const FULL = process.argv.includes('--full')

if (!SSO_KEY) {
  console.error('SSO_KEY is required — the shared secret from the app settings.')
  process.exit(1)
}

/** OpenSSL EVP_BytesToKey, MD5, one iteration — the inverse of lib/crm/sso.ts. */
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

/** Produce the platform's wire format: base64("Salted__" + salt + ciphertext). */
function encryptContext(ctx, passphrase) {
  const salt = crypto.randomBytes(8)
  const { key, iv } = deriveKeyAndIv(passphrase, salt)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  const body = Buffer.concat([cipher.update(JSON.stringify(ctx), 'utf8'), cipher.final()])
  return Buffer.concat([Buffer.from('Salted__', 'utf8'), salt, body]).toString('base64')
}

const results = []
function step(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function main() {
  console.log(`\nMarketplace smoke test → ${BASE}\n`)

  // ── 1. The handshake ─────────────────────────────────────────────────────
  const context = {
    userId: 'smoke-test-user',
    companyId: COMPANY,
    role: 'admin',
    type: 'agency',
    userName: 'Smoke Test',
    email: 'smoke@0ncore.local',
    activeLocation: LOCATION,
  }
  const encryptedData = encryptContext(context, SSO_KEY)

  const ssoRes = await fetch(`${BASE}/api/sso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encryptedData }),
  })
  const sso = await ssoRes.json().catch(() => ({}))

  if (!ssoRes.ok || !sso.token) {
    step('SSO handshake', false, `${ssoRes.status} ${sso.error ?? ''}`)
    console.log('\n  The shared secret does not match any key the server holds.')
    console.log('  Nothing downstream can be tested until that is fixed.\n')
    process.exit(1)
  }
  step('SSO handshake', true, 'app JWT issued')
  const token = sso.token
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  // ── 2. Identity ──────────────────────────────────────────────────────────
  const meRes = await fetch(`${BASE}/api/account/me`, { headers: auth })
  const me = await meRes.json().catch(() => ({}))
  step('0n account exists', meRes.ok && Boolean(me.account?.id),
       meRes.ok ? `${me.account?.email ?? 'no email'}${me.account?.accountCreatedNow ? ' (created now)' : ''}` : `${meRes.status}`)

  // ── 3. The surfaces a reviewer clicks ───────────────────────────────────
  for (const path of ['/app/course', '/crm/account', '/crm/courses']) {
    const r = await fetch(`${BASE}${path}`)
    step(`page ${path}`, r.ok, `HTTP ${r.status}`)
  }

  // ── 4. The course API, authenticated as a marketplace user ──────────────
  const outlineRes = await fetch(`${BASE}/api/crm/courses?step=outline`, {
    method: 'POST', headers: auth,
    body: JSON.stringify({ config: {
      topic: 'How to prepare for your first dental implant',
      audience: 'Nervous first-time patients',
      lessonCount: 2, includeQuizzes: true, tone: 'professional', learningOutcome: '',
    } }),
  })
  const outline = await outlineRes.json().catch(() => ({}))
  const lessons = outline?.outline?.lessons?.length ?? 0
  step('course outline', outlineRes.ok && lessons > 0,
       outlineRes.ok ? `${lessons} lessons: ${outline.outline?.title ?? ''}`.slice(0, 70) : `${outlineRes.status} ${outline.error ?? ''}`)

  if (FULL && outlineRes.ok) {
    const genRes = await fetch(`${BASE}/api/crm/courses?step=generate`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ config: {
        topic: 'How to prepare for your first dental implant',
        audience: 'Nervous first-time patients', lessonCount: 2,
        includeQuizzes: true, tone: 'professional', learningOutcome: '',
      }, outline: outline.outline }),
    })
    const gen = await genRes.json().catch(() => ({}))
    step('course generation', genRes.ok && Boolean(gen.course),
         genRes.ok ? `${gen.course?.lessons?.length ?? 0} written, ${gen.failures?.length ?? 0} failed` : `${genRes.status} ${gen.error ?? ''}`)

    if (genRes.ok && gen.course) {
      const pubRes = await fetch(`${BASE}/api/crm/courses?step=publish`, {
        method: 'POST', headers: auth,
        body: JSON.stringify({ course: gen.course, locationId: LOCATION, priceCents: 0 }),
      })
      const pub = await pubRes.json().catch(() => ({}))
      step('publish to CRM', pubRes.ok, pubRes.ok ? `${pub.lessons ?? 0} lessons via ${pub.method ?? '?'}` : `${pubRes.status} ${pub.error ?? ''}`)
    }
  }

  // ── 5. Policy pages a review will open ──────────────────────────────────
  for (const url of [
    'https://www.0ncore.com/course-builder',
    'https://www.0ncore.com/course-builder/privacy',
    'https://www.0ncore.com/course-builder/terms',
  ]) {
    const r = await fetch(url)
    step(`listing ${url.replace('https://www.0ncore.com', '')}`, r.ok, `HTTP ${r.status}`)
  }

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  if (failed.length) {
    console.log('\nNOT READY — fix these before anyone tests it:')
    for (const f of failed) console.log(`  · ${f.name}: ${f.detail}`)
    process.exit(1)
  }
  console.log('\nReady for a human to test.')
  console.log('Still unproven by this script: portal config (redirect URI, scopes,')
  console.log('Custom Page URL) and that the platform posts the context in an iframe.')
  console.log('Those need one real install.\n')
}

main().catch((e) => { console.error('\nsmoke test crashed:', e.message); process.exit(1) })
