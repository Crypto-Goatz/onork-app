'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Link2, LayoutTemplate, PieChart, AlertCircle, Info } from 'lucide-react'

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

interface AdData {
  accounts: AdAccount[]
  // /api/ads attempts to fetch platform reporting from the CRM, but these
  // payloads are not parsed into displayable metrics. We never render them
  // as real numbers — only the connection status below is treated as real.
  googleAds: any
  facebookAds: any
  attribution: any
}

// ── Platform definitions ──────────────────────────────────
const PLATFORMS = [
  { key: 'google',   name: 'Google Ads',   icon: 'G',  iconBg: 'bg-blue-500',    iconText: 'text-white' },
  { key: 'facebook', name: 'Facebook Ads', icon: 'f',  iconBg: 'bg-blue-600',    iconText: 'text-white' },
  { key: 'tiktok',   name: 'TikTok Ads',   icon: 'TT', iconBg: 'bg-cyan-400',    iconText: 'text-black' },
  { key: 'linkedin', name: 'LinkedIn Ads', icon: 'in', iconBg: 'bg-sky-700',     iconText: 'text-white' },
] as const

// Which PLATFORMS key an account maps to, based on its CRM type/platform.
function platformKeyForAccount(acct: AdAccount): string | null {
  const t = (acct.type || acct.platform || '').toLowerCase()
  if (t.includes('google'))                         return 'google'
  if (t.includes('facebook') || t.includes('meta')) return 'facebook'
  if (t.includes('tiktok'))                         return 'tiktok'
  if (t.includes('linkedin'))                       return 'linkedin'
  return null
}

// ── Main Component ────────────────────────────────────────
export default function PaidAdsPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [adData, setAdData] = useState<AdData | null>(null)
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(new Set())

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
        for (const acct of (data.accounts || []) as AdAccount[]) {
          const key = platformKeyForAccount(acct)
          if (key) connected.add(key)
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

  const accounts: AdAccount[] = adData?.accounts || []

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
        <div className="text-center py-16 text-core-text-muted">Loading ad accounts...</div>
      ) : tab === 'overview' ? (
        <OverviewTab accounts={accounts} connectedPlatforms={connectedPlatforms} />
      ) : (
        <PlatformTab
          platform={PLATFORMS.find(p => p.key === tab)!}
          connected={connectedPlatforms.has(tab)}
          accounts={accounts.filter(a => platformKeyForAccount(a) === tab)}
        />
      )}
    </div>
  )
}

// ── Metrics-not-synced notice (honest empty state) ────────
function MetricsNotice({ scope }: { scope: string }) {
  return (
    <div className="bg-white/[0.04] border border-core-border rounded-xl px-5 py-4 mb-7 flex items-start gap-3">
      <Info className="w-4 h-4 text-core-cyan shrink-0 mt-0.5" />
      <div>
        <div className="text-sm font-semibold text-core-text">Performance metrics aren&apos;t synced yet</div>
        <div className="text-xs text-core-text-muted mt-1 leading-[1.5]">
          Spend, impressions, clicks, conversions, and ROAS for {scope} are not available.
          0nCore currently reads your connected ad accounts only — campaign reporting from each
          platform hasn&apos;t been wired through yet. Once it is, real metrics will appear here.
        </div>
      </div>
    </div>
  )
}

// ── Connected accounts list (real data) ───────────────────
function ConnectedAccounts({ accounts }: { accounts: AdAccount[] }) {
  if (!accounts.length) {
    return (
      <div className="bg-white/[0.03] border border-core-border rounded-xl px-6 py-8 text-center">
        <div className="text-sm font-semibold text-core-text mb-1">No ad accounts connected</div>
        <div className="text-xs text-core-text-muted mb-4">
          Link a Google, Facebook, TikTok, or LinkedIn ad account to get started.
        </div>
        <a
          href="/dashboard/social"
          className="inline-block px-5 py-2 rounded-lg bg-core-cyan/20 text-core-cyan text-[13px] font-semibold no-underline hover:bg-core-cyan/30 transition-all duration-150"
        >
          Connect Ad Account
        </a>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
      {accounts.map(acct => {
        const key = platformKeyForAccount(acct)
        const meta = PLATFORMS.find(p => p.key === key)
        return (
          <div
            key={acct.id}
            className="bg-white/[0.03] border border-core-border rounded-xl p-5 flex items-center gap-3"
          >
            <div
              className={`w-9 h-9 rounded-lg ${meta?.iconBg || 'bg-white/10'} flex items-center justify-center text-sm font-extrabold ${meta?.iconText || 'text-white'} shrink-0`}
            >
              {meta?.icon || '?'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-core-text truncate">
                {acct.name || meta?.name || 'Ad account'}
              </div>
              <div className="text-[11px] text-core-green">Connected</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────
function OverviewTab({
  accounts,
  connectedPlatforms,
}: {
  accounts: AdAccount[]
  connectedPlatforms: Set<string>
}) {
  return (
    <>
      {/* Honest empty state for the metrics area */}
      <MetricsNotice scope="all platforms" />

      {/* Connected accounts (real) */}
      <h2 className="text-base font-semibold text-core-text mb-3.5">Connected Ad Accounts</h2>
      <div className="mb-7">
        <ConnectedAccounts accounts={accounts} />
      </div>

      {/* Platform connection status (real) */}
      <h2 className="text-base font-semibold text-core-text mb-3.5">Platforms</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3 mb-7">
        {PLATFORMS.map(p => {
          const connected = connectedPlatforms.has(p.key)
          return (
            <div
              key={p.key}
              className="bg-white/[0.03] border border-core-border rounded-xl p-5 flex items-center gap-2.5"
            >
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
  platform,
  connected,
  accounts,
}: {
  platform: typeof PLATFORMS[number]
  connected: boolean
  accounts: AdAccount[]
}) {
  return (
    <>
      {/* Connection status banner (real) */}
      {!connected ? (
        <div className="bg-white/[0.04] border border-core-border rounded-xl px-5 py-4 mb-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-core-amber shrink-0" />
            <div>
              <div className="text-sm font-semibold text-core-text">{platform.name} not connected</div>
              <div className="text-xs text-core-text-muted mt-0.5">
                Connect your account to start tracking campaigns
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
      ) : (
        <div className="mb-5">
          <ConnectedAccounts accounts={accounts} />
        </div>
      )}

      {/* Honest empty state for the metrics area */}
      <MetricsNotice scope={platform.name} />

      {/* Create landing page CTA */}
      <div className="mt-2 bg-white/[0.03] border border-core-border rounded-xl px-6 py-5 flex items-center justify-between flex-wrap gap-3">
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
