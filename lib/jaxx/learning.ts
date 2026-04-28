/**
 * Self-learning capture pipeline.
 *
 * Every Jaxx response writes a training pair with neutral quality_score=0.5.
 * Outcome signals adjust the score asynchronously:
 *   tool_succeeded               +0.30
 *   user_thanked                 +0.20
 *   conversation_continued       +0.10
 *   user_corrected               -0.40
 *   iky_triggered_after          -0.50
 *   disclosure_violation_caught  -1.00 (rejected)
 *
 * Daily cron promotes pairs with score>=0.8 to source='curated'. Curated set
 * exports to engine/training-feed for Ollama fine-tune. Production stays on
 * Groq until per-domain A/B shows local wins.
 *
 * INPUTS ARE ALREADY REDACTED — caller passes the post-scrubber output.
 */

import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface TrainingPairInsert {
  logId: string
  surface: string
  // ALL fields below should be already-redacted (post-scrubber)
  input: string
  contextSnapshot: Record<string, unknown>
  response: string
  toolCalls?: Array<Record<string, unknown>>
  modelUsed: string
  // Initial signals (more land async)
  disclosureViolation?: boolean
}

export async function recordPair(p: TrainingPairInsert): Promise<string | null> {
  // If a disclosure violation made it through, skip capture entirely AND mark rejected.
  if (p.disclosureViolation) {
    const { data } = await admin()
      .from('jaxx_training_pairs')
      .insert({
        log_id: p.logId,
        surface: p.surface,
        input: p.input,
        context_snapshot: p.contextSnapshot,
        response: p.response,
        tool_calls: p.toolCalls ?? [],
        model_used: p.modelUsed,
        disclosure_violation: true,
        source: 'rejected',
        quality_score: 0,
        rejected_reason: 'disclosure_violation',
      })
      .select('id')
      .single()
    return data?.id ?? null
  }

  const { data } = await admin()
    .from('jaxx_training_pairs')
    .insert({
      log_id: p.logId,
      surface: p.surface,
      input: p.input,
      context_snapshot: p.contextSnapshot,
      response: p.response,
      tool_calls: p.toolCalls ?? [],
      model_used: p.modelUsed,
      quality_score: 0.5,
      source: 'live',
    })
    .select('id')
    .single()
  return data?.id ?? null
}

export interface OutcomeSignals {
  toolSucceeded?: boolean
  userThanked?: boolean
  userCorrected?: boolean
  conversationContinuedSmoothly?: boolean
  ikyTriggeredAfter?: boolean
}

const SIGNAL_WEIGHTS: Record<keyof OutcomeSignals, number> = {
  toolSucceeded: 0.3,
  userThanked: 0.2,
  conversationContinuedSmoothly: 0.1,
  userCorrected: -0.4,
  ikyTriggeredAfter: -0.5,
}

export async function applySignals(pairId: string, signals: OutcomeSignals): Promise<void> {
  // Read current
  const { data: row } = await admin()
    .from('jaxx_training_pairs')
    .select('quality_score, tool_succeeded, user_thanked, user_corrected, conversation_continued_smoothly, iky_triggered_after')
    .eq('id', pairId)
    .maybeSingle()
  if (!row) return

  let score = Number(row.quality_score) || 0.5

  for (const key of Object.keys(signals) as Array<keyof OutcomeSignals>) {
    const val = signals[key]
    if (typeof val === 'boolean' && val) {
      score += SIGNAL_WEIGHTS[key] ?? 0
    }
  }

  score = Math.max(0, Math.min(1, score))

  await admin()
    .from('jaxx_training_pairs')
    .update({
      quality_score: score,
      tool_succeeded: signals.toolSucceeded ?? row.tool_succeeded,
      user_thanked: signals.userThanked ?? row.user_thanked,
      user_corrected: signals.userCorrected ?? row.user_corrected,
      conversation_continued_smoothly:
        signals.conversationContinuedSmoothly ?? row.conversation_continued_smoothly,
      iky_triggered_after: signals.ikyTriggeredAfter ?? row.iky_triggered_after,
    })
    .eq('id', pairId)
}

/**
 * Daily promotion job — call from a Vercel cron.
 * Promotes live pairs with quality_score >= 0.8 to source='curated'.
 */
export async function promoteCurated(threshold = 0.8): Promise<{ promoted: number }> {
  const { data, error } = await admin()
    .from('jaxx_training_pairs')
    .update({ source: 'curated', promoted_at: new Date().toISOString() })
    .eq('source', 'live')
    .gte('quality_score', threshold)
    .select('id')

  if (error) {
    console.error('[learning.promoteCurated] failed:', error)
    return { promoted: 0 }
  }

  return { promoted: data?.length ?? 0 }
}
