'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  { key: 'google', name: 'Google Ads', color: '#4285F4', icon: 'G', gradient: 'linear-gradient(135deg, #4285F4, #34A853)' },
  { key: 'facebook', name: 'Facebook Ads', color: '#1877F2', icon: 'f', gradient: 'linear-gradient(135deg, #1877F2, #42b72a)' },
  { key: 'tiktok', name: 'TikTok Ads', color: '#00F2EA', icon: 'TT', gradient: 'linear-gradient(135deg, #00F2EA, #FF0050)' },
  { key: 'linkedin', name: 'LinkedIn Ads', color: '#0A66C2', icon: 'in', gradient: 'linear-gradient(135deg, #0A66C2, #004182)' },
] as const

// ── Demo data generators ──────────────────────────────────
function generateDemoCampaigns(platform: string): Campaign[] {
  const prefixes: Record<string, string[]> = {
    google: ['Search - Brand', 'Search - Non-Brand', 'Display - Retarget', 'PMax - All', 'YouTube - Awareness'],
    facebook: ['Conversions - Lookalike', 'Traffic - Interest', 'Retargeting - Cart', 'Leads - Form', 'Engagement - Video'],
    tiktok: ['TopView - Launch', 'In-Feed - Retarget', 'Spark Ads - UGC', 'Collection - Products'],
    linkedin: ['Sponsored - Decision Makers', 'Message Ads - C-Suite', 'Lead Gen - IT Managers', 'Document Ads - Whitepaper'],
  }
  const names = prefixes[platform] || ['Campaign 1', 'Campaign 2', 'Campaign 3']
  const statuses: Campaign['status'][] = ['active', 'active', 'paused', 'completed', 'active']

  return names.map((name, i) => {
    const spend = Math.round(800 + Math.random() * 4200)
    const impressions = Math.round(spend * (15 + Math.random() * 35))
    const clicks = Math.round(impressions * (0.01 + Math.random() * 0.06))
    const conversions = Math.round(clicks * (0.02 + Math.random() * 0.12))
    const revenue = conversions * (20 + Math.random() * 180)
    return {
      id: `${platform}-${i}`,
      name,
      status: statuses[i % statuses.length],
      spend,
      impressions,
      clicks,
      ctr: parseFloat(((clicks / impressions) * 100).toFixed(2)),
      conversions,
      roas: parseFloat((revenue / spend).toFixed(2)),
    }
  })
}

function generatePlatformMetrics(platform: string): PlatformMetrics {
  const campaigns = generateDemoCampaigns(platform)
  const spend = campaigns.reduce((s, c) => s + c.spend, 0)
  const impressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const clicks = campaigns.reduce((s, c) => s + c.clicks, 0)
  const conversions = campaigns.reduce((s, c) => s + c.conversions, 0)
  const totalRevenue = campaigns.reduce((s, c) => s + c.spend * c.roas, 0)

  return {
    spend,
    impressions,
    clicks,
    ctr: parseFloat(((clicks / impressions) * 100).toFixed(2)),
    conversions,
    roas: parseFloat((totalRevenue / spend).toFixed(2)),
    campaigns,
  }
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

// ── Status badge colors ───────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: 'rgba(126, 217, 87, 0.15)', text: '#7ed957' },
  paused: { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24' },
  completed: { bg: 'rgba(139, 149, 165, 0.15)', text: '#8b95a5' },
  draft: { bg: 'rgba(139, 149, 165, 0.1)', text: '#5a6370' },
}

// ── Sparkline SVG component ───────────────────────────────
function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  if (!data.length) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 120
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ')
  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} style={{ display: 'block' }}>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
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

        // Determine connected platforms from CRM social accounts
        const connected = new Set<string>()
        for (const acct of data.accounts || []) {
          const t = (acct.type || acct.platform || '').toLowerCase()
          if (t.includes('google')) connected.add('google')
          if (t.includes('facebook') || t.includes('meta')) connected.add('facebook')
          if (t.includes('tiktok')) connected.add('tiktok')
          if (t.includes('linkedin')) connected.add('linkedin')
        }
        setConnectedPlatforms(connected)
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAds()
  }, [fetchAds])

  // Generate demo metrics (replace with real data when CRM API provides it)
  useEffect(() => {
    const m: Record<string, PlatformMetrics> = {}
    for (const p of PLATFORMS) {
      m[p.key] = generatePlatformMetrics(p.key)
    }
    setMetrics(m)
  }, [timeframe])

  // Aggregate totals across all platforms
  const totals = {
    spend: Object.values(metrics).reduce((s, m) => s + m.spend, 0),
    impressions: Object.values(metrics).reduce((s, m) => s + m.impressions, 0),
    clicks: Object.values(metrics).reduce((s, m) => s + m.clicks, 0),
    conversions: Object.values(metrics).reduce((s, m) => s + m.conversions, 0),
    ctr: 0,
    roas: 0,
  }
  totals.ctr = totals.impressions ? parseFloat(((totals.clicks / totals.impressions) * 100).toFixed(2)) : 0
  const totalRevenue = Object.values(metrics).reduce((s, m) => s + m.spend * m.roas, 0)
  totals.roas = totals.spend ? parseFloat((totalRevenue / totals.spend).toFixed(2)) : 0

  // Sparkline demo data per metric
  const sparklines = {
    spend: Array.from({ length: 14 }, (_, i) => totals.spend / 14 * (0.7 + Math.sin(i * 0.9) * 0.3)),
    impressions: Array.from({ length: 14 }, (_, i) => totals.impressions / 14 * (0.6 + Math.sin(i * 0.7 + 1) * 0.4)),
    clicks: Array.from({ length: 14 }, (_, i) => totals.clicks / 14 * (0.65 + Math.sin(i * 0.8 + 2) * 0.35)),
    conversions: Array.from({ length: 14 }, (_, i) => totals.conversions / 14 * (0.5 + Math.sin(i * 0.6 + 3) * 0.5)),
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'google', label: 'Google Ads' },
    { key: 'facebook', label: 'Facebook Ads' },
    { key: 'tiktok', label: 'TikTok Ads' },
    { key: 'linkedin', label: 'LinkedIn Ads' },
  ]

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', margin: 0 }}>Paid Ads</h1>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 6,
            background: 'rgba(126, 217, 87, 0.15)',
            color: '#7ed957',
            letterSpacing: '0.05em',
          }}>UNLIMITED</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['7d', '30d', '90d'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: timeframe === tf ? '#ffffff' : 'rgba(255,255,255,0.06)',
                color: timeframe === tf ? '#000000' : '#8b95a5',
                transition: 'all 0.15s',
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, overflowX: 'auto', paddingBottom: 2 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: tab === t.key ? '#ffffff' : 'rgba(255,255,255,0.05)',
              color: tab === t.key ? '#000000' : '#8b95a5',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8b95a5' }}>Loading ad data...</div>
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
    { label: 'Total Spend', value: formatCurrency(totals.spend), color: '#ff6b6b', spark: sparklines.spend },
    { label: 'Impressions', value: formatNumber(totals.impressions), color: '#4285F4', spark: sparklines.impressions },
    { label: 'Clicks', value: formatNumber(totals.clicks), color: '#00d4ff', spark: sparklines.clicks },
    { label: 'CTR', value: `${totals.ctr}%`, color: '#fbbf24', spark: [] },
    { label: 'Conversions', value: formatNumber(totals.conversions), color: '#7ed957', spark: sparklines.conversions },
    { label: 'ROAS', value: `${totals.roas}x`, color: '#a78bfa', spark: [] },
  ]

  return (
    <>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
        {summaryCards.map(card => (
          <div key={card.label} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: '18px 20px',
          }}>
            <div style={{ fontSize: 11, color: '#8b95a5', fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>{card.value}</div>
              {card.spark.length > 0 && <Sparkline data={card.spark} color={card.color} />}
            </div>
          </div>
        ))}
      </div>

      {/* Platform breakdown */}
      <h2 style={{ fontSize: 16, fontWeight: 600, color: '#ffffff', marginBottom: 14 }}>Platform Breakdown</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, marginBottom: 28 }}>
        {PLATFORMS.map(p => {
          const m = metrics[p.key]
          const connected = connectedPlatforms.has(p.key)
          return (
            <div key={p.key} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              padding: 20,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Platform header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: p.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 800,
                  color: '#ffffff',
                }}>{p.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: connected ? '#7ed957' : '#8b95a5' }}>
                    {connected ? 'Connected' : 'Not connected'}
                  </div>
                </div>
                {!connected && (
                  <a
                    href="/dashboard/social"
                    style={{
                      marginLeft: 'auto',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '5px 12px',
                      borderRadius: 6,
                      background: `${p.color}20`,
                      color: p.color,
                      textDecoration: 'none',
                      transition: 'opacity 0.15s',
                    }}
                  >
                    Connect
                  </a>
                )}
              </div>

              {/* Metrics grid */}
              {m && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Spend', value: formatCurrency(m.spend) },
                    { label: 'Clicks', value: formatNumber(m.clicks) },
                    { label: 'ROAS', value: `${m.roas}x` },
                    { label: 'Impressions', value: formatNumber(m.impressions) },
                    { label: 'CTR', value: `${m.ctr}%` },
                    { label: 'Conversions', value: formatNumber(m.conversions) },
                  ].map(stat => (
                    <div key={stat.label}>
                      <div style={{ fontSize: 10, color: '#5a6370', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#ffffff' }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick actions */}
      <h2 style={{ fontSize: 16, fontWeight: 600, color: '#ffffff', marginBottom: 14 }}>Quick Actions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <ActionCard
          title="Create Landing Page"
          description="Build an ad-linked funnel for your next campaign"
          href="/dashboard/funnels"
          color="#7ed957"
        />
        <ActionCard
          title="Connect Ad Account"
          description="Link your Google, Facebook, TikTok, or LinkedIn ads"
          href="/dashboard/social"
          color="#4285F4"
        />
        <ActionCard
          title="View Attribution"
          description="See which ads drive the most conversions"
          href="/dashboard/analytics"
          color="#a78bfa"
        />
      </div>
    </>
  )
}

// ── Action Card ───────────────────────────────────────────
function ActionCard({ title, description, href, color }: { title: string; description: string; href: string; color: string }) {
  return (
    <a
      href={href}
      style={{
        display: 'block',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: '18px 20px',
        textDecoration: 'none',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)' }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#8b95a5', lineHeight: 1.4 }}>{description}</div>
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
      {/* Connection status */}
      {!connected && (
        <div style={{
          background: `${platform.color}10`,
          border: `1px solid ${platform.color}30`,
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>{platform.name} not connected</div>
            <div style={{ fontSize: 12, color: '#8b95a5', marginTop: 2 }}>Connect your account to see live campaign data</div>
          </div>
          <a
            href="/dashboard/social"
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              background: platform.color,
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Connect {platform.name}
          </a>
        </div>
      )}

      {/* Platform summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total Spend', value: formatCurrency(metrics.spend), color: '#ff6b6b' },
          { label: 'Impressions', value: formatNumber(metrics.impressions), color: platform.color },
          { label: 'Clicks', value: formatNumber(metrics.clicks), color: '#00d4ff' },
          { label: 'CTR', value: `${metrics.ctr}%`, color: '#fbbf24' },
          { label: 'Conversions', value: formatNumber(metrics.conversions), color: '#7ed957' },
          { label: 'ROAS', value: `${metrics.roas}x`, color: '#a78bfa' },
        ].map(card => (
          <div key={card.label} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: '16px 18px',
          }}>
            <div style={{ fontSize: 10, color: '#8b95a5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#ffffff' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Campaigns table */}
      <h2 style={{ fontSize: 16, fontWeight: 600, color: '#ffffff', marginBottom: 14 }}>Campaigns</h2>
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 90px 100px 100px 80px 90px 80px',
          gap: 8,
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          fontSize: 10,
          fontWeight: 600,
          color: '#5a6370',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          <div>Campaign</div>
          <div style={{ textAlign: 'right' }}>Status</div>
          <div style={{ textAlign: 'right' }}>Spend</div>
          <div style={{ textAlign: 'right' }}>Impressions</div>
          <div style={{ textAlign: 'right' }}>Clicks</div>
          <div style={{ textAlign: 'right' }}>Conv.</div>
          <div style={{ textAlign: 'right' }}>ROAS</div>
        </div>

        {/* Table rows */}
        {metrics.campaigns.map(campaign => {
          const statusStyle = STATUS_COLORS[campaign.status] || STATUS_COLORS.draft
          return (
            <div
              key={campaign.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 90px 100px 100px 80px 90px 80px',
                gap: 8,
                padding: '14px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                fontSize: 13,
                alignItems: 'center',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
            >
              <div style={{ fontWeight: 500, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {campaign.name}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: statusStyle.bg,
                  color: statusStyle.text,
                  textTransform: 'capitalize',
                }}>
                  {campaign.status}
                </span>
              </div>
              <div style={{ textAlign: 'right', color: '#ffffff' }}>{formatCurrency(campaign.spend)}</div>
              <div style={{ textAlign: 'right', color: '#8b95a5' }}>{formatNumber(campaign.impressions)}</div>
              <div style={{ textAlign: 'right', color: '#8b95a5' }}>{formatNumber(campaign.clicks)}</div>
              <div style={{ textAlign: 'right', color: '#7ed957', fontWeight: 600 }}>{campaign.conversions}</div>
              <div style={{ textAlign: 'right', color: campaign.roas >= 2 ? '#7ed957' : campaign.roas >= 1 ? '#fbbf24' : '#ff6b6b', fontWeight: 600 }}>
                {campaign.roas}x
              </div>
            </div>
          )
        })}
      </div>

      {/* Create landing page CTA */}
      <div style={{
        marginTop: 20,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>Create Ad Landing Page</div>
          <div style={{ fontSize: 12, color: '#8b95a5', marginTop: 2 }}>Build a high-converting funnel linked to your {platform.name} campaigns</div>
        </div>
        <a
          href="/dashboard/funnels"
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            background: '#7ed957',
            color: '#000000',
            fontSize: 13,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Build Funnel
        </a>
      </div>
    </>
  )
}
