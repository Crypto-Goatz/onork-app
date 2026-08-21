/**
 * GET /api/hub/room — the human's window into the agent room.
 *
 * Deliberately SEPARATE from /api/bridge/room. That one is the agents' door:
 * authenticated by 0n key, and it only ever returns what is addressed to the
 * caller — because an agent acting on someone else's message does the job
 * twice. This one is the observer's door: owner-gated by session, and it
 * returns EVERYTHING, because the whole point is watching a conversation you
 * are not a party to.
 *
 * Two audiences, two shapes, one table. Merging them would mean either leaking
 * the whole room to every agent, or hiding it from the person who owns it.
 *
 * ROOMS, PLURAL. This pinned room='0n' when '0n' was the only room there was.
 * Now that a room belongs to an agency, the operator's window has to say WHICH
 * one it is showing, and be able to look at another — so it takes `?room=` and
 * returns the roster of rooms for the switcher. The agents' door decides a room
 * from the caller's key; this door does not, because the operator is not a
 * party to any of these rooms and gating them on his own key would show him
 * nothing.
 */
import { NextRequest, NextResponse } from 'next/server'
import { isOwner } from '@/lib/owner'
import { createServiceClient } from '@/lib/connect/service-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Idle beyond this and a peer is "away" rather than working. */
const PRESENT_MS = 5 * 60 * 1000

export async function GET(req: NextRequest) {
  // 404, not 403 — an unauthorised visitor learns nothing about what is here.
  if (!(await isOwner())) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage unavailable.' }, { status: 503 })

  const since = Number(req.nextUrl.searchParams.get('since') ?? 0)

  /**
   * WHICH ROOM, AND NEVER A GUESS.
   *
   * The default is the OLDEST room rather than the literal '0n'. Same room
   * today, but a hardcoded slug is how the tenancy quietly came back last time:
   * rename or retire '0n' and a pinned literal renders an empty window that
   * looks exactly like a quiet room.
   */
  const { data: rooms } = await db
    .from('bridge_rooms').select('slug, name').order('created_at', { ascending: true })

  const asked = req.nextUrl.searchParams.get('room')?.trim()
  const room = asked
    ? (rooms ?? []).find((r) => r.slug === asked)
    : (rooms ?? [])[0]

  if (!room) {
    // Empty is not the same as missing, and the UI has to tell them apart.
    return NextResponse.json({
      rooms: (rooms ?? []).map((r) => ({ slug: r.slug, name: r.name })),
      room: null, peers: [], messages: [], lastSeq: since, blocked: 0,
      note: asked
        ? `No room called "${asked}".`
        : 'No rooms exist yet. One is created when an agency\'s first agent joins.',
    }, { status: asked ? 404 : 200 })
  }

  const [{ data: messages }, { data: peers }] = await Promise.all([
    db.from('bridge_messages')
      .select('id, from_peer, to_peer, subject, detail, body, wake, seq, created_at')
      .eq('room', room.slug).gt('seq', since)
      .order('seq', { ascending: true }).limit(200),
    db.from('bridge_peers')
      .select('name, joined_at, last_seen').eq('room', room.slug)
      .order('joined_at', { ascending: true }),
  ])

  const now = Date.now()
  const roster = (peers ?? []).map((p) => ({
    name: p.name,
    // Presence is DERIVED from last_seen, never stored as a boolean. A stored
    // "online" flag survives a crash and lies about a peer that is gone.
    present: !!p.last_seen && now - new Date(p.last_seen).getTime() < PRESENT_MS,
    lastSeen: p.last_seen,
  }))

  const list = messages ?? []
  return NextResponse.json({
    room: room.slug,
    roomName: room.name,
    rooms: (rooms ?? []).map((r) => ({ slug: r.slug, name: r.name })),
    peers: roster,
    messages: list,
    lastSeq: list.length ? list[list.length - 1].seq : since,
    // The number a person should act on: how many agents are waiting on a
    // decision, as opposed to merely reporting progress.
    blocked: list.filter((m) => m.wake).length,
  })
}
