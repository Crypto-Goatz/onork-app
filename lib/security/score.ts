import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'onai_security' },
  })
}

// Signal weights — negative = decrement, positive = increment
export const SIGNAL_WEIGHTS: Record<string, number> = {
  new_geography: -15,
  new_device: -10,
  new_browser: -5,
  writing_style_deviation: -20,
  tone_shift: -10,
  off_pattern_workflow: -15,
  off_pattern_timing: -10,
  verification_passed: 20,
  verification_failed: -30,
}

// State bands
export function trustState(score: number): 'green' | 'yellow' | 'orange' | 'red' {
  if (score >= 85) return 'green'
  if (score >= 70) return 'yellow'
  if (score >= 50) return 'orange'
  return 'red'
}

export const STATE_COLORS: Record<string, string> = {
  green: '#7ed957',
  yellow: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
}

export interface ScoreResult {
  score: number
  state: string
  previous_score: number
  previous_state: string
  delta: number
  signals_applied: Record<string, number>
}

/**
 * Apply behavioral signals to a session's trust score.
 * Tier 3-4 capabilities get a 1.5x multiplier on decrements.
 */
export async function applySignals(
  sessionId: string,
  signals: Record<string, boolean | number>,
  tier: number = 1,
): Promise<ScoreResult> {
  const db = getAdmin()

  // Read current session
  const { data: session, error } = await db
    .from('sessions')
    .select('trust_score, trust_state, user_id')
    .eq('session_id', sessionId)
    .single()

  if (error || !session) {
    throw new Error(`Session not found: ${sessionId}`)
  }

  const previousScore = session.trust_score as number
  const previousState = session.trust_state as string

  // Calculate delta from signals
  let totalDelta = 0
  const signalsApplied: Record<string, number> = {}

  for (const [signal, value] of Object.entries(signals)) {
    if (!value) continue
    const weight = SIGNAL_WEIGHTS[signal]
    if (weight === undefined) continue

    let delta = weight
    // Apply tier multiplier for 3-4 on decrements only
    if (tier >= 3 && delta < 0) {
      delta = Math.round(delta * 1.5)
    }

    // If signal value is numeric (e.g., deviation magnitude), scale it
    if (typeof value === 'number' && value > 1) {
      delta = Math.round(delta * Math.min(value, 3))
    }

    totalDelta += delta
    signalsApplied[signal] = delta
  }

  // Clamp 0-100
  const newScore = Math.max(0, Math.min(100, previousScore + totalDelta))
  const newState = trustState(newScore)

  // Update session
  await db
    .from('sessions')
    .update({
      trust_score: newScore,
      trust_state: newState,
      last_seen_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)

  // Write audit row on state transitions
  if (newState !== previousState) {
    await db.from('audit').insert({
      session_id: sessionId,
      user_id: session.user_id,
      event_type: 'state_transition',
      score_before: previousScore,
      score_after: newScore,
      signals: signalsApplied,
      detail: {
        from: previousState,
        to: newState,
        tier,
      },
    })
  }

  // Always log signal application
  await db.from('audit').insert({
    session_id: sessionId,
    user_id: session.user_id,
    event_type: 'signals_applied',
    score_before: previousScore,
    score_after: newScore,
    signals: signalsApplied,
    detail: { tier, delta: totalDelta },
  })

  return {
    score: newScore,
    state: newState,
    previous_score: previousScore,
    previous_state: previousState,
    delta: totalDelta,
    signals_applied: signalsApplied,
  }
}

/**
 * Get current session info
 */
export async function getSession(sessionId: string) {
  const db = getAdmin()
  const { data, error } = await db
    .from('sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single()
  if (error) throw new Error(`Session not found: ${sessionId}`)
  return data
}

/**
 * Create a new session
 */
export async function createSession(
  userId: string,
  meta: { device_fingerprint?: string; ip_address?: string; user_agent?: string; geo_country?: string } = {},
) {
  const db = getAdmin()
  const { data, error } = await db
    .from('sessions')
    .insert({
      user_id: userId,
      trust_score: 100,
      trust_state: 'green',
      ...meta,
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to create session: ${error.message}`)
  return data
}

/**
 * Ensure user has a behavioral profile
 */
export async function ensureProfile(userId: string) {
  const db = getAdmin()
  const { data } = await db
    .from('user_profile')
    .select('user_id')
    .eq('user_id', userId)
    .single()
  if (!data) {
    await db.from('user_profile').insert({ user_id: userId })
  }
}
