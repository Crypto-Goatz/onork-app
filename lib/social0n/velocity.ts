/**
 * Velocity Manager — LinkedIn safe limits to prevent account restrictions.
 * Tracks daily activity and enforces rate limits.
 */

export interface DailyLimits {
  posts: { limit: number; used: number; minGapHours: number }
  comments: { limit: number; used: number; minGapMinutes: number }
  profileVisits: { limit: number; used: number }
  connectionRequests: { limit: number; used: number; minGapMinutes: number }
  dms: { limit: number; used: number; minGapMinutes: number }
  reactions: { limit: number; used: number; minGapMinutes: number }
}

export const DEFAULT_LIMITS: DailyLimits = {
  posts: { limit: 2, used: 0, minGapHours: 4 },
  comments: { limit: 12, used: 0, minGapMinutes: 15 },
  profileVisits: { limit: 80, used: 0 },
  connectionRequests: { limit: 25, used: 0, minGapMinutes: 5 },
  dms: { limit: 15, used: 0, minGapMinutes: 10 },
  reactions: { limit: 60, used: 0, minGapMinutes: 2 },
}

export interface VelocityCheck {
  allowed: boolean
  reason?: string
  nextAllowedAt?: string
  usage: { used: number; limit: number; percentage: number }
}

/**
 * Check if an action is allowed based on velocity limits.
 */
export function checkVelocity(
  action: keyof DailyLimits,
  limits: DailyLimits,
  lastActionAt?: string,
): VelocityCheck {
  const entry = limits[action]
  const usage = { used: entry.used, limit: entry.limit, percentage: Math.round((entry.used / entry.limit) * 100) }

  // Check daily limit
  if (entry.used >= entry.limit) {
    return { allowed: false, reason: `Daily ${action} limit reached (${entry.limit})`, usage }
  }

  // Check time gap
  if (lastActionAt && 'minGapMinutes' in entry) {
    const gap = (entry as any).minGapMinutes
    const lastTime = new Date(lastActionAt).getTime()
    const now = Date.now()
    const elapsed = (now - lastTime) / 60000 // minutes

    if (elapsed < gap) {
      const nextAllowed = new Date(lastTime + gap * 60000).toISOString()
      return {
        allowed: false,
        reason: `Wait ${Math.ceil(gap - elapsed)} more minutes between ${action}`,
        nextAllowedAt: nextAllowed,
        usage,
      }
    }
  }

  if (lastActionAt && 'minGapHours' in entry) {
    const gap = (entry as any).minGapHours
    const lastTime = new Date(lastActionAt).getTime()
    const now = Date.now()
    const elapsed = (now - lastTime) / 3600000 // hours

    if (elapsed < gap) {
      const nextAllowed = new Date(lastTime + gap * 3600000).toISOString()
      return {
        allowed: false,
        reason: `Wait ${Math.ceil(gap - elapsed)} more hours between ${action}`,
        nextAllowedAt: nextAllowed,
        usage,
      }
    }
  }

  // Check quiet hours (11pm - 6am local)
  const hour = new Date().getHours()
  if (hour >= 23 || hour < 6) {
    return { allowed: false, reason: 'Quiet hours (11pm-6am) — LinkedIn penalizes late activity', usage }
  }

  return { allowed: true, usage }
}

/**
 * Calculate optimal posting times based on day of week.
 */
export function getOptimalTimes(): { day: string; times: string[]; quality: string }[] {
  return [
    { day: 'Monday', times: ['7:30 AM', '12:00 PM'], quality: 'High' },
    { day: 'Tuesday', times: ['8:00 AM', '10:30 AM', '12:00 PM'], quality: 'Peak' },
    { day: 'Wednesday', times: ['7:30 AM', '12:00 PM', '5:30 PM'], quality: 'Peak' },
    { day: 'Thursday', times: ['8:00 AM', '11:00 AM'], quality: 'High' },
    { day: 'Friday', times: ['7:30 AM', '10:00 AM'], quality: 'Medium' },
    { day: 'Saturday', times: [], quality: 'Off' },
    { day: 'Sunday', times: [], quality: 'Off' },
  ]
}
