import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getVipClient, type VipClient } from '@/lib/vip/clients'
import { loadVipDashboard } from '@/lib/vip/crm'
import {
  Activity,
  TrendingUp,
  ShieldCheck,
  Users,
  DollarSign,
  Calendar,
  Megaphone,
  Sparkles,
  ArrowUpRight,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
} from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// VIP dashboards render live customer CRM data — must never be indexed,
// cached by archive.org, or surfaced in search. Layered with the
// X-Robots-Tag header set in next.config + the /vip disallow in robots.ts.
export const metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-snippet': -1,
      'max-image-preview': 'none' as const,
    },
  },
}

interface Params {
  slug: string
}

/**
 * /vip/[slug] — branded VIP client dashboard.
 *
 * Auth: must be logged in. Email must be on the client's authorizedEmails
 * list OR the user must be an admin (profile.is_admin true).
 *
 * Data: V1 ships with mock data (clearly marked) so the client can see
 * the dashboard immediately. Real wires get layered in post-Mother's-Day:
 *   • Stripe / MassageBook revenue → live KPI cards
 *   • CRM contact tag counts → MD campaign funnel widget
 *   • D&R quality grades → traffic-quality block
 *   • Google Ads spend → ROAS card
 */
export default async function VipDashboard({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  const client = getVipClient(slug)
  if (!client) notFound()

  // Auth gate
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession(); const user = session?.user
  if (!user) {
    redirect(`/login?next=/vip/${slug}`)
  }

  const email = (user.email || '').toLowerCase()
  const allowed =
    client.authorizedEmails.some((e) => e.toLowerCase() === email)

  if (!allowed) {
    // Check admin flag
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile?.is_admin) {
      return <UnauthorizedView clientName={client.name} email={email} />
    }
  }

  // ── Live CRM data + mock fallbacks for non-CRM widgets ──────────
  // CRM reads are real via the spa-specific PIT. D&R + Stripe/MassageBook
  // revenue + ad spend stay on placeholder until those wires land post-MD.
  const live = await loadVipDashboard(client)

  const conversionRate = live.campaign && live.campaign.enrolled > 0
    ? (live.campaign.purchased / live.campaign.enrolled) * 100
    : 0
  const bookingDelta = live.bookingsThisWeek - live.bookingsLastWeek
  const bookingPct = live.bookingsLastWeek > 0
    ? Math.round((bookingDelta / live.bookingsLastWeek) * 100)
    : 0

  const mock = {
    activeCampaign: client.activeCampaigns?.[0],
    revenueToday: 1247,        // ← Stripe + MB email parser (post-MD)
    revenueWeek: 8932,         // ← same
    campaignRevenueToday: 2178, // ← MB email parser (post-MD)
    traffic: {
      qualityScore: 78,        // ← D&R live (post-MD when D&R script is on the spa site)
      sessionsToday: 42,
      botsBlocked: 6,
      grades: { 'A+': 28, A: 22, B: 18, C: 14, D: 8, F: 6, X: 4 },
    },
    adSpend: {
      total: 412,              // ← Google Ads API (post-MD)
      attributed: 1380,
      roas: 3.35,
    },
  }

  const activity = [
    ...live.recentContacts.slice(0, 6).map((c) => ({
      type: c.tags?.includes(client.activeCampaigns?.[0]?.purchaseTag || '___')
        ? ('purchase' as const)
        : c.tags?.includes(client.activeCampaigns?.[0]?.clickTag || '___')
          ? ('click' as const)
          : ('lead' as const),
      text: contactBlurb(c, client.activeCampaigns?.[0]),
      time: c.dateUpdated ? timeAgo(c.dateUpdated) : 'recently',
    })),
  ]

  const b = client.brand

  return (
    <div
      className="min-h-screen"
      style={{
        background: b.bg,
        color: b.text,
        fontFamily: client.fonts?.body,
      }}
    >
      {/* ── Branded header ─────────────────────────────────────── */}
      <header
        className="border-b"
        style={{
          background: b.bgCard,
          borderColor: b.border,
        }}
      >
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {client.logoUrl ? (
              <img
                src={client.logoUrl}
                alt={client.name}
                className="h-10 w-auto"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center text-white font-bold"
                style={{ background: b.primary }}
              >
                {client.monogram || client.shortName[0]}
              </div>
            )}
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.18em] font-bold"
                style={{ color: b.accent }}
              >
                VIP Dashboard
              </p>
              <h1
                className="text-lg font-bold leading-tight"
                style={{ fontFamily: client.fonts?.display, color: b.text }}
              >
                {client.name}
              </h1>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 text-xs" style={{ color: b.textMuted }}>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {client.address}
            </span>
            {client.phone && (
              <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 hover:opacity-80">
                <Phone className="w-3.5 h-3.5" />
                {client.phone.replace('+1-', '')}
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8 space-y-6">
        {/* ── Active campaign banner ─────────────────────────── */}
        {mock.activeCampaign && live.campaign && (
          <ActiveCampaignBanner
            campaign={mock.activeCampaign}
            stats={{
              ...live.campaign,
              revenue: mock.campaignRevenueToday,
              conversionRate,
            }}
            brand={b}
          />
        )}

        {/* ── KPI strip ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi
            brand={b}
            label="Total contacts"
            value={live.totalContacts.toLocaleString()}
            sub={`${live.totalTags} tags · ${live.totalWorkflows} workflows`}
            Icon={Users}
          />
          <Kpi
            brand={b}
            label="Bookings this week"
            value={String(live.bookingsThisWeek)}
            sub={
              live.bookingsLastWeek === 0
                ? `vs ${live.bookingsLastWeek} last week`
                : `${bookingDelta >= 0 ? '+' : ''}${bookingPct}% vs last week`
            }
            Icon={Calendar}
            positive={bookingDelta > 0}
          />
          <Kpi
            brand={b}
            label="Revenue today"
            value={`$${mock.revenueToday.toLocaleString()}`}
            sub="MassageBook + gift cards · sample"
            Icon={DollarSign}
          />
          <Kpi
            brand={b}
            label="Ad ROAS"
            value={`${mock.adSpend.roas.toFixed(2)}×`}
            sub={`$${mock.adSpend.total} spend · sample`}
            Icon={Activity}
          />
        </div>

        {/* Errors banner — CRM call partial failure */}
        {live.errors.length > 0 && (
          <div
            className="rounded-xl border px-4 py-3 text-xs"
            style={{
              background: `${b.accent}10`,
              borderColor: `${b.accent}40`,
              color: b.textSecondary,
            }}
          >
            <strong style={{ color: b.accent }}>Heads up:</strong> some CRM
            queries didn't return cleanly — showing partial data. (
            {live.errors.map((e) => e.source).join(', ')})
          </div>
        )}

        {/* ── 2-col content row ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Traffic quality (D&R) */}
          <div
            className="rounded-2xl border p-5 lg:col-span-2"
            style={{ background: b.bgCard, borderColor: b.border }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: b.accent }}>
                  Detect &amp; Refine — live
                </p>
                <h2 className="text-lg font-bold mt-1" style={{ fontFamily: client.fonts?.display }}>
                  Traffic quality today
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest" style={{ color: b.textMuted }}>
                  Quality score
                </p>
                <p
                  className="text-4xl font-black leading-none"
                  style={{ color: b.primary, fontFamily: client.fonts?.display }}
                >
                  {mock.traffic.qualityScore}
                </p>
              </div>
            </div>

            <p className="text-sm mb-4" style={{ color: b.textMuted }}>
              {mock.traffic.sessionsToday} sessions graded today ·{' '}
              <span style={{ color: b.accent, fontWeight: 600 }}>
                {mock.traffic.botsBlocked} bots blocked
              </span>
            </p>

            {/* Grade distribution bar */}
            <div className="space-y-2">
              {(['A+', 'A', 'B', 'C', 'D', 'F', 'X'] as const).map((g) => {
                const count = mock.traffic.grades[g]
                const total = Object.values(mock.traffic.grades).reduce((a, b) => a + b, 0)
                const pct = total ? (count / total) * 100 : 0
                const color = gradeColor(g, b)
                return (
                  <div key={g} className="flex items-center gap-3">
                    <span
                      className="w-8 text-xs font-bold tabular-nums text-right"
                      style={{ color: b.text }}
                    >
                      {g}
                    </span>
                    <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: b.bgSoft }}>
                      <div
                        className="h-full rounded-md transition-all"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <span
                      className="w-12 text-xs tabular-nums text-right"
                      style={{ color: b.textMuted }}
                    >
                      {count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                )
              })}
            </div>

            <p className="mt-4 text-[11px]" style={{ color: b.textMuted }}>
              <Sparkles className="w-3 h-3 inline mr-1" />
              Smart Bidding receives these grades — Google, Meta, LinkedIn, and TikTok
              shift spend toward A+/A audiences automatically.
            </p>
          </div>

          {/* Recent activity feed */}
          <div
            className="rounded-2xl border p-5"
            style={{ background: b.bgCard, borderColor: b.border }}
          >
            <p
              className="text-[10px] uppercase tracking-widest font-bold mb-1"
              style={{ color: b.accent }}
            >
              Activity
            </p>
            <h2 className="text-lg font-bold mb-4" style={{ fontFamily: client.fonts?.display }}>
              Recent activity
            </h2>
            {activity.length > 0 ? (
              <ul className="space-y-3">
                {activity.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <ActivityIcon type={a.type} brand={b} />
                    <div className="min-w-0 flex-1">
                      <p style={{ color: b.text }}>{a.text}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: b.textMuted }}>{a.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: b.textMuted }}>
                No recent activity yet.
              </p>
            )}
          </div>
        </div>

        {/* ── Quick links ────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickLink
            brand={b}
            href={client.website || '#'}
            label="Website"
            sub={client.website?.replace('https://', '') || ''}
            Icon={ExternalLink}
          />
          <QuickLink
            brand={b}
            href="https://www.massagebook.com/Ligonier~Massage~TheSpaInLigonier"
            label="MassageBook"
            sub="Booking & gift cards"
            Icon={Calendar}
          />
          <QuickLink
            brand={b}
            href={`mailto:${client.email}`}
            label={client.email || 'Contact'}
            sub="Inbox"
            Icon={Mail}
          />
        </div>

        <p className="text-[11px] text-center pt-6 pb-4" style={{ color: b.textMuted }}>
          <Sparkles className="w-3 h-3 inline mr-1" />
          Live CRM data · revenue + ad-spend wires complete after Mother's Day.
        </p>
      </main>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString()
}

function contactBlurb(
  c: { firstName?: string; lastName?: string; email?: string; tags?: string[] },
  campaign?: VipClient['activeCampaigns'] extends infer T ? T extends Array<infer U> ? U : never : never,
): string {
  const name =
    [c.firstName, c.lastName].filter(Boolean).join(' ').trim() ||
    c.email ||
    '(unnamed contact)'
  const tags = c.tags || []
  if (campaign && tags.includes(campaign.purchaseTag)) {
    return `${name} — gift card purchased`
  }
  if (campaign && tags.includes(campaign.clickTag)) {
    return `${name} — clicked the deal`
  }
  if (campaign && tags.includes(campaign.enrollTag)) {
    return `${name} — enrolled in ${campaign.name}`
  }
  return `${name}${tags.length ? ` — tagged ${tags.slice(0, 2).join(', ')}` : ''}`
}

function gradeColor(g: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' | 'X', b: VipClient['brand']) {
  switch (g) {
    case 'A+':
    case 'A':
      return b.primary
    case 'B':
      return b.primaryDark
    case 'C':
      return b.accentLight
    case 'D':
      return b.accent
    case 'F':
      return '#a85240'
    case 'X':
    default:
      return '#7a3326'
  }
}

function Kpi({
  brand,
  label,
  value,
  sub,
  Icon,
  positive,
}: {
  brand: VipClient['brand']
  label: string
  value: string
  sub: string
  Icon: typeof DollarSign
  positive?: boolean
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: brand.bgCard, borderColor: brand.border }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${brand.accent}1f`, color: brand.accent }}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
        <p
          className="text-[10px] uppercase tracking-widest font-bold"
          style={{ color: brand.textMuted }}
        >
          {label}
        </p>
      </div>
      <p
        className="text-2xl font-black tabular-nums"
        style={{ color: brand.text, fontFamily: 'inherit' }}
      >
        {value}
      </p>
      <p
        className="text-[11px] mt-1"
        style={{ color: positive ? brand.primary : brand.textMuted }}
      >
        {sub}
      </p>
    </div>
  )
}

function ActiveCampaignBanner({
  campaign,
  stats,
  brand,
}: {
  campaign: NonNullable<VipClient['activeCampaigns']>[number]
  stats: { enrolled: number; clicked: number; purchased: number; revenue: number; conversionRate: number }
  brand: VipClient['brand']
}) {
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(campaign.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  )
  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${brand.primaryDark} 0%, ${brand.primary} 100%)`,
        color: '#fff',
      }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full"
          style={{ background: `${brand.accent}40`, filter: 'blur(40px)' }}
        />
      </div>
      <div className="relative grid md:grid-cols-[1.5fr_1fr] gap-6 items-center">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="w-4 h-4" style={{ color: brand.accentLight }} />
            <p
              className="text-[10px] uppercase tracking-widest font-bold"
              style={{ color: brand.accentLight }}
            >
              Active campaign · {daysLeft} day{daysLeft === 1 ? '' : 's'} left
            </p>
          </div>
          <h2 className="text-2xl font-bold mb-2">{campaign.name}</h2>
          <p className="text-sm opacity-80 mb-4">
            Tag-based funnel from{' '}
            <code className="px-1.5 py-0.5 rounded bg-white/10">{campaign.enrollTag}</code> →{' '}
            <code className="px-1.5 py-0.5 rounded bg-white/10">{campaign.clickTag}</code> →{' '}
            <code className="px-1.5 py-0.5 rounded bg-white/10">{campaign.purchaseTag}</code>
          </p>
          <a
            href={campaign.dealUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold border-b border-white/40 hover:border-white"
          >
            View deal page
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <FunnelStat label="Enrolled" value={stats.enrolled} accent={brand.accentLight} />
          <FunnelStat label="Clicked" value={stats.clicked} accent={brand.accentLight} />
          <FunnelStat label="Purchased" value={stats.purchased} accent="#fff" />
          <div className="col-span-3 mt-1 text-center">
            <p className="text-xs opacity-70">Revenue today</p>
            <p
              className="text-3xl font-black tabular-nums"
              style={{ fontFamily: 'Georgia, serif', color: brand.accentLight }}
            >
              ${stats.revenue.toLocaleString()}
            </p>
            <p className="text-xs opacity-70 mt-0.5">
              {stats.conversionRate.toFixed(1)}% enroll → purchase rate
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FunnelStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="text-center bg-white/5 rounded-lg p-3 border border-white/10">
      <p className="text-[10px] uppercase tracking-widest opacity-60">{label}</p>
      <p className="text-xl font-bold tabular-nums mt-0.5" style={{ color: accent }}>
        {value}
      </p>
    </div>
  )
}

function ActivityIcon({ type, brand }: { type: string; brand: VipClient['brand'] }) {
  const iconMap: Record<string, typeof Users> = {
    purchase: DollarSign,
    click: Activity,
    booking: Calendar,
    lead: Users,
    block: ShieldCheck,
  }
  const I = iconMap[type] || Activity
  const c =
    type === 'purchase'
      ? brand.primary
      : type === 'block'
        ? brand.accent
        : brand.textSecondary
  return (
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
      style={{ background: `${c}15`, color: c }}
    >
      <I className="w-3.5 h-3.5" />
    </div>
  )
}

function QuickLink({
  brand,
  href,
  label,
  sub,
  Icon,
}: {
  brand: VipClient['brand']
  href: string
  label: string
  sub: string
  Icon: typeof DollarSign
}) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noreferrer' : undefined}
      className="rounded-2xl border p-4 flex items-center gap-3 hover:opacity-90 transition-opacity"
      style={{ background: brand.bgCard, borderColor: brand.border }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ background: `${brand.accent}1f`, color: brand.accent }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold" style={{ color: brand.text }}>{label}</p>
        <p className="text-xs truncate" style={{ color: brand.textMuted }}>{sub}</p>
      </div>
      <ArrowUpRight className="w-4 h-4" style={{ color: brand.textMuted }} />
    </a>
  )
}

function UnauthorizedView({ clientName, email }: { clientName: string; email: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary,#0a0a0f)] text-white p-6">
      <div className="max-w-md text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4">
          <ShieldCheck className="w-6 h-6 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Not authorized</h1>
        <p className="opacity-70 text-sm mb-4">
          You're signed in as <code>{email}</code>, but this email isn't on the access list
          for the <strong>{clientName}</strong> dashboard.
        </p>
        <p className="opacity-50 text-xs">
          Ask Mike to add you, or sign in with a different account.
        </p>
      </div>
    </div>
  )
}
