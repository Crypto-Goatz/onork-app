'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

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

const STATE_COLORS: Record<string, string> = {
  green: '#7ed957',
  yellow: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
}

const STATE_BG: Record<string, string> = {
  green: 'rgba(126,217,87,0.08)',
  yellow: 'rgba(245,158,11,0.08)',
  orange: 'rgba(249,115,22,0.08)',
  red: 'rgba(239,68,68,0.08)',
}

const STATE_BORDER: Record<string, string> = {
  green: 'rgba(126,217,87,0.2)',
  yellow: 'rgba(245,158,11,0.2)',
  orange: 'rgba(249,115,22,0.2)',
  red: 'rgba(239,68,68,0.2)',
}

const EVENT_LABELS: Record<string, string> = {
  signals_applied: 'Signals Applied',
  state_transition: 'State Change',
  interrupt: 'Interrupt',
  challenge_served: 'Challenge Served',
  challenge_resolved: 'Challenge Resolved',
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
      // Create or fetch session by scoring a read-only capability
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

  const stateColor = session ? (STATE_COLORS[session.state] || '#6b7280') : '#6b7280'
  const stateBg = session ? (STATE_BG[session.state] || 'rgba(107,114,128,0.08)') : 'rgba(107,114,128,0.08)'
  const stateBorder = session ? (STATE_BORDER[session.state] || 'rgba(107,114,128,0.2)') : 'rgba(107,114,128,0.2)'

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 8px', display: 'flex', justifyContent: 'center', paddingTop: 100 }}>
        <div style={{ width: 32, height: 32, border: '3px solid #1e293b', borderTopColor: '#7ed957', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f0f4f8', margin: 0 }}>
              <span style={{ color: '#a78bfa' }}>0nAI</span> Security
            </h1>
            <span style={{
              padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
              background: 'rgba(126,217,87,0.1)', color: '#7ed957',
              border: '1px solid rgba(126,217,87,0.2)', letterSpacing: '0.06em',
            }}>
              LIVE
            </span>
            <span style={{
              padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
              background: 'rgba(126,217,87,0.1)', color: '#7ed957',
              border: '1px solid rgba(126,217,87,0.2)', letterSpacing: '0.06em',
            }}>
              UNLIMITED
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            Behavioral authentication — continuous trust scoring
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #1e293b', paddingBottom: 0 }}>
        {(['overview', 'timeline', 'queue'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 600,
              color: tab === t ? '#7ed957' : '#6b7280',
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid #7ed957' : '2px solid transparent',
              cursor: 'pointer',
              textTransform: 'capitalize',
              marginBottom: -1,
            }}
          >
            {t}
            {t === 'queue' && queue.length > 0 && (
              <span style={{
                marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 8,
                background: 'rgba(126,217,87,0.1)', color: '#7ed957',
              }}>
                {queue.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && session && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Trust Score Card */}
          <div style={{
            background: '#161b22', border: '1px solid #1e293b', borderRadius: 14,
            padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gridColumn: '1 / -1',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Trust Score
            </div>
            <div style={{
              fontSize: 72, fontWeight: 900, color: stateColor,
              lineHeight: 1, marginBottom: 12,
              textShadow: `0 0 40px ${stateColor}40`,
            }}>
              {session.score}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', borderRadius: 8,
              background: stateBg, border: `1px solid ${stateBorder}`,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: stateColor,
                boxShadow: `0 0 8px ${stateColor}80`,
              }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: stateColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {session.state}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#4b5563', marginTop: 12 }}>
              Session: {session.session_id.slice(0, 8)}...
            </div>
          </div>

          {/* Signal Weights Reference */}
          <div style={{
            background: '#161b22', border: '1px solid #1e293b', borderRadius: 14, padding: 20,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f4f8', marginBottom: 14 }}>
              Signal Weights
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                <div key={s.signal} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>
                    {s.signal}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                    color: s.weight > 0 ? '#7ed957' : '#f87171',
                  }}>
                    {s.weight > 0 ? '+' : ''}{s.weight}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Capability Tiers */}
          <div style={{
            background: '#161b22', border: '1px solid #1e293b', borderRadius: 14, padding: 20,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f4f8', marginBottom: 14 }}>
              Capability Tiers
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { tier: 1, label: 'Read-Only', desc: 'Always proceed', color: '#7ed957' },
                { tier: 2, label: 'Standard Actions', desc: 'Challenge if score < 85', color: '#f59e0b' },
                { tier: 3, label: 'Sensitive Actions', desc: 'Challenge if score < 90, block if RED', color: '#f97316' },
                { tier: 4, label: 'Critical Actions', desc: 'Challenge if score < 95, block if RED', color: '#ef4444' },
              ].map(t => (
                <div key={t.tier} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                    background: `${t.color}15`, color: t.color, flexShrink: 0,
                  }}>
                    T{t.tier}
                  </span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f4f8' }}>{t.label}</div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* State Bands */}
          <div style={{
            background: '#161b22', border: '1px solid #1e293b', borderRadius: 14, padding: 20,
            gridColumn: '1 / -1',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f4f8', marginBottom: 14 }}>
              Trust State Bands
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { state: 'GREEN', range: '85-100', challenges: '0', color: '#7ed957' },
                { state: 'YELLOW', range: '70-84', challenges: '1', color: '#f59e0b' },
                { state: 'ORANGE', range: '50-69', challenges: '2', color: '#f97316' },
                { state: 'RED', range: '0-49', challenges: 'BLOCK', color: '#ef4444' },
              ].map(b => (
                <div key={b.state} style={{
                  flex: 1, padding: '14px 16px', borderRadius: 10,
                  background: `${b.color}08`, border: `1px solid ${b.color}25`,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: b.color, marginBottom: 4 }}>
                    {b.state}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>
                    Score: {b.range}
                  </div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                    Challenges: {b.challenges}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TIMELINE TAB */}
      {tab === 'timeline' && (
        <div>
          {events.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 0', color: '#4b5563', fontSize: 13,
            }}>
              No security events yet. Events are logged as you use the platform.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {events.map(ev => {
                  const isExpanded = expandedEvent === ev.audit_id
                  const deltaColor = ev.score_after !== null && ev.score_before !== null
                    ? (ev.score_after >= ev.score_before ? '#7ed957' : '#f87171')
                    : '#6b7280'
                  const delta = ev.score_after !== null && ev.score_before !== null
                    ? ev.score_after - ev.score_before
                    : null

                  return (
                    <div
                      key={ev.audit_id}
                      onClick={() => setExpandedEvent(isExpanded ? null : ev.audit_id)}
                      style={{
                        background: '#161b22', border: '1px solid #1e293b', borderRadius: 10,
                        padding: '14px 18px', cursor: 'pointer',
                        transition: 'border-color 0.15s',
                        borderColor: isExpanded ? 'rgba(126,217,87,0.3)' : '#1e293b',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                            background: ev.event_type === 'state_transition' ? 'rgba(249,115,22,0.1)' : 'rgba(126,217,87,0.1)',
                            color: ev.event_type === 'state_transition' ? '#f97316' : '#7ed957',
                          }}>
                            {EVENT_LABELS[ev.event_type] || ev.event_type}
                          </span>
                          {ev.capability_id && (
                            <span style={{ fontSize: 10, color: '#6b7280', fontFamily: 'monospace' }}>
                              {ev.capability_id}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {delta !== null && (
                            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: deltaColor }}>
                              {delta > 0 ? '+' : ''}{delta}
                            </span>
                          )}
                          {ev.score_after !== null && (
                            <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>
                              {ev.score_after}
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: '#4b5563' }}>
                            {relativeTime(ev.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #1e293b' }}>
                          {ev.signals && Object.keys(ev.signals).length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Signals
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {Object.entries(ev.signals).map(([k, v]) => (
                                  <span key={k} style={{
                                    fontSize: 10, padding: '3px 8px', borderRadius: 4,
                                    background: v > 0 ? 'rgba(126,217,87,0.08)' : 'rgba(239,68,68,0.08)',
                                    border: `1px solid ${v > 0 ? 'rgba(126,217,87,0.15)' : 'rgba(239,68,68,0.15)'}`,
                                    color: v > 0 ? '#7ed957' : '#f87171',
                                    fontFamily: 'monospace',
                                  }}>
                                    {k}: {v > 0 ? '+' : ''}{v}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {ev.detail && (
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Detail
                              </div>
                              <pre style={{
                                fontSize: 10, color: '#9ca3af', fontFamily: 'monospace',
                                background: '#0d1117', padding: 10, borderRadius: 6,
                                overflow: 'auto', margin: 0,
                                border: '1px solid #1e293b',
                              }}>
                                {JSON.stringify(ev.detail, null, 2)}
                              </pre>
                            </div>
                          )}
                          <div style={{ fontSize: 9, color: '#374151', marginTop: 8 }}>
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
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                  <button
                    onClick={() => handlePageChange(eventsPage - 1)}
                    disabled={eventsPage <= 1}
                    style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: eventsPage <= 1 ? '#1e293b' : 'rgba(126,217,87,0.06)',
                      border: `1px solid ${eventsPage <= 1 ? '#1e293b' : 'rgba(126,217,87,0.15)'}`,
                      color: eventsPage <= 1 ? '#4b5563' : '#7ed957',
                      cursor: eventsPage <= 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Prev
                  </button>
                  <span style={{ fontSize: 11, color: '#6b7280', alignSelf: 'center' }}>
                    Page {eventsPage} of {Math.ceil(eventsTotal / 20)}
                  </span>
                  <button
                    onClick={() => handlePageChange(eventsPage + 1)}
                    disabled={eventsPage >= Math.ceil(eventsTotal / 20)}
                    style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: eventsPage >= Math.ceil(eventsTotal / 20) ? '#1e293b' : 'rgba(126,217,87,0.06)',
                      border: `1px solid ${eventsPage >= Math.ceil(eventsTotal / 20) ? '#1e293b' : 'rgba(126,217,87,0.15)'}`,
                      color: eventsPage >= Math.ceil(eventsTotal / 20) ? '#4b5563' : '#7ed957',
                      cursor: eventsPage >= Math.ceil(eventsTotal / 20) ? 'not-allowed' : 'pointer',
                    }}
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
            <div style={{
              textAlign: 'center', padding: '60px 0', color: '#4b5563', fontSize: 13,
            }}>
              No tasks in queue. Tasks are queued when capabilities require verification.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {queue.map(item => (
                <div
                  key={item.queue_id}
                  style={{
                    background: '#161b22', border: '1px solid #1e293b', borderRadius: 10,
                    padding: '14px 18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, color: '#6b7280',
                      background: '#0d1117', padding: '2px 8px', borderRadius: 4,
                    }}>
                      #{item.position}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#f0f4f8', fontFamily: 'monospace' }}>
                      {item.capability_id}
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                      background: item.status === 'paused' ? 'rgba(245,158,11,0.1)' : 'rgba(0,212,255,0.1)',
                      color: item.status === 'paused' ? '#f59e0b' : '#00d4ff',
                      textTransform: 'uppercase',
                    }}>
                      {item.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 10, color: '#4b5563' }}>
                      {relativeTime(item.enqueued_at)}
                    </span>
                    <button
                      onClick={() => handleCancelItem(item.queue_id)}
                      style={{
                        padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                        color: '#f87171', cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
