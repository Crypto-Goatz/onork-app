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

  const [{ data: messages }, { data: peers }] = await Promise.all([
    db.from('bridge_messages')
      .select('id, from_peer, to_peer, subject, detail, body, wake, seq, created_at')
      .eq('room', '0n').gt('seq', since)
      .order('seq', { ascending: true }).limit(200),
    db.from('bridge_peers')
      .select('name, joined_at, last_seen').eq('room', '0n')
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
    peers: roster,
    messages: list,
    lastSeq: list.length ? list[list.length - 1].seq : since,
    // The number a person should act on: how many agents are waiting on a
    // decision, as opposed to merely reporting progress.
    blocked: list.filter((m) => m.wake).length,
  })
}
