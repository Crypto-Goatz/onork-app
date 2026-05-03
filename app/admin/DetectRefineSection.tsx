'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  Bot,
  Check,
  Copy,
  Globe,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'

interface DrDomain {
  id: string
  domain: string
  siteId: string
  scriptKey: string
  isActive: boolean
  createdAt: string
  scriptTag: string
}

interface DrStats {
  ok: boolean
  totals: {
    sessions: number
    gradeA: number
    gradeB: number
    gradeC: number
    gradeD: number
    gradeF: number
    gradeX: number
    avgScore: number
  }
  todaySessions: number
  yesterdaySessions: number
  platforms: Record<string, number>
  topReferrers: Array<{ host: string; count: number }>
}

const PLATFORM_LABEL: Record<string, string> = {
  google: 'Google',
  meta: 'Meta',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  bing: 'Bing',
  organic: 'Organic',
  direct: 'Direct',
}

export function DetectRefineSection({ locationId }: { locationId: string }) {
  const [domains, setDomains] = useState<DrDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [installFor, setInstallFor] = useState<DrDomain | null>(null)

  const [activeSiteId, setActiveSiteId] = useState<string | null>(null)
  const [stats, setStats] = useState<DrStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const loadDomains = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/dr/domains?locationId=${encodeURIComponent(locationId)}`)
    const data = await res.json().catch(() => ({})) as { domains?: DrDomain[] }
    const list = (data.domains ?? []).filter((d) => d.isActive)
    setDomains(list)
    setActiveSiteId((prev) => {
      if (prev && list.some((d) => d.siteId === prev)) return prev
      return list[0]?.siteId ?? null
    })
    setLoading(false)
  }, [locationId])

  const loadStats = useCallback(async (siteId: string) => {
    setStatsLoading(true)
    const res = await fetch(`/api/dr/stats/${encodeURIComponent(siteId)}?days=7`)
    const data = await res.json().catch(() => null) as DrStats | null
    setStats(data?.ok ? data : null)
    setStatsLoading(false)
  }, [])

  useEffect(() => {
    loadDomains()
  }, [loadDomains])

  useEffect(() => {
    if (activeSiteId) loadStats(activeSiteId)
    else setStats(null)
  }, [activeSiteId, loadStats])

  const addDomain = async () => {
    const trimmed = newDomain.trim()
    if (!trimmed) return
    setAdding(true)
    setAddError(null)
    const res = await fetch('/api/dr/domains', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locationId, domain: trimmed }),
    })
    const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; siteId?: string }
    setAdding(false)
    if (!data.ok) {
      setAddError(data.error || `HTTP ${res.status}`)
      return
    }
    setNewDomain('')
    await loadDomains()
    if (data.siteId) setActiveSiteId(data.siteId)
  }

  const removeDomain = async (id: string) => {
    await fetch(`/api/dr/domains/${id}`, { method: 'DELETE' })
    loadDomains()
  }

  if (loading) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[#e6edf3]">Detect &amp; Refine</h2>
        <div className="h-24 animate-pulse rounded-xl border border-[#30363d] bg-[#161b22]" />
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#e6edf3]">
          <ShieldCheck className="h-4 w-4 text-[#6EE05A]" />
          Detect &amp; Refine
        </h2>
        {domains.length > 0 && (
          <span className="text-xs text-[#8b949e]">{domains.length} domain{domains.length === 1 ? '' : 's'}</span>
        )}
      </div>

      {domains.length === 0 ? (
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[#6EE05A]/10 p-2">
              <Globe className="h-5 w-5 text-[#6EE05A]" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="text-sm font-medium text-[#e6edf3]">Grade every ad click</div>
              <div className="text-xs text-[#8b949e]">
                Register a domain to start scoring traffic quality A+ through F.
              </div>
            </div>
          </div>
          <AddDomainForm
            value={newDomain}
            onChange={setNewDomain}
            onSubmit={addDomain}
            busy={adding}
            error={addError}
          />
        </div>
      ) : (
        <>
          {/* Domain selector */}
          {domains.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {domains.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setActiveSiteId(d.siteId)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    activeSiteId === d.siteId
                      ? 'border-[#6EE05A]/40 bg-[#6EE05A]/10 text-[#6EE05A]'
                      : 'border-[#30363d] bg-[#161b22] text-[#c9d1d9] hover:border-[#484f58]'
                  }`}
                >
                  {d.domain}
                </button>
              ))}
            </div>
          )}

          {/* Active domain panel */}
          {activeSiteId && (
            <DomainPanel
              domain={domains.find((d) => d.siteId === activeSiteId)!}
              stats={stats}
              loading={statsLoading}
              onInstall={() => {
                const d = domains.find((dd) => dd.siteId === activeSiteId)
                if (d) setInstallFor(d)
              }}
              onRemove={() => {
                const d = domains.find((dd) => dd.siteId === activeSiteId)
                if (d && confirm(`Remove ${d.domain} from D&R?`)) removeDomain(d.id)
              }}
            />
          )}

          {/* Add another */}
          <details className="rounded-xl border border-[#30363d] bg-[#161b22]">
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm text-[#c9d1d9]">
              <Plus className="h-4 w-4 text-[#8b949e]" />
              Register another domain
            </summary>
            <div className="border-t border-[#30363d] p-4">
              <AddDomainForm
                value={newDomain}
                onChange={setNewDomain}
                onSubmit={addDomain}
                busy={adding}
                error={addError}
              />
            </div>
          </details>
        </>
      )}

      {installFor && (
        <InstallScriptModal domain={installFor} onClose={() => setInstallFor(null)} />
      )}
    </section>
  )
}

function AddDomainForm({
  value,
  onChange,
  onSubmit,
  busy,
  error,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  busy: boolean
  error: string | null
}) {
  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit() }}
          placeholder="yoursite.com"
          className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#6EE05A] focus:outline-none focus:ring-1 focus:ring-[#6EE05A]/20"
        />
        <button
          onClick={onSubmit}
          disabled={busy || !value.trim()}
          className="flex min-h-[44px] items-center gap-1 rounded-lg bg-[#6EE05A] px-3 text-sm font-medium text-[#0d1117] hover:bg-[#5bc74a] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Register
        </button>
      </div>
      {error && <div className="text-xs text-[#f87171]">{error}</div>}
    </div>
  )
}

function DomainPanel({
  domain,
  stats,
  loading,
  onInstall,
  onRemove,
}: {
  domain: DrDomain
  stats: DrStats | null
  loading: boolean
  onInstall: () => void
  onRemove: () => void
}) {
  const sessions = stats?.totals.sessions ?? 0
  const today = stats?.todaySessions ?? 0
  const yesterday = stats?.yesterdaySessions ?? 0
  const delta = today - yesterday
  const avgScore = stats?.totals.avgScore ?? 0
  const bots = stats?.totals.gradeX ?? 0

  const gradeBuckets = stats
    ? [
        { label: 'A', count: stats.totals.gradeA, color: '#6EE05A' },
        { label: 'B', count: stats.totals.gradeB, color: '#34d399' },
        { label: 'C', count: stats.totals.gradeC, color: '#fbbf24' },
        { label: 'D', count: stats.totals.gradeD, color: '#fb923c' },
        { label: 'F', count: stats.totals.gradeF, color: '#f87171' },
        { label: 'X', count: stats.totals.gradeX, color: '#484f58' },
      ]
    : []
  const gradeTotal = gradeBuckets.reduce((s, b) => s + b.count, 0)

  const scoreColor = avgScore >= 70 ? '#6EE05A' : avgScore >= 50 ? '#fbbf24' : '#f87171'

  return (
    <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-[#e6edf3]">
            <span className="h-2 w-2 rounded-full bg-[#6EE05A]" />
            {domain.domain}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-[#8b949e]">{domain.siteId}</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onInstall}
            className="rounded-lg border border-[#30363d] bg-[#21262d] px-2.5 py-1.5 text-xs font-medium text-[#c9d1d9] hover:bg-[#30363d]"
          >
            Install script
          </button>
          <button
            onClick={onRemove}
            aria-label="Remove domain"
            className="rounded-lg border border-[#30363d] bg-[#21262d] p-1.5 text-[#8b949e] hover:bg-[#30363d] hover:text-[#f87171]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Score + headline metrics */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-[#0d1117] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[#8b949e]">Quality score</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: scoreColor }}>
            {loading ? '…' : avgScore.toFixed(0)}
          </div>
          <div className="text-[10px] text-[#8b949e]">7-day avg</div>
        </div>
        <div className="rounded-lg bg-[#0d1117] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[#8b949e]">Today</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-[#e6edf3]">
            {loading ? '…' : today}
          </div>
          <div className={`text-[10px] ${delta > 0 ? 'text-[#6EE05A]' : delta < 0 ? 'text-[#f87171]' : 'text-[#8b949e]'}`}>
            {delta > 0 ? `+${delta}` : delta} vs yesterday
          </div>
        </div>
        <div className="rounded-lg bg-[#0d1117] p-3">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#8b949e]">
            <Bot className="h-3 w-3" /> Bots
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-[#e6edf3]">
            {loading ? '…' : bots}
          </div>
          <div className="text-[10px] text-[#8b949e]">flagged in 7d</div>
        </div>
      </div>

      {/* Grade distribution */}
      {sessions > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#8b949e]">
            <span>Grade distribution</span>
            <span>{sessions} sessions</span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#0d1117]">
            {gradeBuckets.map((b) => (
              <div
                key={b.label}
                className="h-full"
                style={{
                  width: gradeTotal > 0 ? `${(b.count / gradeTotal) * 100}%` : '0%',
                  backgroundColor: b.color,
                }}
                title={`${b.label}: ${b.count}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] text-[#c9d1d9]">
            {gradeBuckets.map((b) => (
              <span key={b.label} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                {b.label} {b.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Platform breakdown */}
      {stats && Object.keys(stats.platforms).length > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#8b949e]">
            <Activity className="h-3 w-3" /> Traffic by platform
          </div>
          <div className="space-y-1">
            {Object.entries(stats.platforms)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([key, count]) => {
                const total = Object.values(stats.platforms).reduce((s, n) => s + n, 0)
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="w-16 text-[#c9d1d9]">{PLATFORM_LABEL[key] || key}</span>
                    <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-[#0d1117]">
                      <div className="h-full bg-[#6EE05A]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-12 text-right tabular-nums text-[#8b949e]">{count}</span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {sessions === 0 && !loading && (
        <div className="mt-4 rounded-lg border border-dashed border-[#30363d] p-3 text-center text-xs text-[#8b949e]">
          Waiting for traffic. Install the script and visit your site to see grades.
        </div>
      )}
    </div>
  )
}

function InstallScriptModal({ domain, onClose }: { domain: DrDomain; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(domain.scriptTag)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-lg rounded-t-2xl border border-[#30363d] bg-[#1c2128] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#30363d] px-4 py-3">
          <div>
            <div className="text-sm font-medium text-[#e6edf3]">Install script</div>
            <div className="text-xs text-[#8b949e]">{domain.domain}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-[#8b949e] hover:bg-[#21262d] hover:text-[#e6edf3]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="text-xs text-[#8b949e]">
            Paste this snippet into the &lt;head&gt; of <span className="font-mono text-[#e6edf3]">{domain.domain}</span>.
            Domain-locked &mdash; it will refuse to run anywhere else.
          </div>
          <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
            <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-[#c9d1d9]">
              {domain.scriptTag}
            </pre>
          </div>
          <button
            onClick={copy}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#6EE05A] px-4 py-2.5 text-sm font-medium text-[#0d1117] hover:bg-[#5bc74a]"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy snippet'}
          </button>
        </div>
      </div>
    </div>
  )
}
