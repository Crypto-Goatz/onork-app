import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { applySignals, createSession, ensureProfile, getSession } from '@/lib/security/score'
import { decide, decisionReason } from '@/lib/security/ladder'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { session_id, capability_id, signals } = body

    if (!capability_id) {
      return NextResponse.json({ error: 'capability_id required' }, { status: 400 })
    }

    // Ensure user profile exists
    await ensureProfile(user.id)

    // Get or create session
    let sessionId = session_id
    if (!sessionId) {
      const session = await createSession(user.id, {
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        user_agent: req.headers.get('user-agent') || undefined,
      })
      sessionId = session.session_id
    }

    // Look up capability tier
    const { createClient: createAdmin } = await import('@supabase/supabase-js')
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: 'onai_security' } },
    )
    const { data: cap } = await admin
      .from('capability_tiers')
      .select('tier')
      .eq('capability_id', capability_id)
      .single()

    const tier = cap?.tier ?? 1

    // Apply signals if provided
    let scoreResult = null
    if (signals && Object.keys(signals).length > 0) {
      scoreResult = await applySignals(sessionId, signals, tier)
    }

    // Get current session state
    const session = await getSession(sessionId)
    const decision = decide(session.trust_score, tier)
    const reason = decisionReason(session.trust_score, tier, session.trust_state)

    return NextResponse.json({
      session_id: sessionId,
      score: session.trust_score,
      state: session.trust_state,
      tier,
      decision,
      reason,
      score_result: scoreResult,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
