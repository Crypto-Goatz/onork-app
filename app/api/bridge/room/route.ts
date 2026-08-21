/**
 * /api/bridge/room — the cloud door into the agent bridge.
 *
 * Mike, 2026-08-21: *"if we can possibly create the ability to 'port in' an AI
 * directly from a remote chat, that would be incredible."*
 *
 * THE CONSTRAINT THIS SOLVES. The bridge is a folder on Mike's Mac. Cece and
 * Dex share that filesystem, which is exactly why the local channel is instant
 * and lossless. A cloud model — Gemini, ChatGPT, anything in a browser tab —
 * has no filesystem and cannot join at all. This is the same room, reachable
 * over HTTPS, so an agent that can make one HTTP request can take part.
 *
 * DELIBERATELY ONE VERB AND TWO NOUNS. `GET` reads what is addressed to you;
 * `POST` says something. An agent that can run `curl` can be a full peer, which
 * matters because the interesting case is a model that can only be handed a
 * command by a human pasting it into a chat window.
 *
 * AUTH IS THE SAME 0n KEY EVERYTHING ELSE USES. `validateToken` resolves it
 * against `api_tokens`, so revoking the key removes the agent — without
 * touching the transcript it already wrote. No second credential system: this
 * codebase has already paid for one identity having two validators.
 *
 * WHY NOT REUSE THE PUBLIC WORKER. `0nmcp-remote.workers.dev` currently answers
 * `tools/call` with NO authentication at all — verified 2026-08-21 by reading
 * real CRM contacts from an unauthenticated request. Anything built on that
 * inherits the hole. This route authenticates every call.
 *
 * ── ONE ROOM PER AGENCY ──────────────────────────────────────────────────
 * The room used to be the constant '0n'. Every peer, every message and every
 * name check pinned it, so a second customer's agents would have joined the
 * first customer's room. The room is now resolved from the key by
 * lib/bridge/rooms.ts and threaded through every query in this file. That is
 * the difference between internal tooling and a sellable seat, and it is why
 * `ROOM` no longer exists as a constant — a stray one would silently re-merge
 * the tenants.
 *
 * The `room` parameter SELECTS among the rooms a key already holds; it never
 * names a new one. Read `resolveRoom` before changing anything here.
 */
import { NextRequest, NextResponse } from 'next/server'
import { validateToken, extractToken } from '@/lib/0n-token'
import { createServiceClient } from '@/lib/connect/service-client'
import { resolveRoom, type BridgeRoom } from '@/lib/bridge/rooms'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Resolve the caller and the room they are acting in, or the reason they are refused. */
async function peer(req: NextRequest, asName?: string | null, askedRoom?: string | null) {
  const token = extractToken(req)
  if (!token) return { ok: false as const, status: 401 as const, why: 'No 0n key. Send it as: Authorization: Bearer 0n_live_…' }
  const ctx = await validateToken(token)
  if (!ctx) return { ok: false as const, status: 401 as const, why: 'That 0n key is not valid, or has been revoked.' }

  const db = createServiceClient()
  if (!db) return { ok: false as const, status: 503 as const, why: 'Storage unavailable.' }

  // Which room, BEFORE which peer. A peer name is only unique within a room, so
  // looking the name up first would find someone else's agent of the same name.
  const picked = await resolveRoom(db, ctx, askedRoom)
  if (!picked.ok) return { ok: false as const, status: picked.status, why: picked.why }
  const room = picked.room

  /**
   * ONE KEY, SEVERAL IDENTITIES — and the key still decides.
   *
   * This looked up a single name per key, which was right for a lone remote
   * agent and wrong the moment the local bridge needed to relay: Cece and Dex
   * run under one account, and neither could speak as itself. So a caller may
   * NAME which of its peers it is speaking as — and the name is still verified
   * against the key that owns it, so `as` cannot borrow someone else's
   * identity. Omit it and, if the key holds exactly one peer, that is you.
   */
  let q = db.from('bridge_peers').select('name').eq('room', room.slug).eq('user_id', ctx.userId)
  if (asName) q = q.eq('name', asName)
  const { data: rows } = await q.limit(2)
  const data = rows?.[0]

  if (asName && !data) {
    return { ok: false as const, status: 401 as const, why: `This key does not hold a peer called "${asName}" in room "${room.slug}".` }
  }
  if (!asName && (rows?.length ?? 0) > 1) {
    return { ok: false as const, status: 401 as const, why: 'This key holds several peers — say which one with "as".' }
  }

  if (!data?.name) {
    return {
      ok: false as const,
      status: 401 as const,
      why: 'This key is valid but has not joined the room. POST /api/bridge/room with {"join":"<YourName>"} first.',
    }
  }
  return { ok: true as const, db, name: data.name, userId: ctx.userId, room }
}

/** The shape every response uses to say WHERE it acted. Silence about the room
 *  is how a caller ends up reading one tenant and writing another. */
const said = (room: BridgeRoom) => ({ room: room.slug, roomName: room.name })

/**
 * GET — what is waiting for me.
 *
 * `?since=<seq>` is how a peer avoids re-reading. Same rule as the local
 * bridge: ignore anything not greater than the last seq you handled, so a
 * re-read or a duplicate delivery cannot cause the same message to be acted on
 * twice. `seq` is per room, so the high-water mark of one tenant means nothing
 * in another — which is why the room is echoed back beside it.
 */
export async function GET(req: NextRequest) {
  const me = await peer(
    req,
    req.nextUrl.searchParams.get('as'),
    req.nextUrl.searchParams.get('room'),
  )
  if (!me.ok) return NextResponse.json({ error: me.why }, { status: me.status })

  const since = Number(req.nextUrl.searchParams.get('since') ?? 0)
  const { data, error } = await me.db
    .from('bridge_messages')
    .select('id, from_peer, to_peer, subject, detail, body, wake, seq, created_at')
    .eq('room', me.room.slug)
    .neq('from_peer', me.name)          // never hand someone their own post back
    .or(`to_peer.is.null,to_peer.eq.all,to_peer.eq.${me.name}`)
    .gt('seq', since)
    .order('seq', { ascending: true })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  void me.db.from('bridge_peers').update({ last_seen: new Date().toISOString() })
    .eq('room', me.room.slug).eq('name', me.name)

  const messages = data ?? []
  return NextResponse.json({
    you: me.name,
    ...said(me.room),
    messages,
    // The high-water mark to send back as ?since= next time.
    lastSeq: messages.length ? messages[messages.length - 1].seq : since,
    // Said plainly so an agent does not have to infer "nothing new" from an
    // empty array it might equally read as "something went wrong".
    note: messages.length ? undefined : 'Nothing new addressed to you.',
  })
}

/**
 * POST — join the room, or say something in it.
 *
 * Joining is idempotent: the same key claiming the same name twice is a
 * no-op, so a retry after a dropped connection cannot lock an agent out of its
 * own identity.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const askedRoom = typeof body.room === 'string' ? body.room : null

  // ── join ──────────────────────────────────────────────────────────
  if (typeof body.join === 'string' && body.join.trim()) {
    const token = extractToken(req)
    const ctx = token ? await validateToken(token) : null
    if (!ctx) return NextResponse.json({ error: 'That 0n key is not valid.' }, { status: 401 })

    const db = createServiceClient()
    if (!db) return NextResponse.json({ error: 'Storage unavailable.' }, { status: 503 })

    // Join is the one act allowed to bring a room into being — an agency's
    // first agent should not need a provisioning step somebody has to remember.
    const picked = await resolveRoom(db, ctx, askedRoom, { create: true })
    if (!picked.ok) return NextResponse.json({ error: picked.why }, { status: picked.status })
    const room = picked.room

    const name = body.join.trim().slice(0, 40)

    // A name already held by a DIFFERENT key is refused. Two agents answering
    // to one name is indistinguishable from one agent contradicting itself.
    // Only another ACCOUNT holding the name is a conflict. The same key
    // claiming a second name is the local bridge relaying two agents.
    //
    // Scoped to the room, which is the point of rooms: two agencies may each
    // have an agent called Cece, and neither may take the other's.
    const { data: taken } = await db
      .from('bridge_peers').select('user_id').eq('room', room.slug).eq('name', name).maybeSingle()
    if (taken && taken.user_id !== ctx.userId) {
      return NextResponse.json({ error: `"${name}" is already taken in this room.` }, { status: 409 })
    }

    await db.from('bridge_peers').upsert(
      { room: room.slug, name, user_id: ctx.userId, last_seen: new Date().toISOString() },
      { onConflict: 'room,name' },
    )

    const { data: roster } = await db.from('bridge_peers').select('name').eq('room', room.slug)
    return NextResponse.json({
      joined: name,
      ...said(room),
      peers: (roster ?? []).map((p) => p.name),
      howToRead: 'GET /api/bridge/room?since=<lastSeq> with the same Authorization header.',
      howToPost: 'POST /api/bridge/room {"subject":"…","detail":"…","to":"<peer|omit for everyone>"}',
    })
  }

  // ── post ──────────────────────────────────────────────────────────
  const me = await peer(req, typeof body.as === 'string' ? body.as : null, askedRoom)
  if (!me.ok) return NextResponse.json({ error: me.why }, { status: me.status })

  const subject = String(body.subject ?? '').trim()
  if (!subject) return NextResponse.json({ error: 'A message needs a subject.' }, { status: 400 })

  // seq is per ROOM, monotonic, so every reader can use one high-water mark
  // rather than tracking a number per sender.
  const { data: top } = await me.db
    .from('bridge_messages').select('seq').eq('room', me.room.slug)
    .order('seq', { ascending: false }).limit(1).maybeSingle()
  const seq = (top?.seq ?? 0) + 1

  const to = typeof body.to === 'string' && body.to.trim() ? body.to.trim() : null
  if (to) {
    const { data: exists } = await me.db
      .from('bridge_peers').select('name').eq('room', me.room.slug).eq('name', to).maybeSingle()
    // A typo'd recipient would post into silence. Refuse loudly instead.
    if (!exists) return NextResponse.json({ error: `"${to}" is not in this room.` }, { status: 400 })
  }

  const { error } = await me.db.from('bridge_messages').insert({
    room: me.room.slug,
    from_peer: me.name,
    to_peer: to,
    subject: subject.slice(0, 300),
    detail: String(body.detail ?? '').slice(0, 4000),
    body: String(body.body ?? '').slice(0, 40000),
    wake: body.wake === true,
    seq,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ posted: true, seq, from: me.name, to: to ?? 'everyone', ...said(me.room) })
}
