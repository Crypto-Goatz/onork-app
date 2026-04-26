'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, Activity, BarChart3, Flame, RefreshCw,
  Search, ArrowUpDown, DollarSign, Briefcase, Link2, Plus, X,
  Sparkles, Target, Lightbulb, GraduationCap, Bookmark, CheckCircle2,
  XCircle, Clock, Wand2, Trash2, AlertTriangle,
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

interface Profile {
  id: string
  platform: string
  profile_url: string
  display_name: string | null
  headline: string | null
  skills: string[]
  hourly_rate: number | null
  rating: number | null
  location: string | null
  scraped_at: string
}

interface Match {
  id: string
  match_type: 'opportunity' | 'trending' | 'build_suggestion' | 'skill_gap'
  title: string
  description: string
  relevance_score: number
  demand_score: number
  competition_score: number
  profit_potential: number
  overall_score: number
  related_skills: string[]
  suggested_price_range: { min: number; max: number; currency: string } | null
  suggested_action: string | null
  app_idea: string | null
  tech_stack: string[]
  estimated_build_time: string | null
  potential_revenue: string | null
  workflow_steps: Array<{ step: number; title: string; detail: string }> | null
  status: 'new' | 'viewed' | 'saved' | 'dismissed' | 'acted_on'
  created_at: string
}

interface MatchCounts {
  opportunity: number
  trending: number
  build_suggestion: number
  skill_gap: number
  total: number
}

type SortKey = 'listing_count_7d' | 'avg_budget' | 'growth_pct' | 'saturation_score' | 'skill'
type Tab = 'matches' | 'skills'
type MatchFilter = 'all' | 'opportunity' | 'trending' | 'build_suggestion' | 'skill_gap'

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

const MATCH_TYPE_META: Record<MatchFilter, { label: string; icon: typeof Target; color: string; bg: string }> = {
  all:              { label: 'All',         icon: Sparkles,       color: 'text-white',         bg: 'bg-white/[0.06]' },
  opportunity:      { label: 'Opportunity', icon: Target,         color: 'text-emerald-400',   bg: 'bg-emerald-400/10' },
  trending:         { label: 'Trending',    icon: Flame,          color: 'text-[#FF6B35]',     bg: 'bg-[#FF6B35]/10' },
  build_suggestion: { label: 'Build',       icon: Lightbulb,      color: 'text-yellow-400',    bg: 'bg-yellow-400/10' },
  skill_gap:        { label: 'Skill Gap',   icon: GraduationCap,  color: 'text-[#00d4ff]',     bg: 'bg-[#00d4ff]/10' },
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
  const [tab, setTab] = useState<Tab>('matches')

  // Skills table state
  const [skills, setSkills] = useState<Skill[]>([])
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [trendFilter, setTrendFilter] = useState<typeof TRENDS[number]>('all')
  const [sortBy, setSortBy] = useState<SortKey>('listing_count_7d')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Profile state
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [showLinkModal, setShowLinkModal] = useState(false)

  // Matches state
  const [matches, setMatches] = useState<Match[]>([])
  const [matchCounts, setMatchCounts] = useState<MatchCounts>({ opportunity: 0, trending: 0, build_suggestion: 0, skill_gap: 0, total: 0 })
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all')
  const [matchesLoading, setMatchesLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const loadSkills = useCallback(async () => {
    setSkillsLoading(true)
    try {
      const params = new URLSearchParams({ sort: sortBy, dir: sortDir, limit: '300' })
      if (category !== 'all') params.set('category', category)
      if (trendFilter !== 'all') params.set('trend', trendFilter)
      const res = await fetch(`/api/market-intel/skills?${params.toString()}`)
      const data = await res.json()
      if (data.skills) setSkills(data.skills)
    } catch {}
    setSkillsLoading(false)
  }, [sortBy, sortDir, category, trendFilter])

  const loadProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/market-intel/profile')
      const data = await res.json()
      if (data.profiles) setProfiles(data.profiles)
    } catch {}
  }, [])

  const loadMatches = useCallback(async () => {
    setMatchesLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (matchFilter !== 'all') params.set('type', matchFilter)
      const res = await fetch(`/api/market-intel/matches?${params.toString()}`)
      const data = await res.json()
      if (data.matches) setMatches(data.matches)
      if (data.counts) setMatchCounts(data.counts)
    } catch {}
    setMatchesLoading(false)
  }, [matchFilter])

  useEffect(() => { loadSkills() }, [loadSkills])
  useEffect(() => { loadProfiles() }, [loadProfiles])
  useEffect(() => { loadMatches() }, [loadMatches])

  async function regenerateMatches() {
    setGenerating(true)
    try {
      await fetch('/api/market-intel/generate-matches', { method: 'POST' })
      await loadMatches()
    } catch {}
    setGenerating(false)
  }

  async function deleteProfile(id: string) {
    await fetch(`/api/market-intel/profile?id=${id}`, { method: 'DELETE' })
    await loadProfiles()
  }

  async function updateMatchStatus(id: string, status: Match['status']) {
    setMatches(prev => prev.map(m => m.id === id ? { ...m, status } : m))
    await fetch('/api/market-intel/matches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (status === 'dismissed') {
      setMatches(prev => prev.filter(m => m.id !== id))
    }
  }

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
    if (sortBy === key) setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    else { setSortBy(key); setSortDir('desc') }
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
            <p className="text-xs text-white/40">AI-matched opportunities & live freelance demand</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'matches' && (
            <button
              onClick={regenerateMatches}
              disabled={generating || profiles.length === 0}
              className="px-3 py-2 rounded-lg bg-[#FF6B35]/10 border border-[#FF6B35]/20 text-xs text-[#FF6B35] hover:bg-[#FF6B35]/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
              <Sparkles className={`w-3.5 h-3.5 ${generating ? 'animate-pulse' : ''}`} />
              {generating ? 'Matching...' : 'Refresh Matches'}
            </button>
          )}
          {tab === 'skills' && (
            <button onClick={loadSkills}
              className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/60 hover:text-white hover:border-white/[0.12] transition-all flex items-center gap-1.5 cursor-pointer">
              <RefreshCw className={`w-3.5 h-3.5 ${skillsLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* Linked Profiles */}
      <ProfileSection
        profiles={profiles}
        onLink={() => setShowLinkModal(true)}
        onDelete={deleteProfile}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.06]">
        <TabButton active={tab === 'matches'} onClick={() => setTab('matches')} icon={Sparkles} label={`AI Matches${matchCounts.total > 0 ? ` (${matchCounts.total})` : ''}`} />
        <TabButton active={tab === 'skills'}  onClick={() => setTab('skills')}  icon={BarChart3} label="All Skills" />
      </div>

      {tab === 'matches' ? (
        <MatchesView
          matches={matches}
          counts={matchCounts}
          loading={matchesLoading}
          filter={matchFilter}
          onFilter={setMatchFilter}
          onStatus={updateMatchStatus}
          hasProfiles={profiles.length > 0}
          onLink={() => setShowLinkModal(true)}
        />
      ) : (
        <SkillsView
          skills={filtered}
          loading={skillsLoading}
          stats={stats}
          search={search}
          setSearch={setSearch}
          category={category}
          setCategory={setCategory}
          trendFilter={trendFilter}
          setTrendFilter={setTrendFilter}
          sortBy={sortBy}
          sortDir={sortDir}
          toggleSort={toggleSort}
        />
      )}

      {showLinkModal && (
        <LinkProfileModal
          onClose={() => setShowLinkModal(false)}
          onSuccess={() => { setShowLinkModal(false); loadProfiles(); loadMatches() }}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Profile Section
// ────────────────────────────────────────────────────────────
function ProfileSection({
  profiles, onLink, onDelete,
}: {
  profiles: Profile[]
  onLink: () => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-[#00d4ff]" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider">Linked Profiles</span>
          {profiles.length > 0 && <span className="text-[10px] text-white/30">{profiles.length} linked</span>}
        </div>
        <button onClick={onLink}
          className="px-3 py-1.5 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-xs text-[#00d4ff] hover:bg-[#00d4ff]/20 transition-all flex items-center gap-1.5 cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Link Profile
        </button>
      </div>
      {profiles.length === 0 ? (
        <p className="text-xs text-white/30">Link a freelancer profile (LinkedIn, Upwork, GitHub, personal site) to unlock AI-matched opportunities.</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {profiles.map(p => (
            <div key={p.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 group">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#00d4ff]">{p.platform}</span>
                    {p.location && <span className="text-[10px] text-white/30">· {p.location}</span>}
                  </div>
                  <div className="text-sm font-semibold text-white truncate">{p.display_name || p.profile_url}</div>
                  {p.headline && <div className="text-[11px] text-white/50 line-clamp-2 mt-0.5">{p.headline}</div>}
                  {p.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.skills.slice(0, 5).map(s => (
                        <span key={s} className="text-[9px] px-1.5 py-0.5 rounded border border-white/[0.06] bg-white/[0.02] text-white/50">{s}</span>
                      ))}
                      {p.skills.length > 5 && <span className="text-[9px] text-white/30">+{p.skills.length - 5}</span>}
                    </div>
                  )}
                </div>
                <button onClick={() => onDelete(p.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/[0.06] cursor-pointer transition-all">
                  <Trash2 className="w-3 h-3 text-white/40 hover:text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Tabs
// ────────────────────────────────────────────────────────────
function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Sparkles; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
        active
          ? 'text-[#FF6B35] border-[#FF6B35]'
          : 'text-white/40 border-transparent hover:text-white/70'
      }`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}

// ────────────────────────────────────────────────────────────
// Matches View
// ────────────────────────────────────────────────────────────
function MatchesView({
  matches, counts, loading, filter, onFilter, onStatus, hasProfiles, onLink,
}: {
  matches: Match[]
  counts: MatchCounts
  loading: boolean
  filter: MatchFilter
  onFilter: (f: MatchFilter) => void
  onStatus: (id: string, status: Match['status']) => void
  hasProfiles: boolean
  onLink: () => void
}) {
  if (!hasProfiles) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
        <Sparkles className="w-8 h-8 text-[#FF6B35]/40 mx-auto mb-3" />
        <p className="text-sm text-white mb-2">Link a profile to unlock AI matches</p>
        <p className="text-xs text-white/40 mb-4">We&apos;ll analyze your skills and find opportunities, trends, build ideas, and skill gaps.</p>
        <button onClick={onLink}
          className="px-4 py-2 rounded-lg bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#FF6B35]/90 transition-all cursor-pointer inline-flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5" /> Link Your Profile
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'opportunity', 'trending', 'build_suggestion', 'skill_gap'] as MatchFilter[]).map(f => {
          const meta = MATCH_TYPE_META[f]
          const Icon = meta.icon
          const count = f === 'all' ? counts.total : counts[f]
          return (
            <button key={f} onClick={() => onFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all border ${
                filter === f
                  ? `${meta.bg} ${meta.color} border-current`
                  : 'bg-white/[0.02] text-white/50 border-white/[0.06] hover:text-white/80'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {meta.label}
              {count > 0 && <span className="opacity-60">({count})</span>}
            </button>
          )
        })}
      </div>

      {loading && matches.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
          <Sparkles className="w-6 h-6 text-white/20 animate-pulse mx-auto mb-2" />
          <p className="text-sm text-white/30">Loading matches...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
          <Sparkles className="w-8 h-8 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/40 mb-2">No matches yet</p>
          <p className="text-xs text-white/20">Click &ldquo;Refresh Matches&rdquo; to generate AI-powered opportunities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {matches.map(m => (
            <MatchCard key={m.id} match={m} onStatus={onStatus} />
          ))}
        </div>
      )}
    </>
  )
}

function MatchCard({ match, onStatus }: { match: Match; onStatus: (id: string, status: Match['status']) => void }) {
  const meta = MATCH_TYPE_META[match.match_type]
  const Icon = meta.icon
  const isBuild = match.match_type === 'build_suggestion'
  const isSaved = match.status === 'saved'
  const isActed = match.status === 'acted_on'

  return (
    <div className={`rounded-xl border ${isBuild ? 'border-yellow-400/20 bg-yellow-400/[0.02]' : 'border-white/[0.06] bg-white/[0.02]'} p-4 flex flex-col gap-3`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className={`text-[9px] uppercase tracking-wider font-bold ${meta.color}`}>{meta.label}</div>
            <h3 className="text-sm font-semibold text-white leading-tight mt-0.5">{match.title}</h3>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="text-right">
            <div className="text-base font-bold text-white">{match.overall_score}</div>
            <div className="text-[8px] text-white/30 uppercase tracking-wider">score</div>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-white/60 leading-relaxed">{match.description}</p>

      {/* Build-specific details */}
      {isBuild && (
        <div className="rounded-lg border border-yellow-400/10 bg-yellow-400/[0.04] p-3 space-y-2.5">
          {match.app_idea && (
            <div>
              <div className="text-[9px] uppercase tracking-wider text-yellow-400/70 font-bold mb-1">App Idea</div>
              <p className="text-xs text-white/80 leading-relaxed">{match.app_idea}</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            {match.estimated_build_time && (
              <div className="flex items-center gap-1.5 text-white/60">
                <Clock className="w-3 h-3 text-yellow-400/70" />
                <span>{match.estimated_build_time}</span>
              </div>
            )}
            {match.potential_revenue && (
              <div className="flex items-center gap-1.5 text-white/60 col-span-2">
                <DollarSign className="w-3 h-3 text-emerald-400/70" />
                <span>{match.potential_revenue}</span>
              </div>
            )}
          </div>
          {match.tech_stack && match.tech_stack.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {match.tech_stack.map(t => (
                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded border border-yellow-400/20 bg-yellow-400/[0.06] text-yellow-400/80">{t}</span>
              ))}
            </div>
          )}
          {match.workflow_steps && Array.isArray(match.workflow_steps) && match.workflow_steps.length > 0 && (
            <details className="group">
              <summary className="text-[10px] text-yellow-400/80 uppercase tracking-wider cursor-pointer hover:text-yellow-400 list-none flex items-center gap-1">
                <Wand2 className="w-3 h-3" /> Workflow Steps ({match.workflow_steps.length})
              </summary>
              <ol className="mt-2 space-y-1.5">
                {match.workflow_steps.map(s => (
                  <li key={s.step} className="text-[11px] text-white/70 flex gap-2">
                    <span className="text-yellow-400/60 font-mono shrink-0">{s.step}.</span>
                    <div>
                      <div className="font-semibold text-white/90">{s.title}</div>
                      <div className="text-white/50">{s.detail}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      )}

      {/* Score bars */}
      <div className="grid grid-cols-4 gap-2">
        <ScoreBar label="Relevance" value={match.relevance_score} color="bg-[#00d4ff]" />
        <ScoreBar label="Demand" value={match.demand_score} color="bg-emerald-400" />
        <ScoreBar label="Open" value={100 - match.competition_score} color="bg-yellow-400" />
        <ScoreBar label="Profit" value={match.profit_potential} color="bg-[#FF6B35]" />
      </div>

      {/* Related skills */}
      {match.related_skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {match.related_skills.slice(0, 6).map(s => (
            <span key={s} className="text-[9px] px-1.5 py-0.5 rounded border border-white/[0.06] bg-white/[0.02] text-white/40">{s}</span>
          ))}
        </div>
      )}

      {/* Suggested action + price */}
      {(match.suggested_action || match.suggested_price_range) && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-1">
          {match.suggested_action && (
            <div className="text-[11px] text-white/70 leading-relaxed">
              <span className="text-[#FF6B35] font-semibold">→ </span>{match.suggested_action}
            </div>
          )}
          {match.suggested_price_range && (
            <div className="text-[10px] text-emerald-400/80">
              Price range: {match.suggested_price_range.currency} {match.suggested_price_range.min.toLocaleString()}–{match.suggested_price_range.max.toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Status / Action buttons */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-white/[0.04]">
        {isBuild && !isActed && (
          <a
            href={`/dashboard/automation-builder?seed=${encodeURIComponent(match.title)}`}
            className="px-2.5 py-1.5 rounded-md bg-yellow-400/10 border border-yellow-400/20 text-[10px] text-yellow-400 hover:bg-yellow-400/20 transition-all flex items-center gap-1 cursor-pointer">
            <Wand2 className="w-3 h-3" /> Generate Workflow
          </a>
        )}
        <ActionBtn icon={Bookmark} label="Save" active={isSaved} onClick={() => onStatus(match.id, isSaved ? 'viewed' : 'saved')} />
        <ActionBtn icon={CheckCircle2} label="Acted" active={isActed} onClick={() => onStatus(match.id, 'acted_on')} />
        <div className="flex-1" />
        <ActionBtn icon={XCircle} label="Dismiss" onClick={() => onStatus(match.id, 'dismissed')} muted />
      </div>
    </div>
  )
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] uppercase tracking-wider text-white/30">{label}</span>
        <span className="text-[9px] font-mono text-white/60">{value}</span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  )
}

function ActionBtn({
  icon: Icon, label, active, onClick, muted,
}: { icon: typeof Bookmark; label: string; active?: boolean; onClick: () => void; muted?: boolean }) {
  return (
    <button onClick={onClick}
      className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 cursor-pointer transition-all ${
        active
          ? 'bg-[#FF6B35]/15 text-[#FF6B35]'
          : muted
            ? 'text-white/30 hover:text-red-400'
            : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
      }`}>
      <Icon className="w-3 h-3" />
      {label}
    </button>
  )
}

// ────────────────────────────────────────────────────────────
// Link Profile Modal
// ────────────────────────────────────────────────────────────
function LinkProfileModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [url, setUrl] = useState('')
  const [pasted, setPasted] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsPaste, setNeedsPaste] = useState<string | null>(null)

  async function submit() {
    setLoading(true)
    setError(null)
    setNeedsPaste(null)
    try {
      const res = await fetch('/api/market-intel/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_url: url, pasted_text: showPaste ? pasted : undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
      } else if (data.needs_paste) {
        setNeedsPaste(data.reason || 'Platform requires manual paste')
        setShowPaste(true)
      } else {
        onSuccess()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0c0c0c] border border-white/[0.08] rounded-xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00d4ff]/10 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-[#00d4ff]" />
            </div>
            <h2 className="text-base font-bold text-white">Link Your Profile</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/[0.06] cursor-pointer">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>
        <p className="text-xs text-white/50 mb-4">Paste your profile URL — LinkedIn, Upwork, GitHub, Fiverr, Behance, or your personal site.</p>

        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://linkedin.com/in/yourname"
          className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none focus:border-[#00d4ff]/40 mb-3"
        />

        {needsPaste && (
          <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/[0.06] p-3 mb-3 text-xs text-yellow-400/90 flex gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{needsPaste}. Copy your headline, skills, and bio from the page and paste below.</span>
          </div>
        )}

        {showPaste && (
          <textarea
            value={pasted}
            onChange={e => setPasted(e.target.value)}
            placeholder="Paste your profile text — name, headline, skills, experience, bio..."
            rows={8}
            className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none focus:border-[#00d4ff]/40 mb-3 font-mono text-xs"
          />
        )}

        {!showPaste && (
          <button onClick={() => setShowPaste(true)} className="text-[11px] text-white/40 hover:text-white/70 mb-3 cursor-pointer">
            + Paste profile text manually
          </button>
        )}

        {error && (
          <div className="rounded-lg border border-red-400/20 bg-red-400/[0.06] p-3 mb-3 text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={submit}
            disabled={loading || !url}
            className="px-4 py-2 rounded-lg bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#FF6B35]/90 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
            {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {loading ? 'Analyzing...' : 'Link & Analyze'}
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-white/60 hover:text-white cursor-pointer">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Skills View (existing table)
// ────────────────────────────────────────────────────────────
function SkillsView({
  skills, loading, stats, search, setSearch, category, setCategory,
  trendFilter, setTrendFilter, sortBy, sortDir, toggleSort,
}: {
  skills: Skill[]
  loading: boolean
  stats: { totalListings: number; hot: number; rising: number; declining: number; avgBudget: number; total: number }
  search: string
  setSearch: (s: string) => void
  category: string
  setCategory: (c: string) => void
  trendFilter: typeof TRENDS[number]
  setTrendFilter: (t: typeof TRENDS[number]) => void
  sortBy: SortKey
  sortDir: 'asc' | 'desc'
  toggleSort: (key: SortKey) => void
}) {
  return (
    <div className="space-y-4">
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
      ) : skills.length === 0 ? (
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

          {skills.map(s => {
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
