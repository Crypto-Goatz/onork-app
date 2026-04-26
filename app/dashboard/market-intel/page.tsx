'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Briefcase,
  Compass,
  Filter,
  Flame,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Waves,
} from 'lucide-react'

interface Skill {
  id: string
  skill: string
  category: string | null
  avg_budget: number | null
  avg_sold: number | null
  listings_30d: number
  listings_7d: number
  growth_pct: number
  prev_30d: number
  competition: 'Low' | 'Medium' | 'High' | 'Very High'
  saturation_score: number
  top_buyer_location: string | null
  top_seller_location: string | null
  trend: 'hot' | 'up' | 'flat' | 'down'
  platforms: string[] | null
  updated_at: string
}

interface Snapshot {
  snapshot_date: string
  total_listings: number
  total_skills: number
  hot_skills: string[]
  rising_skills: string[]
  declining_skills: string[]
  top_opportunities: Array<{
    skill: string
    category: string | null
    avg_budget: number | null
    saturation: number
    growth_pct: number
    listings_30d: number
  }> | null
  ai_summary: string
  created_at: string
}

type SortKey =
  | 'skill'
  | 'category'
  | 'avg_budget'
  | 'listings_30d'
  | 'listings_7d'
  | 'growth_pct'
  | 'saturation_score'

const TREND_META: Record<Skill['trend'], { label: string; cls: string; Icon: typeof Flame }> = {
  hot: { label: 'Hot', cls: 'text-core-red bg-core-red/10', Icon: Flame },
  up: { label: 'Rising', cls: 'text-core-green bg-core-green/10', Icon: TrendingUp },
  flat: { label: 'Flat', cls: 'text-core-text-muted bg-core-border/40', Icon: Activity },
  down: { label: 'Cooling', cls: 'text-core-text-muted bg-core-border/40', Icon: TrendingDown },
}

const COMP_META: Record<Skill['competition'], string> = {
  Low: 'text-core-green bg-core-green/10',
  Medium: 'text-core-cyan bg-core-cyan/10',
  High: 'text-amber-400 bg-amber-400/10',
  'Very High': 'text-core-red bg-core-red/10',
}

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

function StatCard({
  label,
  value,
  sub,
  Icon,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  Icon: typeof Activity
  accent?: 'green' | 'red' | 'cyan' | 'amber'
}) {
  const accentCls =
    accent === 'green'
      ? 'text-core-green'
      : accent === 'red'
        ? 'text-core-red'
        : accent === 'cyan'
          ? 'text-core-cyan'
          : accent === 'amber'
            ? 'text-amber-400'
            : 'text-core-text'
  return (
    <div className="px-[18px] py-4 rounded-xl bg-core-card border border-core-border">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[11px] text-core-text-muted font-semibold uppercase tracking-[0.06em]">
          {label}
        </div>
        <Icon className={`w-4 h-4 ${accentCls}`} />
      </div>
      <div className={`text-2xl font-extrabold tracking-tight ${accentCls}`}>{value}</div>
      {sub && <div className="text-[11px] text-core-text-muted mt-0.5">{sub}</div>}
    </div>
  )
}

function SortHeader({
  label,
  k,
  sortKey,
  sortDir,
  onClick,
  align = 'left',
}: {
  label: string
  k: SortKey
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onClick: (k: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = sortKey === k
  return (
    <th
      className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-core-text-muted cursor-pointer select-none hover:text-core-text ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
      onClick={() => onClick(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active &&
          (sortDir === 'asc' ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          ))}
      </span>
    </th>
  )
}

export default function MarketIntelPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [trend, setTrend] = useState('')
  const [competition, setCompetition] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('listings_30d')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const load = async () => {
    setRefreshing(true)
    setError('')
    try {
      const [sRes, snapRes] = await Promise.all([
        fetch('/api/market-intel/skills?limit=500'),
        fetch('/api/market-intel/snapshot'),
      ])
      const sJson = await sRes.json()
      const snapJson = await snapRes.json()
      if (sRes.ok) setSkills(sJson.skills || [])
      else setError(sJson.error || 'Failed to load skills')
      if (snapRes.ok) setSnapshot(snapJson.snapshot || null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const s of skills) if (s.category) set.add(s.category)
    return Array.from(set).sort()
  }, [skills])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let rows = skills.filter((s) => {
      if (q && !s.skill.toLowerCase().includes(q) && !(s.category || '').toLowerCase().includes(q))
        return false
      if (category && s.category !== category) return false
      if (trend && s.trend !== trend) return false
      if (competition && s.competition !== competition) return false
      return true
    })
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey] as number | string | null
      const bv = b[sortKey] as number | string | null
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number')
        return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
    return rows
  }, [skills, search, category, trend, competition, sortKey, sortDir])

  const stats = useMemo(() => {
    const totalListings = skills.reduce((acc, s) => acc + (s.listings_30d || 0), 0)
    const hotCount = skills.filter((s) => s.trend === 'hot').length
    const blueOcean = skills.filter(
      (s) => s.saturation_score < 40 && (s.avg_budget || 0) > 0,
    ).length
    return {
      totalListings,
      totalSkills: skills.length,
      hotCount,
      blueOcean,
    }
  }, [skills])

  const onSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(k)
      setSortDir(k === 'skill' || k === 'category' ? 'asc' : 'desc')
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-core-green" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-core-text flex items-center gap-2">
            <Compass className="w-6 h-6 text-core-green" />
            0n Market Intel
          </h1>
          <p className="text-sm text-core-text-muted mt-1 max-w-2xl">
            Live freelance market intelligence — listings collected from Upwork, Reddit, Hacker
            News and GitHub, aggregated into per-skill demand, growth and saturation signals.
          </p>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-core-card border border-core-border text-sm text-core-text hover:border-core-green/60 disabled:opacity-50"
        >
          {refreshing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-core-red/10 border border-core-red/40 text-sm text-core-red">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Listings (30d)"
          value={stats.totalListings.toLocaleString()}
          Icon={Briefcase}
          sub="across all platforms"
        />
        <StatCard
          label="Skills tracked"
          value={stats.totalSkills.toLocaleString()}
          Icon={Sparkles}
          accent="cyan"
        />
        <StatCard
          label="Hot skills"
          value={stats.hotCount.toLocaleString()}
          Icon={Flame}
          accent="red"
          sub="growth ≥ 50%"
        />
        <StatCard
          label="Blue ocean"
          value={stats.blueOcean.toLocaleString()}
          Icon={Waves}
          accent="green"
          sub="low saturation, paid"
        />
      </div>

      {snapshot && (
        <div className="rounded-xl bg-core-card border border-core-border overflow-hidden">
          <div className="px-5 py-4 border-b border-core-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-core-green" />
              <span className="text-sm font-semibold text-core-text">
                Weekly AI brief
              </span>
              <span className="text-xs text-core-text-muted">
                {snapshot.snapshot_date}
              </span>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-core-text whitespace-pre-wrap leading-relaxed">
              {snapshot.ai_summary}
            </p>
            <div className="grid md:grid-cols-3 gap-3 pt-2">
              <div>
                <div className="text-[11px] uppercase tracking-[0.06em] text-core-text-muted mb-1.5 font-semibold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-core-red" /> Hot
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {snapshot.hot_skills?.slice(0, 8).map((s) => (
                    <span
                      key={s}
                      className="px-2 py-1 rounded-md bg-core-red/10 text-core-red text-xs font-medium"
                    >
                      {s}
                    </span>
                  ))}
                  {!snapshot.hot_skills?.length && (
                    <span className="text-xs text-core-text-muted">none yet</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.06em] text-core-text-muted mb-1.5 font-semibold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-core-green" /> Rising
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {snapshot.rising_skills?.slice(0, 8).map((s) => (
                    <span
                      key={s}
                      className="px-2 py-1 rounded-md bg-core-green/10 text-core-green text-xs font-medium"
                    >
                      {s}
                    </span>
                  ))}
                  {!snapshot.rising_skills?.length && (
                    <span className="text-xs text-core-text-muted">none yet</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.06em] text-core-text-muted mb-1.5 font-semibold flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Cooling
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {snapshot.declining_skills?.slice(0, 8).map((s) => (
                    <span
                      key={s}
                      className="px-2 py-1 rounded-md bg-core-border/60 text-core-text-muted text-xs font-medium"
                    >
                      {s}
                    </span>
                  ))}
                  {!snapshot.declining_skills?.length && (
                    <span className="text-xs text-core-text-muted">none yet</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-core-card border border-core-border overflow-hidden">
        <div className="px-4 py-3 border-b border-core-border flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-core-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search skill or category…"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-core-bg border border-core-border text-sm text-core-text placeholder:text-core-text-muted focus:outline-none focus:border-core-green/60"
            />
          </div>
          <Filter className="w-4 h-4 text-core-text-muted ml-1" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 rounded-lg bg-core-bg border border-core-border text-sm text-core-text focus:outline-none focus:border-core-green/60"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={trend}
            onChange={(e) => setTrend(e.target.value)}
            className="px-3 py-2 rounded-lg bg-core-bg border border-core-border text-sm text-core-text focus:outline-none focus:border-core-green/60"
          >
            <option value="">Any trend</option>
            <option value="hot">Hot</option>
            <option value="up">Rising</option>
            <option value="flat">Flat</option>
            <option value="down">Cooling</option>
          </select>
          <select
            value={competition}
            onChange={(e) => setCompetition(e.target.value)}
            className="px-3 py-2 rounded-lg bg-core-bg border border-core-border text-sm text-core-text focus:outline-none focus:border-core-green/60"
          >
            <option value="">Any competition</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Very High">Very High</option>
          </select>
          <span className="text-xs text-core-text-muted ml-auto">
            {filtered.length} of {skills.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-core-bg/40 border-b border-core-border">
              <tr>
                <SortHeader label="Skill" k="skill" sortKey={sortKey} sortDir={sortDir} onClick={onSort} />
                <SortHeader
                  label="Category"
                  k="category"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onClick={onSort}
                />
                <SortHeader
                  label="Avg budget"
                  k="avg_budget"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onClick={onSort}
                  align="right"
                />
                <SortHeader
                  label="30d"
                  k="listings_30d"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onClick={onSort}
                  align="right"
                />
                <SortHeader
                  label="7d"
                  k="listings_7d"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onClick={onSort}
                  align="right"
                />
                <SortHeader
                  label="Growth"
                  k="growth_pct"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onClick={onSort}
                  align="right"
                />
                <SortHeader
                  label="Saturation"
                  k="saturation_score"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onClick={onSort}
                  align="right"
                />
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-core-text-muted text-left">
                  Competition
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-core-text-muted text-left">
                  Trend
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-core-text-muted text-left">
                  Top buyer
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-core-text-muted text-sm">
                    No data yet. Run the collector cron to populate.
                  </td>
                </tr>
              )}
              {filtered.map((s) => {
                const tm = TREND_META[s.trend] || TREND_META.flat
                const TrendIcon = tm.Icon
                const growthPositive = s.growth_pct >= 0
                return (
                  <tr key={s.id} className="border-b border-core-border/60 hover:bg-core-bg/40">
                    <td className="px-3 py-2.5 text-core-text font-medium">{s.skill}</td>
                    <td className="px-3 py-2.5 text-core-text-muted">{s.category || '—'}</td>
                    <td className="px-3 py-2.5 text-right text-core-text font-semibold">
                      {formatCurrency(s.avg_budget)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-core-text">{s.listings_30d}</td>
                    <td className="px-3 py-2.5 text-right text-core-text">{s.listings_7d}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          growthPositive ? 'text-core-green' : 'text-core-red'
                        }`}
                      >
                        {growthPositive ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )}
                        {s.growth_pct}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-core-border/60 overflow-hidden">
                          <div
                            className={`h-full ${
                              s.saturation_score < 30
                                ? 'bg-core-green'
                                : s.saturation_score < 60
                                  ? 'bg-core-cyan'
                                  : s.saturation_score < 85
                                    ? 'bg-amber-400'
                                    : 'bg-core-red'
                            }`}
                            style={{ width: `${s.saturation_score}%` }}
                          />
                        </div>
                        <span className="text-core-text-muted text-xs w-8 text-right">
                          {s.saturation_score}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-medium ${COMP_META[s.competition] || 'text-core-text-muted bg-core-border/40'}`}
                      >
                        {s.competition}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${tm.cls}`}
                      >
                        <TrendIcon className="w-3 h-3" />
                        {tm.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-core-text-muted text-xs">
                      {s.top_buyer_location || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
