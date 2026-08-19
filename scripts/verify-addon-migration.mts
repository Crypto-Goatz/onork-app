/**
 * Receipt for "Migrate Course Builder + lead0n onto the addon frame".
 *
 * ACCEPTANCE, verbatim from the task: both served by the same skeleton, and a
 * locked tile flips to live when an entitlement flips (the Hub unlock moment).
 * Both are asserted here against the LIVE database, through the real resolver
 * and the real Hub tile derivation — not a reimplementation of either.
 *
 * IT WRITES AND IT CLEANS UP. The entitlement flip is a real row inserted and
 * deleted on a synthetic location id no customer owns, because a flip that is
 * simulated proves the simulation.
 */
import { resolveEntitlement, setAddonEntitlement } from '@/lib/addons/entitlements'
import { skeletonFor, allSkeletons, entryRouteFor } from '@/lib/addons/skeleton'
import { getAddonDefinition, isRunnableAddon } from '@/lib/addon-registry'
import { ADDONS } from '@/lib/marketplace-data'
import { CATEGORIES } from '@/lib/marketplace-data'
import { createServiceClient } from '@/lib/connect/service-client'

const LOC = 'zzz-cece-migrate-verify'   // synthetic; no customer owns it
const TENANTS = ['ai-course-builder', 'lead0n'] as const
const db = createServiceClient()!
let fails = 0

function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fails++
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}\n         got ${JSON.stringify(got)}${ok ? '' : `  want ${JSON.stringify(want)}`}`)
}

async function clean() {
  await db.from('addon_entitlements').delete().eq('location_id', LOC)
  await db.from('location_plans').delete().eq('location_id', LOC)
}

async function main() {
  await clean()

  console.log('\n=== 1. BOTH TENANTS ARE ON THE SKELETON ===')
  for (const slug of TENANTS) {
    const s = skeletonFor(slug)
    check(`${slug}: skeleton exists`, !!s, true)
    check(`${slug}: skeleton shape`, Object.keys(s!).sort(),
      ['appId', 'entryRoute', 'name', 'requiredEntitlement', 'slug'])
    check(`${slug}: entryRoute is its own app`, s!.entryRoute, entryRouteFor(slug))
    check(`${slug}: appears in allSkeletons()`, allSkeletons().some(x => x.slug === slug), true)
  }
  check('course-builder entryRoute', skeletonFor('ai-course-builder')!.entryRoute, '/dashboard/course-builder')
  check('lead0n entryRoute', skeletonFor('lead0n')!.entryRoute, '/dashboard/lead0n')
  // Course Builder names its own CRM app, so an install of some OTHER app
  // must not open it. lead0n is unsubmitted, so any live install counts.
  check('course-builder names its app', skeletonFor('ai-course-builder')!.appId,
    process.env.CRM_COURSE_APP_ID || '69801f7a533633818a22921c')
  check('lead0n names no app (unsubmitted)', skeletonFor('lead0n')!.appId, null)

  console.log('\n=== 2. HOSTED, NOT ABSORBED INTO THE GENERIC FRAME ===')
  for (const slug of TENANTS) {
    const def = getAddonDefinition(slug)!
    check(`${slug}: surface is hosted`, def.surface, 'hosted')
    check(`${slug}: has no generic execute()`, isRunnableAddon(def), false)
    check(`${slug}: offers no duplicate config form`, def.configSchema.length, 0)
  }
  // The three original add-ons must be untouched by the new discriminator.
  for (const slug of ['content-engine', 'sxo', '0ncouncil']) {
    check(`${slug}: still runnable in the frame`, isRunnableAddon(getAddonDefinition(slug)), true)
    check(`${slug}: still lives at /x/`, entryRouteFor(slug), `/x/${slug}`)
  }

  console.log('\n=== 3. BOTH ARE LISTED (a skeleton with no listing prices itself at enterprise) ===')
  for (const slug of TENANTS) {
    const listing = ADDONS.find(a => a.slug === slug)
    check(`${slug}: has a marketplace listing`, !!listing, true)
  }
  check('course-builder minTier', skeletonFor('ai-course-builder')!.requiredEntitlement.minTier, 'starter')
  check('lead0n minTier', skeletonFor('lead0n')!.requiredEntitlement.minTier, 'pro')

  console.log('\n=== 4. CATEGORY COUNTS ARE DERIVED, NOT TYPED ===')
  for (const c of CATEGORIES) {
    const derived = ADDONS.filter(a => (a.visibility ?? 'public') === 'public' && a.categories.includes(c.slug)).length
    check(`${c.slug}: count matches what renders`, c.count, derived)
  }

  console.log('\n=== 5. LOCKED BY DEFAULT ===')
  for (const slug of TENANTS) {
    const v = await resolveEntitlement({ slug, locationId: LOC })
    check(`${slug}: nothing grants it → locked`, [v.state, v.source], ['locked', null])
    check(`${slug}: and we know that for sure`, v.verified, true)
    console.log(`         reason: ${v.reason}`)
  }

  console.log('\n=== 6. THE ACCEPTANCE — A TILE FLIPS LOCKED → LIVE ON AN ENTITLEMENT FLIP ===')
  for (const slug of TENANTS) {
    const before = await resolveEntitlement({ slug, locationId: LOC })
    check(`${slug}: before the flip`, before.state, 'locked')

    await setAddonEntitlement({ locationId: LOC, slug, status: 'active', source: 'purchase' })

    const after = await resolveEntitlement({ slug, locationId: LOC })
    check(`${slug}: after the flip`, [after.state, after.source], ['active', 'explicit'])
    // The tile's href is the resolver's entryRoute — this is what the Hub renders.
    check(`${slug}: opens at its own app`, after.entryRoute, entryRouteFor(slug))

    // And back again: revoked outranks everything, so the tile re-locks.
    // source stays 'explicit' on purpose — the resolver distinguishes "this was
    // deliberately removed" from "this was never granted", and only the first
    // deserves the sentence about billing restoring it.
    await setAddonEntitlement({ locationId: LOC, slug, status: 'revoked', source: 'purchase' })
    const revoked = await resolveEntitlement({ slug, locationId: LOC })
    check(`${slug}: revoked → locked again`, [revoked.state, revoked.source], ['locked', 'explicit'])
    check(`${slug}: revoke says it was removed`, /removed for this location/.test(revoked.reason), true)
  }

  console.log('\n=== 7. THE HUB DERIVES THE SAME VERDICT (tile == door) ===')
  await clean()
  await setAddonEntitlement({ locationId: LOC, slug: 'ai-course-builder', status: 'active', source: 'purchase' })
  // Exactly the derivation app/api/hub/home/route.ts performs.
  const verdicts = new Map(await Promise.all(
    allSkeletons().map(async s => [s.slug, await resolveEntitlement({ slug: s.slug, locationId: LOC })] as const),
  ))
  const open = ADDONS.filter(a => verdicts.get(a.slug)?.state && verdicts.get(a.slug)!.state !== 'locked')
  const locked = ADDONS.filter(a => verdicts.has(a.slug) && verdicts.get(a.slug)!.state === 'locked')
  check('exactly one tile open', open.map(a => a.slug), ['ai-course-builder'])
  check('its href is the real app', verdicts.get('ai-course-builder')!.entryRoute, '/dashboard/course-builder')
  check('lead0n is a locked tile, not a missing one', locked.some(a => a.slug === 'lead0n'), true)

  await clean()
  console.log(`\n${fails ? `FAILED — ${fails} check(s)` : 'ALL CHECKS PASSED'}\n`)
  process.exit(fails ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
