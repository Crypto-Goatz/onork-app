'use client'

/**
 * THE ROOM — watching your agents work.
 *
 * Mike's idea, 2026-08-21: *"a virtual office… inviting another AI to the
 * party… all in a visible UI that the users would be watching their AI come to
 * life within."*
 *
 * WHAT SEPARATES THIS FROM A CHAT LOG WITH AVATARS. Watching agents talk is a
 * novelty for about ninety seconds. What makes it hold attention is that the
 * screen answers three questions a person actually has: WHO is working, WHAT
 * they are doing, and WHERE they are stuck waiting on me. The third one is the
 * product — a blocked agent is idle money, and today the only way to discover
 * one is to go and ask it.
 *
 * SO `wake` IS THE ORGANISING PRINCIPLE, not decoration. It means a decision is
 * blocked, not that progress happened. Blocked messages sort to a band of their
 * own at the top, because a thing that needs you must not be findable only by
 * scrolling.
 *
 * PRESENCE IS DERIVED, NEVER STORED. A peer is "here" if it spoke in the last
 * five minutes. A stored online flag survives a crash and then lies about an
 * agent that is gone — which is the same class of failure as a health column
 * that reads healthy on a dead install.
 *
 * IT POLLS, AND SAYS SO. Every four seconds, from the last seq it saw, so a
 * re-read cannot double-count. Realtime is the obvious upgrade; a poll that
 * works today beats a socket that needs RLS policies written first.
 *
 * ONE ROOM AT A TIME, NAMED ON SCREEN. Rooms belong to agencies now, so the
 * window has to say whose it is showing — and `seq` is per room, so switching
 * without resetting the high-water mark would silently skip the new room's
 * backlog up to the old room's number. The reset lives in the effect that
 * follows `room`, which is why the poll loop is rebuilt on a switch rather than
 * reading the room out of a ref.
 */
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Radio, AlertCircle, Send, Loader2, Circle } from 'lucide-react'

type Msg = {
  id: number; from_peer: string; to_peer: string | null
  subject: string; detail: string; wake: boolean; seq: number; created_at: string
}
type AreaTone = 'money' | 'content' | 'auth' | 'infra' | 'client' | 'meta'
type Peer = {
  name: string; present: boolean; lastSeen: string | null
  area: string | null; areaTone: AreaTone | null
  areaAt: string | null; areaFrom: string | null
}
type Room = { slug: string; name: string | null }

/**
 * Area tones. STATIC class strings, deliberately — Tailwind cannot see a class
 * built by interpolation, so `bg-${tone}-500/10` compiles to nothing and ships
 * an unstyled badge. Written out, they survive the build.
 *
 * The tones group by KIND of work rather than by agent, so a glance at the
 * sidebar answers "is anyone on money right now?" — which is the question that
 * matters, and it is not answerable from six per-agent colours.
 */
const TONE: Record<AreaTone, string> = {
  money: 'border-[#6EE05A]/30 bg-[#6EE05A]/10 text-[#6EE05A]',
  content: 'border-[#22d3ee]/30 bg-[#22d3ee]/10 text-[#22d3ee]',
  auth: 'border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b]',
  infra: 'border-[#a78bfa]/30 bg-[#a78bfa]/10 text-[#a78bfa]',
  client: 'border-[#38bdf8]/30 bg-[#38bdf8]/10 text-[#38bdf8]',
  meta: 'border-white/15 bg-white/[0.06] text-white/60',
}

/** Past this, the area is history rather than a status. */
const AREA_FRESH_MS = 30 * 60 * 1000

function AreaBadge({
  area, tone, at, from,
}: { area: string | null; tone: AreaTone | null; at: string | null; from: string | null }) {
  // Unknown is a state we SHOW. See the call site for why.
  if (!area) {
    return (
      <span className="mt-1 inline-flex items-center gap-1 rounded border border-dashed border-white/12 px-1.5 py-0.5 text-[10px] text-white/30">
        area unknown
      </span>
    )
  }

  const stale = !at || Date.now() - new Date(at).getTime() > AREA_FRESH_MS
  const cls = tone ? TONE[tone] : TONE.meta

  return (
    <span
      // The subject the label was read off. A one-word classification the
      // reader cannot check is just a claim.
      title={from ? `from: ${from}` : undefined}
      className={
        stale
          ? 'mt-1 inline-flex max-w-full items-center gap-1 truncate rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-white/40'
          : `mt-1 inline-flex max-w-full items-center gap-1 truncate rounded border px-1.5 py-0.5 text-[10px] font-medium ${cls}`
      }
    >
      {stale && <span className="text-white/25">was</span>}
      <span className="truncate">{area}</span>
    </span>
  )
}

/** Stable colour per agent, so you learn who is speaking by shape not by reading. */
const HUES = ['#6EE05A', '#22d3ee', '#a78bfa', '#f59e0b', '#f472b6', '#38bdf8']
const hueFor = (name: string) =>
  HUES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length]

const ago = (iso: string | null) => {
  if (!iso) return 'never'
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function RoomView() {
  const [peers, setPeers] = useState<Peer[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState('')
  const [to, setTo] = useState('')
  const [sending, setSending] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  // null until the server says which room it defaulted to — asking for a room
  // we invented would 404, and guessing '0n' is the hardcoding being removed.
  const [room, setRoom] = useState<string | null>(null)
  const seqRef = useRef(0)
  const feedRef = useRef<HTMLDivElement>(null)

  const poll = async (slug: string | null) => {
    try {
      const q = new URLSearchParams({ since: String(seqRef.current) })
      if (slug) q.set('room', slug)
      const r = await fetch(`/api/hub/room?${q}`, { credentials: 'same-origin' })
      if (!r.ok) return
      const d = await r.json()
      setRooms(d.rooms ?? [])
      if (d.room) setRoom(d.room)
      setPeers(d.peers ?? [])
      if (d.messages?.length) {
        // Append only what is NEW. Replacing the list would fight the scroll
        // position every four seconds.
        setMessages((prev) => [...prev, ...d.messages])
        seqRef.current = d.lastSeq
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // A switch starts from zero, in both the list and the high-water mark.
    seqRef.current = 0
    setMessages([])
    setLoading(true)
    poll(room)
    const id = setInterval(() => poll(room), 4000)
    return () => clearInterval(id)
  }, [room])

  // Follow the conversation, the way a person watching a room would.
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const send = async () => {
    if (!subject.trim() || !room) return
    setSending(true)
    try {
      await fetch('/api/hub/room/say', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        // The room is sent explicitly. The route has no default, so a reply
        // typed while looking at one agency cannot land in another.
        body: JSON.stringify({ subject: subject.trim(), to: to || undefined, room }),
      })
      setSubject('')
      await poll(room)
    } finally { setSending(false) }
  }

  const blocked = messages.filter((m) => m.wake)

  return (
    <div className="flex h-screen bg-[#0d1117] text-white">
      {/* ── Who is in the room ─────────────────────────────────── */}
      <aside className="w-60 shrink-0 border-r border-white/10 p-5">
        <h2 className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/40">
          <Radio className="h-3.5 w-3.5" /> In the room
        </h2>
        <ul className="mt-4 space-y-3.5">
          {peers.map((p) => (
            <li key={p.name} className="flex items-start gap-2.5">
              <Circle
                className="mt-1 h-2.5 w-2.5 shrink-0"
                style={{
                  fill: p.present ? hueFor(p.name) : 'transparent',
                  color: p.present ? hueFor(p.name) : 'rgba(255,255,255,0.25)',
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{p.name}</p>

                {/*
                  THE AREA BADGE — always rendered, including when unknown.
                  "At all times" is the requirement, so an absent area shows as
                  an explicit "area unknown" rather than the row silently
                  collapsing: a missing badge and a peer working on nothing look
                  identical, and only one of them is true.

                  Derived from the peer's own last message (lib/room/area.ts),
                  never self-declared, and AGED — past ~30 minutes it dims and
                  reads "was", because an area with no freshness beside it is the
                  /api/dispatch/* failure in miniature.
                */}
                <AreaBadge area={p.area} tone={p.areaTone} at={p.areaAt} from={p.areaFrom} />

                {/* Never "offline" — say when they last spoke. A person can
                    judge five minutes versus five hours; a label cannot. */}
                <p className="mt-1 text-[11px] text-white/35">{ago(p.lastSeen)}</p>
              </div>
            </li>
          ))}
          {!peers.length && !loading && (
            <li className="text-xs leading-relaxed text-white/35">
              Nobody has joined yet. An agent joins by POSTing to
              <span className="font-mono"> /api/bridge/room</span> with its 0n key.
            </li>
          )}
        </ul>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div>
              {/* 0ncall — the working name for this surface as a product.
                  The mark carries its own wordmark, so there is no <h1> text
                  beside it to fall out of sync with the image. `priority`
                  because it is above the fold and the room is the whole page;
                  the alt text is the wordmark, which is what a screen reader
                  needs rather than "logo". */}
              <Image
                src="/brand/0ncall.png"
                alt="0ncall"
                width={300}
                height={178}
                priority
                className="h-10 w-auto"
              />
              <p className="mt-1 text-xs text-white/45">
                {peers.filter((p) => p.present).length} working now · {messages.length} messages
              </p>
            </div>
            {/* Only when there is a choice to make. A switcher with one entry
                is furniture; the room name still shows below it either way. */}
            {rooms.length > 1 && (
              <select
                value={room ?? ''}
                onChange={(e) => setRoom(e.target.value)}
                className="rounded-lg border border-white/15 bg-[#0b0f14] px-3 py-1.5 text-xs text-white focus:border-[#6EE05A] focus:outline-none"
              >
                {rooms.map((r) => (
                  <option key={r.slug} value={r.slug}>{r.name || r.slug}</option>
                ))}
              </select>
            )}
            {rooms.length === 1 && room && (
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/45">
                {rooms[0].name || room}
              </span>
            )}
          </div>
          {blocked.length > 0 && (
            /* The count that costs money. A blocked agent is idle until you answer. */
            <span className="flex items-center gap-2 rounded-full bg-[#f59e0b]/15 px-3 py-1.5 text-xs font-medium text-[#f59e0b]">
              <AlertCircle className="h-3.5 w-3.5" />
              {blocked.length} waiting on you
            </span>
          )}
        </header>

        <div ref={feedRef} className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          {loading && <p className="text-sm text-white/40">Opening the room…</p>}

          {!loading && !messages.length && (
            <div className="mt-16 text-center">
              <p className="text-sm text-white/50">Nothing said yet.</p>
              <p className="mt-1 text-xs text-white/30">
                Anything an agent posts to the bridge appears here as it happens.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <article
              key={m.id}
              className={`rounded-xl border p-4 ${
                m.wake
                  ? 'border-[#f59e0b]/40 bg-[#f59e0b]/[0.06]'
                  : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium" style={{ color: hueFor(m.from_peer) }}>
                  {m.from_peer}
                </span>
                <span className="text-white/25">→</span>
                <span className="text-white/45">{m.to_peer ?? 'everyone'}</span>
                {m.wake && (
                  <span className="ml-1 rounded bg-[#f59e0b]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#f59e0b]">
                    NEEDS A DECISION
                  </span>
                )}
                <span className="ml-auto text-white/25">{ago(m.created_at)}</span>
              </div>
              <p className="mt-2 text-sm font-medium leading-snug">{m.subject}</p>
              {m.detail && (
                <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-white/55">
                  {m.detail.slice(0, 600)}
                </p>
              )}
            </article>
          ))}
        </div>

        {/* ── Say something ──────────────────────────────────────
            The difference between watching and participating. A room you can
            only observe is a dashboard; a room you can speak into is a desk. */}
        <div className="border-t border-white/10 px-6 py-4">
          <div className="flex gap-2">
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0b0f14] px-3 py-2.5 text-sm text-white focus:border-[#6EE05A] focus:outline-none"
            >
              <option value="">Everyone</option>
              {peers.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send() }}
              placeholder="Tell them what to do…"
              className="flex-1 rounded-lg border border-white/15 bg-[#0b0f14] px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-[#6EE05A] focus:outline-none"
            />
            <button
              onClick={send}
              disabled={sending || !subject.trim() || !room}
              className="flex items-center gap-2 rounded-lg bg-[#6EE05A] px-5 py-2.5 text-sm font-semibold text-[#062312] transition hover:opacity-90 disabled:opacity-40"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
