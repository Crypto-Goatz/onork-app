/**
 * IKY Protocol — "I Know You" identity challenge.
 *
 * Trust score per conversation. When user presses for sensitive info or trust
 * drops below threshold, Jaxx issues a challenge pulled from the user's real data.
 * Correct answer raises trust; wrong lowers it; 3 wrong locks the conversation
 * and alerts.
 *
 * The contact-vs-actor distinction is critical: an unknown CRM contact starts
 * at trust=0 and can never be elevated without a verified user_id link.
 */

import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Trust score
// ─────────────────────────────────────────────────────────────────────────

export interface TrustContext {
  // Required
  surface: 'crm_inbound' | 'dashboard_widget' | 'slack' | 'chrome' | 'test'
  hasLinkedUser: boolean // contact links to a 0nCore user_id
  isLocationOwner: boolean // linked user IS the location owner
  // Optional signals
  signupIp?: string | null
  recentLoginIps?: string[] // IPs seen in last 7 days
  currentIp?: string | null
  signupUa?: string | null
  currentUa?: string | null
  recentPasswordChange?: boolean // changed in last 24h
}

export function computeBaselineTrust(ctx: TrustContext): number {
  // Hard floor: unknown contact (no linked user) = 0, full stop.
  if (!ctx.hasLinkedUser) return 0

  // If linked user is NOT the location owner, also low trust.
  if (!ctx.isLocationOwner) return 10

  let score = 50 // baseline for verified actor

  // IP comparison
  if (ctx.currentIp && ctx.signupIp && ctx.currentIp === ctx.signupIp) {
    score += 30
  } else if (
    ctx.currentIp &&
    ctx.recentLoginIps &&
    ctx.recentLoginIps.includes(ctx.currentIp)
  ) {
    score += 15
  } else if (ctx.currentIp) {
    score -= 20 // new IP
  }

  // UA comparison
  if (ctx.currentUa && ctx.signupUa && ctx.currentUa !== ctx.signupUa) {
    score -= 10 // new device
  }

  // Recent password change
  if (ctx.recentPasswordChange) score -= 15

  return Math.max(0, Math.min(100, score))
}

// ─────────────────────────────────────────────────────────────────────────
// Should challenge?
// ─────────────────────────────────────────────────────────────────────────

export type AskCategory =
  | 'public_info' // anyone can ask: pricing, features, public docs
  | 'account_info' // requires verified user: their plan, services, automations
  | 'sensitive' // mutating actions or private data
  | 'internal_probe' // user asking about internals — auto-trigger IKY

export function shouldChallenge(trust: number, ask: AskCategory): boolean {
  if (ask === 'internal_probe') return true
  if (ask === 'sensitive') return trust < 70
  if (ask === 'account_info') return trust < 50
  return false
}

// ─────────────────────────────────────────────────────────────────────────
// Challenge bank
// ─────────────────────────────────────────────────────────────────────────

export type ChallengeType =
  | 'active_automation'
  | 'recent_service'
  | 'last_login_window'
  | 'task_on_list'

export interface Challenge {
  id: string
  type: ChallengeType
  question: string
  // Server-side only — never exposed to user
  expectedHash: string
  expectedHint: string
}

function hash(s: string): string {
  return crypto.createHash('sha256').update(normalize(s)).digest('hex')
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
}

async function pickActiveAutomation(userId: string): Promise<Challenge | null> {
  const { data } = await admin()
    .from('user_workflows')
    .select('name')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(5)
  if (!data || data.length === 0) return null
  // Pick a random one
  const picked = data[Math.floor(Math.random() * data.length)] as { name: string }
  return {
    id: '', // assigned by issueChallenge
    type: 'active_automation',
    question: 'Quick check — name one of your active automations.',
    expectedHash: hash(picked.name),
    expectedHint: picked.name,
  }
}

async function pickRecentService(userId: string): Promise<Challenge | null> {
  const { data } = await admin()
    .from('connected_services')
    .select('service_name, connected_at')
    .eq('user_id', userId)
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  const svc = (data as { service_name: string }).service_name
  return {
    id: '',
    type: 'recent_service',
    question: 'Which service did you most recently connect to your account?',
    expectedHash: hash(svc),
    expectedHint: svc,
  }
}

async function pickLastLoginWindow(userId: string): Promise<Challenge | null> {
  // Use auth.users last_sign_in_at (admin-only access)
  const { data } = await admin()
    .from('profiles')
    .select('last_login_at')
    .eq('id', userId)
    .maybeSingle()
  const last = (data as { last_login_at?: string } | null)?.last_login_at
  if (!last) return null

  const d = new Date(last)
  const now = new Date()
  const hours = (now.getTime() - d.getTime()) / 3_600_000
  let window: string
  if (hours < 1) window = 'within the last hour'
  else if (hours < 24) window = 'today'
  else if (hours < 48) window = 'yesterday'
  else if (hours < 168) window = 'this week'
  else window = 'more than a week ago'

  return {
    id: '',
    type: 'last_login_window',
    question: 'Roughly when did you last log in — within the last hour, today, yesterday, this week, or more than a week ago?',
    expectedHash: hash(window),
    expectedHint: window,
  }
}

async function pickTaskOnList(userId: string): Promise<Challenge | null> {
  const { data } = await admin()
    .from('tasks')
    .select('title')
    .eq('user_id', userId)
    .in('status', ['pending', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(5)
  if (!data || data.length === 0) return null
  const picked = data[Math.floor(Math.random() * data.length)] as { title: string }
  return {
    id: '',
    type: 'task_on_list',
    question: 'Name a task currently on your list (any one will do).',
    expectedHash: hash(picked.title),
    expectedHint: picked.title,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Issue + score
// ─────────────────────────────────────────────────────────────────────────

export async function issueChallenge(args: {
  conversationId: string
  locationId: string
  userId: string
}): Promise<Challenge | null> {
  const { conversationId, locationId, userId } = args

  // Try each source in random order; first one that yields data wins
  const builders = [pickActiveAutomation, pickRecentService, pickLastLoginWindow, pickTaskOnList]
  builders.sort(() => Math.random() - 0.5)

  let challenge: Challenge | null = null
  for (const fn of builders) {
    challenge = await fn(userId)
    if (challenge) break
  }
  if (!challenge) return null

  // Persist
  const { data, error } = await admin()
    .from('jaxx_iky_challenges')
    .insert({
      conversation_id: conversationId,
      location_id: locationId,
      user_id: userId,
      challenge_type: challenge.type,
      expected_answer_hash: challenge.expectedHash,
      expected_answer_hint: challenge.expectedHint,
      question: challenge.question,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[iky.issueChallenge] persist failed:', error)
    return null
  }

  return { ...challenge, id: data.id }
}

export interface ScoreResult {
  passed: boolean
  remainingAttempts: number
  locked: boolean
  trustDelta: number
}

export async function scoreAnswer(args: {
  conversationId: string
  answer: string
}): Promise<ScoreResult> {
  const { conversationId, answer } = args

  // Find latest pending challenge for this conversation
  const { data: ch } = await admin()
    .from('jaxx_iky_challenges')
    .select('id, expected_answer_hash, expected_answer_hint, attempts, max_attempts, expires_at, user_id, location_id')
    .eq('conversation_id', conversationId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!ch) {
    return { passed: false, remainingAttempts: 0, locked: false, trustDelta: 0 }
  }

  // Expired?
  if (new Date(ch.expires_at).getTime() < Date.now()) {
    await admin().from('jaxx_iky_challenges').update({ status: 'expired', resolved_at: new Date().toISOString() }).eq('id', ch.id)
    return { passed: false, remainingAttempts: 0, locked: false, trustDelta: -10 }
  }

  const submitted = hash(answer)
  // Also accept fuzzy: check if the submitted normalized answer is a substring of the hint or vice versa
  const submittedNorm = normalize(answer)
  const hintNorm = normalize(ch.expected_answer_hint || '')
  const fuzzyMatch =
    hintNorm.length >= 4 &&
    submittedNorm.length >= 3 &&
    (hintNorm.includes(submittedNorm) || submittedNorm.includes(hintNorm))

  const passed = submitted === ch.expected_answer_hash || fuzzyMatch

  const newAttempts = ch.attempts + 1

  if (passed) {
    await admin()
      .from('jaxx_iky_challenges')
      .update({ status: 'passed', attempts: newAttempts, resolved_at: new Date().toISOString() })
      .eq('id', ch.id)
    return { passed: true, remainingAttempts: ch.max_attempts - newAttempts, locked: false, trustDelta: 20 }
  }

  // Wrong
  const locked = newAttempts >= ch.max_attempts

  await admin()
    .from('jaxx_iky_challenges')
    .update({
      status: locked ? 'failed' : 'pending',
      attempts: newAttempts,
      resolved_at: locked ? new Date().toISOString() : null,
    })
    .eq('id', ch.id)

  if (locked) {
    // Best-effort alert; never throw
    void notifyLockout({
      conversationId,
      locationId: ch.location_id,
      userId: ch.user_id,
    })
  }

  return {
    passed: false,
    remainingAttempts: Math.max(0, ch.max_attempts - newAttempts),
    locked,
    trustDelta: -30,
  }
}

async function notifyLockout(args: { conversationId: string; locationId: string; userId: string | null }) {
  const slackToken = process.env.SLACK_BOT_TOKEN
  const channel = process.env.SLACK_ALERT_CHANNEL || 'C0AQQ2C00GJ'
  if (!slackToken) return

  try {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${slackToken}`,
      },
      body: JSON.stringify({
        channel,
        text: `:lock: Jaxx IKY lockout — conversation ${args.conversationId} (location ${args.locationId}, user ${args.userId ?? 'unknown'}). 3 failed identity challenges.`,
      }),
    })
  } catch (err) {
    console.error('[iky.notifyLockout] slack post failed:', err)
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Active challenge lookup (for webhook handler)
// ─────────────────────────────────────────────────────────────────────────

export async function getActiveChallenge(conversationId: string) {
  const { data } = await admin()
    .from('jaxx_iky_challenges')
    .select('id, question, attempts, max_attempts, expires_at, status')
    .eq('conversation_id', conversationId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}
