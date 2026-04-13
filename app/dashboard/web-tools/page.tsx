'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

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

// ── Styles ─────────────────────────────────────────────────

const S = {
  page: {
    minHeight: '100vh',
    background: 'var(--jp-bg, #0d1117)',
    color: 'var(--jp-text, #f0f4f8)',
    fontFamily: 'var(--jp-font-mono, "JetBrains Mono", monospace)',
    padding: '32px 24px',
    maxWidth: 1280,
    margin: '0 auto',
  } as React.CSSProperties,
  h1: {
    fontSize: 28,
    fontWeight: 700,
    margin: 0,
    letterSpacing: '-0.02em',
  } as React.CSSProperties,
  subtitle: {
    fontSize: 13,
    color: 'var(--jp-text-muted, #8b95a5)',
    marginTop: 4,
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--jp-text-secondary, #c4cad4)',
    marginBottom: 12,
    marginTop: 32,
  } as React.CSSProperties,
  grid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16,
    marginTop: 20,
  } as React.CSSProperties,
  grid6: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
    gap: 12,
    marginTop: 12,
  } as React.CSSProperties,
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: 20,
    marginTop: 12,
  } as React.CSSProperties,
  card: (glow: boolean): React.CSSProperties => ({
    background: 'rgba(255,255,255,0.02)',
    border: glow ? '1px solid rgba(110,224,90,0.4)' : '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 20,
    boxShadow: glow ? '0 0 20px rgba(110,224,90,0.08)' : 'none',
    transition: 'border-color 0.3s, box-shadow 0.3s',
  }),
  statCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: '16px 18px',
  } as React.CSSProperties,
  pillRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  pill: (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    border: 'none',
    background: active ? '#6EE05A' : 'rgba(255,255,255,0.04)',
    color: active ? '#0d1117' : 'var(--jp-text-secondary, #c4cad4)',
    transition: 'all 0.2s',
  }),
  badge: (connected: boolean): React.CSSProperties => ({
    display: 'inline-block',
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 6,
    background: connected ? 'rgba(110,224,90,0.15)' : 'rgba(255,255,255,0.06)',
    color: connected ? '#6EE05A' : 'var(--jp-text-muted, #8b95a5)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  }),
  initials: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 14,
    background: 'rgba(110,224,90,0.1)',
    color: '#6EE05A',
    flexShrink: 0,
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.3)',
    color: 'var(--jp-text, #f0f4f8)',
    fontFamily: 'inherit',
    fontSize: 12,
    outline: 'none',
    marginTop: 8,
  } as React.CSSProperties,
  btn: (variant: 'primary' | 'secondary'): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    border: 'none',
    background: variant === 'primary' ? '#6EE05A' : 'rgba(255,255,255,0.06)',
    color: variant === 'primary' ? '#0d1117' : 'var(--jp-text-secondary, #c4cad4)',
    transition: 'opacity 0.2s',
  }),
  chartWrap: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
  } as React.CSSProperties,
  trendUp: {
    color: '#6EE05A',
    fontSize: 11,
    fontWeight: 600,
  } as React.CSSProperties,
  trendDown: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: 600,
  } as React.CSSProperties,
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    fontSize: 13,
  } as React.CSSProperties,
  barBg: {
    height: 6,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.04)',
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  } as React.CSSProperties,
} as const

// ── Chart Drawing ──────────────────────────────────────────

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

  // Grid lines
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

  // X axis labels
  ctx.textAlign = 'center'
  const labelCount = Math.min(data.length, 8)
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.round((i / (labelCount - 1)) * (data.length - 1))
    const x = padLeft + (idx / (data.length - 1)) * chartW
    const y = h - padBottom + 20
    ctx.fillText(formatDate(idx, data.length, timeframe), x, y)
  }

  // Data
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
    // Area fill
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

    // Line
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

    // Dots on line for small datasets
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

  // Load connections from localStorage
  useEffect(() => {
    const loaded: ServiceConnection[] = INITIAL_SERVICES.map((s) => {
      let stored: string | null = null
      try {
        stored = localStorage.getItem(s.storageKey)
      } catch {
        // ignore
      }
      return {
        ...s,
        value: stored || '',
        connected: !!stored,
      }
    })
    setServices(loaded)
  }, [])

  // Generate chart data
  const chartData = generateDemoData(timeframe, metric)

  // Draw chart
  const redrawChart = useCallback(() => {
    if (canvasRef.current) {
      drawChart(canvasRef.current, chartData, chartType, timeframe, metric)
    }
  }, [chartData, chartType, timeframe, metric])

  useEffect(() => {
    redrawChart()
  }, [redrawChart])

  // Resize handler
  useEffect(() => {
    const onResize = () => redrawChart()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [redrawChart])

  // Stats
  const connectedCount = services.filter((s) => s.connected).length

  const stats: StatCard[] = [
    { label: 'Sessions', value: (12000 + Math.round(seededRandom(timeframe.length + 1) * 40000)).toLocaleString(), trend: 12.4, up: true },
    { label: 'Users', value: (3000 + Math.round(seededRandom(timeframe.length + 2) * 6000)).toLocaleString(), trend: 8.2, up: true },
    { label: 'Pageviews', value: (30000 + Math.round(seededRandom(timeframe.length + 3) * 50000)).toLocaleString(), trend: 15.1, up: true },
    { label: 'Bounce Rate', value: `${(30 + Math.round(seededRandom(timeframe.length + 4) * 30))}%`, trend: 3.2, up: false },
    { label: 'Avg Duration', value: `${1 + Math.floor(seededRandom(timeframe.length + 5) * 3)}:${String(Math.floor(seededRandom(timeframe.length + 6) * 59)).padStart(2, '0')}`, trend: 5.7, up: true },
    { label: 'Conversions', value: String(20 + Math.round(seededRandom(timeframe.length + 7) * 80)), trend: 22.1, up: true },
  ]

  const handleConnect = (serviceId: string) => {
    const val = inputValues[serviceId]
    if (!val || !val.trim()) return
    try {
      const svc = INITIAL_SERVICES.find((s) => s.id === serviceId)
      if (svc) {
        localStorage.setItem(svc.storageKey, val.trim())
      }
    } catch {
      // ignore
    }
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, value: val.trim(), connected: true } : s))
    )
    setEditingService(null)
    setInputValues((prev) => {
      const next = { ...prev }
      delete next[serviceId]
      return next
    })
  }

  const handleDisconnect = (serviceId: string) => {
    const svc = INITIAL_SERVICES.find((s) => s.id === serviceId)
    if (svc) {
      try {
        localStorage.removeItem(svc.storageKey)
      } catch {
        // ignore
      }
    }
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, value: '', connected: false } : s))
    )
  }

  const maxTrafficSessions = Math.max(...TRAFFIC_SOURCES.map((t) => t.sessions))

  return (
    <div style={S.page}>
      {/* Header */}
      <div>
        <h1 style={S.h1}>Web Tools</h1>
        <p style={S.subtitle}>
          {connectedCount} of {services.length} tools connected
        </p>
      </div>

      {/* Connection CTAs */}
      <div style={S.grid4}>
        {services.map((svc) => (
          <div key={svc.id} style={S.card(svc.connected)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={S.initials}>{svc.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{svc.name}</div>
                <span style={S.badge(svc.connected)}>
                  {svc.connected ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>

            {svc.connected && editingService !== svc.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--jp-text-muted, #8b95a5)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {svc.value.slice(0, 4)}{'****'}
                </span>
                <button
                  type="button"
                  style={S.btn('secondary')}
                  onClick={() => handleDisconnect(svc.id)}
                >
                  Disconnect
                </button>
              </div>
            ) : editingService === svc.id ? (
              <div>
                <input
                  style={S.input}
                  placeholder={svc.placeholder}
                  value={inputValues[svc.id] || ''}
                  onChange={(e) => setInputValues((prev) => ({ ...prev, [svc.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleConnect(svc.id) }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button type="button" style={S.btn('primary')} onClick={() => handleConnect(svc.id)}>
                    Save
                  </button>
                  <button type="button" style={S.btn('secondary')} onClick={() => setEditingService(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                style={{ ...S.btn('primary'), width: '100%', padding: '8px 14px' }}
                onClick={() => setEditingService(svc.id)}
              >
                Connect
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Time Frame Selector */}
      <div style={{ ...S.sectionTitle, marginBottom: 0 }}>Time Frame</div>
      <div style={{ ...S.pillRow, marginTop: 8 }}>
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.key}
            type="button"
            style={S.pill(timeframe === tf.key)}
            onClick={() => setTimeframe(tf.key)}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Chart Type Toggle + Metric Selector row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24, marginTop: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--jp-text-muted, #8b95a5)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Chart Type
          </div>
          <div style={S.pillRow}>
            {CHART_TYPES.map((ct) => (
              <button
                key={ct.key}
                type="button"
                style={S.pill(chartType === ct.key)}
                onClick={() => setChartType(ct.key)}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--jp-text-muted, #8b95a5)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Metric
          </div>
          <div style={S.pillRow}>
            {METRICS.map((m) => (
              <button
                key={m.key}
                type="button"
                style={S.pill(metric === m.key)}
                onClick={() => setMetric(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div ref={containerRef} style={S.chartWrap}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: 340, display: 'block' }}
        />
      </div>

      {/* Stats Row */}
      <div style={S.grid6}>
        {stats.map((stat) => (
          <div key={stat.label} style={S.statCard}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--jp-text-muted, #8b95a5)', marginTop: 2 }}>
              {stat.label}
            </div>
            <div style={stat.up ? S.trendUp : S.trendDown}>
              {stat.up ? '\u2191' : '\u2193'} {stat.trend}%
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Section */}
      <div style={S.grid2}>
        {/* Top Pages */}
        <div style={{ ...S.card(false), marginTop: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Top Pages</div>
          <div>
            {TOP_PAGES.map((page, i) => (
              <div key={page.path} style={S.listItem}>
                <span style={{ color: 'var(--jp-text-muted, #8b95a5)', width: 20, fontSize: 12, flexShrink: 0 }}>
                  {i + 1}.
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {page.path}
                </span>
                <span style={{ fontWeight: 600, marginLeft: 12, color: '#6EE05A', fontSize: 13 }}>
                  {page.views.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Sources */}
        <div style={{ ...S.card(false), marginTop: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Traffic Sources</div>
          <div>
            {TRAFFIC_SOURCES.map((src) => (
              <div key={src.name} style={S.listItem}>
                <span style={{ minWidth: 110, fontSize: 12 }}>{src.name}</span>
                <div style={S.barBg}>
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: `${(src.sessions / maxTrafficSessions) * 100}%`,
                      borderRadius: 3,
                      background: src.color,
                      opacity: 0.7,
                    }}
                  />
                </div>
                <span style={{ fontWeight: 600, fontSize: 12, minWidth: 50, textAlign: 'right' }}>
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
