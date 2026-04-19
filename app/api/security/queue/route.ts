import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enqueue, dequeue, cancel, listQueue } from '@/lib/security/queue'

/**
 * GET /api/security/queue?session_id=xxx — list queued items
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sessionId = req.nextUrl.searchParams.get('session_id')
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 })
    }

    const items = await listQueue(sessionId)
    return NextResponse.json({ items, count: items.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/security/queue — enqueue, dequeue, or cancel
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { action, session_id, capability_id, payload, queue_id } = body

    if (!session_id) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 })
    }

    switch (action) {
      case 'enqueue': {
        if (!capability_id) {
          return NextResponse.json({ error: 'capability_id required for enqueue' }, { status: 400 })
        }
        const item = await enqueue(session_id, capability_id, payload || {})
        return NextResponse.json({ action: 'enqueued', item })
      }
      case 'dequeue': {
        const item = await dequeue(session_id)
        if (!item) {
          return NextResponse.json({
            action: 'empty',
            message: 'Queue empty or session is RED (paused)',
          })
        }
        return NextResponse.json({ action: 'dequeued', item })
      }
      case 'cancel': {
        if (!queue_id) {
          return NextResponse.json({ error: 'queue_id required for cancel' }, { status: 400 })
        }
        await cancel(queue_id)
        return NextResponse.json({ action: 'cancelled', queue_id })
      }
      default:
        return NextResponse.json(
          { error: 'action must be enqueue, dequeue, or cancel' },
          { status: 400 },
        )
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
