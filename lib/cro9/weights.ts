/**
 * Adaptive weights — the learning loop that makes CRO9 rank sites,
 * not just generate briefs.
 *
 * After a task is applied we snapshot its metrics. After `measure_window_days`
 * the cron re-pulls GSC and computes a delta. If the bucket that owned the
 * task produced a lift, we nudge the corresponding factor up (by a tiny
 * step, capped); if it regressed, we nudge it down. Weights are normalised
 * back to sum ≈ 1 each update.
 *
 * Result: each site learns which signals actually move ITS rankings, and
 * the scoring formula self-tunes over time.
 */

import type { Factor, TaskStatus } from './types'
import { DEFAULT_WEIGHTS } from './score'

export interface WeightRow { factor: Factor; value: number; update_count: number; last_updated: string }

/** Convert an array of rows (from vsxo_adaptive_weights) into a weight map. */
export function toMap(rows: WeightRow[] | null | undefined): Record<Factor, number> {
  const m: Record<Factor, number> = { ...DEFAULT_WEIGHTS }
  for (const r of rows || []) {
    if (r.factor in m) m[r.factor as Factor] = Number(r.value)
  }
  return normalise(m)
}

export function normalise(w: Record<Factor, number>): Record<Factor, number> {
  const sum = (Object.values(w) as number[]).reduce((a, b) => a + b, 0) || 1
  const out = { ...w }
  for (const k of Object.keys(out) as Factor[]) out[k] = Number((out[k] / sum).toFixed(4))
  return out
}

/**
 * Given a delta (current metrics vs baseline) and the task's bucket,
 * decide which factor to adjust and by how much.
 *
 * Lift strength (|delta|) scales the step size so big wins move weights
 * more than marginal ones. Step is always ≤ 0.03 so weights evolve
 * gradually, not catastrophically.
 */
export interface AdjustArgs {
  bucket: string           // the task's bucket
  deltaPosition: number    // baseline_position - current_position (positive == better)
  deltaClicks: number
  deltaCtr: number         // absolute pp difference
  deltaImpressions: number
}

export function computeAdjustment(args: AdjustArgs): { factor: Factor; step: number; outcome: TaskStatus } {
  const { bucket, deltaPosition, deltaClicks, deltaCtr, deltaImpressions } = args

  // Crude "did it work" heuristic: any of these counts as a win
  const positionWin = deltaPosition >= 2
  const ctrWin = deltaCtr >= 0.005
  const clicksWin = deltaClicks >= 3
  const impressionsWin = deltaImpressions >= 50

  const win = positionWin || ctrWin || clicksWin || impressionsWin
  const regressed = deltaPosition <= -3 || deltaClicks <= -3

  const factor: Factor = bucketToFactor(bucket)
  const magnitude = Math.min(
    0.03,
    Math.max(
      Math.abs(deltaPosition) / 100,
      Math.abs(deltaCtr) * 2,
      Math.abs(deltaClicks) / 150,
    )
  )
  const step = win ? magnitude : regressed ? -magnitude : 0
  const outcome: TaskStatus = win ? 'improved' : regressed ? 'regressed' : 'flat'

  return { factor, step, outcome }
}

function bucketToFactor(bucket: string): Factor {
  switch (bucket) {
    case 'CTR_FIX':           return 'ctrGap'
    case 'RELEVANCE_REBUILD': return 'impressions'
    case 'POSITION_CLIMB':    return 'position'
    case 'SCHEMA_UPGRADE':    return 'ctrGap'
    case 'THIN_CONTENT':      return 'impressions'
    case 'INTERNAL_LINKING':  return 'position'
    default:                   return 'impressions'
  }
}

/** Apply a step to the current weight map and re-normalise. */
export function applyStep(map: Record<Factor, number>, factor: Factor, step: number): Record<Factor, number> {
  const out = { ...map }
  out[factor] = Math.max(0.01, Math.min(0.8, out[factor] + step))
  return normalise(out)
}

/** Rows ready for upsert into cro9_adaptive_weights. */
export function toRows(siteId: string, map: Record<Factor, number>): Array<{ site_id: string; factor: Factor; value: number }> {
  return (Object.keys(map) as Factor[]).map((f) => ({ site_id: siteId, factor: f, value: map[f] }))
}
