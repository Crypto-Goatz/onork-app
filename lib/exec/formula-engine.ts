export interface FormulaVariable {
  variable_key: string
  weight: number
  label: string
}

export interface FormulaDefinition {
  numerator: FormulaVariable[]
  denominator: FormulaVariable[]
  normalize: boolean
  clamp_min: number
  clamp_max: number
}

export interface VariableDefinition {
  key: string
  min_value: number
  max_value: number
  default_value?: number
  direction: 'positive' | 'negative'
  data_type: string
}

export type ScoreBand = 'NOMINAL' | 'MONITOR' | 'REVIEW' | 'CRITICAL'

export interface ScoreBreakdown {
  variable_key: string
  label: string
  raw_value: number
  normalized_value: number
  weight: number
  weighted_contribution: number
  role: 'numerator' | 'denominator'
}

export interface FormulaThresholds {
  critical: number
  review: number
  monitor: number
}

export interface ScoreResult {
  score: number
  band: ScoreBand
  breakdown: ScoreBreakdown[]
  numerator_raw: number
  denominator_raw: number
  computed_at: string
}

export function computeScore(
  formula: FormulaDefinition,
  variableValues: Record<string, number>,
  variableDefs: Record<string, VariableDefinition>,
  thresholds: FormulaThresholds
): ScoreResult {
  const breakdown: ScoreBreakdown[] = []

  let numeratorSum = 0
  let numeratorWeightSum = 0

  for (const fv of formula.numerator) {
    const def = variableDefs[fv.variable_key]
    const rawValue = variableValues[fv.variable_key] ?? def?.default_value ?? 50
    const normalized = normalizeValue(rawValue, def)
    const contribution = normalized * fv.weight
    numeratorSum += contribution
    numeratorWeightSum += fv.weight
    breakdown.push({
      variable_key: fv.variable_key, label: fv.label,
      raw_value: rawValue, normalized_value: normalized,
      weight: fv.weight, weighted_contribution: contribution, role: 'numerator',
    })
  }

  let denominatorSum = 0
  let denominatorWeightSum = 0

  for (const fv of formula.denominator) {
    const def = variableDefs[fv.variable_key]
    const rawValue = variableValues[fv.variable_key] ?? def?.default_value ?? 50
    const normalized = normalizeValue(rawValue, def)
    const contribution = normalized * fv.weight
    denominatorSum += contribution
    denominatorWeightSum += fv.weight
    breakdown.push({
      variable_key: fv.variable_key, label: fv.label,
      raw_value: rawValue, normalized_value: normalized,
      weight: fv.weight, weighted_contribution: contribution, role: 'denominator',
    })
  }

  const numNormalized = numeratorWeightSum > 0 ? numeratorSum / numeratorWeightSum : 0.5
  const denNormalized = denominatorWeightSum > 0 ? Math.max(denominatorSum / denominatorWeightSum, 0.01) : 0.01

  let rawScore: number
  if (formula.denominator.length === 0) {
    rawScore = numNormalized * 100
  } else {
    rawScore = (numNormalized / denNormalized) * 50
  }

  const score = Math.min(Math.max(Math.round(rawScore), formula.clamp_min), formula.clamp_max)
  const band = getBand(score, thresholds)

  return { score, band, breakdown, numerator_raw: numeratorSum, denominator_raw: denominatorSum, computed_at: new Date().toISOString() }
}

function normalizeValue(value: number, def: VariableDefinition | undefined): number {
  if (!def) return 0.5
  const range = def.max_value - def.min_value
  if (range === 0) return 0.5
  return Math.max(0, Math.min(1, (value - def.min_value) / range))
}

function getBand(score: number, t: FormulaThresholds): ScoreBand {
  if (score < t.critical) return 'CRITICAL'
  if (score < t.review) return 'REVIEW'
  if (score < t.monitor) return 'MONITOR'
  return 'NOMINAL'
}

export function getBandColor(band: ScoreBand): string {
  return { NOMINAL: '#6EE05A', MONITOR: '#f5c518', REVIEW: '#f97316', CRITICAL: '#ef4444' }[band]
}
