import { createClient } from '@supabase/supabase-js'
import { askAIForJson } from '@/lib/ai-call'

interface OutcomeRecord {
  contact_id: string
  outcome: 'won' | 'lost' | 'churned' | 'stalled'
  final_score: number
  variable_values: Record<string, number>
  days_in_orbit: number
}

export interface LearnerInput {
  formulaId: string
  userId: string
  orbitId?: string
  contactCount: number
  outcomes: OutcomeRecord[]
  currentWeights: Record<string, number>
}

export async function runLearner(input: LearnerInput): Promise<void> {
  if (input.outcomes.length < 10) return

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const patterns = [...detectStatisticalPatterns(input), ...(await detectAIPatterns(input))]
  if (patterns.length === 0) return

  await supabase.from('exec_ai_patterns').insert(
    patterns.map(p => ({
      onmcp_user_id: input.userId, formula_id: input.formulaId,
      orbit_id: input.orbitId || null, ...p,
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    }))
  )

  const won = input.outcomes.filter(o => o.outcome === 'won')
  const successRate = won.length / input.outcomes.length * 100
  const avgScore = input.outcomes.reduce((s, o) => s + o.final_score, 0) / input.outcomes.length

  await supabase.from('exec_formulas').update({
    outcomes_tracked: input.outcomes.length,
    success_rate: Math.round(successRate * 100) / 100,
    avg_score: Math.round(avgScore * 100) / 100,
  }).eq('id', input.formulaId)
}

function detectStatisticalPatterns(input: LearnerInput) {
  const patterns: Record<string, unknown>[] = []
  const churned = input.outcomes.filter(o => o.outcome === 'churned')

  const scoreBuckets: Record<string, { won: number; total: number }> = {}
  for (const o of input.outcomes) {
    const bucket = String(Math.floor(o.final_score / 10) * 10)
    if (!scoreBuckets[bucket]) scoreBuckets[bucket] = { won: 0, total: 0 }
    scoreBuckets[bucket].total++
    if (o.outcome === 'won') scoreBuckets[bucket].won++
  }

  const critBucket = Object.entries(scoreBuckets)
    .filter(([, v]) => v.total >= 3)
    .find(([, v]) => v.won / v.total < 0.2)

  if (critBucket) {
    patterns.push({
      pattern_type: 'stall_predictor',
      title: `Contacts below score ${critBucket[0]} rarely close`,
      description: `${Math.round((critBucket[1].won / critBucket[1].total) * 100)}% win rate from ${critBucket[1].total} contacts scoring below ${critBucket[0]}.`,
      recommendation: `Set intervention protocols when contacts drop below ${critBucket[0]}.`,
      confidence: Math.min(90, 50 + critBucket[1].total * 2),
      sample_size: critBucket[1].total, affected_count: 0,
      pattern_data: { score_threshold: parseInt(critBucket[0]), win_rate: critBucket[1].won / critBucket[1].total },
    })
  }

  if (churned.length >= 5) {
    const avgChurnScore = Math.round(churned.reduce((s, o) => s + o.final_score, 0) / churned.length)
    patterns.push({
      pattern_type: 'churn_signal',
      title: 'Score decline predicts churn',
      description: `${churned.length} churned contacts averaged score ${avgChurnScore}/100 at churn.`,
      recommendation: 'Set up intervention when score declines >10 points in 2 weeks.',
      confidence: Math.min(84, 40 + churned.length * 3),
      sample_size: churned.length, affected_count: 0,
      pattern_data: { avg_churn_score: avgChurnScore },
    })
  }

  return patterns
}

async function detectAIPatterns(input: LearnerInput) {
  const won = input.outcomes.filter(o => o.outcome === 'won')
  const lost = input.outcomes.filter(o => o.outcome === 'lost')

  const summary = {
    outcome_count: input.outcomes.length,
    win_rate: Math.round(won.length / input.outcomes.length * 100),
    avg_score_won: won.length ? Math.round(won.reduce((s, o) => s + o.final_score, 0) / won.length) : 0,
    avg_score_lost: lost.length ? Math.round(lost.reduce((s, o) => s + o.final_score, 0) / lost.length) : 0,
    current_weights: input.currentWeights,
  }

  const prompt = `You are a B2B pipeline scoring analyst. Analyze outcome data and return JSON: { "patterns": [{"pattern_type":"stall_predictor"|"success_signal"|"weight_suggestion","title":"<60 chars","description":"<200 chars","recommendation":"<200 chars","confidence":number,"pattern_data":{}}, ...] }. 1-3 patterns max. Only patterns with confidence>60.

DATA:
${JSON.stringify(summary)}`

  const { data } = await askAIForJson<{ patterns?: Array<Record<string, unknown>> }>(prompt, {
    maxTokens: 800,
  })
  if (!data || !Array.isArray(data.patterns)) return []
  return data.patterns.map((p) => ({ ...p, sample_size: input.outcomes.length, affected_count: 0 }))
}
