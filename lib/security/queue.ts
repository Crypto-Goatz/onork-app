import { createClient } from '@supabase/supabase-js'
import { trustState } from './score'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'onai_security' },
  })
}

const MAX_QUEUE_SIZE = 10

export interface QueueItem {
  queue_id: string
  session_id: string
  position: number
  capability_id: string
  payload: Record<string, unknown>
  status: string
  enqueued_at: string
  dequeued_at: string | null
}

/**
 * Enqueue a capability request. Max 10 items per session.
 */
export async function enqueue(
  sessionId: string,
  capabilityId: string,
  payload: Record<string, unknown> = {},
): Promise<QueueItem> {
  const db = getAdmin()

  // Check current queue size
  const { count } = await db
    .from('queue')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('status', 'queued')

  if ((count ?? 0) >= MAX_QUEUE_SIZE) {
    throw new Error(`Queue full — maximum ${MAX_QUEUE_SIZE} items`)
  }

  // Get next position
  const { data: last } = await db
    .from('queue')
    .select('position')
    .eq('session_id', sessionId)
    .eq('status', 'queued')
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = (last?.position ?? 0) + 1

  const { data, error } = await db
    .from('queue')
    .insert({
      session_id: sessionId,
      position,
      capability_id: capabilityId,
      payload,
      status: 'queued',
    })
    .select()
    .single()

  if (error) throw new Error(`Enqueue failed: ${error.message}`)
  return data as QueueItem
}

/**
 * Dequeue the next item. Re-scores before returning.
 * If the session is RED at dequeue time, pauses everything.
 */
export async function dequeue(sessionId: string): Promise<QueueItem | null> {
  const db = getAdmin()

  // Check current session score
  const { data: session } = await db
    .from('sessions')
    .select('trust_score')
    .eq('session_id', sessionId)
    .single()

  if (!session) throw new Error('Session not found')

  const state = trustState(session.trust_score)
  if (state === 'red') {
    // Pause everything
    await pauseAll(sessionId)
    return null
  }

  // Get next queued item
  const { data: item } = await db
    .from('queue')
    .select('*')
    .eq('session_id', sessionId)
    .eq('status', 'queued')
    .order('position', { ascending: true })
    .limit(1)
    .single()

  if (!item) return null

  // Mark as dequeued
  await db
    .from('queue')
    .update({
      status: 'dequeued',
      dequeued_at: new Date().toISOString(),
    })
    .eq('queue_id', item.queue_id)

  return item as QueueItem
}

/**
 * Cancel a specific queued item
 */
export async function cancel(queueId: string): Promise<void> {
  const db = getAdmin()
  await db
    .from('queue')
    .update({ status: 'cancelled' })
    .eq('queue_id', queueId)
}

/**
 * Pause all queued items for a session
 */
export async function pauseAll(sessionId: string): Promise<number> {
  const db = getAdmin()
  const { data } = await db
    .from('queue')
    .update({ status: 'paused' })
    .eq('session_id', sessionId)
    .eq('status', 'queued')
    .select()

  return data?.length ?? 0
}

/**
 * List queued items for a session
 */
export async function listQueue(sessionId: string): Promise<QueueItem[]> {
  const db = getAdmin()
  const { data } = await db
    .from('queue')
    .select('*')
    .eq('session_id', sessionId)
    .in('status', ['queued', 'paused'])
    .order('position', { ascending: true })

  return (data ?? []) as QueueItem[]
}
