/**
 * Opportunity scoring + bucket classifier.
 *
 * Faithfully ported from the CRO9 SEO Neuro Engine Apps Script (sheet
 * 1kOHwW8jvvgdkz7ooQsUZj5tmrvKrBFIr-Ufv9y4039w), with the same adaptive
 * weights that self-tune in lib/cro9/weights.ts.
 *
 * score(url) = Σ(factor_i × weight_i)   where each factor ∈ [0, 1]
 *
 * Bucketing:
 *   - CTR_FIX          → position ≤ 20 but CTR materially below expected
 *   - RELEVANCE_REBUILD→ impressions solid (≥100) but position > 30
 *   - POSITION_CLIMB   → position 11–30 with decent CTR
 *   - SCHEMA_UPGRADE   → page has no schema detected (pipeline sets flag)
 *   - THIN_CONTENT     → crawler flagged word count below target floor
 *   - INTERNAL_LINKING → orphan page (few inlinks) or low depth
 *
 * The Apps Script default weights — kept here as a fallback if the DB
 * hasn't learned any yet.
 */

import type { Bucket, Factor, PriorityAction, ScoreComponents, TaskInput, TaskOutput } from './types'

export const DEFAULT_WEIGHTS: Record<Factor, number> = {
  impressions: 0.2019,
  position: 0.1683,
  ctrGap: 0.4953,
  conversions: 0.0808,
  freshness: 0.0537,
}

/** Expected CTR per SERP position — industry median (Advanced Web Ranking 2025) */
const EXPECTED_CTR_BY_POSITION: number[] = [
  0, 0.395, 0.189, 0.100, 0.071, 0.050, 0.036, 0.027, 0.021, 0.018, 0.015,
  0.013, 0.011, 0.010, 0.009, 0.008, 0.007, 0.006, 0.005, 0.005, 0.004,
]

export function expectedCtrFor(position: number): number {
  if (!Number.isFinite(position)) return 0.005
  const idx = Math.max(1, Math.min(20, Math.round(position)))
  return EXPECTED_CTR_BY_POSITION[idx] ?? 0.005
}

/**
 * Minimum expected clicks before an observed CTR is evidence of anything.
 *
 * CTR is a proportion, so its sampling error is sqrt(p(1-p)/n) — at n=1 a zero-click
 * page is the *expected* outcome for any p below 50%, not a finding. Gating on raw
 * impressions is the wrong axis, because the sample a position needs scales with the
 * rate it is being compared against: position 1 (p=0.395) has said something real by
 * 8 impressions, position 12 (p=0.011) has not until ~270. Expected clicks (n × p) is
 * that gate in one number, and 3 is the conventional floor for a rate comparison.
 *
 * Measured 2026-08-27 against the live cro9_tasks: all 26 CTR_FIX rows this engine
 * had ever written scored **under 1 expected click** — 25 of them under 0.6, most on
 * 1–6 impressions with 0 clicks, which makes ctrGap exactly 1.0 and clears any gap
 * threshold automatically. That, not the CTR curve, was the monoculture.
 */
export const MIN_EXPECTED_CLICKS_FOR_CTR_CLAIM = 3

/**
 * Minimum impressions before a *position* is worth acting on.
 *
 * Unlike CTR this is a judgment, not a derivation: GSC's position is an average over
 * n impressions, so it is a real observation even at n=1 — it is just an observation
 * about a page nobody sees. The number is set to 100 to match RELEVANCE_REBUILD, the
 * other position-derived bucket in `classify()`, because the same signal should not
 * carry two different bars in one function.
 *
 * Without it the monoculture merely relocates: when the CTR floor landed, three live
 * rows at position 11-12 with a single impression each stopped being CTR_FIX and
 * immediately became POSITION_CLIMB / OPTIMIZE_FOR_INTENT.
 */
export const MIN_IMPRESSIONS_FOR_POSITION_CLAIM = 100

/** Is there enough search data to say anything about this page's CTR? */
export function ctrIsMeasurable(impressions: number, expectedCtr: number): boolean {
  if (!Number.isFinite(impressions) || !Number.isFinite(expectedCtr)) return false
  return impressions * expectedCtr >= MIN_EXPECTED_CLICKS_FOR_CTR_CLAIM
}

/** Normalise impressions (log-scale) so a 1M-impression page doesn't dwarf a 500 */
function normImpressions(impressions: number): number {
  if (impressions <= 0) return 0
  // Log scale: 10 → 0.2, 100 → 0.4, 1k → 0.6, 10k → 0.8, 100k → 1.0
  return Math.min(1, Math.log10(impressions + 1) / 5)
}

/** Position factor — peaks at position ~15 (the sweet spot for gains) */
function normPosition(position: number): number {
  if (!Number.isFinite(position) || position <= 0) return 0
  if (position <= 3) return 0.15              // already crushing it
  if (position <= 10) return 0.35             // first page, small upside
  if (position <= 20) return 0.95             // highest leverage
  if (position <= 40) return 0.75
  if (position <= 60) return 0.5
  if (position <= 80) return 0.3
  return 0.15
}

/** How far is actual CTR from expected? (0–1) */
function normCtrGap(ctr: number, expected: number): number {
  if (expected <= 0) return 0
  const gap = Math.max(0, expected - ctr)
  return Math.min(1, gap / expected)           // 1.0 == zero CTR against expected
}

/** Freshness — stale pages score higher (want to refresh them) */
function normFreshness(lastUpdatedDaysAgo: number): number {
  if (!Number.isFinite(lastUpdatedDaysAgo)) return 0.3
  if (lastUpdatedDaysAgo < 30) return 0.0
  if (lastUpdatedDaysAgo < 90) return 0.3
  if (lastUpdatedDaysAgo < 180) return 0.6
  if (lastUpdatedDaysAgo < 365) return 0.85
  return 1.0
}

function normConversions(conversions: number, impressions: number): number {
  if (impressions <= 0) return 0
  const rate = conversions / impressions
  return Math.min(1, rate * 100)               // 1% conversion == 1.0
}

export interface ScoreContext {
  input: TaskInput
  hasSchema?: boolean
  wordCount?: number
  lastUpdatedDaysAgo?: number
  conversions?: number
  internalLinks?: number                       // count of inbound internal links
}

export function scoreComponents(ctx: ScoreContext, weights: Partial<Record<Factor, number>> = {}): ScoreComponents {
  const w: Record<Factor, number> = { ...DEFAULT_WEIGHTS, ...weights } as Record<Factor, number>
  const sum = Object.values(w).reduce((a, b) => a + b, 0) || 1
  for (const k of Object.keys(w) as Factor[]) w[k] = w[k] / sum      // re-normalise to 1

  const factors: Record<Factor, number> = {
    impressions: normImpressions(ctx.input.impressions),
    position: normPosition(ctx.input.position),
    ctrGap: normCtrGap(ctx.input.ctr, ctx.input.expectedCtr),
    conversions: normConversions(ctx.conversions || 0, ctx.input.impressions),
    freshness: normFreshness(ctx.lastUpdatedDaysAgo ?? 180),
  }

  const weighted = (Object.keys(factors) as Factor[]).reduce((sum, k) => sum + factors[k] * w[k], 0)

  return { ...factors, weighted: Number(weighted.toFixed(4)) }
}

/**
 * Assign an action bucket, or `null` when the page has no diagnosable opportunity.
 *
 * `null` is a real answer and callers must persist nothing for it. The previous
 * default arm returned CTR_FIX, so "fits no bucket" and "needs its meta rewritten"
 * were the same output — that is how /integrations, at position 4.9 with a CTR of
 * 0.125 against an expected 0.050 (2.5× *over*-performing), was handed a
 * REWRITE_META_AND_INTRO task.
 */
export function classify(ctx: ScoreContext): { bucket: Bucket; action: PriorityAction } | null {
  const { position, ctr, expectedCtr, impressions } = ctx.input

  // Thin content override
  if (typeof ctx.wordCount === 'number' && ctx.wordCount < 400 && impressions >= 50) {
    return { bucket: 'THIN_CONTENT', action: 'EXPAND_CONTENT' }
  }
  // Missing schema override (only when page ranks on page 1)
  if (ctx.hasSchema === false && position > 0 && position <= 20 && impressions >= 50) {
    return { bucket: 'SCHEMA_UPGRADE', action: 'ADD_SCHEMA' }
  }
  // Orphan page
  if (typeof ctx.internalLinks === 'number' && ctx.internalLinks < 2 && impressions >= 30) {
    return { bucket: 'INTERNAL_LINKING', action: 'ADD_INTERNAL_LINKS' }
  }

  const gap = Math.max(0, expectedCtr - ctr)
  const gapRatio = expectedCtr > 0 ? gap / expectedCtr : 0

  // CTR_FIX is a claim about a rate, so it needs a sample that can carry one.
  if (position > 0 && position <= 20 && gapRatio >= 0.35 && ctrIsMeasurable(impressions, expectedCtr)) {
    return { bucket: 'CTR_FIX', action: 'REWRITE_META_AND_INTRO' }
  }
  if (position > 30 && impressions >= MIN_IMPRESSIONS_FOR_POSITION_CLAIM) {
    return { bucket: 'RELEVANCE_REBUILD', action: 'COMPREHENSIVE_REWRITE' }
  }
  if (position > 10 && position <= 30 && impressions >= MIN_IMPRESSIONS_FOR_POSITION_CLAIM) {
    return { bucket: 'POSITION_CLIMB', action: 'OPTIMIZE_FOR_INTENT' }
  }
  // No diagnosable opportunity. Not a bucket.
  return null
}

/** Returns `null` when the page has no diagnosable opportunity — persist nothing. */
export function scoreTask(ctx: ScoreContext, weights?: Partial<Record<Factor, number>>): TaskOutput | null {
  const components = scoreComponents(ctx, weights)
  const classified = classify(ctx)
  if (!classified) return null
  const { bucket, action } = classified
  return {
    ...ctx.input,
    bucket,
    priorityAction: action,
    score: components.weighted,
    scoreComponents: components,
  }
}
