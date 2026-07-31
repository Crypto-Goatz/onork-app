'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

type Tab = 'overview' | 'pages' | 'search' | 'cro' | 'siphon'
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
  // Map legacy hex colors to Tailwind token classes
  const valueClass =
    color === '#7ed957' || color === '#6EE05A'
      ? 'text-core-green'
      : color === '#ef4444'
      ? 'text-core-red'
      : color === '#00d4ff'
      ? 'text-core-cyan'
      : 'text-core-text'

  return (
    <div className="px-[18px] py-4 rounded-xl bg-core-card border border-core-border">
      <div className="text-[11px] text-core-text-muted font-semibold uppercase tracking-[0.06em] mb-1.5">
        {label}
      </div>
      <div className={`text-2xl font-extrabold tracking-tight ${valueClass}`}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-core-text-muted mt-0.5">{sub}</div>
      )}
    </div>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const barColor = color === '#00d4ff' ? 'bg-core-cyan' : 'bg-core-green'

  return (
    <div className="w-20 h-1.5 rounded-full bg-core-border overflow-hidden">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 70 ? '#6EE05A' : score >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#30363d" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-1000 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[28px] font-extrabold" style={{ color }}>{score}</span>
        <span className="text-[9px] text-core-text-muted font-semibold uppercase tracking-[0.08em]">
          CRO Score
        </span>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const searchParams = useSearchParams()
  const initialTab = (['overview', 'pages', 'search', 'cro', 'siphon'].includes(searchParams.get('tab') || '') ? searchParams.get('tab') : 'overview') as Tab
  const [tab, setTab] = useState<Tab>(initialTab)
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
    { key: 'siphon', label: 'Siphon' },
  ]

  const priorityClasses = (p: string): { badge: string; text: string } => {
    if (p === 'high') return { badge: 'bg-core-red/10', text: 'text-core-red' }
    if (p === 'medium') return { badge: 'bg-core-amber/10', text: 'text-core-amber' }
    return { badge: 'bg-core-green/10', text: 'text-core-green' }
  }

  // Helper: score bar color based on value
  const scoreBgClass = (val: number) =>
    val >= 70 ? 'bg-core-green' : val >= 40 ? 'bg-core-amber' : 'bg-core-red'

  // Helper: bar color for daily chart
  const dailyBarClass = (sessions: number) =>
    sessions > dailyMax * 0.7
      ? 'bg-core-green'
      : sessions > dailyMax * 0.3
      ? 'bg-core-green/50'
      : 'bg-core-green/20'

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-core-text">Analytics</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-core-green/10 text-core-green">
              CRO9
            </span>
          </div>
          <p className="text-[12px] text-core-text-muted mt-0.5">
            Google Analytics + Search Console + Conversion Optimization
          </p>
        </div>

        {/* Date range picker */}
        <div className="flex gap-1 bg-core-card p-0.5 rounded-lg">
          {(['7d', '14d', '30d', '90d'] as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer border-none transition-all duration-150 ${
                range === r
                  ? 'bg-core-green text-core-bg'
                  : 'bg-transparent text-core-text-muted hover:text-core-text'
              }`}
            >
              {RANGE_MAP[r].label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-6 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer border-none tracking-[0.01em] transition-all duration-200 relative overflow-hidden ${
              tab === t.key
                ? 'text-core-green shadow-[0_0_20px_rgba(110,224,90,0.15),inset_0_0_0_1px_rgba(110,224,90,0.3)] bg-gradient-to-br from-core-green/15 to-core-cyan/10'
                : 'text-core-text-muted bg-white/[0.02] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:text-core-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-core-red/[0.08] border border-core-red/20 text-core-red text-[13px] mb-4">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-core-text-muted text-[13px] mb-4">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading...
        </div>
      )}

      {/* ═══ OVERVIEW TAB ═══ */}
      {tab === 'overview' && !loading && (
        <>
          <div className="grid grid-cols-4 gap-3 mb-5">
            {metrics.map(m => <MetricCard key={m.label} {...m} />)}
          </div>

          {/* Daily chart */}
          {daily.length > 0 && (
            <div className="mb-5 px-[18px] py-4 rounded-xl bg-core-card border border-core-border">
              <div className="text-[12px] font-bold text-core-text mb-3">Daily Sessions</div>
              <div className="flex items-end gap-0.5 h-20">
                {daily.map((d, i) => (
                  <div
                    key={i}
                    title={`${d.date}: ${d.sessions} sessions`}
                    className={`flex-1 rounded-t-sm min-h-[2px] transition-[height] duration-300 ${dailyBarClass(d.sessions)}`}
                    style={{ height: `${(d.sessions / dailyMax) * 100}%` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sources + Top Pages */}
          <div className="grid grid-cols-2 gap-4">
            <div className="px-[18px] py-4 rounded-xl bg-core-card border border-core-border">
              <div className="text-[12px] font-bold text-core-text mb-3">Traffic Sources</div>
              {sources.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between py-1.5 ${i < sources.length - 1 ? 'border-b border-core-border' : ''}`}
                >
                  <span className="text-[12px] text-core-text-dim">{s.channel}</span>
                  <div className="flex items-center gap-2">
                    <MiniBar value={s.sessions} max={sources[0]?.sessions || 1} color="#6EE05A" />
                    <span className="text-[12px] font-semibold text-core-text min-w-[40px] text-right">
                      {s.sessions.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-[18px] py-4 rounded-xl bg-core-card border border-core-border">
              <div className="text-[12px] font-bold text-core-text mb-3">Top Pages</div>
              {pages.slice(0, 8).map((p, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between py-1.5 ${i < 7 ? 'border-b border-core-border' : ''}`}
                >
                  <span className="text-[11px] text-core-text-dim overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]">
                    {p.page}
                  </span>
                  <div className="flex items-center gap-2">
                    <MiniBar value={p.sessions} max={maxSessions} color="#00d4ff" />
                    <span className="text-[12px] font-semibold text-core-text min-w-[40px] text-right">
                      {p.sessions.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ═══ PAGES TAB ═══ */}
      {tab === 'pages' && !loading && (
        <div className="px-[18px] py-4 rounded-xl bg-core-card border border-core-border">
          <div className="text-[12px] font-bold text-core-text mb-3">Landing Pages</div>
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-core-border">
                {['Page', 'Sessions', 'Users', 'Bounce', 'Avg Duration'].map(h => (
                  <th
                    key={h}
                    className={`px-2.5 py-2 text-core-text-muted font-semibold text-[10px] uppercase tracking-[0.06em] ${h === 'Page' ? 'text-left' : 'text-right'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pages.map((p, i) => (
                <tr key={i} className="border-b border-core-border">
                  <td className="px-2.5 py-2 text-core-text-dim max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap">
                    {p.page}
                  </td>
                  <td className="px-2.5 py-2 text-right font-semibold text-core-text">
                    {p.sessions.toLocaleString()}
                  </td>
                  <td className="px-2.5 py-2 text-right text-core-text-dim">
                    {p.users.toLocaleString()}
                  </td>
                  <td className={`px-2.5 py-2 text-right ${p.bounceRate > 0.7 ? 'text-core-red' : 'text-core-text-dim'}`}>
                    {(p.bounceRate * 100).toFixed(1)}%
                  </td>
                  <td className="px-2.5 py-2 text-right text-core-text-dim">
                    {Math.floor(p.avgDuration / 60)}m {Math.round(p.avgDuration % 60)}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ SEARCH TAB ═══ */}
      {tab === 'search' && !loading && (
        <div className="grid grid-cols-2 gap-4">
          <div className="px-[18px] py-4 rounded-xl bg-core-card border border-core-border">
            <div className="text-[12px] font-bold text-core-text mb-3">Top Queries</div>
            {queries.map((q, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 py-1.5 ${i < queries.length - 1 ? 'border-b border-core-border' : ''}`}
              >
                <span
                  className={`text-[11px] font-bold min-w-[24px] ${
                    q.position <= 3
                      ? 'text-core-green'
                      : q.position <= 10
                      ? 'text-core-amber'
                      : 'text-core-text-muted'
                  }`}
                >
                  {q.position.toFixed(0)}
                </span>
                <span className="flex-1 text-[12px] text-core-text-dim overflow-hidden text-ellipsis whitespace-nowrap">
                  {q.query}
                </span>
                <MiniBar value={q.clicks} max={maxClicks} color="#00d4ff" />
                <span className="text-[11px] font-semibold text-core-text min-w-[30px] text-right">
                  {q.clicks}
                </span>
                <span className="text-[10px] text-core-text-muted min-w-[35px] text-right">
                  {(q.ctr * 100).toFixed(1)}%
                </span>
              </div>
            ))}
            {queries.length === 0 && (
              <div className="text-core-text-muted text-[12px] py-5 text-center">
                No query data yet. Add the service account to Search Console.
              </div>
            )}
          </div>

          <div className="px-[18px] py-4 rounded-xl bg-core-card border border-core-border">
            <div className="text-[12px] font-bold text-core-text mb-3">Top Pages (Search)</div>
            {scPages.map((p, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 py-1.5 ${i < scPages.length - 1 ? 'border-b border-core-border' : ''}`}
              >
                <span className="flex-1 text-[11px] text-core-text-dim overflow-hidden text-ellipsis whitespace-nowrap">
                  {p.query.replace(/^https?:\/\/[^/]+/, '')}
                </span>
                <span className="text-[11px] font-semibold text-core-cyan min-w-[30px] text-right">
                  {p.clicks}
                </span>
                <span className="text-[10px] text-core-text-muted min-w-[50px] text-right">
                  {p.impressions.toLocaleString()} imp
                </span>
              </div>
            ))}
            {scPages.length === 0 && (
              <div className="text-core-text-muted text-[12px] py-5 text-center">
                No page data yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ SIPHON TAB — adaptive data simulator (folded in from standalone) ═══ */}
      {tab === 'siphon' && (
        <div className="rounded-xl overflow-hidden border border-core-border bg-core-card">
          <iframe
            src="/widgets/adaptive-siphon/index.html"
            title="Adaptive Siphon"
            className="w-full block"
            style={{ height: 'calc(100vh - 240px)', minHeight: 560, border: 0 }}
            sandbox="allow-scripts allow-same-origin allow-downloads"
          />
        </div>
      )}

      {/* ═══ CRO9 TAB ═══ */}
      {tab === 'cro' && (
        <>
          {croLoading ? (
            <div className="flex items-center justify-center gap-2 text-core-text-muted text-[13px] py-10">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Running CRO9 analysis...
            </div>
          ) : (
            <>
              {/* Score + Dimensions */}
              <div className="flex gap-5 mb-5">
                <div className="p-6 rounded-xl bg-core-card border border-core-border flex items-center justify-center">
                  <ScoreRing score={croScore} />
                </div>
                {croScores && (
                  <div className="flex-1 px-5 py-4 rounded-xl bg-core-card border border-core-border grid grid-cols-3 gap-3 content-center">
                    {Object.entries(croScores).map(([key, val]) => (
                      <div key={key}>
                        <div className="text-[10px] text-core-text-muted uppercase tracking-[0.06em] mb-1">
                          {key}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-core-border overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-[width] duration-500 ${scoreBgClass(val)}`}
                              style={{ width: `${val}%` }}
                            />
                          </div>
                          <span className="text-[12px] font-bold text-core-text min-w-[24px]">{val}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {croRecs.length > 0 && (
                <div className="mb-5">
                  <div className="text-[13px] font-bold text-core-text mb-3">
                    Recommendations ({croRecs.length})
                  </div>
                  <div className="flex flex-col gap-2">
                    {croRecs.map((r, i) => {
                      const { badge, text } = priorityClasses(r.priority)
                      return (
                        <div key={i} className="px-[18px] py-3.5 rounded-xl bg-core-card border border-core-border">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${badge} ${text}`}>
                              {r.priority}
                            </span>
                            <span className="text-[10px] text-core-text-muted font-semibold">{r.category}</span>
                          </div>
                          <div className="text-[13px] font-semibold text-core-text mb-1">{r.title}</div>
                          <div className="text-[12px] text-core-text-dim leading-relaxed mb-1">{r.description}</div>
                          <div className="text-[11px] text-core-green font-semibold">{r.impact}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* CRO Landing Pages */}
              {croPages.length > 0 && (
                <div className="px-[18px] py-4 rounded-xl bg-core-card border border-core-border">
                  <div className="text-[12px] font-bold text-core-text mb-3">Landing Page Performance</div>
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr className="border-b border-core-border">
                        {['Page', 'Sessions', 'Bounce', 'Duration', 'Conversions'].map(h => (
                          <th
                            key={h}
                            className={`px-2.5 py-2 text-core-text-muted font-semibold text-[10px] uppercase tracking-[0.06em] ${h === 'Page' ? 'text-left' : 'text-right'}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {croPages.map((p, i) => (
                        <tr key={i} className="border-b border-core-border">
                          <td className="px-2.5 py-2 text-core-text-dim max-w-[250px] overflow-hidden text-ellipsis whitespace-nowrap">
                            {p.page}
                          </td>
                          <td className="px-2.5 py-2 text-right font-semibold text-core-text">
                            {p.sessions}
                          </td>
                          <td className={`px-2.5 py-2 text-right ${
                            p.bounceRate > 0.7
                              ? 'text-core-red'
                              : p.bounceRate > 0.5
                              ? 'text-core-amber'
                              : 'text-core-green'
                          }`}>
                            {(p.bounceRate * 100).toFixed(1)}%
                          </td>
                          <td className="px-2.5 py-2 text-right text-core-text-dim">
                            {Math.floor(p.avgDuration / 60)}m {Math.round(p.avgDuration % 60)}s
                          </td>
                          <td className={`px-2.5 py-2 text-right font-semibold ${p.conversions > 0 ? 'text-core-green' : 'text-core-text-muted'}`}>
                            {p.conversions}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {croScore === 0 && croRecs.length === 0 && !croLoading && (
                <div className="text-center py-10 text-core-text-muted">
                  <div className="text-[14px] mb-2">
                    Add the service account to GA4 + Search Console to enable CRO9
                  </div>
                  <div className="text-[11px] font-mono opacity-60">
                    id-nmcp@gen-lang-client-0912315168.iam.gserviceaccount.com
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
