import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { matchStopToken, handleInterrupt } from '@/lib/security/interrupt'

/**
 * POST /api/security/interrupt — handle STOP/OFF commands
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = (await supabase.auth.getSession()).data.session?.user ?? null
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { session_id, message } = body

    if (!session_id) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 })
    }

    // Check if the message is a stop token
    if (message && !matchStopToken(message)) {
      return NextResponse.json({
        interrupted: false,
        message: 'Not a stop command. Use "stop" or "off".',
      })
    }

    const result = await handleInterrupt(session_id, user.id)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
