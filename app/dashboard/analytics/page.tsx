'use client'

import { useState, useEffect, useCallback } from 'react'

type Tab = 'overview' | 'pages' | 'search' | 'cro'
type DateRange = '7d' | '14d' | '30d' | '90d'

interface Metric { label: string; value: string; sub?: string; color?: string }

interface LandingPage { page: string; sessions: number; bounceRate: number; avgDuration: number; conversions: number; users: number }
interface Source { channel: string; sessions: number; conversions: number; bounceRate: number }
interface Query { query: string; clicks: number; impressions: number; ctr: number; position: number }
interface DailyPoint { date: string; users: number; sessions: number; conversions: number }
interface CroRec { priority: 'high' | 'medium' | 'low'; category: string; title: string; description: string; impact: string }
interface CroScores { traffic: number; engagement: number; bounce: number; conversion: number; seo: number; speed: number }

const RANGE_MAP: Record<DateRange, { start: string; end: string; label: string }> = {
  '7d': { start: '7daysAgo', end: 'today', label: 'Last 7 days' },
  '14d': { start: '14daysAgo', end: 'today', label: 'Last 14 days' },
  '30d': { start: '30daysAgo', end: 'today', label: 'Last 30 days' },
  '90d': { start: '90daysAgo', end: 'today', label: 'Last 90 days' },
}

function MetricCard({ label, value, sub, color }: Metric) {
  return (
    <div style={{ padding: '16px 18px', borderRadius: 12, background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)' }}>
      <div style={{ fontSize: 11, color: 'var(--jp-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || 'var(--jp-text)', letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--jp-text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ width: 80, height: 6, borderRadius: 3, background: 'var(--jp-border)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: color, transition: 'width 0.5s ease' }} />
    </div>
  )
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 70 ? '#7ed957' : score >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--jp-border)" strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 28, fontWeight: 800, color }}>{score}</span>
        <span style={{ fontSize: 9, color: 'var(--jp-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>CRO Score</span>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [range, setRange] = useState<DateRange>('30d')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // GA4 state
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [pages, setPages] = useState<LandingPage[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [daily, setDaily] = useState<DailyPoint[]>([])

  // Search Console state
  const [queries, setQueries] = useState<Query[]>([])
  const [scPages, setScPages] = useState<Query[]>([])

  // CRO state
  const [croScore, setCroScore] = useState(0)
  const [croScores, setCroScores] = useState<CroScores | null>(null)
  const [croRecs, setCroRecs] = useState<CroRec[]>([])
  const [croPages, setCroPages] = useState<LandingPage[]>([])
  const [croLoading, setCroLoading] = useState(false)

  const { start, end } = RANGE_MAP[range]

  const fetchOverview = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/google/analytics?report=overview&startDate=${start}&endDate=${end}`)
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`)
      const data = await res.json()

      const row = data.traffic?.rows?.[0]?.metricValues || []
      const users = Number(row[0]?.value || 0)
      const sessions = Number(row[1]?.value || 0)
      const pageViews = Number(row[2]?.value || 0)
      const bounce = Number(row[3]?.value || 0)
      const duration = Number(row[4]?.value || 0)
      const newUsers = Number(row[5]?.value || 0)
      const engaged = Number(row[6]?.value || 0)
      const conversions = Number(row[7]?.value || 0)

      setMetrics([
        { label: 'Active Users', value: users.toLocaleString(), color: '#7ed957' },
        { label: 'Sessions', value: sessions.toLocaleString() },
        { label: 'Page Views', value: pageViews.toLocaleString() },
        { label: 'Bounce Rate', value: `${(bounce * 100).toFixed(1)}%`, color: bounce > 0.6 ? '#ef4444' : '#7ed957' },
        { label: 'Avg Duration', value: `${Math.floor(duration / 60)}m ${Math.round(duration % 60)}s` },
        { label: 'New Users', value: newUsers.toLocaleString(), sub: `${sessions > 0 ? ((newUsers / users) * 100).toFixed(0) : 0}% of total` },
        { label: 'Engaged', value: engaged.toLocaleString(), sub: `${sessions > 0 ? ((engaged / sessions) * 100).toFixed(1) : 0}% rate` },
        { label: 'Conversions', value: conversions.toLocaleString(), color: '#00d4ff' },
      ])

      // Sources
      const srcRows = data.sources?.rows || []
      setSources(srcRows.map((r: any) => ({
        channel: r.dimensionValues?.[0]?.value || '',
        sessions: Number(r.metricValues?.[0]?.value || 0),
        conversions: Number(r.metricValues?.[2]?.value || 0),
        bounceRate: 0,
      })))

      // Pages
      const pageRows = data.pages?.rows || []
      setPages(pageRows.map((r: any) => ({
        page: r.dimensionValues?.[0]?.value || '',
        sessions: Number(r.metricValues?.[0]?.value || 0),
        users: Number(r.metricValues?.[1]?.value || 0),
        bounceRate: Number(r.metricValues?.[2]?.value || 0),
        avgDuration: Number(r.metricValues?.[3]?.value || 0),
        conversions: 0,
      })).slice(0, 15))

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [start, end])

  const fetchDaily = useCallback(async () => {
    try {
      const res = await fetch(`/api/google/analytics?report=daily&startDate=${start}&endDate=${end}`)
      if (!res.ok) return
      const data = await res.json()
      setDaily((data.daily?.rows || []).map((r: any) => ({
        date: r.dimensionValues?.[0]?.value || '',
        users: Number(r.metricValues?.[0]?.value || 0),
        sessions: Number(r.metricValues?.[1]?.value || 0),
        conversions: Number(r.metricValues?.[3]?.value || 0),
      })))
    } catch {}
  }, [start, end])

  const fetchSearch = useCallback(async () => {
    setLoading(true)
    try {
      const scStart = new Date(Date.now() - (range === '7d' ? 7 : range === '14d' ? 14 : range === '90d' ? 90 : 28) * 86400000).toISOString().split('T')[0]
      const scEnd = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/google/search-console?report=performance&startDate=${scStart}&endDate=${scEnd}`)
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`)
      const data = await res.json()
      setQueries((data.queries || []).slice(0, 30))
      setScPages((data.pages || []).map((r: any) => ({
        query: r.keys?.[0] || '', clicks: r.clicks || 0, impressions: r.impressions || 0,
        ctr: r.ctr || 0, position: r.position || 0,
      })).slice(0, 20))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [range])

  const fetchCro = useCallback(async () => {
    setCroLoading(true)
    try {
      const res = await fetch('/api/cro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: start, endDate: end }),
      })
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`)
      const data = await res.json()
      setCroScore(data.score || 0)
      setCroScores(data.scores || null)
      setCroRecs(data.recommendations || [])
      setCroPages(data.landingPages || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCroLoading(false)
    }
  }, [start, end])

  useEffect(() => {
    if (tab === 'overview' || tab === 'pages') { fetchOverview(); fetchDaily() }
    if (tab === 'search') fetchSearch()
    if (tab === 'cro') fetchCro()
  }, [tab, range, fetchOverview, fetchDaily, fetchSearch, fetchCro])

  const maxSessions = Math.max(...pages.map(p => p.sessions), 1)
  const maxClicks = Math.max(...queries.map(q => q.clicks), 1)
  const dailyMax = Math.max(...daily.map(d => d.sessions), 1)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'pages', label: 'Pages' },
    { key: 'search', label: 'Search' },
    { key: 'cro', label: 'CRO9' },
  ]

  const priorityBadge = (p: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      high: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
      medium: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
      low: { bg: 'rgba(126,217,87,0.12)', text: '#7ed957' },
    }
    return colors[p] || colors.low
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--jp-text)' }}>Analytics</h1>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,217,87,0.12)', color: '#7ed957' }}>CRO9</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--jp-text-muted)', marginTop: 2 }}>Google Analytics + Search Console + Conversion Optimization</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--jp-bg-card)', padding: 3, borderRadius: 8 }}>
          {(['7d', '14d', '30d', '90d'] as DateRange[]).map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: range === r ? '#7ed957' : 'transparent',
              color: range === r ? '#000' : 'var(--jp-text-muted)',
            }}>{RANGE_MAP[r].label}</button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--jp-bg-card)', padding: 3, borderRadius: 8, width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 20px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: tab === t.key ? 700 : 500, cursor: 'pointer',
            background: tab === t.key ? '#7ed957' : 'transparent',
            color: tab === t.key ? '#000' : 'var(--jp-text-muted)',
          }}>{t.label}</button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--jp-text-muted)', fontSize: 13, marginBottom: 16 }}>
          <span style={{ width: 14, height: 14, border: '2px solid var(--jp-text-muted)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
          Loading...
        </div>
      )}

      {/* ═══ OVERVIEW TAB ═══ */}
      {tab === 'overview' && !loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {metrics.map(m => <MetricCard key={m.label} {...m} />)}
          </div>

          {/* Daily chart */}
          {daily.length > 0 && (
            <div style={{ marginBottom: 20, padding: '16px 18px', borderRadius: 12, background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--jp-text)', marginBottom: 12 }}>Daily Sessions</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
                {daily.map((d, i) => (
                  <div key={i} title={`${d.date}: ${d.sessions} sessions`} style={{
                    flex: 1, borderRadius: '2px 2px 0 0', minHeight: 2,
                    height: `${(d.sessions / dailyMax) * 100}%`,
                    background: d.sessions > dailyMax * 0.7 ? '#7ed957' : d.sessions > dailyMax * 0.3 ? 'rgba(126,217,87,0.5)' : 'rgba(126,217,87,0.2)',
                    transition: 'height 0.3s ease',
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Sources + Top Pages side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ padding: '16px 18px', borderRadius: 12, background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--jp-text)', marginBottom: 12 }}>Traffic Sources</div>
              {sources.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < sources.length - 1 ? '1px solid var(--jp-border)' : 'none' }}>
                  <span style={{ fontSize: 12, color: 'var(--jp-text-secondary)' }}>{s.channel}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MiniBar value={s.sessions} max={sources[0]?.sessions || 1} color="#7ed957" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--jp-text)', minWidth: 40, textAlign: 'right' }}>{s.sessions.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '16px 18px', borderRadius: 12, background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--jp-text)', marginBottom: 12 }}>Top Pages</div>
              {pages.slice(0, 8).map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 7 ? '1px solid var(--jp-border)' : 'none' }}>
                  <span style={{ fontSize: 11, color: 'var(--jp-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{p.page}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MiniBar value={p.sessions} max={maxSessions} color="#00d4ff" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--jp-text)', minWidth: 40, textAlign: 'right' }}>{p.sessions.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ═══ PAGES TAB ═══ */}
      {tab === 'pages' && !loading && (
        <div style={{ padding: '16px 18px', borderRadius: 12, background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--jp-text)', marginBottom: 12 }}>Landing Pages</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--jp-border)' }}>
                {['Page', 'Sessions', 'Users', 'Bounce', 'Avg Duration'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Page' ? 'left' : 'right', color: 'var(--jp-text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pages.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--jp-border)' }}>
                  <td style={{ padding: '8px 10px', color: 'var(--jp-text-secondary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.page}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--jp-text)' }}>{p.sessions.toLocaleString()}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--jp-text-secondary)' }}>{p.users.toLocaleString()}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: p.bounceRate > 0.7 ? '#ef4444' : 'var(--jp-text-secondary)' }}>{(p.bounceRate * 100).toFixed(1)}%</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--jp-text-secondary)' }}>{Math.floor(p.avgDuration / 60)}m {Math.round(p.avgDuration % 60)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ SEARCH TAB ═══ */}
      {tab === 'search' && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ padding: '16px 18px', borderRadius: 12, background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--jp-text)', marginBottom: 12 }}>Top Queries</div>
            {queries.map((q, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < queries.length - 1 ? '1px solid var(--jp-border)' : 'none' }}>
                <span style={{ fontSize: 11, color: q.position <= 3 ? '#7ed957' : q.position <= 10 ? '#f59e0b' : 'var(--jp-text-muted)', fontWeight: 700, minWidth: 24 }}>{q.position.toFixed(0)}</span>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--jp-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.query}</span>
                <MiniBar value={q.clicks} max={maxClicks} color="#00d4ff" />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--jp-text)', minWidth: 30, textAlign: 'right' }}>{q.clicks}</span>
                <span style={{ fontSize: 10, color: 'var(--jp-text-muted)', minWidth: 35, textAlign: 'right' }}>{(q.ctr * 100).toFixed(1)}%</span>
              </div>
            ))}
            {queries.length === 0 && <div style={{ color: 'var(--jp-text-muted)', fontSize: 12, padding: 20, textAlign: 'center' }}>No query data yet. Add the service account to Search Console.</div>}
          </div>

          <div style={{ padding: '16px 18px', borderRadius: 12, background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--jp-text)', marginBottom: 12 }}>Top Pages (Search)</div>
            {scPages.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < scPages.length - 1 ? '1px solid var(--jp-border)' : 'none' }}>
                <span style={{ flex: 1, fontSize: 11, color: 'var(--jp-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.query.replace(/^https?:\/\/[^/]+/, '')}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#00d4ff', minWidth: 30, textAlign: 'right' }}>{p.clicks}</span>
                <span style={{ fontSize: 10, color: 'var(--jp-text-muted)', minWidth: 50, textAlign: 'right' }}>{p.impressions.toLocaleString()} imp</span>
              </div>
            ))}
            {scPages.length === 0 && <div style={{ color: 'var(--jp-text-muted)', fontSize: 12, padding: 20, textAlign: 'center' }}>No page data yet.</div>}
          </div>
        </div>
      )}

      {/* ═══ CRO9 TAB ═══ */}
      {tab === 'cro' && (
        <>
          {croLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--jp-text-muted)', fontSize: 13, padding: 40, justifyContent: 'center' }}>
              <span style={{ width: 14, height: 14, border: '2px solid var(--jp-text-muted)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              Running CRO9 analysis...
            </div>
          ) : (
            <>
              {/* Score + Dimensions */}
              <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                <div style={{ padding: 24, borderRadius: 12, background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ScoreRing score={croScore} />
                </div>
                {croScores && (
                  <div style={{ flex: 1, padding: '16px 20px', borderRadius: 12, background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignContent: 'center' }}>
                    {Object.entries(croScores).map(([key, val]) => (
                      <div key={key}>
                        <div style={{ fontSize: 10, color: 'var(--jp-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{key}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--jp-border)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${val}%`, borderRadius: 3, background: val >= 70 ? '#7ed957' : val >= 40 ? '#f59e0b' : '#ef4444', transition: 'width 0.5s' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--jp-text)', minWidth: 24 }}>{val}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {croRecs.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--jp-text)', marginBottom: 12 }}>Recommendations ({croRecs.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {croRecs.map((r, i) => {
                      const badge = priorityBadge(r.priority)
                      return (
                        <div key={i} style={{ padding: '14px 18px', borderRadius: 10, background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: badge.bg, color: badge.text, textTransform: 'uppercase' }}>{r.priority}</span>
                            <span style={{ fontSize: 10, color: 'var(--jp-text-muted)', fontWeight: 600 }}>{r.category}</span>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--jp-text)', marginBottom: 4 }}>{r.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--jp-text-secondary)', lineHeight: 1.5, marginBottom: 4 }}>{r.description}</div>
                          <div style={{ fontSize: 11, color: '#7ed957', fontWeight: 600 }}>{r.impact}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* CRO Landing Pages */}
              {croPages.length > 0 && (
                <div style={{ padding: '16px 18px', borderRadius: 12, background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--jp-text)', marginBottom: 12 }}>Landing Page Performance</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--jp-border)' }}>
                        {['Page', 'Sessions', 'Bounce', 'Duration', 'Conversions'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Page' ? 'left' : 'right', color: 'var(--jp-text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {croPages.map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--jp-border)' }}>
                          <td style={{ padding: '8px 10px', color: 'var(--jp-text-secondary)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.page}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--jp-text)' }}>{p.sessions}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: p.bounceRate > 0.7 ? '#ef4444' : p.bounceRate > 0.5 ? '#f59e0b' : '#7ed957' }}>{(p.bounceRate * 100).toFixed(1)}%</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--jp-text-secondary)' }}>{Math.floor(p.avgDuration / 60)}m {Math.round(p.avgDuration % 60)}s</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: p.conversions > 0 ? '#7ed957' : 'var(--jp-text-muted)' }}>{p.conversions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {croScore === 0 && croRecs.length === 0 && !croLoading && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--jp-text-muted)' }}>
                  <div style={{ fontSize: 14, marginBottom: 8 }}>Add the service account to GA4 + Search Console to enable CRO9</div>
                  <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--jp-text-muted)', opacity: 0.6 }}>id-nmcp@gen-lang-client-0912315168.iam.gserviceaccount.com</div>
                </div>
              )}
            </>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
