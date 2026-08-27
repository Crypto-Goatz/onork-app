/**
 * CRO9 classifier — the guard against a CTR claim made on no sample.
 *
 * Incident (measured 2026-08-27, live cro9_tasks, project pwujhhmlrtxjmjzyttwn):
 * 26 of 29 tasks this engine had ever written were CTR_FIX / REWRITE_META_AND_INTRO.
 * Every one of them scored under 1 expected click; 25 had ZERO clicks on 1-8
 * impressions, which makes measured ctr exactly 0, which makes gapRatio exactly 1.0,
 * which clears `gapRatio >= 0.35` automatically. The bucket was not detecting a CTR
 * problem, it was detecting "this page has almost no search data."
 *
 * The fixtures below are the real rows, not invented ones.
 *
 * Both directions are asserted. A floor that silences the engine entirely would be
 * the same defect wearing the opposite costume, so the positive controls pin that a
 * page with a real sample and a real shortfall still buckets CTR_FIX.
 */
import { classify, ctrIsMeasurable, expectedCtrFor, MIN_EXPECTED_CLICKS_FOR_CTR_CLAIM } from '../../lib/cro9/score'
import type { TaskInput } from '../../lib/cro9/types'

let pass = 0, fail = 0
const t = (n: string, got: unknown, want: unknown) => {
  const ok = got === want; ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `  — got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`)
}

const input = (o: Partial<TaskInput>): TaskInput => ({
  url: 'https://www.0nmcp.com/x', primaryKeyword: 'k',
  clicks: 0, impressions: 0, position: 5, ctr: 0,
  expectedCtr: expectedCtrFor(o.position ?? 5), ctrGap: 0, ...o,
})
const bucketOf = (i: Partial<TaskInput>, extra = {}) =>
  classify({ input: input(i), ...extra })?.bucket ?? 'NONE'

// ---------------------------------------------------------------------------
// The real rows that produced the monoculture. Every one must now be NONE.
// ---------------------------------------------------------------------------
const LIVE_MONOCULTURE_ROWS: Array<[string, number, number, number]> = [
  // [path, impressions, clicks, position]
  ['/blog/linkedin-meets-0nmcp', 1, 0, 12],
  ['/blog/0nmcp-v2-2-0-release', 1, 0, 11],
  ['/0n-standard', 1, 0, 11],
  ['/sponsor', 1, 0, 8],
  ['/blog/linkedin-advertising-api', 2, 0, 8],
  ['/audit', 1, 0, 5],
  ['/blog/0nvault-container-system', 5, 0, 6.8],
  ['/community', 6, 0, 5.7],
  ['/blog/crm-automation-switch-files', 5, 0, 4.8],
  ['/secure-claude', 8, 0, 5.8],
  ['/', 1, 0, 1],
  ['/', 4, 0, 1.8],
  ['/forum', 3, 0, 2.3],
  ['/blog/mcp-vs-traditional-api-integration-why', 32, 0, 5.9],
  ['/onpress', 6, 0, 1.2],
]
for (const [path, impressions, clicks, position] of LIVE_MONOCULTURE_ROWS) {
  const expectedCtr = expectedCtrFor(position)
  t(`live row ${path} (${impressions} imp, ${clicks} clicks, pos ${position}) is not a CTR claim`,
    bucketOf({ url: path, impressions, clicks, position, ctr: clicks / impressions, expectedCtr }),
    'NONE')
}

// The one that was over-performing and still got told to rewrite its meta.
t('/integrations, CTR 0.125 vs expected 0.050, is not an opportunity at all',
  bucketOf({ url: '/integrations', impressions: 8, clicks: 1, position: 4.9, ctr: 0.125, expectedCtr: 0.05 }),
  'NONE')

// ---------------------------------------------------------------------------
// POSITIVE CONTROLS — the floor must not be a mute button.
// ---------------------------------------------------------------------------
// pos 6 → p=0.036 → needs 84 impressions to reach 3 expected clicks.
t('pos 6, 2,000 impressions, zero clicks IS a CTR problem',
  bucketOf({ impressions: 2000, clicks: 0, position: 6, ctr: 0, expectedCtr: 0.036 }), 'CTR_FIX')
t('pos 6, 2,000 impressions, CTR half of expected IS a CTR problem',
  bucketOf({ impressions: 2000, clicks: 36, position: 6, ctr: 0.018, expectedCtr: 0.036 }), 'CTR_FIX')
t('pos 6, 2,000 impressions, CTR at expected is NOT',
  bucketOf({ impressions: 2000, clicks: 72, position: 6, ctr: 0.036, expectedCtr: 0.036 }), 'NONE')
// pos 1 → p=0.395 → only 8 impressions needed. The floor scales with the rate.
t('pos 1 needs a far smaller sample than pos 12 (8 imp is enough at p=0.395)',
  bucketOf({ impressions: 8, clicks: 0, position: 1, ctr: 0, expectedCtr: 0.395 }), 'CTR_FIX')
t('pos 12 on the same 8 impressions is still noise',
  bucketOf({ impressions: 8, clicks: 0, position: 12, ctr: 0, expectedCtr: 0.011 }), 'NONE')

// Non-CTR buckets are crawl-derived, not rate-derived — the floor must not touch them.
t('THIN_CONTENT still fires on a small sample',
  bucketOf({ impressions: 54, clicks: 1, position: 6.7, ctr: 0.0185, expectedCtr: 0.027 }, { wordCount: 120 }),
  'THIN_CONTENT')
t('SCHEMA_UPGRADE still fires on a small sample',
  bucketOf({ impressions: 98, clicks: 11, position: 2.1, ctr: 0.1122, expectedCtr: 0.189 }, { hasSchema: false }),
  'SCHEMA_UPGRADE')
t('INTERNAL_LINKING still fires on a small sample',
  bucketOf({ impressions: 36, clicks: 1, position: 6.6, ctr: 0.0278, expectedCtr: 0.027 }, { internalLinks: 0 }),
  'INTERNAL_LINKING')
t('RELEVANCE_REBUILD is unaffected — it always had its floor',
  bucketOf({ impressions: 500, clicks: 0, position: 45, ctr: 0, expectedCtr: 0.004 }), 'RELEVANCE_REBUILD')
t('RELEVANCE_REBUILD still refuses a thin sample',
  bucketOf({ impressions: 40, clicks: 0, position: 45, ctr: 0, expectedCtr: 0.004 }), 'NONE')
t('POSITION_CLIMB fires with a real sample',
  bucketOf({ impressions: 400, clicks: 2, position: 18, ctr: 0.005, expectedCtr: 0.005 }), 'POSITION_CLIMB')
t('POSITION_CLIMB does NOT fire on 5 impressions — the monoculture must not relocate',
  bucketOf({ impressions: 5, clicks: 0, position: 18, ctr: 0, expectedCtr: 0.005 }), 'NONE')

// ---------------------------------------------------------------------------
// The floor itself
// ---------------------------------------------------------------------------
t('floor is expressed in expected clicks, not impressions', MIN_EXPECTED_CLICKS_FOR_CTR_CLAIM, 3)
t('exactly at the floor is measurable', ctrIsMeasurable(100, 0.03), true)
t('a hair under is not', ctrIsMeasurable(99, 0.03), false)
t('NaN impressions is not measurable', ctrIsMeasurable(NaN, 0.3), false)
t('NaN expected is not measurable', ctrIsMeasurable(1000, NaN), false)

// ---------------------------------------------------------------------------
// The guard on the guard: the superseded classifier as a live control.
// Every live row above must have bucketed CTR_FIX under the OLD rule, or these
// fixtures are not reproducing the incident and the suite proves nothing.
// ---------------------------------------------------------------------------
const oldClassify = (i: TaskInput): string => {
  const gap = Math.max(0, i.expectedCtr - i.ctr)
  const gapRatio = i.expectedCtr > 0 ? gap / i.expectedCtr : 0
  if (i.position > 0 && i.position <= 20 && gapRatio >= 0.35) return 'CTR_FIX'
  if (i.position > 30 && i.impressions >= 100) return 'RELEVANCE_REBUILD'
  if (i.position > 10 && i.position <= 30) return 'POSITION_CLIMB'
  return 'CTR_FIX'   // the default arm that made "no bucket" mean "rewrite it"
}
for (const [path, impressions, clicks, position] of LIVE_MONOCULTURE_ROWS) {
  t(`CONTROL: ${path} did bucket CTR_FIX under the old rule`,
    oldClassify(input({ impressions, clicks, position, ctr: clicks / impressions, expectedCtr: expectedCtrFor(position) })),
    'CTR_FIX')
}
t('CONTROL: /integrations did too, via the default arm',
  oldClassify(input({ impressions: 8, clicks: 1, position: 4.9, ctr: 0.125, expectedCtr: 0.05 })), 'CTR_FIX')

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
