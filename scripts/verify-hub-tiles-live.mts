/**
 * The Hub's tiles, over real HTTP, against the deployed site.
 *
 * WHAT THIS PROVES is the acceptance criterion for the locked-tiles work, and
 * it is a two-part claim that has to be checked separately:
 *
 *   1. every aspirational tile is visibly locked — it carries a padlock and a
 *      SENTENCE, and it is not a link;
 *   2. nothing clickable leads nowhere — every href the Hub can emit is
 *      followed here and must resolve.
 *
 * Part 2 is the half that had actually regressed, and it is not provable by
 * reading the component. The Hub rendered "Open courses" at
 * www.0ncore.com/learn (404) and "Manage billing" as an anchor at a POST-only
 * route (405, zero bytes). Both looked live in the JSX. So this script asks
 * the deployed server for the real payload and then follows every link in it.
 *
 * The session is minted through the admin API against a throwaway account and
 * the account is deleted at the end. Nothing here touches a real customer, and
 * nothing here writes to Stripe: the billing route is probed WITHOUT a session
 * (401 proves POST is routed; 405 would prove it is not) precisely so that
 * verifying a dead link does not create a junk customer as a side effect.
 */
import { createClient } from '@supabase/supabase-js'

const BASE = process.env.HUB_BASE || 'https://app.0ncore.com'
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!
const REF = new URL(URL_).hostname.split('.')[0]
const LOC = 'zzz-cece-hub-tiles'

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

async function get(path: string, cookie?: string) {
  const r = await fetch(path.startsWith('http') ? path : BASE + path, {
    headers: cookie ? { cookie } : {},
    redirect: 'manual',
  })
  return { status: r.status, body: await r.text() }
}

async function main() {
  const email = `hub-verify-${Date.now()}@0ncore.local`
  const password = `0n_${Math.random().toString(36).slice(2)}Aa1!`

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (cErr) throw new Error('createUser: ' + cErr.message)
  const uid = created.user!.id
  console.log(`Throwaway account ${email} (${uid}) against ${BASE}\n`)

  const cleanup = async () => {
    await admin.from('location_plans').delete().eq('location_id', LOC)
    await admin.from('profiles').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid)
  }

  try {
    const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
    const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({ email, password })
    if (sErr || !signIn.session) throw new Error('signIn: ' + (sErr?.message ?? 'no session'))
    const cookie = sessionCookie(signIn.session as unknown as Record<string, unknown>)

    console.log('── the cold visitor: signed in, nothing connected ──')
    const r = await get('/api/hub/home', cookie)
    check('/api/hub/home status', r.status, 200)
    const home = JSON.parse(r.body)
    check('authed', home.authed, true)

    console.log('\n── 1. every aspirational tile is visibly locked ──')
    check('learning carries NO href (not a link)', home.learning?.href ?? null, null)
    check('learning declares the locked state', home.learning?.state, 'locked')
    check('learning says what it would do', (home.learning?.blurb ?? '').length > 20, true)
    check('learning says why it is shut', (home.learning?.note ?? '').length > 20, true)
    check('billing shows no unverified plan', home.billing?.plan ?? null, null)

    const locked: { slug: string; name: string; blurb: string }[] = home.locked ?? []
    check('locked tiles present', locked.length > 0, true)
    check('every locked tile is named', locked.every((t) => !!t.name), true)
    check('every locked tile carries a sentence, not a bare padlock',
      locked.every((t) => (t.blurb ?? '').trim().length > 0), true)
    check('no locked tile carries an href', locked.every((t) => !('href' in t)), true)
    console.log(`         ${locked.length} locked: ${locked.map((t) => t.slug).join(', ')}`)

    console.log('\n── 2. nothing clickable leads nowhere ──')
    // Every href the page can emit, gathered from the payload + the static ones.
    const clickable: string[] = [
      ...(home.apps ?? []).map((a: { href: string }) => a.href),
      ...(home.learning?.href ? [home.learning.href] : []),
      '/marketplace',
      '/account/security',
      '/login',
    ]
    for (const href of clickable) {
      const res = await get(href, cookie)
      const dead = res.status === 404 || res.status === 405 || res.status >= 500
      check(`follows: ${href}`, dead ? `DEAD ${res.status}` : `ok ${res.status}`, `ok ${res.status}`)
    }

    console.log('\n── the two links that used to dead-end ──')
    const learn = await get('https://www.0ncore.com/learn')
    check('the OLD learning target is still 404 (why it was locked)', learn.status, 404)
    check('...and the Hub no longer emits it',
      JSON.stringify(home).includes('0ncore.com/learn'), false)

    const billingGet = await get('/api/billing/portal', cookie)
    check('GET the billing route still 405 (why the anchor was wrong)', billingGet.status, 405)
    const billingPost = await fetch(BASE + '/api/billing/portal', { method: 'POST', redirect: 'manual' })
    check('POST is routed (401 unauth, NOT 405)', billingPost.status, 401)

    // ── The OTHER half of "nothing clickable leads nowhere" ──────────────
    //
    // Everything above ran as a cold visitor, whose apps list is empty — so
    // the OPEN tiles, the ones that are actual links, were never followed.
    // A tile that says "Open" and 404s is the same defect as a locked one
    // that links out, so the entitled case has to be exercised too. Enterprise
    // is the top rung of the ladder, which turns every registered add-on on
    // at once and gives the widest set of hrefs to follow.
    console.log('\n── the entitled visitor: open tiles must open ──')
    await admin.from('profiles').upsert({ id: uid, email, crm_location_id: LOC }, { onConflict: 'id' })
    await admin.from('location_plans').upsert({
      location_id: LOC, tier: 'enterprise', source: 'manual', note: 'hub tile verification',
    })
    const r2 = await get('/api/hub/home', cookie)
    const home2 = JSON.parse(r2.body)
    const apps: { slug: string; href: string; state: string }[] = home2.apps ?? []
    check('entitlement opened tiles', apps.length > 0, true)
    check('no tile is both open and locked', 
      apps.every((a) => !(home2.locked ?? []).some((l: { slug: string }) => l.slug === a.slug)), true)
    console.log(`         ${apps.length} open: ${apps.map((a) => a.slug).join(', ')}`)
    for (const a of apps) {
      const res = await get(a.href, cookie)
      const dead = res.status === 404 || res.status === 405 || res.status >= 500
      check(`opens: ${a.slug} → ${a.href}`, dead ? `DEAD ${res.status}` : `ok ${res.status}`, `ok ${res.status}`)
      // An "Open" tile that renders the LOCKED panel is a dead end wearing a
      // working tile's clothes — the exact bug the per-location gate fixed.
      if (!dead) {
        check(`  ...and ${a.slug} is not secretly locked`,
          res.body.includes('Not switched on for this location'), false)
      }
    }
  } finally {
    await cleanup()
    console.log('\nThrowaway account deleted.')
  }

  console.log(fails ? `\n${fails} FAILED` : '\nAll checks passed.')
  process.exit(fails ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
