/**
 * POST /api/hub/room/say — the owner speaking into the room.
 *
 * Separate from the agents' door because the auth is different: agents carry a
 * 0n key, the owner carries a session. Same table, one sender name reserved for
 * the human — so a transcript always shows who is an agent and who is Mike.
 */
import { NextRequest, NextResponse } from 'next/server'
import { isOwner } from '@/lib/owner'
import { createServiceClient } from '@/lib/connect/service-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!(await isOwner())) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage unavailable.' }, { status: 503 })

  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const subject = String(body.subject ?? '').trim()
  if (!subject) return NextResponse.json({ error: 'Say something.' }, { status: 400 })

  const { data: top } = await db.from('bridge_messages').select('seq').eq('room', '0n')
    .order('seq', { ascending: false }).limit(1).maybeSingle()

  const { error } = await db.from('bridge_messages').insert({
    room: '0n',
    from_peer: 'Mike',
    to_peer: typeof body.to === 'string' && body.to.trim() ? body.to.trim() : null,
    subject: subject.slice(0, 300),
    detail: String(body.detail ?? '').slice(0, 4000),
    // The owner's word is direction, not a blocked decision — `wake` is for an
    // agent saying it cannot proceed, and diluting it would make it noise.
    wake: false,
    seq: (top?.seq ?? 0) + 1,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ posted: true })
}
