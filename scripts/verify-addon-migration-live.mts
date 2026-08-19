/**
 * The migration, over real HTTP, against the deployed site.
 *
 * verify-addon-migration.mts proves the resolver agrees. This proves the
 * WIRING: that Course Builder's and lead0n's own routes and own APIs actually
 * consult the gate in production — which is the whole point, because both
 * shipped with front doors that checked only that you were signed in.
 *
 * THE ONE THAT MATTERS IS THE 402. A signed-OUT 401 proves nothing new; these
 * endpoints already refused anonymous callers. The regression this migration
 * fixes is a signed-IN, unentitled account being able to generate a course and
 * publish it into a live CRM, so the check is made with a real session that has
 * no entitlement, and again after flipping one on.
 *
 * Throwaway account, synthetic location, deleted at the end.
 */
import { createClient } from '@supabase/supabase-js'

const BASE = process.env.GATE_BASE || 'https://www.0ncore.com'
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!
const REF = new URL(URL_).hostname.split('.')[0]
const LOC = 'zzz-cece-live-migrate'

const admin = createClient(URL_, SVC, { auth: { persistSession: false } })
let fails = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fails++
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label} → ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`)
}

function sessionCookie(session: Record<string, unknown>) {
  return `sb-${REF}-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`
}
async function req(method: string, path: string, cookie?: string, body?: unknown) {
  const r = await fetch(BASE + path, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  })
  return { status: r.status, body: await r.text() }
}
const get = (p: string, c?: string) => req('GET', p, c)
const post = (p: string, c: string | undefined, b: unknown) => req('POST', p, c, b)

async function main() {
  const email = `migrate-verify-${Date.now()}@0ncore.local`
  const password = `0n_${Math.random().toString(36).slice(2)}Aa1!`
  const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (cErr) throw new Error('createUser: ' + cErr.message)
  const uid = created.user!.id
  console.log(`Throwaway account ${email} (${uid}), location ${LOC}\n`)

  const cleanup = async () => {
    await admin.from('addon_entitlements').delete().eq('location_id', LOC)
    await admin.from('location_plans').delete().eq('location_id', LOC)
    await admin.from('profiles').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid)
  }

  try {
    const { error: pErr } = await admin.from('profiles')
      .upsert({ id: uid, email, crm_location_id: LOC }, { onConflict: 'id' })
    if (pErr) throw new Error('profile: ' + pErr.message)

    const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
    const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({ email, password })
    if (sErr || !signIn.session) throw new Error('signIn: ' + (sErr?.message ?? 'no session'))
    const cookie = sessionCookie(signIn.session as unknown as Record<string, unknown>)

    console.log('── the doors exist at all (both 404d before the migration) ──')
    for (const slug of ['ai-course-builder', 'lead0n']) {
      check(`/x/${slug} is a door`, (await get(`/x/${slug}`, cookie)).status, 200)
    }

    console.log('\n── signed in, NOT entitled ──')
    let r = await get('/x/ai-course-builder', cookie)
    check('/x/ai-course-builder locked panel', r.body.includes('Not switched on for this location'), true)
    check('  names the location', r.body.includes(LOC), true)
    r = await get('/x/lead0n', cookie)
    check('/x/lead0n locked panel', r.body.includes('Not switched on for this location'), true)

    // THE REGRESSION THIS FIXES: signed in, no entitlement, live CRM writes.
    r = await get('/api/course-builder/courses', cookie)
    check('course list → 402 (was 200 for anyone signed in)', r.status, 402)
    r = await post('/api/course-builder/courses', cookie, { topic: 't', audience: 'a', learningOutcome: 'o' })
    check('course GENERATE → 402', r.status, 402)
    console.log(`         ${r.body.slice(0, 150)}`)
    r = await post('/api/leadscout', cookie, { step: 'find', trade: 'plumber', where: 'Pittsburgh' })
    check('lead0n search → 402', r.status, 402)

    // A customer must never be sent into /dashboard/*: the H1 gate makes it
    // owner-only and bounces them to /hub. This is the bug the first cut of the
    // migration shipped, caught here and not in the resolver.
    console.log('\n── the owner-only dashboard is not a customer door ──')
    const bounce = await fetch(BASE + '/dashboard/course-builder', { headers: { cookie }, redirect: 'manual' })
    check('/dashboard/course-builder bounces a customer', bounce.status, 307)
    check('  to /hub', bounce.headers.get('location')?.endsWith('/hub'), true)

    console.log('\n── THE FLIP: entitlement on ──')
    for (const slug of ['ai-course-builder', 'lead0n']) {
      await admin.from('addon_entitlements').upsert({
        location_id: LOC, addon_slug: slug, status: 'active', source: 'purchase', note: 'migration verification',
      })
    }
    r = await get('/x/ai-course-builder', cookie)
    check('/x/ now renders Course Builder itself', r.body.includes('New course'), true)
    check('  and not the generic frame', r.body.includes('Run now'), false)
    check('  no locked panel', r.body.includes('Not switched on for this location'), false)
    r = await get('/x/lead0n', cookie)
    check('/x/lead0n renders the lead search', r.body.includes('Find real local businesses'), true)
    r = await get('/api/course-builder/courses', cookie)
    check('course list → 200', r.status, 200)
    r = await post('/api/leadscout', cookie, { step: 'find', trade: '', where: '' })
    check('lead0n API past the gate (400 on empty input, not 402)', r.status !== 402, true)
    console.log(`         ${r.status}: ${r.body.slice(0, 120)}`)

    console.log('\n── THE HUB UNLOCK MOMENT ──')
    r = await get('/api/hub/home', cookie)
    const hub = JSON.parse(r.body)
    const open = hub.apps.map((a: { slug: string }) => a.slug).sort()
    check('both tiles now open', open.includes('ai-course-builder') && open.includes('lead0n'), true)
    const hrefs = Object.fromEntries(hub.apps.map((a: { slug: string; href: string }) => [a.slug, a.href]))
    check('course-builder tile href', hrefs['ai-course-builder'], '/x/ai-course-builder')
    check('lead0n tile href', hrefs['lead0n'], '/x/lead0n')
    check('no tile points into the owner-only dashboard',
      Object.values(hrefs).filter((h) => String(h).startsWith('/dashboard')), [])

    console.log('\n── AND BACK: revoke re-locks the tile ──')
    for (const slug of ['ai-course-builder', 'lead0n']) {
      await admin.from('addon_entitlements').upsert({
        location_id: LOC, addon_slug: slug, status: 'revoked', source: 'grant', note: 'migration verification',
      })
    }
    r = await get('/api/hub/home', cookie)
    const hub2 = JSON.parse(r.body)
    check('no open tiles', hub2.apps.length, 0)
    // hub.locked is deliberately capped at the strongest six of ~46 listings,
    // so absence from it proves nothing. Assert the door instead.
    r = await get('/x/lead0n', cookie)
    check('lead0n door locked again', r.body.includes('was removed for this location'), true)
    r = await get('/x/ai-course-builder', cookie)
    check('course builder door locked again', r.body.includes('was removed for this location'), true)
    check('  and its app is gone', r.body.includes('New course'), false)
    r = await post('/api/course-builder/courses', cookie, { topic: 't', audience: 'a', learningOutcome: 'o' })
    check('generate → 402 again', r.status, 402)
  } finally {
    await cleanup()
    const { count } = await admin.from('addon_entitlements')
      .select('*', { count: 'exact', head: true }).eq('location_id', LOC)
    console.log(`\nCleanup: addon_entitlements=${count} for ${LOC} (account deleted)`)
  }

  console.log(fails === 0 ? '\nALL LIVE CHECKS PASSED\n' : `\n${fails} LIVE CHECK(S) FAILED\n`)
  process.exit(fails === 0 ? 0 : 1)
}

main().catch((e) => { console.error('THREW:', e); process.exit(1) })
