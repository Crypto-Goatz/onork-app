'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Shield, Radio, Infinity } from 'lucide-react'

type Tab = 'overview' | 'timeline' | 'queue'

interface AuditEvent {
  audit_id: string
  event_type: string
  score_before: number | null
  score_after: number | null
  signals: Record<string, number> | null
  capability_id: string | null
  detail: Record<string, unknown> | null
  created_at: string
}

interface QueueItem {
  queue_id: string
  position: number
  capability_id: string
  status: string
  enqueued_at: string
}

interface SessionInfo {
  session_id: string
  score: number
  state: string
  started_at?: string
  device_fingerprint?: string
  ip_address?: string
  geo_country?: string
  user_agent?: string
}

const EVENT_LABELS: Record<string, string> = {
  signals_applied: 'Signals Applied',
  state_transition: 'State Change',
  interrupt: 'Interrupt',
  challenge_served: 'Challenge Served',
  challenge_resolved: 'Challenge Resolved',
}

// Tailwind classes per state
const STATE_TEXT: Record<string, string> = {
  green: 'text-core-green',
  yellow: 'text-core-amber',
  orange: 'text-orange-400',
  red: 'text-core-red',
}

const STATE_BADGE: Record<string, string> = {
  green: 'bg-core-green/10 border border-core-green/20 text-core-green',
  yellow: 'bg-core-amber/10 border border-core-amber/20 text-core-amber',
  orange: 'bg-orange-500/10 border border-orange-500/20 text-orange-400',
  red: 'bg-core-red/10 border border-core-red/20 text-core-red',
}

const STATE_DOT: Record<string, string> = {
  green: 'bg-core-green shadow-[0_0_8px_theme(colors.core-green/50)]',
  yellow: 'bg-core-amber shadow-[0_0_8px_theme(colors.core-amber/50)]',
  orange: 'bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.5)]',
  red: 'bg-core-red shadow-[0_0_8px_theme(colors.core-red/50)]',
}

const SCORE_TEXT: Record<string, string> = {
  green: 'text-core-green',
  yellow: 'text-core-amber',
  orange: 'text-orange-400',
  red: 'text-core-red',
}

const BAND_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  GREEN:  { text: 'text-core-green',  bg: 'bg-core-green/[0.06]',  border: 'border-core-green/20' },
  YELLOW: { text: 'text-core-amber',  bg: 'bg-core-amber/[0.06]',  border: 'border-core-amber/20' },
  ORANGE: { text: 'text-orange-400',  bg: 'bg-orange-500/[0.06]',  border: 'border-orange-500/20' },
  RED:    { text: 'text-core-red',    bg: 'bg-core-red/[0.06]',    border: 'border-core-red/20' },
}

const TIER_COLORS: Record<number, { text: string; bg: string }> = {
  1: { text: 'text-core-green',  bg: 'bg-core-green/[0.08]' },
  2: { text: 'text-core-amber',  bg: 'bg-core-amber/[0.08]' },
  3: { text: 'text-orange-400',  bg: 'bg-orange-500/[0.08]' },
  4: { text: 'text-core-red',    bg: 'bg-core-red/[0.08]' },
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function SecurityPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [eventsPage, setEventsPage] = useState(1)
  const [eventsTotal, setEventsTotal] = useState(0)
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)

  const supabase = createClient()

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/security/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capability_id: 'read_analytics' }),
      })
      if (res.ok) {
        const data = await res.json()
        setSession({
          session_id: data.session_id,
          score: data.score,
          state: data.state,
        })
        return data.session_id
      }
    } catch { /* silent */ }
    return null
  }, [])

  const fetchTimeline = useCallback(async (page: number) => {
    try {
      const res = await fetch(`/api/security/timeline?page=${page}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events)
        setEventsTotal(data.total)
      }
    } catch { /* silent */ }
  }, [])

  const fetchQueue = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/security/queue?session_id=${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        setQueue(data.items)
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      const sid = await fetchSession()
      await fetchTimeline(1)
      if (sid) await fetchQueue(sid)
      setLoading(false)
    }
    init()
  }, [fetchSession, fetchTimeline, fetchQueue])

  async function handleCancelItem(queueId: string) {
    if (!session) return
    await fetch('/api/security/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'cancel',
        session_id: session.session_id,
        queue_id: queueId,
      }),
    })
    await fetchQueue(session.session_id)
  }

  async function handlePageChange(page: number) {
    setEventsPage(page)
    await fetchTimeline(page)
  }

  const stateKey = session?.state ?? 'unknown'
  const scoreTextClass = SCORE_TEXT[stateKey] ?? 'text-core-text-muted'
  const stateBadgeClass = STATE_BADGE[stateKey] ?? 'bg-core-border/10 border border-core-border/20 text-core-text-muted'
  const stateDotClass = STATE_DOT[stateKey] ?? 'bg-core-text-muted'

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-2 flex justify-center pt-24">
        <Loader2 className="w-8 h-8 text-core-green animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto px-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold text-core-text m-0">
              <span className="text-core-purple">0nAI</span> Security
            </h1>
            <span className="px-2.5 py-[3px] rounded-md text-[10px] font-bold bg-core-green/10 text-core-green border border-core-green/20 tracking-widest">
              LIVE
            </span>
            <span className="px-2.5 py-[3px] rounded-md text-[10px] font-bold bg-core-green/10 text-core-green border border-core-green/20 tracking-widest">
              UNLIMITED
            </span>
          </div>
          <p className="text-[13px] text-core-text-muted mt-1">
            Behavioral authentication — continuous trust scoring
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-core-border">
        {(['overview', 'timeline', 'queue'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-5 py-2.5 text-[13px] font-semibold capitalize cursor-pointer bg-transparent border-none -mb-px',
              'border-b-2 transition-colors',
              tab === t
                ? 'text-core-green border-core-green'
                : 'text-core-text-muted border-transparent',
            ].join(' ')}
          >
            {t}
            {t === 'queue' && queue.length > 0 && (
              <span className="ml-1.5 text-[10px] px-1.5 py-px rounded-full bg-core-green/10 text-core-green">
                {queue.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && session && (
        <div className="grid grid-cols-2 gap-4">
          {/* Trust Score Card */}
          <div className="bg-core-card border border-core-border rounded-2xl p-7 flex flex-col items-center col-span-2">
            <div className="text-[11px] font-bold text-core-text-muted uppercase tracking-widest mb-3">
              Trust Score
            </div>
            <div className={`text-[72px] font-black leading-none mb-3 ${scoreTextClass}`}>
              {session.score}
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg ${stateBadgeClass}`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${stateDotClass}`} />
              <span className="text-[13px] font-bold uppercase tracking-widest">
                {session.state}
              </span>
            </div>
            <div className="text-[11px] text-core-text-muted/40 mt-3">
              Session: {session.session_id.slice(0, 8)}...
            </div>
          </div>

          {/* Signal Weights Reference */}
          <div className="bg-core-card border border-core-border rounded-2xl p-5">
            <div className="text-[12px] font-bold text-core-text mb-3.5">
              Signal Weights
            </div>
            <div className="flex flex-col gap-1.5">
              {[
                { signal: 'new_geography', weight: -15 },
                { signal: 'new_device', weight: -10 },
                { signal: 'new_browser', weight: -5 },
                { signal: 'writing_style_deviation', weight: -20 },
                { signal: 'tone_shift', weight: -10 },
                { signal: 'off_pattern_workflow', weight: -15 },
                { signal: 'off_pattern_timing', weight: -10 },
                { signal: 'verification_passed', weight: 20 },
                { signal: 'verification_failed', weight: -30 },
              ].map(s => (
                <div key={s.signal} className="flex justify-between items-center">
                  <span className="text-[11px] text-core-text-dim font-mono">
                    {s.signal}
                  </span>
                  <span className={`text-[11px] font-bold font-mono ${s.weight > 0 ? 'text-core-green' : 'text-core-red'}`}>
                    {s.weight > 0 ? '+' : ''}{s.weight}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Capability Tiers */}
          <div className="bg-core-card border border-core-border rounded-2xl p-5">
            <div className="text-[12px] font-bold text-core-text mb-3.5">
              Capability Tiers
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                { tier: 1, label: 'Read-Only', desc: 'Always proceed' },
                { tier: 2, label: 'Standard Actions', desc: 'Challenge if score < 85' },
                { tier: 3, label: 'Sensitive Actions', desc: 'Challenge if score < 90, block if RED' },
                { tier: 4, label: 'Critical Actions', desc: 'Challenge if score < 95, block if RED' },
              ].map(t => {
                const colors = TIER_COLORS[t.tier]
                return (
                  <div key={t.tier} className="flex items-start gap-2.5">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded flex-shrink-0 ${colors.bg} ${colors.text}`}>
                      T{t.tier}
                    </span>
                    <div>
                      <div className="text-[12px] font-semibold text-core-text">{t.label}</div>
                      <div className="text-[10px] text-core-text-muted">{t.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* State Bands */}
          <div className="bg-core-card border border-core-border rounded-2xl p-5 col-span-2">
            <div className="text-[12px] font-bold text-core-text mb-3.5">
              Trust State Bands
            </div>
            <div className="flex gap-3">
              {[
                { state: 'GREEN',  range: '85-100', challenges: '0' },
                { state: 'YELLOW', range: '70-84',  challenges: '1' },
                { state: 'ORANGE', range: '50-69',  challenges: '2' },
                { state: 'RED',    range: '0-49',   challenges: 'BLOCK' },
              ].map(b => {
                const c = BAND_COLORS[b.state]
                return (
                  <div
                    key={b.state}
                    className={`flex-1 px-4 py-3.5 rounded-xl border ${c.bg} ${c.border}`}
                  >
                    <div className={`text-[13px] font-extrabold mb-1 ${c.text}`}>
                      {b.state}
                    </div>
                    <div className="text-[11px] text-core-text-dim">
                      Score: {b.range}
                    </div>
                    <div className="text-[10px] text-core-text-muted mt-0.5">
                      Challenges: {b.challenges}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* TIMELINE TAB */}
      {tab === 'timeline' && (
        <div>
          {events.length === 0 ? (
            <div className="text-center py-16 text-core-text-muted text-[13px]">
              No security events yet. Events are logged as you use the platform.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {events.map(ev => {
                  const isExpanded = expandedEvent === ev.audit_id
                  const delta = ev.score_after !== null && ev.score_before !== null
                    ? ev.score_after - ev.score_before
                    : null
                  const deltaPositive = delta !== null && delta >= 0
                  const isStateTransition = ev.event_type === 'state_transition'

                  return (
                    <div
                      key={ev.audit_id}
                      onClick={() => setExpandedEvent(isExpanded ? null : ev.audit_id)}
                      className={[
                        'bg-core-card border rounded-xl px-[18px] py-3.5 cursor-pointer transition-colors',
                        isExpanded ? 'border-core-green/30' : 'border-core-border',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={[
                            'text-[10px] font-bold px-2 py-0.5 rounded',
                            isStateTransition
                              ? 'bg-orange-500/10 text-orange-400'
                              : 'bg-core-green/10 text-core-green',
                          ].join(' ')}>
                            {EVENT_LABELS[ev.event_type] || ev.event_type}
                          </span>
                          {ev.capability_id && (
                            <span className="text-[10px] text-core-text-muted font-mono">
                              {ev.capability_id}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {delta !== null && (
                            <span className={`text-[12px] font-bold font-mono ${deltaPositive ? 'text-core-green' : 'text-core-red'}`}>
                              {delta > 0 ? '+' : ''}{delta}
                            </span>
                          )}
                          {ev.score_after !== null && (
                            <span className="text-[11px] text-core-text-dim font-mono">
                              {ev.score_after}
                            </span>
                          )}
                          <span className="text-[10px] text-core-text-muted/60">
                            {relativeTime(ev.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-core-border">
                          {ev.signals && Object.keys(ev.signals).length > 0 && (
                            <div className="mb-2.5">
                              <div className="text-[10px] font-bold text-core-text-muted mb-1.5 uppercase tracking-widest">
                                Signals
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(ev.signals).map(([k, v]) => (
                                  <span
                                    key={k}
                                    className={[
                                      'text-[10px] px-2 py-[3px] rounded font-mono border',
                                      v > 0
                                        ? 'bg-core-green/[0.08] border-core-green/15 text-core-green'
                                        : 'bg-core-red/[0.08] border-core-red/15 text-core-red',
                                    ].join(' ')}
                                  >
                                    {k}: {v > 0 ? '+' : ''}{v}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {ev.detail && (
                            <div>
                              <div className="text-[10px] font-bold text-core-text-muted mb-1.5 uppercase tracking-widest">
                                Detail
                              </div>
                              <pre className="text-[10px] text-core-text-dim font-mono bg-core-bg p-2.5 rounded-md overflow-auto m-0 border border-core-border">
                                {JSON.stringify(ev.detail, null, 2)}
                              </pre>
                            </div>
                          )}
                          <div className="text-[9px] text-core-text-muted/30 mt-2">
                            {new Date(ev.created_at).toLocaleString()} | {ev.audit_id.slice(0, 8)}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {eventsTotal > 20 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <button
                    onClick={() => handlePageChange(eventsPage - 1)}
                    disabled={eventsPage <= 1}
                    className={[
                      'px-3.5 py-1.5 rounded-md text-[11px] font-semibold border transition-colors',
                      eventsPage <= 1
                        ? 'bg-core-border border-core-border text-core-text-muted cursor-not-allowed'
                        : 'bg-core-green/[0.06] border-core-green/15 text-core-green cursor-pointer',
                    ].join(' ')}
                  >
                    Prev
                  </button>
                  <span className="text-[11px] text-core-text-muted">
                    Page {eventsPage} of {Math.ceil(eventsTotal / 20)}
                  </span>
                  <button
                    onClick={() => handlePageChange(eventsPage + 1)}
                    disabled={eventsPage >= Math.ceil(eventsTotal / 20)}
                    className={[
                      'px-3.5 py-1.5 rounded-md text-[11px] font-semibold border transition-colors',
                      eventsPage >= Math.ceil(eventsTotal / 20)
                        ? 'bg-core-border border-core-border text-core-text-muted cursor-not-allowed'
                        : 'bg-core-green/[0.06] border-core-green/15 text-core-green cursor-pointer',
                    ].join(' ')}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* QUEUE TAB */}
      {tab === 'queue' && (
        <div>
          {queue.length === 0 ? (
            <div className="text-center py-16 text-core-text-muted text-[13px]">
              No tasks in queue. Tasks are queued when capabilities require verification.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {queue.map(item => {
                const isPaused = item.status === 'paused'
                return (
                  <div
                    key={item.queue_id}
                    className="bg-core-card border border-core-border rounded-xl px-[18px] py-3.5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-extrabold text-core-text-muted bg-core-bg px-2 py-0.5 rounded font-mono">
                        #{item.position}
                      </span>
                      <span className="text-[12px] font-semibold text-core-text font-mono">
                        {item.capability_id}
                      </span>
                      <span className={[
                        'text-[9px] font-bold px-2 py-0.5 rounded uppercase',
                        isPaused
                          ? 'bg-core-amber/10 text-core-amber'
                          : 'bg-core-cyan/10 text-core-cyan',
                      ].join(' ')}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] text-core-text-muted/60">
                        {relativeTime(item.enqueued_at)}
                      </span>
                      <button
                        onClick={() => handleCancelItem(item.queue_id)}
                        className="px-3 py-1 rounded-md text-[10px] font-semibold bg-core-red/[0.06] border border-core-red/15 text-core-red cursor-pointer hover:bg-core-red/10 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
