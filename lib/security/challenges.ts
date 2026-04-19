import { createClient } from '@supabase/supabase-js'
import { applySignals } from './score'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'onai_security' },
  })
}

/**
 * SHA-256 hash a string (used for answer comparison)
 */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Normalize an answer for comparison:
 * lowercase, trim, collapse whitespace
 */
function normalizeAnswer(answer: string): string {
  return answer.toLowerCase().trim().replace(/\s+/g, ' ')
}

export interface Challenge {
  challenge_id: string
  question: string
  recency_band: string
  recall_type: string
}

/**
 * Serve the next fresh challenge for a user
 */
export async function serveNext(userId: string): Promise<Challenge | null> {
  const db = getAdmin()

  // Pick a fresh challenge
  const { data: challenge } = await db
    .from('challenge_pool')
    .select('challenge_id, question, recency_band, recall_type')
    .eq('user_id', userId)
    .eq('status', 'fresh')
    .order('generated_at', { ascending: true })
    .limit(1)
    .single()

  if (!challenge) return null

  // Mark as served
  await db
    .from('challenge_pool')
    .update({
      status: 'served',
      served_at: new Date().toISOString(),
    })
    .eq('challenge_id', challenge.challenge_id)

  return challenge as Challenge
}

/**
 * Resolve a challenge — compare answer hash
 * On success: apply verification_passed signal
 * On failure: apply verification_failed signal
 */
export async function resolveChallenge(
  challengeId: string,
  answer: string,
  sessionId: string,
): Promise<{ passed: boolean; score_result: unknown }> {
  const db = getAdmin()

  // Get the challenge
  const { data: challenge, error } = await db
    .from('challenge_pool')
    .select('answer_hash, user_id, status')
    .eq('challenge_id', challengeId)
    .single()

  if (error || !challenge) {
    throw new Error('Challenge not found')
  }

  if (challenge.status !== 'served') {
    throw new Error(`Challenge status is ${challenge.status}, expected "served"`)
  }

  // Hash the normalized answer
  const normalized = normalizeAnswer(answer)
  const hash = await sha256(normalized)

  const passed = hash === challenge.answer_hash

  // Mark challenge as resolved
  await db
    .from('challenge_pool')
    .update({
      status: passed ? 'passed' : 'failed',
      resolved_at: new Date().toISOString(),
    })
    .eq('challenge_id', challengeId)

  // Apply appropriate signal
  const signal: Record<string, boolean> = passed
    ? { verification_passed: true }
    : { verification_failed: true }

  const scoreResult = await applySignals(sessionId, signal)

  return { passed, score_result: scoreResult }
}

/**
 * Add a challenge to the pool (used by the system to seed challenges)
 */
export async function addChallenge(
  userId: string,
  question: string,
  answer: string,
  recencyBand: '24h' | '7d' | '30d' = '24h',
  recallType: 'factual' | 'preference' | 'behavioral' = 'factual',
): Promise<string> {
  const db = getAdmin()

  const normalized = normalizeAnswer(answer)
  const hash = await sha256(normalized)

  const { data, error } = await db
    .from('challenge_pool')
    .insert({
      user_id: userId,
      question,
      answer_hash: hash,
      recency_band: recencyBand,
      recall_type: recallType,
      status: 'fresh',
    })
    .select('challenge_id')
    .single()

  if (error) throw new Error(`Failed to add challenge: ${error.message}`)
  return data.challenge_id
}
