/**
 * POST /api/hub/room/say — the owner speaking into the room.
 *
 * Separate from the agents' door because the auth is different: agents carry a
 * 0n key, the owner carries a session. Same table, one sender name reserved for
 * the human — so a transcript always shows who is an agent and who is Mike.
 *
 * IT MUST BE TOLD WHICH ROOM. This posted into the literal '0n', which was
 * harmless while that was the only room and is not now: with the window able to
 * show any agency's room, a reply typed while looking at one tenant would have
 * landed in another. There is deliberately NO default — the observer's window
 * always knows which room it is showing, and a caller that does not know has no
 * business writing into a customer's transcript.
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

  const asked = typeof body.room === 'string' ? body.room.trim() : ''
  if (!asked) return NextResponse.json({ error: 'Which room? Send "room".' }, { status: 400 })

  // Checked against the table rather than trusted. Without this, a typo would
  // open a room nobody can reach: `room` is a plain text column, so an insert
  // with an unknown slug succeeds and the message is simply never read.
  const { data: room } = await db
    .from('bridge_rooms').select('slug').eq('slug', asked).maybeSingle()
  if (!room) return NextResponse.json({ error: `No room called "${asked}".` }, { status: 404 })

  const { data: top } = await db.from('bridge_messages').select('seq').eq('room', room.slug)
    .order('seq', { ascending: false }).limit(1).maybeSingle()

  const { error } = await db.from('bridge_messages').insert({
    room: room.slug,
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
