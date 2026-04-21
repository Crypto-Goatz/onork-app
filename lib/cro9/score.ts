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

export function classify(ctx: ScoreContext): { bucket: Bucket; action: PriorityAction } {
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

  if (position > 0 && position <= 20 && gapRatio >= 0.35) {
    return { bucket: 'CTR_FIX', action: 'REWRITE_META_AND_INTRO' }
  }
  if (position > 30 && impressions >= 100) {
    return { bucket: 'RELEVANCE_REBUILD', action: 'COMPREHENSIVE_REWRITE' }
  }
  if (position > 10 && position <= 30) {
    return { bucket: 'POSITION_CLIMB', action: 'OPTIMIZE_FOR_INTENT' }
  }
  // Default
  return { bucket: 'CTR_FIX', action: 'REWRITE_META_AND_INTRO' }
}

export function scoreTask(ctx: ScoreContext, weights?: Partial<Record<Factor, number>>): TaskOutput {
  const components = scoreComponents(ctx, weights)
  const { bucket, action } = classify(ctx)
  return {
    ...ctx.input,
    bucket,
    priorityAction: action,
    score: components.weighted,
    scoreComponents: components,
  }
}
