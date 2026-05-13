'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Link2, LayoutTemplate, PieChart, AlertCircle } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────
type Tab = 'overview' | 'google' | 'facebook' | 'tiktok' | 'linkedin'

interface AdAccount {
  id: string
  type: string
  platform: string
  name: string
  avatar?: string
  connected: boolean
}

interface PlatformMetrics {
  spend: number
  impressions: number
  clicks: number
  ctr: number
  conversions: number
  roas: number
  campaigns: Campaign[]
}

interface Campaign {
  id: string
  name: string
  status: 'active' | 'paused' | 'completed' | 'draft'
  spend: number
  impressions: number
  clicks: number
  ctr: number
  conversions: number
  roas: number
}

interface AdData {
  accounts: AdAccount[]
  googleAds: any
  facebookAds: any
  attribution: any
}

// ── Platform definitions ──────────────────────────────────
const PLATFORMS = [
  { key: 'google',   name: 'Google Ads',   icon: 'G',  iconBg: 'bg-blue-500',    iconText: 'text-white' },
  { key: 'facebook', name: 'Facebook Ads', icon: 'f',  iconBg: 'bg-blue-600',    iconText: 'text-white' },
  { key: 'tiktok',  name: 'TikTok Ads',   icon: 'TT', iconBg: 'bg-cyan-400',    iconText: 'text-black' },
  { key: 'linkedin', name: 'LinkedIn Ads', icon: 'in', iconBg: 'bg-sky-700',     iconText: 'text-white' },
] as const

// ── Empty metrics shape (used until a platform is connected & real data flows) ──
function emptyMetrics(): PlatformMetrics {
  return { spend: 0, impressions: 0, clicks: 0, ctr: 0, conversions: 0, roas: 0, campaigns: [] }
}

// ── Formatters ────────────────────────────────────────────
function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

// ── Status badge classes ───────────────────────────────────
function statusClasses(status: Campaign['status']): string {
  switch (status) {
    case 'active':    return 'bg-core-green/15 text-core-green'
    case 'paused':    return 'bg-core-amber/15 text-core-amber'
    case 'completed': return 'bg-core-text-muted/15 text-core-text-muted'
    case 'draft':     return 'bg-core-text-muted/10 text-core-text-dim'
    default:          return 'bg-core-text-muted/10 text-core-text-dim'
  }
}

// ── ROAS value color ──────────────────────────────────────
function roasColorClass(roas: number): string {
  if (roas >= 2) return 'text-core-green'
  if (roas >= 1) return 'text-core-amber'
  return 'text-core-red'
}

// ── Sparkline SVG component ───────────────────────────────
function Sparkline({ data, colorClass, height = 32 }: { data: number[]; colorClass: string; height?: number }) {
  if (!data.length) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 120
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4) - 2}`)
    .join(' ')
  // stroke color is passed via a CSS var mapped from the colorClass; we use currentColor trick via a wrapper
  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} className={`block ${colorClass}`}>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

// ── Main Component ────────────────────────────────────────
export default function PaidAdsPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [adData, setAdData] = useState<AdData | null>(null)
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(new Set())
  const [metrics, setMetrics] = useState<Record<string, PlatformMetrics>>({})
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d')

  const fetchAds = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const res = await fetch('/api/ads', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setAdData(data)

        const connected = new Set<string>()
        for (const acct of data.accounts || []) {
          const t = (acct.type || acct.platform || '').toLowerCase()
          if (t.includes('google'))                        connected.add('google')
          if (t.includes('facebook') || t.includes('meta')) connected.add('facebook')
          if (t.includes('tiktok'))                        connected.add('tiktok')
          if (t.includes('linkedin'))                      connected.add('linkedin')
        }
        setConnectedPlatforms(connected)
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAds() }, [fetchAds])

  useEffect(() => {
    // Per-platform real metrics live on adData. Until that's wired through
    // /api/ads for each platform, show zeros for any platform that hasn't
    // been connected — never synthesize fake spend / impressions / ROAS.
    const m: Record<string, PlatformMetrics> = {}
    for (const p of PLATFORMS) m[p.key] = emptyMetrics()
    setMetrics(m)
  }, [timeframe, adData])

  const totals = {
    spend:       Object.values(metrics).reduce((s, m) => s + m.spend, 0),
    impressions: Object.values(metrics).reduce((s, m) => s + m.impressions, 0),
    clicks:      Object.values(metrics).reduce((s, m) => s + m.clicks, 0),
    conversions: Object.values(metrics).reduce((s, m) => s + m.conversions, 0),
    ctr: 0,
    roas: 0,
  }
  totals.ctr = totals.impressions
    ? parseFloat(((totals.clicks / totals.impressions) * 100).toFixed(2))
    : 0
  const totalRevenue = Object.values(metrics).reduce((s, m) => s + m.spend * m.roas, 0)
  totals.roas = totals.spend ? parseFloat((totalRevenue / totals.spend).toFixed(2)) : 0

  const sparklines = {
    spend:       Array.from({ length: 14 }, (_, i) => totals.spend / 14 * (0.7 + Math.sin(i * 0.9) * 0.3)),
    impressions: Array.from({ length: 14 }, (_, i) => totals.impressions / 14 * (0.6 + Math.sin(i * 0.7 + 1) * 0.4)),
    clicks:      Array.from({ length: 14 }, (_, i) => totals.clicks / 14 * (0.65 + Math.sin(i * 0.8 + 2) * 0.35)),
    conversions: Array.from({ length: 14 }, (_, i) => totals.conversions / 14 * (0.5 + Math.sin(i * 0.6 + 3) * 0.5)),
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'google',   label: 'Google Ads' },
    { key: 'facebook', label: 'Facebook Ads' },
    { key: 'tiktok',   label: 'TikTok Ads' },
    { key: 'linkedin', label: 'LinkedIn Ads' },
  ]

  return (
    <div className="px-7 py-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-core-text m-0">Paid Ads</h1>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-core-green/15 text-core-green tracking-wide uppercase">
            UNLIMITED
          </span>
        </div>
        <div className="flex gap-1.5">
          {(['7d', '30d', '90d'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none transition-all duration-150 ${
                timeframe === tf
                  ? 'bg-white text-black'
                  : 'bg-white/[0.06] text-core-text-muted hover:bg-white/10'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-0.5">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border-none whitespace-nowrap transition-all duration-150 ${
              tab === t.key
                ? 'bg-white text-black'
                : 'bg-white/[0.05] text-core-text-muted hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-core-text-muted">Loading ad data...</div>
      ) : tab === 'overview' ? (
        <OverviewTab
          totals={totals}
          metrics={metrics}
          connectedPlatforms={connectedPlatforms}
          sparklines={sparklines}
        />
      ) : (
        <PlatformTab
          platformKey={tab}
          platform={PLATFORMS.find(p => p.key === tab)!}
          metrics={metrics[tab]}
          connected={connectedPlatforms.has(tab)}
        />
      )}
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────
function OverviewTab({
  totals,
  metrics,
  connectedPlatforms,
  sparklines,
}: {
  totals: { spend: number; impressions: number; clicks: number; ctr: number; conversions: number; roas: number }
  metrics: Record<string, PlatformMetrics>
  connectedPlatforms: Set<string>
  sparklines: Record<string, number[]>
}) {
  const summaryCards = [
    { label: 'Total Spend',  value: formatCurrency(totals.spend),       colorClass: 'text-core-red',    spark: sparklines.spend },
    { label: 'Impressions',  value: formatNumber(totals.impressions),    colorClass: 'text-blue-400',    spark: sparklines.impressions },
    { label: 'Clicks',       value: formatNumber(totals.clicks),         colorClass: 'text-core-cyan',   spark: sparklines.clicks },
    { label: 'CTR',          value: `${totals.ctr}%`,                   colorClass: 'text-core-amber',  spark: [] },
    { label: 'Conversions',  value: formatNumber(totals.conversions),    colorClass: 'text-core-green',  spark: sparklines.conversions },
    { label: 'ROAS',         value: `${totals.roas}x`,                  colorClass: 'text-core-purple', spark: [] },
  ]

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 mb-7">
        {summaryCards.map(card => (
          <div
            key={card.label}
            className="bg-white/[0.03] border border-core-border rounded-xl px-5 py-4"
          >
            <div className="text-[11px] text-core-text-muted font-medium mb-1.5 uppercase tracking-wide">
              {card.label}
            </div>
            <div className="flex items-end justify-between gap-2">
              <div className="text-[26px] font-bold text-core-text leading-none">{card.value}</div>
              {card.spark.length > 0 && (
                <Sparkline data={card.spark} colorClass={card.colorClass} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Platform breakdown */}
      <h2 className="text-base font-semibold text-core-text mb-3.5">Platform Breakdown</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3 mb-7">
        {PLATFORMS.map(p => {
          const m = metrics[p.key]
          const connected = connectedPlatforms.has(p.key)
          return (
            <div
              key={p.key}
              className="bg-white/[0.03] border border-core-border rounded-xl p-5 relative overflow-hidden"
            >
              {/* Platform header */}
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className={`w-9 h-9 rounded-lg ${p.iconBg} flex items-center justify-center text-sm font-extrabold ${p.iconText} shrink-0`}
                >
                  {p.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-core-text">{p.name}</div>
                  <div className={`text-[11px] ${connected ? 'text-core-green' : 'text-core-text-muted'}`}>
                    {connected ? 'Connected' : 'Not connected'}
                  </div>
                </div>
                {!connected && (
                  <a
                    href="/dashboard/social"
                    className="ml-auto text-[11px] font-semibold px-3 py-1 rounded-md bg-white/[0.06] text-core-text-dim hover:bg-white/10 hover:text-core-text no-underline transition-all duration-150"
                  >
                    Connect
                  </a>
                )}
              </div>

              {/* Metrics grid */}
              {m && (
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: 'Spend',       value: formatCurrency(m.spend) },
                    { label: 'Clicks',      value: formatNumber(m.clicks) },
                    { label: 'ROAS',        value: `${m.roas}x` },
                    { label: 'Impressions', value: formatNumber(m.impressions) },
                    { label: 'CTR',         value: `${m.ctr}%` },
                    { label: 'Conversions', value: formatNumber(m.conversions) },
                  ].map(stat => (
                    <div key={stat.label}>
                      <div className="text-[10px] text-core-text-dim uppercase tracking-wide">{stat.label}</div>
                      <div className="text-[15px] font-semibold text-core-text">{stat.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick actions */}
      <h2 className="text-base font-semibold text-core-text mb-3.5">Quick Actions</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        <ActionCard
          title="Create Landing Page"
          description="Build an ad-linked funnel for your next campaign"
          href="/dashboard/funnels"
          Icon={LayoutTemplate}
          accentClass="text-core-green hover:border-core-green/40"
        />
        <ActionCard
          title="Connect Ad Account"
          description="Link your Google, Facebook, TikTok, or LinkedIn ads"
          href="/dashboard/social"
          Icon={Link2}
          accentClass="text-blue-400 hover:border-blue-400/40"
        />
        <ActionCard
          title="View Attribution"
          description="See which ads drive the most conversions"
          href="/dashboard/analytics"
          Icon={PieChart}
          accentClass="text-core-purple hover:border-core-purple/40"
        />
      </div>
    </>
  )
}

// ── Action Card ───────────────────────────────────────────
function ActionCard({
  title,
  description,
  href,
  Icon,
  accentClass,
}: {
  title: string
  description: string
  href: string
  Icon: React.ElementType
  accentClass: string
}) {
  return (
    <a
      href={href}
      className={`block bg-white/[0.03] border border-core-border rounded-xl px-5 py-4 no-underline transition-all duration-150 group ${accentClass}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 shrink-0" />
        <div className="text-sm font-semibold text-core-text">{title}</div>
      </div>
      <div className="text-xs text-core-text-muted leading-[1.4] pl-6">{description}</div>
    </a>
  )
}

// ── Platform Tab ──────────────────────────────────────────
function PlatformTab({
  platformKey,
  platform,
  metrics,
  connected,
}: {
  platformKey: string
  platform: typeof PLATFORMS[number]
  metrics: PlatformMetrics
  connected: boolean
}) {
  if (!metrics) return null

  return (
    <>
      {/* Connection status banner */}
      {!connected && (
        <div className="bg-white/[0.04] border border-core-border rounded-xl px-5 py-4 mb-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-core-amber shrink-0" />
            <div>
              <div className="text-sm font-semibold text-core-text">{platform.name} not connected</div>
              <div className="text-xs text-core-text-muted mt-0.5">
                Connect your account to see live campaign data
              </div>
            </div>
          </div>
          <a
            href="/dashboard/social"
            className="px-5 py-2 rounded-lg bg-core-cyan/20 text-core-cyan text-[13px] font-semibold no-underline hover:bg-core-cyan/30 transition-all duration-150"
          >
            Connect {platform.name}
          </a>
        </div>
      )}

      {/* Platform summary cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 mb-7">
        {[
          { label: 'Total Spend',  value: formatCurrency(metrics.spend) },
          { label: 'Impressions',  value: formatNumber(metrics.impressions) },
          { label: 'Clicks',       value: formatNumber(metrics.clicks) },
          { label: 'CTR',          value: `${metrics.ctr}%` },
          { label: 'Conversions',  value: formatNumber(metrics.conversions) },
          { label: 'ROAS',         value: `${metrics.roas}x` },
        ].map(card => (
          <div
            key={card.label}
            className="bg-white/[0.03] border border-core-border rounded-xl px-4 py-4"
          >
            <div className="text-[10px] text-core-text-muted uppercase tracking-wide mb-1">{card.label}</div>
            <div className="text-[22px] font-bold text-core-text">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Campaigns table */}
      <h2 className="text-base font-semibold text-core-text mb-3.5">Campaigns</h2>
      <div className="bg-white/[0.03] border border-core-border rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid gap-2 px-5 py-3 border-b border-core-border text-[10px] font-semibold text-core-text-dim uppercase tracking-wide"
          style={{ gridTemplateColumns: '2fr 90px 100px 100px 80px 90px 80px' }}
        >
          <div>Campaign</div>
          <div className="text-right">Status</div>
          <div className="text-right">Spend</div>
          <div className="text-right">Impressions</div>
          <div className="text-right">Clicks</div>
          <div className="text-right">Conv.</div>
          <div className="text-right">ROAS</div>
        </div>

        {/* Table rows */}
        {metrics.campaigns.map(campaign => (
          <div
            key={campaign.id}
            className="grid gap-2 px-5 py-3.5 border-b border-white/[0.03] text-[13px] items-center hover:bg-white/[0.02] transition-colors duration-100"
            style={{ gridTemplateColumns: '2fr 90px 100px 100px 80px 90px 80px' }}
          >
            <div className="font-medium text-core-text overflow-hidden text-ellipsis whitespace-nowrap">
              {campaign.name}
            </div>
            <div className="text-right">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${statusClasses(campaign.status)}`}
              >
                {campaign.status}
              </span>
            </div>
            <div className="text-right text-core-text">{formatCurrency(campaign.spend)}</div>
            <div className="text-right text-core-text-muted">{formatNumber(campaign.impressions)}</div>
            <div className="text-right text-core-text-muted">{formatNumber(campaign.clicks)}</div>
            <div className="text-right text-core-green font-semibold">{campaign.conversions}</div>
            <div className={`text-right font-semibold ${roasColorClass(campaign.roas)}`}>
              {campaign.roas}x
            </div>
          </div>
        ))}
      </div>

      {/* Create landing page CTA */}
      <div className="mt-5 bg-white/[0.03] border border-core-border rounded-xl px-6 py-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <LayoutTemplate className="w-5 h-5 text-core-green shrink-0" />
          <div>
            <div className="text-sm font-semibold text-core-text">Create Ad Landing Page</div>
            <div className="text-xs text-core-text-muted mt-0.5">
              Build a high-converting funnel linked to your {platform.name} campaigns
            </div>
          </div>
        </div>
        <a
          href="/dashboard/funnels"
          className="px-5 py-2 rounded-lg bg-core-green text-black text-[13px] font-bold no-underline hover:opacity-90 transition-opacity duration-150"
        >
          Build Funnel
        </a>
      </div>
    </>
  )
}
