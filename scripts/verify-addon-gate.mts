/**
 * Real verification of the add-on gate against the LIVE database.
 * Writes rows, resolves through the actual lib/addons/entitlements.ts, cleans up.
 */
import { resolveEntitlement, setAddonEntitlement } from '@/lib/addons/entitlements'
import { skeletonFor, allSkeletons } from '@/lib/addons/skeleton'
import { createServiceClient } from '@/lib/connect/service-client'

const LOC = 'nphConTwfHcVE1oA0uep'          // customer zero, real row in activated_locations
const LOC_ARCHIVED = 'AeY8M0GNOuJPNkLQ7AAC'  // In2sight — real location, its install is archived
// Synthetic. crm_installations has a unique on (location_id, app_id), so the
// install lifecycle is exercised on an id no customer owns rather than by
// mutating a real row's status.
const LOC_INSTALL = 'zzz-cece-gate-verify'
const SLUG = 'sxo'
const db = createServiceClient()!
let fails = 0

function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fails++
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}\n         got ${JSON.stringify(got)}${ok ? '' : `  want ${JSON.stringify(want)}`}`)
}

const iso = (daysFromNow: number) => new Date(Date.now() + daysFromNow * 86400000).toISOString()

async function clean() {
  await db.from('addon_entitlements').delete().in('location_id', [LOC, LOC_INSTALL, LOC_ARCHIVED])
  await db.from('location_plans').delete().in('location_id', [LOC, LOC_INSTALL, LOC_ARCHIVED])
  await db.from('crm_installations').delete().eq('location_id', LOC_INSTALL)
}

async function main() {
  console.log('\n=== SKELETON ===')
  const s = skeletonFor(SLUG)!
  console.log(JSON.stringify(s, null, 2))
  check('skeleton shape', Object.keys(s).sort(), ['appId', 'entryRoute', 'name', 'requiredEntitlement', 'slug'])
  check('entryRoute', s.entryRoute, '/x/sxo')
  check('requiredEntitlement', s.requiredEntitlement, { key: 'sxo', minTier: 'starter' })
  // Was `null` until the migration registered it. Now it must both EXIST and
  // still name its own CRM app — an install of some other app must not open it.
  const cb = skeletonFor('ai-course-builder')!
  check('course-builder has a skeleton', !!cb, true)
  check('course-builder names its own app', cb.appId, process.env.CRM_COURSE_APP_ID || '69801f7a533633818a22921c')
  console.log(`  skeletons with a working door: ${allSkeletons().map(x => x.slug).join(', ')}`)

  await clean()

  console.log('\n=== 1. NOTHING GRANTS IT ===')
  let v = await resolveEntitlement({ slug: SLUG, locationId: LOC })
  check('state', v.state, 'locked'); check('source', v.source, null); check('verified', v.verified, true)
  console.log(`         reason: ${v.reason}`)

  console.log('\n=== 2. BLANK / DIRTY LOCATION IDS ===')
  check("'' locked", (await resolveEntitlement({ slug: SLUG, locationId: '' })).state, 'locked')
  check('null locked', (await resolveEntitlement({ slug: SLUG, locationId: null })).state, 'locked')
  // profiles really does hold 'nphConTwfHcVE1oA0uep\n'
  await setAddonEntitlement({ locationId: LOC, slug: SLUG, status: 'active', source: 'purchase' })
  v = await resolveEntitlement({ slug: SLUG, locationId: LOC + '\n' })
  check('trailing newline still resolves', [v.state, v.source], ['active', 'explicit'])

  console.log('\n=== 3. EXPLICIT: active / grace / past-grace ===')
  v = await resolveEntitlement({ slug: SLUG, locationId: LOC })
  check('perpetual purchase → active', [v.state, v.source], ['active', 'explicit'])

  await setAddonEntitlement({ locationId: LOC, slug: SLUG, status: 'active', source: 'purchase', expiresAt: iso(-3), graceDays: 7 })
  v = await resolveEntitlement({ slug: SLUG, locationId: LOC })
  check('lapsed 3d, 7d grace → grace', [v.state, v.source], ['grace', 'explicit'])
  check('days left', v.graceDaysLeft, 4)

  await setAddonEntitlement({ locationId: LOC, slug: SLUG, status: 'active', source: 'purchase', expiresAt: iso(-10), graceDays: 7 })
  v = await resolveEntitlement({ slug: SLUG, locationId: LOC })
  check('lapsed 10d → locked', v.state, 'locked')

  console.log('\n=== 4. TIER LADDER (pricing.ts) ===')
  await db.from('location_plans').upsert({ location_id: LOC, tier: 'free', source: 'manual' })
  check('free < starter → still locked', (await resolveEntitlement({ slug: SLUG, locationId: LOC })).state, 'locked')

  await db.from('location_plans').upsert({ location_id: LOC, tier: 'starter', source: 'manual' })
  v = await resolveEntitlement({ slug: SLUG, locationId: LOC })
  check('starter meets starter → active via tier', [v.state, v.source], ['active', 'tier'])
  check('past-grace purchase does not veto the plan', v.locationTier, 'starter')

  await db.from('location_plans').upsert({ location_id: LOC, tier: 'enterprise', source: 'manual' })
  const everything = await Promise.all(allSkeletons().map(k => resolveEntitlement({ slug: k.slug, locationId: LOC })))
  check('enterprise = ALL add-ons', everything.map(x => `${x.slug}:${x.state}`), allSkeletons().map(k => `${k.slug}:active`))

  console.log('\n=== 5. REVOCATION IS A VETO (beats enterprise) ===')
  await setAddonEntitlement({ locationId: LOC, slug: SLUG, status: 'revoked', note: 'chargeback' })
  v = await resolveEntitlement({ slug: SLUG, locationId: LOC })
  check('revoked on enterprise → locked', [v.state, v.source], ['locked', 'explicit'])
  console.log(`         reason: ${v.reason}`)

  console.log('\n=== 6. INSTALL-AS-ENTITLEMENT (no plan, no purchase) ===')
  await clean()
  // Real data first: In2sight's only install row is archived, and an archived
  // install is a product someone removed on purpose.
  const { data: arch } = await db.from('crm_installations').select('id,status').eq('location_id', LOC_ARCHIVED)
  console.log(`         real rows at ${LOC_ARCHIVED}: ${arch?.map(a => a.status).join() || 'none'}`)
  check('archived install at a real location → locked', (await resolveEntitlement({ slug: SLUG, locationId: LOC_ARCHIVED })).state, 'locked')
  check('no install, no plan → locked', (await resolveEntitlement({ slug: SLUG, locationId: LOC_INSTALL })).state, 'locked')

  const { data: ins, error: insErr } = await db.from('crm_installations').insert({
    location_id: LOC_INSTALL, company_id: 'bknfhTkdDLapbwfZqQNi',
    app_id: '69c762225a31e1cd2f28dd4c', access_token: '', refresh_token: '',
    status: 'active', expires_at: iso(1),
  }).select('id').single()
  if (insErr) throw new Error('install insert: ' + insErr.message)
  v = await resolveEntitlement({ slug: SLUG, locationId: LOC_INSTALL })
  check('live install → active via install', [v.state, v.source], ['active', 'install'])

  await db.from('crm_installations').update({ status: 'expired', updated_at: iso(-2) }).eq('id', ins.id)
  v = await resolveEntitlement({ slug: SLUG, locationId: LOC_INSTALL })
  check('credential lapsed 2d → grace via install', [v.state, v.source], ['grace', 'install'])
  check('days left', v.graceDaysLeft, 5)

  await db.from('crm_installations').update({ updated_at: iso(-9) }).eq('id', ins.id)
  check('lapsed 9d → locked', (await resolveEntitlement({ slug: SLUG, locationId: LOC_INSTALL })).state, 'locked')

  await db.from('crm_installations').update({ status: 'archived' }).eq('id', ins.id)
  check('uninstalled → locked', (await resolveEntitlement({ slug: SLUG, locationId: LOC_INSTALL })).state, 'locked')

  await db.from('crm_installations').delete().eq('id', ins.id)

  console.log('\n=== 7. THE EMPTY-STRING INSTALL ROW MUST NEVER GRANT ===')
  const { data: blank } = await db.from('crm_installations').select('id,status,app_id').eq('location_id', '').eq('status', 'active')
  console.log(`         rows with location_id = '': ${blank?.length ?? 0} (status ${blank?.map(b => b.status).join()})`)
  check("'' install does not open anything", (await resolveEntitlement({ slug: SLUG, locationId: '' })).state, 'locked')
  const { error: ckErr } = await db.from('addon_entitlements').insert({ location_id: '', addon_slug: SLUG })
  check('DB refuses a blank location key', !!ckErr, true)
  console.log(`         ${ckErr?.message}`)

  console.log('\n=== 8. OWNER OVERRIDE IS LABELLED, NOT AN ENTITLEMENT ===')
  v = await resolveEntitlement({ slug: SLUG, locationId: '', isOwner: true })
  check('owner opens with no location', [v.state, v.source], ['active', 'owner'])
  // Scoped to the locations THIS script touches. It used to count the whole
  // table, which meant any unrelated row anywhere — a leftover from another
  // team's drill, say — failed a check about what resolveEntitlement wrote.
  // A check that can go red for a reason other than the thing it names is not
  // a check.
  const { count } = await db.from('addon_entitlements')
    .select('*', { count: 'exact', head: true })
    .in('location_id', [LOC, LOC_INSTALL, LOC_ARCHIVED])
  check('owner override wrote no row', count, 0)

  console.log('\n=== 9. UNKNOWN SLUG ===')
  v = await resolveEntitlement({ slug: 'not-a-real-addon', locationId: LOC })
  check('unknown → locked', v.state, 'locked')
  v = await resolveEntitlement({ slug: 'voice-ai-agent', locationId: LOC })  // listed, no definition
  check('listing with no code → locked', v.state, 'locked')
  console.log(`         reason: ${v.reason}`)

  await clean()
  const { count: left } = await db.from('addon_entitlements')
    .select('*', { count: 'exact', head: true })
    .in('location_id', [LOC, LOC_INSTALL, LOC_ARCHIVED])
  const { count: leftP } = await db.from('location_plans')
    .select('*', { count: 'exact', head: true })
    .in('location_id', [LOC, LOC_INSTALL, LOC_ARCHIVED])
  console.log(`\nCleanup: addon_entitlements=${left} location_plans=${leftP}`)
  console.log(fails === 0 ? '\nALL CHECKS PASSED\n' : `\n${fails} CHECK(S) FAILED\n`)
  process.exit(fails === 0 ? 0 : 1)
}

main().catch(async (e) => { console.error('THREW:', e); await clean(); process.exit(1) })
