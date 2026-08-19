#!/usr/bin/env node
/**
 * THE AUTH ACCEPTANCE MATRIX — every entry path × its asserted outcome.
 *
 * Written 2026-08-19 for AUTH OVERHAUL, after Mike's "every single
 * registration and login WORKING PROPERLY" and Supabase logs that showed the
 * auth SERVER succeeding while our app looped after the 302.
 *
 * Run it after every auth-touching deploy:
 *
 *   node scripts/auth-matrix.mjs                     # against production
 *   BASE=https://app.0ncore.com node scripts/auth-matrix.mjs
 *   node scripts/auth-matrix.mjs --live-signup       # + real signup/login/reset
 *
 * ── WHAT THIS PROVES, AND WHAT IT DELIBERATELY DOES NOT ──────────────────
 *
 * Law #2: a check that can pass for a reason other than the thing you are
 * checking is not a check. So every assertion here names the exact artifact —
 * a status code on a named path, a header, a Location host, a cookie Domain,
 * a string in a body — and never a proxy for one.
 *
 * Three provider consents (Google, LinkedIn, Slack) require a human at a
 * browser and CANNOT be asserted from a terminal. They are printed in the
 * MANUAL section, every run, so a green matrix can never be mistaken for full
 * coverage. Law: no silent caps.
 *
 * Exit 0 = every automatable row passed. Exit 1 = at least one failed.
 */

const BASE = (process.env.BASE || 'https://app.0ncore.com').replace(/\/$/, '')
const WWW = (process.env.WWW_BASE || 'https://www.0ncore.com').replace(/\/$/, '')
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pwujhhmlrtxjmjzyttwn.supabase.co').replace(/\/$/, '')
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const LIVE_SIGNUP = process.argv.includes('--live-signup')

const results = []
let failed = 0

function record(area, name, ok, detail) {
  results.push({ area, name, ok, detail })
  if (!ok) failed++
  const mark = ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'
  console.log(`  ${mark}  ${name}`)
  if (detail) console.log(`        ${detail}`)
}

async function check(area, name, fn) {
  try {
    const { ok, detail } = await fn()
    record(area, name, ok, detail)
  } catch (err) {
    record(area, name, false, `threw: ${err.message}`)
  }
}

/** Fetch without following redirects — the Location header IS the assertion. */
function raw(url, init = {}) {
  return fetch(url, { redirect: 'manual', ...init })
}

/**
 * Follow redirects by hand with a cap, remembering every URL seen.
 *
 * This is the loop detector. "No loop" was the acceptance criterion Mike
 * actually asked for, and it is not implied by any single status code — only
 * by walking the chain and finding no URL twice.
 */
async function walk(url, { max = 12, headers = {} } = {}) {
  const chain = []
  let current = url
  for (let i = 0; i < max; i++) {
    chain.push(current)
    const res = await raw(current, { headers })
    if (res.status < 300 || res.status >= 400) {
      return { chain, final: current, status: res.status, res, looped: false }
    }
    const loc = res.headers.get('location')
    if (!loc) return { chain, final: current, status: res.status, res, looped: false }
    const nextUrl = new URL(loc, current).toString()
    if (chain.includes(nextUrl)) {
      chain.push(nextUrl)
      return { chain, final: nextUrl, status: res.status, res, looped: true }
    }
    current = nextUrl
  }
  return { chain, final: current, status: 0, res: null, looped: true }
}

console.log(`\n\x1b[1mAUTH ACCEPTANCE MATRIX\x1b[0m`)
console.log(`  app host : ${BASE}`)
console.log(`  www host : ${WWW}`)
console.log(`  supabase : ${SUPABASE_URL}\n`)

// ─────────────────────────────────────────────────────────────────────────
console.log('\x1b[1m1. THE LOOP BREAKER — a failed callback must land somewhere that explains itself\x1b[0m')
// The whole overhaul exists because /auth/callback answered failures with a
// silent bounce to /login. These two rows are the regression test for that:
// if either ever points back at /login again, the invisible loop is back.

await check('loop', '/auth/callback with no code → /auth/error (never /login)', async () => {
  const res = await raw(`${BASE}/auth/callback`)
  const loc = res.headers.get('location') || ''
  const ok = res.status >= 300 && res.status < 400 && loc.includes('/auth/error') && loc.includes('reason=no_code')
  return { ok, detail: `${res.status} → ${loc || '(no location)'}` }
})

await check('loop', '/auth/callback with a bogus code → /auth/error?reason=exchange_failed', async () => {
  const res = await raw(`${BASE}/auth/callback?code=not-a-real-code-${Date.now()}`)
  const loc = res.headers.get('location') || ''
  const ok = loc.includes('/auth/error') && loc.includes('reason=exchange_failed')
  return { ok, detail: `${res.status} → ${loc || '(no location)'}` }
})

await check('loop', '/auth/callback with a provider error → provider_rejected, description preserved', async () => {
  const res = await raw(`${BASE}/auth/callback?error=access_denied&error_description=User+refused`)
  const loc = res.headers.get('location') || ''
  const ok = loc.includes('reason=provider_rejected') && loc.includes('detail=')
  return { ok, detail: `${res.status} → ${loc || '(no location)'}` }
})

await check('loop', '/auth/error renders the reason in the body (not a blank page)', async () => {
  const res = await fetch(`${BASE}/auth/error?reason=exchange_failed&detail=invalid+flow+state`)
  const body = await res.text()
  // Assert on the DETAIL text, not on the word "error": an error page and an
  // error response both contain "error", which is exactly the trap law #2 names.
  const ok = res.status === 200 && body.includes('invalid flow state') && body.includes('exchange_failed')
  return { ok, detail: `${res.status}, ${body.length}b, detail shown: ${body.includes('invalid flow state')}` }
})

await check('loop', 'the failed-callback chain terminates (no URL visited twice)', async () => {
  const { chain, looped, final, status } = await walk(`${BASE}/auth/callback?code=bogus-${Date.now()}`)
  return {
    ok: !looped && status === 200,
    detail: `${chain.length} hop(s) → ${final} [${status}]${looped ? '  ← LOOPED' : ''}`,
  }
})

// ─────────────────────────────────────────────────────────────────────────
console.log('\n\x1b[1m2. HOST CANONICALISATION — one product, one host\x1b[0m')
// Law #4: two hosts for one origin is a guaranteed outage. Every login referer
// in the Supabase logs was www while the product lives on app.

await check('host', 'app host serves /login itself (not rewritten to /crm/login)', async () => {
  const res = await fetch(`${BASE}/login`)
  const body = await res.text()
  const ok = res.status === 200 && /Welcome back/i.test(body)
  return { ok, detail: `${res.status}, "Welcome back" present: ${/Welcome back/i.test(body)}` }
})

await check('host', 'www host serves /login too (marketing-side sign-in works)', async () => {
  const res = await fetch(`${WWW}/login`)
  const ok = res.status === 200
  return { ok, detail: `${res.status}` }
})

await check('host', 'stray ?code at "/" is rescued into /auth/callback', async () => {
  // The middleware rescue for Supabase's Site-URL fallback. If this stops
  // working, an allow-list miss strands the code on the root with nothing to
  // exchange it — a login that fails by doing nothing at all.
  const res = await raw(`${BASE}/?code=probe-${Date.now()}`)
  const loc = res.headers.get('location') || ''
  const ok = loc.includes('/auth/callback')
  return { ok, detail: `${res.status} → ${loc || '(no location)'}` }
})

await check('host', 'app paths land on the app host, not www', async () => {
  // /crm is the default post-login destination. Until 2026-08-19 the default
  // branch of the callback concatenated the raw origin and stranded www logins
  // on www.0ncore.com/crm. This asserts the fix at the artifact.
  const res = await raw(`${WWW}/crm`)
  const loc = res.headers.get('location') || ''
  // Logged out, /crm should not 500 and should not bounce between hosts.
  const ok = res.status < 500 && !loc.includes('www.0ncore.com/crm')
  return { ok, detail: `${res.status}${loc ? ` → ${loc}` : ''}` }
})

// ─────────────────────────────────────────────────────────────────────────
console.log('\n\x1b[1m3. GATES — protected routes must fail CLOSED on BOTH hosts\x1b[0m')
// The rewrite-before-the-gate bug served /dashboard 200 on the app host while
// www correctly 307'd. Both hosts, every time — that is the only way to see it.

for (const path of ['/dashboard', '/admin', '/profile', '/console']) {
  for (const [label, host] of [['app', BASE], ['www', WWW]]) {
    await check('gate', `${label}${path} redirects to /login when logged out`, async () => {
      const res = await raw(`${host}${path}`)
      const loc = res.headers.get('location') || ''
      const ok = res.status >= 300 && res.status < 400 && loc.includes('/login')
      return { ok, detail: `${res.status}${loc ? ` → ${loc}` : ' (served, NOT gated)'}` }
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────
console.log('\n\x1b[1m4. PROVIDERS — each must be enabled at Supabase and hand off to the real provider\x1b[0m')
// This does NOT prove consent completes. It proves the provider is enabled,
// the client id is present, and the redirect leaves for the right vendor —
// which is where "auth is broken" most often actually lives.

for (const [provider, expectHost] of [
  ['google', 'accounts.google.com'],
  ['linkedin_oidc', 'linkedin.com'],
]) {
  await check('provider', `${provider} /authorize hands off to ${expectHost}`, async () => {
    const url = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(BASE + '/auth/callback')}`
    const res = await raw(url)
    const loc = res.headers.get('location') || ''
    const ok = res.status >= 300 && res.status < 400 && loc.includes(expectHost)
    return { ok, detail: `${res.status} → ${loc.slice(0, 110) || '(no location)'}` }
  })
}

await check('provider', 'slack login route returns an authorize URL', async () => {
  const res = await fetch(`${BASE}/api/auth/connect/slack`)
  if (!res.ok) return { ok: false, detail: `${res.status} — Slack login not configured` }
  const body = await res.json().catch(() => ({}))
  const ok = typeof body.url === 'string' && body.url.includes('slack.com')
  return { ok, detail: ok ? body.url.slice(0, 100) : JSON.stringify(body).slice(0, 140) }
})

// ─────────────────────────────────────────────────────────────────────────
console.log('\n\x1b[1m5. EMAIL + PASSWORD — the one full round trip a terminal can actually complete\x1b[0m')

if (!LIVE_SIGNUP) {
  console.log('  \x1b[33mSKIP\x1b[0m  register → login → session → reset  (pass --live-signup to run)')
} else if (!ANON || !SERVICE) {
  record('email', 'register → login → session', false,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are both required for --live-signup')
} else {
  const email = `authmatrix+${Date.now()}@rocketopp.com`
  const password = `Am-${Math.random().toString(36).slice(2)}-9xQ!`
  let userId = null

  await check('email', 'register creates a user', async () => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const body = await res.json().catch(() => ({}))
    userId = body?.user?.id || body?.id || null
    // Report the platform's own words on failure — "email_exists", "weak
    // password", "signups disabled" are four different bugs with four owners.
    return { ok: res.ok && Boolean(userId), detail: res.ok ? `user ${userId}` : `${res.status} ${JSON.stringify(body).slice(0, 180)}` }
  })

  await check('email', 'login returns a session with an access token', async () => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const body = await res.json().catch(() => ({}))
    const ok = res.ok && typeof body.access_token === 'string'
    return { ok, detail: ok ? 'access_token + refresh_token present' : `${res.status} ${JSON.stringify(body).slice(0, 180)}` }
  })

  await check('email', 'password reset is accepted (not silently swallowed)', async () => {
    // Law #5: RESEND_API_KEY was never set and every email this app "sent" was
    // dropped inside a catch. A 200 here proves Supabase ACCEPTED the request —
    // it does NOT prove delivery. Inbox confirmation stays in MANUAL below.
    const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, redirect_to: `${BASE}/reset-password` }),
    })
    return { ok: res.ok, detail: `${res.status} — accepted, NOT proof of delivery` }
  })

  if (userId) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    })
    console.log(`  \x1b[2mcleanup: deleted test user ${userId} (${res.status})\x1b[0m`)
  }
}

// ─────────────────────────────────────────────────────────────────────────
console.log('\n\x1b[1m6. NOT COVERED BY THIS SCRIPT — a human must do these\x1b[0m')
console.log('  A green run above does NOT mean auth is verified. These need a browser:\n')
for (const row of [
  'Google consent → session persists → lands on /crm on app.0ncore.com, no loop',
  'LinkedIn consent → same, and w_member_social survives (login must not narrow a connect grant)',
  'Slack consent → returns to /install/slack signed in',
  'Password-reset email actually ARRIVES and its link is not otp_expired',
  'CRM marketplace install → Custom Page iframe authenticates via SSO, no LockGate',
  'Chrome extension sign-in (apex vs www CORS preflight)',
  '0nTask Firebase sign-in — needs the authorized-domains entry (Mike, one click)',
]) console.log(`    ·  ${row}`)

// ─────────────────────────────────────────────────────────────────────────
const total = results.length
const passed = total - failed
console.log(`\n\x1b[1m${failed === 0 ? '\x1b[32mALL AUTOMATABLE ROWS PASS' : '\x1b[31mMATRIX FAILED'}\x1b[0m  ${passed}/${total}`)
if (failed) {
  console.log('\nFailures:')
  for (const r of results.filter((r) => !r.ok)) console.log(`  [${r.area}] ${r.name}\n      ${r.detail}`)
}
process.exit(failed === 0 ? 0 : 1)
