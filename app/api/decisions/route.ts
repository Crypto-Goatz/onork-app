/**
 * POST /api/decisions — receive one round of answers.
 *
 * The TOKEN is the authorisation. This carries no client data — only decisions
 * about what to build — so a login gate would add friction to the one thing
 * that has to be frictionless, and gain nothing an unguessable token does not
 * already give.
 *
 * Answers are appended, never overwritten: a second submission is a change of
 * mind worth keeping, and the newest row is the one that counts.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  const answers = body?.answers

  if (!token || !answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'Missing token or answers.' }, { status: 400 })
  }

  const sb = db()
  const { data: round } = await sb
    .from('decision_rounds')
    .select('id, round')
    .eq('token', token)
    .maybeSingle()

  if (!round) return NextResponse.json({ error: 'Unknown round.' }, { status: 404 })

  const { error } = await sb.from('decision_answers').insert({
    round_id: round.id,
    answers,
  })
  if (error) {
    console.error('[decisions] insert failed:', error.message)
    return NextResponse.json({ error: 'Could not save your answers.' }, { status: 500 })
  }

  await sb
    .from('decision_rounds')
    .update({ status: 'answered', answered_at: new Date().toISOString() })
    .eq('id', round.id)

  return NextResponse.json({ ok: true, round: round.round })
}
