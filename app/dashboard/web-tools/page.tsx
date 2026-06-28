'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────

interface ServiceConnection {
  id: string
  name: string
  initials: string
  placeholder: string
  prefix: string
  storageKey: string
  value: string
  connected: boolean
}

type TimeFrame = '7d' | '30d' | '90d' | '1yr' | 'custom'
type ChartType = 'line' | 'bar' | 'area'
type Metric = 'sessions' | 'users' | 'pageviews' | 'bounce_rate' | 'conversions' | 'revenue'

interface StatCard {
  label: string
  value: string
  trend: number
  up: boolean
}

interface TopPage {
  path: string
  views: number
}

interface TrafficSource {
  name: string
  sessions: number
  color: string
}

// ── Helpers ────────────────────────────────────────────────

function generateDemoData(timeframe: TimeFrame, metric: Metric): number[] {
  const counts: Record<TimeFrame, number> = { '7d': 7, '30d': 30, '90d': 90, '1yr': 365, custom: 30 }
  const len = counts[timeframe]
  const baselines: Record<Metric, number> = {
    sessions: 1200,
    users: 800,
    pageviews: 3200,
    bounce_rate: 45,
    conversions: 35,
    revenue: 4500,
  }
  const amplitudes: Record<Metric, number> = {
    sessions: 400,
    users: 250,
    pageviews: 1000,
    bounce_rate: 10,
    conversions: 12,
    revenue: 1500,
  }
  const base = baselines[metric]
  const amp = amplitudes[metric]
  const seed = metric.length * 17 + len * 3
  const data: number[] = []
  for (let i = 0; i < len; i++) {
    const sine = Math.sin((i / len) * Math.PI * 2 + seed) * amp
    const noise = (Math.sin(i * 13.7 + seed * 2.3) * 0.5 + Math.cos(i * 7.1 + seed) * 0.3) * amp * 0.4
    data.push(Math.max(0, Math.round(base + sine + noise)))
  }
  return data
}

function formatDate(index: number, total: number, timeframe: TimeFrame): string {
  const now = new Date()
  const daysBack = timeframe === '1yr' ? 365 : timeframe === '90d' ? 90 : timeframe === '7d' ? 7 : 30
  const date = new Date(now.getTime() - (total - 1 - index) * 24 * 60 * 60 * 1000 * (daysBack / total))
  const month = date.toLocaleString('en', { month: 'short' })
  return `${month} ${date.getDate()}`
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// ── Constants ──────────────────────────────────────────────

const TIMEFRAMES: { key: TimeFrame; label: string }[] = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: '1yr', label: '1yr' },
  { key: 'custom', label: 'Custom' },
]

const CHART_TYPES: { key: ChartType; label: string }[] = [
  { key: 'line', label: 'Line' },
  { key: 'bar', label: 'Bar' },
  { key: 'area', label: 'Area' },
]

const METRICS: { key: Metric; label: string }[] = [
  { key: 'sessions', label: 'Sessions' },
  { key: 'users', label: 'Users' },
  { key: 'pageviews', label: 'Pageviews' },
  { key: 'bounce_rate', label: 'Bounce Rate' },
  { key: 'conversions', label: 'Conversions' },
  { key: 'revenue', label: 'Revenue' },
]

const TOP_PAGES: TopPage[] = [
  { path: '/', views: 12847 },
  { path: '/store', views: 8432 },
  { path: '/dashboard', views: 6219 },
  { path: '/builder', views: 4103 },
  { path: '/docs/getting-started', views: 3587 },
]

const TRAFFIC_SOURCES: TrafficSource[] = [
  { name: 'Organic Search', sessions: 14230, color: '#6EE05A' },
  { name: 'Direct', sessions: 8742, color: '#00d4ff' },
  { name: 'Social Media', sessions: 5391, color: '#a78bfa' },
  { name: 'Referral', sessions: 3218, color: '#f59e0b' },
  { name: 'Email', sessions: 1876, color: '#ef4444' },
]

const INITIAL_SERVICES: Omit<ServiceConnection, 'value' | 'connected'>[] = [
  { id: 'ga4', name: 'Google Analytics', initials: 'GA', placeholder: 'G-XXXXXXXXXX', prefix: 'G-', storageKey: '0ncore-webtools-ga4' },
  { id: 'fbpixel', name: 'Facebook Pixel', initials: 'FB', placeholder: 'Pixel ID', prefix: '', storageKey: '0ncore-webtools-fbpixel' },
  { id: 'gads', name: 'Google Ads', initials: 'AD', placeholder: 'AW-XXXXXXXXXX', prefix: 'AW-', storageKey: '0ncore-webtools-gads' },
  { id: 'gtm', name: 'Google Tag Manager', initials: 'TM', placeholder: 'GTM-XXXXXXX', prefix: 'GTM-', storageKey: '0ncore-webtools-gtm' },
]

// ── Chart Drawing ──────────────────────────────────────────

// Maps a service tile id → the server config column it persists to.
const ID_TO_FIELD: Record<string, string> = {
  ga4: 'ga4_id', fbpixel: 'fb_pixel_id', gads: 'gads_id', gtm: 'gtm_id',
}

function drawChart(
  canvas: HTMLCanvasElement,
  data: number[],
  chartType: ChartType,
  timeframe: TimeFrame,
  metric: Metric,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  const w = rect.width
  const h = rect.height
  const padLeft = 60
  const padRight = 20
  const padTop = 20
  const padBottom = 40
  const chartW = w - padLeft - padRight
  const chartH = h - padTop - padBottom

  ctx.clearRect(0, 0, w, h)

  if (data.length === 0) return

  const maxVal = Math.max(...data) * 1.1
  const minVal = Math.min(0, Math.min(...data) * 0.9)
  const range = maxVal - minVal || 1

  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 1
  const gridLines = 5
  ctx.font = '10px "JetBrains Mono", monospace'
  ctx.fillStyle = '#8b95a5'
  ctx.textAlign = 'right'

  for (let i = 0; i <= gridLines; i++) {
    const y = padTop + (chartH / gridLines) * i
    ctx.beginPath()
    ctx.moveTo(padLeft, y)
    ctx.lineTo(w - padRight, y)
    ctx.stroke()
    const val = maxVal - (range / gridLines) * i
    let label: string
    if (metric === 'bounce_rate') {
      label = `${val.toFixed(0)}%`
    } else if (metric === 'revenue') {
      label = `$${formatNumber(Math.round(val))}`
    } else {
      label = formatNumber(Math.round(val))
    }
    ctx.fillText(label, padLeft - 8, y + 4)
  }

  ctx.textAlign = 'center'
  const labelCount = Math.min(data.length, 8)
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.round((i / (labelCount - 1)) * (data.length - 1))
    const x = padLeft + (idx / (data.length - 1)) * chartW
    const y = h - padBottom + 20
    ctx.fillText(formatDate(idx, data.length, timeframe), x, y)
  }

  const accent = '#6EE05A'
  const toX = (i: number) => padLeft + (i / (data.length - 1)) * chartW
  const toY = (v: number) => padTop + chartH - ((v - minVal) / range) * chartH

  if (chartType === 'bar') {
    const barW = Math.max(2, (chartW / data.length) * 0.6)
    for (let i = 0; i < data.length; i++) {
      const x = toX(i) - barW / 2
      const y = toY(data[i])
      const barH = padTop + chartH - y
      ctx.fillStyle = accent
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0])
      ctx.fill()
    }
    ctx.globalAlpha = 1
  } else {
    if (chartType === 'area') {
      ctx.beginPath()
      ctx.moveTo(toX(0), toY(data[0]))
      for (let i = 1; i < data.length; i++) {
        ctx.lineTo(toX(i), toY(data[i]))
      }
      ctx.lineTo(toX(data.length - 1), padTop + chartH)
      ctx.lineTo(toX(0), padTop + chartH)
      ctx.closePath()
      const grad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH)
      grad.addColorStop(0, 'rgba(110,224,90,0.2)')
      grad.addColorStop(1, 'rgba(110,224,90,0)')
      ctx.fillStyle = grad
      ctx.fill()
    }

    ctx.beginPath()
    ctx.moveTo(toX(0), toY(data[0]))
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(toX(i), toY(data[i]))
    }
    ctx.strokeStyle = accent
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()

    if (data.length <= 30) {
      for (let i = 0; i < data.length; i++) {
        ctx.beginPath()
        ctx.arc(toX(i), toY(data[i]), 3, 0, Math.PI * 2)
        ctx.fillStyle = accent
        ctx.fill()
      }
    }
  }
}

// ── Component ──────────────────────────────────────────────

export default function WebToolsPage() {
  const [services, setServices] = useState<ServiceConnection[]>([])
  const [editingService, setEditingService] = useState<string | null>(null)
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [timeframe, setTimeframe] = useState<TimeFrame>('30d')
  const [chartType, setChartType] = useState<ChartType>('line')
  const [metric, setMetric] = useState<Metric>('sessions')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load saved tracking IDs from the server (persists across devices).
    fetch('/api/web-tools')
      .then((r) => r.json())
      .then((d) => {
        const cfg = d?.config || {}
        setServices(INITIAL_SERVICES.map((s) => {
          const v = (cfg[ID_TO_FIELD[s.id]] as string) || ''
          return { ...s, value: v, connected: !!v }
        }))
      })
      .catch(() => {
        // Fallback to any local cache if the API is unreachable.
        setServices(INITIAL_SERVICES.map((s) => {
          let stored: string | null = null
          try { stored = localStorage.getItem(s.storageKey) } catch { /* ignore */ }
          return { ...s, value: stored || '', connected: !!stored }
        }))
      })
  }, [])

  const chartData = generateDemoData(timeframe, metric)

  const redrawChart = useCallback(() => {
    if (canvasRef.current) {
      drawChart(canvasRef.current, chartData, chartType, timeframe, metric)
    }
  }, [chartData, chartType, timeframe, metric])

  useEffect(() => { redrawChart() }, [redrawChart])

  useEffect(() => {
    const onResize = () => redrawChart()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [redrawChart])

  const connectedCount = services.filter((s) => s.connected).length

  const stats: StatCard[] = [
    { label: 'Sessions', value: (12000 + Math.round(seededRandom(timeframe.length + 1) * 40000)).toLocaleString(), trend: 12.4, up: true },
    { label: 'Users', value: (3000 + Math.round(seededRandom(timeframe.length + 2) * 6000)).toLocaleString(), trend: 8.2, up: true },
    { label: 'Pageviews', value: (30000 + Math.round(seededRandom(timeframe.length + 3) * 50000)).toLocaleString(), trend: 15.1, up: true },
    { label: 'Bounce Rate', value: `${(30 + Math.round(seededRandom(timeframe.length + 4) * 30))}%`, trend: 3.2, up: false },
    { label: 'Avg Duration', value: `${1 + Math.floor(seededRandom(timeframe.length + 5) * 3)}:${String(Math.floor(seededRandom(timeframe.length + 6) * 59)).padStart(2, '0')}`, trend: 5.7, up: true },
    { label: 'Conversions', value: String(20 + Math.round(seededRandom(timeframe.length + 7) * 80)), trend: 22.1, up: true },
  ]

  const persist = (arr: ServiceConnection[]) => {
    const cfg: Record<string, string> = {}
    arr.forEach((s) => { if (ID_TO_FIELD[s.id] && s.value) cfg[ID_TO_FIELD[s.id]] = s.value })
    fetch('/api/web-tools', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) }).catch(() => {})
  }

  const handleConnect = (serviceId: string) => {
    const val = inputValues[serviceId]
    if (!val || !val.trim()) return
    const next = services.map((s) => (s.id === serviceId ? { ...s, value: val.trim(), connected: true } : s))
    setServices(next); persist(next)
    try { const svc = INITIAL_SERVICES.find((s) => s.id === serviceId); if (svc) localStorage.setItem(svc.storageKey, val.trim()) } catch { /* ignore */ }
    setEditingService(null)
    setInputValues((prev) => { const n = { ...prev }; delete n[serviceId]; return n })
  }

  const handleDisconnect = (serviceId: string) => {
    const next = services.map((s) => (s.id === serviceId ? { ...s, value: '', connected: false } : s))
    setServices(next); persist(next)
    const svc = INITIAL_SERVICES.find((s) => s.id === serviceId)
    if (svc) { try { localStorage.removeItem(svc.storageKey) } catch { /* ignore */ } }
  }

  const maxTrafficSessions = Math.max(...TRAFFIC_SOURCES.map((t) => t.sessions))

  return (
    <div className="min-h-screen bg-core-bg text-core-text font-mono py-8 px-6 max-w-[1280px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold m-0 tracking-tight">Web Tools</h1>
        <p className="text-[13px] text-core-text-muted mt-1">
          {connectedCount} of {services.length} tools connected
        </p>
      </div>

      {/* Connection cards */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 mt-5">
        {services.map((svc) => (
          <div
            key={svc.id}
            className={[
              'rounded-xl p-5 transition-all duration-300',
              svc.connected
                ? 'bg-white/[0.02] border border-core-green/40 shadow-[0_0_20px_rgba(110,224,90,0.08)]'
                : 'bg-white/[0.02] border border-white/[0.06]',
            ].join(' ')}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm bg-core-green/10 text-core-green shrink-0">
                {svc.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{svc.name}</div>
                <span
                  className={[
                    'inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider',
                    svc.connected
                      ? 'bg-core-green/15 text-core-green'
                      : 'bg-white/[0.06] text-core-text-muted',
                  ].join(' ')}
                >
                  {svc.connected ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>

            {svc.connected && editingService !== svc.id ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-core-text-muted flex-1 truncate">
                  {svc.value.slice(0, 4)}{'****'}
                </span>
                <button
                  type="button"
                  onClick={() => handleDisconnect(svc.id)}
                  className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold bg-white/[0.06] text-core-text-dim hover:opacity-80 transition-opacity border-0 cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            ) : editingService === svc.id ? (
              <div>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-black/30 text-core-text font-mono text-xs outline-none mt-2"
                  placeholder={svc.placeholder}
                  value={inputValues[svc.id] || ''}
                  onChange={(e) => setInputValues((prev) => ({ ...prev, [svc.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleConnect(svc.id) }}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => handleConnect(svc.id)}
                    className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold bg-core-green text-core-bg border-0 cursor-pointer hover:opacity-90"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingService(null)}
                    className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold bg-white/[0.06] text-core-text-dim border-0 cursor-pointer hover:opacity-80"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingService(svc.id)}
                className="w-full py-2 px-3.5 rounded-lg text-[11px] font-bold bg-core-green text-core-bg border-0 cursor-pointer hover:opacity-90 transition-opacity"
              >
                Connect
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Timeframe selector */}
      <div className="text-sm font-semibold text-core-text-dim mt-8 mb-0">Time Frame</div>
      <div className="flex gap-1.5 flex-wrap mt-2">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.key}
            type="button"
            onClick={() => setTimeframe(tf.key)}
            className={[
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono cursor-pointer border-0 transition-all duration-200',
              timeframe === tf.key
                ? 'bg-core-green text-core-bg'
                : 'bg-white/[0.04] text-core-text-dim hover:bg-white/[0.07]',
            ].join(' ')}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Chart type + metric row */}
      <div className="flex flex-wrap items-center gap-6 mt-5">
        <div>
          <div className="text-[11px] text-core-text-muted mb-1.5 font-semibold uppercase tracking-widest">Chart Type</div>
          <div className="flex gap-1.5 flex-wrap">
            {CHART_TYPES.map((ct) => (
              <button
                key={ct.key}
                type="button"
                onClick={() => setChartType(ct.key)}
                className={[
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono cursor-pointer border-0 transition-all duration-200',
                  chartType === ct.key
                    ? 'bg-core-green text-core-bg'
                    : 'bg-white/[0.04] text-core-text-dim hover:bg-white/[0.07]',
                ].join(' ')}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-core-text-muted mb-1.5 font-semibold uppercase tracking-widest">Metric</div>
          <div className="flex gap-1.5 flex-wrap">
            {METRICS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMetric(m.key)}
                className={[
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono cursor-pointer border-0 transition-all duration-200',
                  metric === m.key
                    ? 'bg-core-green text-core-bg'
                    : 'bg-white/[0.04] text-core-text-dim hover:bg-white/[0.07]',
                ].join(' ')}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main chart */}
      <div ref={containerRef} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 mt-4">
        <canvas ref={canvasRef} className="w-full block" style={{ height: 340 }} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3 mt-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-4">
            <div className="text-[22px] font-bold tracking-tight">{stat.value}</div>
            <div className="text-[11px] text-core-text-muted mt-0.5">{stat.label}</div>
            <div className={`flex items-center gap-0.5 text-[11px] font-semibold mt-0.5 ${stat.up ? 'text-core-green' : 'text-core-red'}`}>
              {stat.up
                ? <TrendingUp className="w-3 h-3" />
                : <TrendingDown className="w-3 h-3" />
              }
              {stat.trend}%
            </div>
          </div>
        ))}
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-5 mt-3">
        {/* Top Pages */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 mt-6">
          <div className="text-sm font-semibold mb-2">Top Pages</div>
          <div>
            {TOP_PAGES.map((page, i) => (
              <div key={page.path} className="flex justify-between items-center py-2.5 border-b border-white/[0.04] text-sm last:border-0">
                <span className="text-core-text-muted w-5 text-xs shrink-0">{i + 1}.</span>
                <span className="flex-1 truncate">{page.path}</span>
                <span className="font-semibold ml-3 text-core-green text-[13px]">
                  {page.views.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 mt-6">
          <div className="text-sm font-semibold mb-2">Traffic Sources</div>
          <div>
            {TRAFFIC_SOURCES.map((src) => (
              <div key={src.name} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] text-sm last:border-0">
                <span className="min-w-[110px] text-xs">{src.name}</span>
                <div className="flex-1 h-1.5 rounded bg-white/[0.04] mx-3 relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full rounded opacity-70"
                    style={{
                      width: `${(src.sessions / maxTrafficSessions) * 100}%`,
                      background: src.color,
                    }}
                  />
                </div>
                <span className="font-semibold text-xs min-w-[50px] text-right">
                  {src.sessions.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
