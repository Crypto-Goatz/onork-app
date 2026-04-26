'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, Activity, BarChart3, Flame, RefreshCw,
  Search, ArrowUpDown, DollarSign, Briefcase,
} from 'lucide-react'

interface Skill {
  skill: string
  category: string | null
  avg_budget: number | null
  median_budget: number | null
  budget_min: number | null
  budget_max: number | null
  listing_count_7d: number
  listing_count_30d: number
  listing_count_90d: number
  growth_pct: number | null
  competition_level: string | null
  saturation_score: number | null
  trend: string | null
  top_locations: Array<{ name: string; count: number }>
  top_platforms: Array<{ name: string; count: number }>
  related_skills: Array<{ name: string; count: number }>
  last_listing_at: string | null
}

type SortKey = 'listing_count_7d' | 'avg_budget' | 'growth_pct' | 'saturation_score' | 'skill'

const TREND_STYLE: Record<string, { color: string; label: string; icon: typeof Flame }> = {
  hot:  { color: 'text-[#FF6B35]', label: 'Hot',  icon: Flame },
  up:   { color: 'text-emerald-400', label: 'Up', icon: TrendingUp },
  flat: { color: 'text-white/40', label: 'Flat', icon: Activity },
  down: { color: 'text-red-400', label: 'Down', icon: TrendingDown },
}

const COMPETITION_STYLE: Record<string, string> = {
  low: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  high: 'text-red-400 bg-red-400/10 border-red-400/20',
}

const CATEGORIES = ['all', 'ai', 'development', 'design', 'writing', 'marketing', 'video', 'data', 'web3']
const TRENDS: Array<'all' | 'hot' | 'up' | 'flat' | 'down'> = ['all', 'hot', 'up', 'flat', 'down']

function formatBudget(n: number | null): string {
  if (n == null) return '—'
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

function formatGrowth(n: number | null): string {
  if (n == null) return '—'
  return `${n > 0 ? '+' : ''}${Math.round(n)}%`
}

export default function MarketIntelPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [trendFilter, setTrendFilter] = useState<typeof TRENDS[number]>('all')
  const [sortBy, setSortBy] = useState<SortKey>('listing_count_7d')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sort: sortBy, dir: sortDir, limit: '300' })
      if (category !== 'all') params.set('category', category)
      if (trendFilter !== 'all') params.set('trend', trendFilter)
      const res = await fetch(`/api/market-intel/skills?${params.toString()}`)
      const data = await res.json()
      if (data.skills) setSkills(data.skills)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [sortBy, sortDir, category, trendFilter])  // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!search) return skills
    const q = search.toLowerCase()
    return skills.filter(s => s.skill.toLowerCase().includes(q) || (s.category && s.category.toLowerCase().includes(q)))
  }, [skills, search])

  const stats = useMemo(() => {
    const totalListings = skills.reduce((s, x) => s + x.listing_count_7d, 0)
    const hot = skills.filter(s => s.trend === 'hot').length
    const rising = skills.filter(s => s.trend === 'up' || s.trend === 'hot').length
    const declining = skills.filter(s => s.trend === 'down').length
    const budgets = skills.map(s => s.avg_budget).filter((b): b is number => b != null && b > 0)
    const avgBudget = budgets.length ? budgets.reduce((a, b) => a + b, 0) / budgets.length : 0
    return { totalListings, hot, rising, declining, avgBudget, total: skills.length }
  }, [skills])

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(key)
      setSortDir('desc')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-[#FF6B35]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Market Intel</h1>
            <p className="text-xs text-white/40">Real-time freelance demand & pricing across Upwork, Reddit, HN</p>
          </div>
        </div>
        <button onClick={load}
          className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/60 hover:text-white hover:border-white/[0.12] transition-all flex items-center gap-1.5 cursor-pointer">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Skills Tracked',  value: stats.total,         icon: Briefcase, color: 'text-white' },
          { label: 'Listings (7d)',   value: stats.totalListings, icon: Activity,  color: 'text-[#00d4ff]' },
          { label: 'Hot Skills',      value: stats.hot,           icon: Flame,     color: 'text-[#FF6B35]' },
          { label: 'Rising',          value: stats.rising,        icon: TrendingUp,color: 'text-emerald-400' },
          { label: 'Avg Budget',      value: formatBudget(stats.avgBudget), icon: DollarSign, color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</span>
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search skills..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-white/20 outline-none focus:border-[#FF6B35]/30" />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mr-1">Category</span>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-2.5 py-1 rounded-md text-[11px] capitalize cursor-pointer transition-colors border ${
                category === c
                  ? 'bg-[#FF6B35]/15 text-[#FF6B35] border-[#FF6B35]/30'
                  : 'bg-white/[0.02] text-white/50 border-white/[0.06] hover:text-white/80'
              }`}>
              {c}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mr-1">Trend</span>
          {TRENDS.map(t => (
            <button key={t} onClick={() => setTrendFilter(t)}
              className={`px-2.5 py-1 rounded-md text-[11px] capitalize cursor-pointer transition-colors border ${
                trendFilter === t
                  ? 'bg-[#FF6B35]/15 text-[#FF6B35] border-[#FF6B35]/30'
                  : 'bg-white/[0.02] text-white/50 border-white/[0.06] hover:text-white/80'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading && skills.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
          <RefreshCw className="w-6 h-6 text-white/20 animate-spin mx-auto mb-2" />
          <p className="text-sm text-white/30">Loading market data...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
          <BarChart3 className="w-8 h-8 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/40 mb-2">No skills found</p>
          <p className="text-xs text-white/20">Run /api/cron/market-collect to start collecting data</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          <div className="grid grid-cols-[1.4fr_0.8fr_100px_120px_120px_110px_140px] gap-3 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.04] text-[10px] text-white/25 uppercase tracking-wider font-semibold">
            <SortHeader label="Skill"        active={sortBy === 'skill'}            dir={sortDir} onClick={() => toggleSort('skill')} />
            <div>Category</div>
            <SortHeader label="Trend"        active={false}                          dir={sortDir} onClick={() => {}} disableSort />
            <SortHeader label="Listings 7d"  active={sortBy === 'listing_count_7d'}  dir={sortDir} onClick={() => toggleSort('listing_count_7d')} />
            <SortHeader label="Growth"       active={sortBy === 'growth_pct'}        dir={sortDir} onClick={() => toggleSort('growth_pct')} />
            <SortHeader label="Avg Budget"   active={sortBy === 'avg_budget'}        dir={sortDir} onClick={() => toggleSort('avg_budget')} />
            <SortHeader label="Saturation"   active={sortBy === 'saturation_score'}  dir={sortDir} onClick={() => toggleSort('saturation_score')} />
          </div>

          {filtered.map(s => {
            const trendStyle = s.trend ? TREND_STYLE[s.trend] : null
            const TrendIcon = trendStyle?.icon
            const compStyle = s.competition_level ? COMPETITION_STYLE[s.competition_level] : ''
            return (
              <div key={s.skill}
                className="grid grid-cols-[1.4fr_0.8fr_100px_120px_120px_110px_140px] gap-3 px-4 py-3 border-b border-white/[0.04] last:border-none hover:bg-white/[0.02] transition-colors items-center">
                <div>
                  <div className="text-sm font-semibold text-white">{s.skill}</div>
                  {s.related_skills && s.related_skills.length > 0 && (
                    <div className="text-[10px] text-white/25 mt-0.5">
                      {s.related_skills.slice(0, 3).map(r => r.name).join(' · ')}
                    </div>
                  )}
                </div>

                <div className="text-xs text-white/50 capitalize">{s.category || '—'}</div>

                <div>
                  {trendStyle && TrendIcon ? (
                    <span className={`flex items-center gap-1 text-xs font-mono uppercase ${trendStyle.color}`}>
                      <TrendIcon className="w-3 h-3" />
                      {trendStyle.label}
                    </span>
                  ) : <span className="text-white/20">—</span>}
                </div>

                <div>
                  <div className="text-sm font-mono text-white">{s.listing_count_7d}</div>
                  <div className="text-[10px] text-white/25">{s.listing_count_30d} / 30d</div>
                </div>

                <div className={`text-sm font-mono ${(s.growth_pct ?? 0) > 0 ? 'text-emerald-400' : (s.growth_pct ?? 0) < 0 ? 'text-red-400' : 'text-white/40'}`}>
                  {formatGrowth(s.growth_pct)}
                </div>

                <div>
                  <div className="text-sm font-mono text-white">{formatBudget(s.avg_budget)}</div>
                  {s.median_budget != null && (
                    <div className="text-[10px] text-white/25">med {formatBudget(s.median_budget)}</div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full bg-[#FF6B35]"
                      style={{ width: `${Math.min(100, s.saturation_score ?? 0)}%` }}
                    />
                  </div>
                  {s.competition_level && (
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${compStyle}`}>
                      {s.competition_level}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SortHeader({
  label, active, dir, onClick, disableSort = false,
}: {
  label: string
  active: boolean
  dir: 'asc' | 'desc'
  onClick: () => void
  disableSort?: boolean
}) {
  if (disableSort) return <div>{label}</div>
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1 cursor-pointer hover:text-white/60 transition-colors text-left bg-transparent border-none p-0 uppercase tracking-wider text-[10px] font-semibold ${active ? 'text-[#FF6B35]' : 'text-white/25'}`}>
      {label}
      {active && <ArrowUpDown className={`w-3 h-3 ${dir === 'asc' ? 'rotate-180' : ''} transition-transform`} />}
    </button>
  )
}
