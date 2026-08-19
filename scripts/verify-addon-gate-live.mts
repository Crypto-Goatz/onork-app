/**
 * The gate, over real HTTP, against the deployed site.
 *
 * The unit-level script (verify-addon-gate.mts) proves the resolver. This one
 * proves the WIRING: that /x/[slug] and /api/addons/[slug]/* actually consult
 * it in production, with a real signed-in session, and that the states a
 * customer would hit come back as 402 / 200 and not 500.
 *
 * The session is minted through the admin API against a throwaway account and
 * the account is deleted at the end. Nothing here touches a real customer.
 */
import { createClient } from '@supabase/supabase-js'

const BASE = process.env.GATE_BASE || 'https://www.0ncore.com'
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!
const REF = new URL(URL_).hostname.split('.')[0]
const SLUG = 'sxo'
const LOC = 'zzz-cece-live-gate'

const admin = createClient(URL_, SVC, { auth: { persistSession: false } })
let fails = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fails++
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label} → ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`)
}

/** The cookie @supabase/ssr v0.8 reads: base64- prefixed JSON of the session. */
function sessionCookie(session: Record<string, unknown>) {
  const value = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
  return `sb-${REF}-auth-token=${value}`
}

async function get(path: string, cookie?: string) {
  const r = await fetch(BASE + path, {
    headers: cookie ? { cookie } : {},
    redirect: 'manual',
  })
  return { status: r.status, body: await r.text() }
}
async function post(path: string, cookie: string, body: unknown) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    redirect: 'manual',
  })
  return { status: r.status, body: await r.text() }
}

async function main() {
  const email = `gate-verify-${Date.now()}@0ncore.local`
  const password = `0n_${Math.random().toString(36).slice(2)}Aa1!`

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (cErr) throw new Error('createUser: ' + cErr.message)
  const uid = created.user!.id
  console.log(`Throwaway account ${email} (${uid}), location ${LOC}\n`)

  const cleanup = async () => {
    await admin.from('addon_entitlements').delete().eq('location_id', LOC)
    await admin.from('location_plans').delete().eq('location_id', LOC)
    await admin.from('addon_configs').delete().eq('user_id', uid)
    await admin.from('profiles').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid)
  }

  try {
    // profiles row carries the location; upsert because a trigger may create it.
    const { error: pErr } = await admin.from('profiles')
      .upsert({ id: uid, email, crm_location_id: LOC }, { onConflict: 'id' })
    if (pErr) throw new Error('profile: ' + pErr.message)

    const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
    const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({ email, password })
    if (sErr || !signIn.session) throw new Error('signIn: ' + (sErr?.message ?? 'no session'))
    const cookie = sessionCookie(signIn.session as unknown as Record<string, unknown>)

    console.log('── signed out ──')
    let r = await get(`/x/${SLUG}`)
    check('/x/sxo status', r.status, 200)
    check('shows the sign-in lock', r.body.includes('Add-ons are enabled per CRM location'), true)
    check('no Run button', r.body.includes('Run now'), false)
    r = await post(`/api/addons/${SLUG}/execute`, '', {})
    check('execute unauthenticated', r.status, 401)

    console.log('\n── signed in, LOCKED (nothing grants it) ──')
    r = await get(`/x/${SLUG}`, cookie)
    check('/x/sxo status', r.status, 200)
    check('locked panel', r.body.includes('Not switched on for this location'), true)
    check('names the location', r.body.includes(LOC), true)
    check('no Run button', r.body.includes('Run now'), false)
    r = await post(`/api/addons/${SLUG}/execute`, cookie, {})
    check('execute → 402 payment required', r.status, 402)
    console.log(`         ${r.body.slice(0, 160)}`)
    r = await get(`/api/addons/${SLUG}/config`, cookie)
    check('config GET → 402', r.status, 402)

    console.log('\n── signed in, ACTIVE via the tier ladder ──')
    await admin.from('location_plans').upsert({ location_id: LOC, tier: 'enterprise', source: 'manual', note: 'gate verification' })
    r = await get(`/x/${SLUG}`, cookie)
    check('frame renders', r.body.includes('Run now'), true)
    check('says why it is open', r.body.includes('Included on the enterprise plan'), true)
    r = await get(`/api/addons/${SLUG}/config`, cookie)
    check('config GET → 200', r.status, 200)

    console.log('\n── signed in, GRACE (lapsed 3 days, 7-day window) ──')
    await admin.from('location_plans').delete().eq('location_id', LOC)
    await admin.from('addon_entitlements').upsert({
      location_id: LOC, addon_slug: SLUG, status: 'active', source: 'purchase',
      expires_at: new Date(Date.now() - 3 * 86400000).toISOString(), grace_days: 7,
    })
    r = await get(`/x/${SLUG}`, cookie)
    check('frame still renders in grace', r.body.includes('Run now'), true)
    check('countdown shown', r.body.includes('4 days left'), true)
    r = await get(`/api/addons/${SLUG}/config`, cookie)
    check('config GET → 200 during grace', r.status, 200)

    console.log('\n── signed in, REVOKED (veto beats everything) ──')
    await admin.from('location_plans').upsert({ location_id: LOC, tier: 'enterprise', source: 'manual' })
    await admin.from('addon_entitlements').upsert({
      location_id: LOC, addon_slug: SLUG, status: 'revoked', source: 'grant', note: 'gate verification',
    })
    r = await get(`/x/${SLUG}`, cookie)
    check('locked despite enterprise', r.body.includes('Run now'), false)
    check('says it was removed', r.body.includes('was removed for this location'), true)
    r = await post(`/api/addons/${SLUG}/execute`, cookie, {})
    check('execute → 402', r.status, 402)

    console.log('\n── the Hub agrees with the door ──')
    await admin.from('addon_entitlements').delete().eq('location_id', LOC)
    r = await get('/api/hub/home', cookie)
    const hub = JSON.parse(r.body)
    check('hub authed', hub.authed, true)
    // Was the three workflow add-ons. Course Builder and lead0n joined the
    // registry when they migrated onto the frame, so enterprise now reaches
    // five rungs — which is the tier ladder working, not a regression.
    check('enterprise opens every registered tile', hub.apps.map((a: {slug: string}) => a.slug).sort(),
      ['0ncouncil', 'ai-course-builder', 'content-engine', 'lead0n', 'sxo'])
    // Every tile opens through the frame. A tile pointing at /dashboard/* would
    // bounce the customer to /hub via the owner-only H1 gate.
    const hrefs = Object.fromEntries(hub.apps.map((a: {slug: string; href: string}) => [a.slug, a.href]))
    check('course-builder tile opens the frame', hrefs['ai-course-builder'], '/x/ai-course-builder')
    check('lead0n tile opens the frame', hrefs['lead0n'], '/x/lead0n')
    check('no tile points into the owner-only dashboard',
      Object.values(hrefs).filter((h) => String(h).startsWith('/dashboard')), [])
    await admin.from('location_plans').delete().eq('location_id', LOC)
    r = await get('/api/hub/home', cookie)
    const hub2 = JSON.parse(r.body)
    check('no plan → no open tiles', hub2.apps.length, 0)
    check('and they appear as locked, with a reason', hub2.locked.some((t: {blurb: string}) => t.blurb.includes('No plan is recorded')), true)

    console.log('\n── unknown slug ──')
    r = await get('/x/not-a-real-addon', cookie)
    check('404', r.status, 404)
    r = await get('/x/voice-ai-agent', cookie)
    check('listed but no code → 404, not an empty shell', r.status, 404)
  } finally {
    await cleanup()
    // Scoped to LOC: a table-wide count goes red on any unrelated row and says
    // nothing about whether THIS script cleaned up after itself.
    const { count } = await admin.from('addon_entitlements')
      .select('*', { count: 'exact', head: true }).eq('location_id', LOC)
    const { count: c2 } = await admin.from('location_plans')
      .select('*', { count: 'exact', head: true }).eq('location_id', LOC)
    console.log(`\nCleanup: addon_entitlements=${count} location_plans=${c2} (account deleted)`)
  }

  console.log(fails === 0 ? '\nALL LIVE CHECKS PASSED\n' : `\n${fails} LIVE CHECK(S) FAILED\n`)
  process.exit(fails === 0 ? 0 : 1)
}

main().catch((e) => { console.error('THREW:', e); process.exit(1) })
