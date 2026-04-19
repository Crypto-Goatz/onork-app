import { pauseAll } from './queue'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'onai_security' },
  })
}

// Matches standalone "stop" or "off" (case-insensitive, trimmed)
const STOP_REGEX = /^\s*(stop|off)\s*$/i

/**
 * Check if a message contains a stop token (standalone only)
 */
export function matchStopToken(message: string): boolean {
  return STOP_REGEX.test(message)
}

export interface InterruptResult {
  interrupted: boolean
  paused_count: number
  message: string
}

/**
 * Handle an interrupt — abort current task and pause the queue.
 * Writes an audit entry.
 */
export async function handleInterrupt(
  sessionId: string,
  userId: string,
): Promise<InterruptResult> {
  const db = getAdmin()

  // Pause all queued items
  const pausedCount = await pauseAll(sessionId)

  // Write audit entry
  await db.from('audit').insert({
    session_id: sessionId,
    user_id: userId,
    event_type: 'interrupt',
    detail: {
      paused_count: pausedCount,
      reason: 'User issued stop command',
    },
  })

  return {
    interrupted: true,
    paused_count: pausedCount,
    message: `Interrupted. ${pausedCount} queued task${pausedCount !== 1 ? 's' : ''} paused.`,
  }
}
