/**
 * Per-user Groq key router with quota.
 *
 * Resolution order:
 *   1. The user's own Groq key (stored as a `user_connections` row with
 *      provider='groq'). Bring-your-own-key is unlimited — they pay Groq.
 *   2. The platform key (process.env.GROQ_API_KEY). Subject to a per-month
 *      task budget that scales with the user's plan:
 *        free:        100/month
 *        starter:     1,000/month
 *        pro+:        10,000/month
 *        enterprise:  unlimited (Number.MAX_SAFE_INTEGER)
 *
 * After every billable call, the platform-key user's monthly counter
 * (groq_usage row keyed by user_id + YYYY-MM) is incremented.
 *
 * For users who have their own key, no usage row is written — they're
 * billed by Groq directly.
 */

import { createClient } from '@supabase/supabase-js'

export type GroqKeySource = 'user' | 'platform'

export interface GroqKeyResolution {
  apiKey: string
  source: GroqKeySource
  /** When source='platform': the limit + how much used this month. */
  quota?: {
    limit: number
    used: number
    remaining: number
    plan: string
    month: string
  }
  /** When source='platform' AND remaining=0: caller should refuse the call. */
  exhausted: boolean
  /** When source='platform': set to true so caller can call recordUsage(). */
  shouldRecord: boolean
}

const FREE_LIMIT = 100
const STARTER_LIMIT = 1_000
const PRO_LIMIT = 10_000
const UNLIMITED = Number.MAX_SAFE_INTEGER

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function planLimit(plan: string): number {
  switch ((plan || 'free').toLowerCase()) {
    case 'free':
      return FREE_LIMIT
    case 'starter':
      return STARTER_LIMIT
    case 'pro':
    case 'agency':
      return PRO_LIMIT
    case 'enterprise':
    case 'lifetime':
      return UNLIMITED
    default:
      return FREE_LIMIT
  }
}

/**
 * Resolve which Groq key to use for a call by this user.
 *
 * If `userId` is null/undefined (server-side cron, public surfaces) we fall
 * back to the platform key with no quota tracking.
 */
export async function resolveGroqKey(userId: string | null | undefined): Promise<GroqKeyResolution> {
  const platformKey = process.env.GROQ_API_KEY || ''

  if (!userId) {
    return {
      apiKey: platformKey,
      source: 'platform',
      exhausted: !platformKey,
      shouldRecord: false,
    }
  }

  const sb = admin()

  // 1. User's own Groq key
  const { data: conn } = await sb
    .from('user_connections')
    .select('access_token, status')
    .eq('user_id', userId)
    .eq('provider', 'groq')
    .eq('status', 'active')
    .maybeSingle()
  if (conn?.access_token) {
    return {
      apiKey: conn.access_token,
      source: 'user',
      exhausted: false,
      shouldRecord: false,
    }
  }

  // 2. Platform key with quota
  const { data: profile } = await sb
    .from('profiles')
    .select('plan, plan_status')
    .eq('id', userId)
    .maybeSingle()
  const plan = (profile?.plan as string) || 'free'
  const limit = planLimit(plan)

  const month = currentMonth()
  const { data: usage } = await sb
    .from('groq_usage')
    .select('tasks_used')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('source', 'platform')
    .maybeSingle()

  const used = usage?.tasks_used ?? 0
  const remaining = Math.max(0, limit - used)

  return {
    apiKey: platformKey,
    source: 'platform',
    quota: { limit, used, remaining, plan, month },
    exhausted: !platformKey || remaining === 0,
    shouldRecord: !!platformKey && remaining > 0,
  }
}

export async function recordGroqUsage(userId: string, count = 1): Promise<void> {
  const sb = admin()
  const month = currentMonth()
  // Upsert via existing row → increment, or create new row.
  const { data: existing } = await sb
    .from('groq_usage')
    .select('id, tasks_used')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('source', 'platform')
    .maybeSingle()
  if (existing) {
    await sb
      .from('groq_usage')
      .update({
        tasks_used: (existing.tasks_used ?? 0) + count,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await sb.from('groq_usage').insert({
      user_id: userId,
      month,
      source: 'platform',
      tasks_used: count,
    })
  }
}

/**
 * GET status for the dashboard banner / settings page.
 * Returns the same shape as resolveGroqKey() but redacts the actual key.
 */
export interface GroqKeyStatus {
  hasOwnKey: boolean
  source: GroqKeySource
  exhausted: boolean
  quota?: GroqKeyResolution['quota']
  /** When hasOwnKey: an asterisked preview, e.g. gsk_•••XYZ */
  ownKeyPreview?: string
}

export async function getGroqKeyStatus(userId: string): Promise<GroqKeyStatus> {
  const r = await resolveGroqKey(userId)
  if (r.source === 'user') {
    const tail = r.apiKey.slice(-4)
    return {
      hasOwnKey: true,
      source: 'user',
      exhausted: false,
      ownKeyPreview: `gsk_•••${tail}`,
    }
  }
  return {
    hasOwnKey: false,
    source: 'platform',
    exhausted: r.exhausted,
    quota: r.quota,
  }
}

/**
 * Tiny end-to-end "proof of life" against Groq. Hits /openai/v1/models which
 * is free, fast, and rejects on 401. Returns true on success, throws on 401
 * with a useful message so /api/connections/groq POST can return it verbatim.
 */
export async function probeGroqKey(apiKey: string): Promise<{ ok: boolean; modelCount: number }> {
  if (!apiKey || !apiKey.startsWith('gsk_')) {
    throw new Error('Key must start with `gsk_`')
  }
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (res.status === 401) {
    throw new Error('Groq rejected the key (401). Generate a new one at console.groq.com/keys.')
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Groq probe failed (${res.status}): ${text.slice(0, 120)}`)
  }
  const json = await res.json().catch(() => ({}))
  const models = Array.isArray(json?.data) ? json.data.length : 0
  return { ok: true, modelCount: models }
}
