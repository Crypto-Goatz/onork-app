import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serveNext, resolveChallenge, addChallenge } from '@/lib/security/challenges'

/**
 * GET /api/security/challenge — serve the next challenge
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const challenge = await serveNext(user.id)
    if (!challenge) {
      return NextResponse.json({
        available: false,
        message: 'No challenges available. Challenges are generated from your activity.',
      })
    }

    return NextResponse.json({
      available: true,
      challenge,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/security/challenge — resolve an answer OR add a new challenge
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    // If adding a new challenge (admin/system use)
    if (body.action === 'add') {
      const { question, answer, recency_band, recall_type } = body
      if (!question || !answer) {
        return NextResponse.json({ error: 'question and answer required' }, { status: 400 })
      }
      const challengeId = await addChallenge(
        user.id,
        question,
        answer,
        recency_band || '24h',
        recall_type || 'factual',
      )
      return NextResponse.json({ challenge_id: challengeId, added: true })
    }

    // Resolving a challenge
    const { challenge_id, answer, session_id } = body
    if (!challenge_id || !answer || !session_id) {
      return NextResponse.json(
        { error: 'challenge_id, answer, and session_id required' },
        { status: 400 },
      )
    }

    const result = await resolveChallenge(challenge_id, answer, session_id)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
