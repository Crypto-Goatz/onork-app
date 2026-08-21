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
 */
import { useEffect, useRef, useState } from 'react'
import { Radio, AlertCircle, Send, Loader2, Circle } from 'lucide-react'

type Msg = {
  id: number; from_peer: string; to_peer: string | null
  subject: string; detail: string; wake: boolean; seq: number; created_at: string
}
type Peer = { name: string; present: boolean; lastSeen: string | null }

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
  const seqRef = useRef(0)
  const feedRef = useRef<HTMLDivElement>(null)

  const poll = async () => {
    try {
      const r = await fetch(`/api/hub/room?since=${seqRef.current}`, { credentials: 'same-origin' })
      if (!r.ok) return
      const d = await r.json()
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
    poll()
    const id = setInterval(poll, 4000)
    return () => clearInterval(id)
  }, [])

  // Follow the conversation, the way a person watching a room would.
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const send = async () => {
    if (!subject.trim()) return
    setSending(true)
    try {
      await fetch('/api/hub/room/say', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ subject: subject.trim(), to: to || undefined }),
      })
      setSubject('')
      await poll()
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
        <ul className="mt-4 space-y-3">
          {peers.map((p) => (
            <li key={p.name} className="flex items-center gap-2.5">
              <Circle
                className="h-2.5 w-2.5 shrink-0"
                style={{
                  fill: p.present ? hueFor(p.name) : 'transparent',
                  color: p.present ? hueFor(p.name) : 'rgba(255,255,255,0.25)',
                }}
              />
              <div className="min-w-0">
                <p className="truncate text-sm">{p.name}</p>
                {/* Never "offline" — say when they last spoke. A person can
                    judge five minutes versus five hours; a label cannot. */}
                <p className="text-[11px] text-white/35">{ago(p.lastSeen)}</p>
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
          <div>
            <h1 className="text-lg font-semibold">The Room</h1>
            <p className="text-xs text-white/45">
              {peers.filter((p) => p.present).length} working now · {messages.length} messages
            </p>
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
              disabled={sending || !subject.trim()}
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
