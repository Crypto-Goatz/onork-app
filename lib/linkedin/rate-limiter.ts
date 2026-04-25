import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// LinkedIn platform limits (conservative)
const POST_MAX_PER_DAY = 2
const POST_MIN_INTERVAL_MS = 4 * 60 * 60 * 1000  // 4 hours
const COMMENT_MAX_PER_DAY = 12
const COMMENT_MIN_INTERVAL_MS = 15 * 60 * 1000    // 15 minutes

// EST operating window
const WINDOW_START_EST = 7   // 7am
const WINDOW_END_EST = 21    // 9pm

function nowEST(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
}

function startOfDayEST(): Date {
  const d = nowEST()
  d.setHours(0, 0, 0, 0)
  return d
}

function inOperatingWindow(): boolean {
  const h = nowEST().getHours()
  return h >= WINDOW_START_EST && h < WINDOW_END_EST
}

export interface RateLimitResult {
  allowed: boolean
  reason?: string
  next_allowed_at?: string
}

// ── Post rate limit ───────────────────────────────────────────────────────────

export async function canPost(botConfigId: string): Promise<RateLimitResult> {
  if (!inOperatingWindow()) {
    const nextWindow = nowEST()
    if (nextWindow.getHours() >= WINDOW_END_EST) {
      nextWindow.setDate(nextWindow.getDate() + 1)
    }
    nextWindow.setHours(WINDOW_START_EST, 0, 0, 0)
    return { allowed: false, reason: 'Outside operating window (7am–9pm EST)', next_allowed_at: nextWindow.toISOString() }
  }

  const dayStart = startOfDayEST().toISOString()
  const { data: todayPosts } = await admin
    .from('bot_queue')
    .select('published_at, created_at')
    .eq('bot_config_id', botConfigId)
    .eq('type', 'post')
    .in('status', ['published', 'scheduled', 'approved'])
    .gte('created_at', dayStart)
    .order('created_at', { ascending: false })

  if ((todayPosts?.length ?? 0) >= POST_MAX_PER_DAY) {
    return { allowed: false, reason: `Daily post limit reached (${POST_MAX_PER_DAY}/day)` }
  }

  if (todayPosts && todayPosts.length > 0) {
    const lastTs = new Date(todayPosts[0].created_at).getTime()
    const elapsed = Date.now() - lastTs
    if (elapsed < POST_MIN_INTERVAL_MS) {
      const nextAt = new Date(lastTs + POST_MIN_INTERVAL_MS)
      return { allowed: false, reason: 'Minimum 4-hour interval between posts', next_allowed_at: nextAt.toISOString() }
    }
  }

  return { allowed: true }
}

// ── Comment rate limit ────────────────────────────────────────────────────────

export async function canComment(botConfigId: string): Promise<RateLimitResult> {
  if (!inOperatingWindow()) {
    return { allowed: false, reason: 'Outside operating window (7am–9pm EST)' }
  }

  const dayStart = startOfDayEST().toISOString()
  const { data: todayComments } = await admin
    .from('bot_queue')
    .select('created_at')
    .eq('bot_config_id', botConfigId)
    .eq('type', 'comment')
    .in('status', ['published', 'scheduled', 'approved'])
    .gte('created_at', dayStart)
    .order('created_at', { ascending: false })

  if ((todayComments?.length ?? 0) >= COMMENT_MAX_PER_DAY) {
    return { allowed: false, reason: `Daily comment limit reached (${COMMENT_MAX_PER_DAY}/day)` }
  }

  if (todayComments && todayComments.length > 0) {
    const lastTs = new Date(todayComments[0].created_at).getTime()
    const elapsed = Date.now() - lastTs
    if (elapsed < COMMENT_MIN_INTERVAL_MS) {
      const nextAt = new Date(lastTs + COMMENT_MIN_INTERVAL_MS)
      return { allowed: false, reason: 'Minimum 15-minute interval between comments', next_allowed_at: nextAt.toISOString() }
    }
  }

  return { allowed: true }
}

// ── Next available post time ──────────────────────────────────────────────────

export async function nextPostTime(botConfigId: string): Promise<Date | null> {
  const dayStart = startOfDayEST().toISOString()
  const { data } = await admin
    .from('bot_queue')
    .select('created_at')
    .eq('bot_config_id', botConfigId)
    .eq('type', 'post')
    .in('status', ['published', 'scheduled', 'approved'])
    .gte('created_at', dayStart)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!data?.length) {
    // Next available is now if in window, else tomorrow at window start
    const n = nowEST()
    if (n.getHours() >= WINDOW_START_EST && n.getHours() < WINDOW_END_EST) return new Date()
    const tomorrow = new Date(n)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(WINDOW_START_EST, 0, 0, 0)
    return tomorrow
  }

  const lastTs = new Date(data[0].created_at).getTime()
  return new Date(lastTs + POST_MIN_INTERVAL_MS)
}
