'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw,
  Globe,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Search,
  Sparkles,
  ChevronRight,
} from 'lucide-react'

interface Scan {
  id: string
  hostname: string
  url: string
  gaps: string[]
  stack_gap_score: number
  top_recommendation: { service_id?: string; why?: string } | null
  saved: boolean
  contact_id: string | null
  created_at: string
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
  if (score >= 40) return 'text-amber-300 bg-amber-500/15 border-amber-500/30'
  return 'text-rose-300 bg-rose-500/15 border-rose-500/30'
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function ScansPage() {
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/scans/list?limit=100', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setScans(data.scans || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load scans')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = scans.filter((s) => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return (
      s.hostname.toLowerCase().includes(q) ||
      s.gaps.some((g) => g.toLowerCase().includes(q)) ||
      (s.top_recommendation?.service_id || '').toLowerCase().includes(q)
    )
  })

  const handleGenerateGig = (scan: Scan) => {
    const params = new URLSearchParams({
      scanId: scan.id,
      mode: 'fiverr',
      url: scan.url,
      gaps: scan.gaps.join(','),
      ...(scan.top_recommendation?.service_id ? { rec: scan.top_recommendation.service_id } : {}),
    })
    window.location.href = `/dashboard/automations?${params.toString()}`
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#f0f4f8]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-[#6b7280]">
              <Globe className="h-4 w-4" />
              <span>Stack Scanner</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#f0f4f8]">Recent Scans</span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Recent Scans</h1>
            <p className="mt-1 text-sm text-[#9ca3af]">
              Sites you&apos;ve scanned with the extension. Sorted by stack-gap score — biggest opportunities first.
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-md border border-[#30363d] bg-[#161b22] px-3 py-2 text-sm hover:bg-[#1f242c]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by hostname, gap, or recommendation"
              className="w-full rounded-md border border-[#30363d] bg-[#161b22] py-2 pl-9 pr-3 text-sm placeholder:text-[#6b7280] focus:border-[#6EE05A] focus:outline-none"
            />
          </div>
          <span className="text-xs text-[#6b7280]">{filtered.length} of {scans.length} scans</span>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {loading && scans.length === 0 ? (
          <div className="flex items-center justify-center rounded-md border border-[#30363d] bg-[#161b22] p-12 text-sm text-[#6b7280]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading scans…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border border-[#30363d] bg-[#161b22] p-12 text-center text-sm text-[#9ca3af]">
            {scans.length === 0
              ? 'No scans yet. Run a Stack Scan from the 0n Chrome extension on any site.'
              : 'No scans match that filter.'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((scan) => (
              <div key={scan.id} className="rounded-md border border-[#30363d] bg-[#161b22] p-4">
                <div className="flex items-start gap-4">
                  <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-md border ${scoreColor(scan.stack_gap_score)}`}>
                    <div className="text-lg font-bold leading-none">{scan.stack_gap_score}</div>
                    <div className="text-[10px] uppercase tracking-wider opacity-70">gap</div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={scan.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate font-medium hover:underline"
                      >
                        {scan.hostname}
                      </a>
                      <ExternalLink className="h-3 w-3 text-[#6b7280]" />
                      {scan.saved && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" /> Saved
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-xs text-[#6b7280]">{fmtDate(scan.created_at)}</div>

                    {scan.gaps.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {scan.gaps.slice(0, 8).map((g) => (
                          <span
                            key={g}
                            className="inline-flex items-center gap-1 rounded-md border border-[#30363d] bg-[#0d1117] px-2 py-0.5 text-[11px] text-[#9ca3af]"
                          >
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {g}
                          </span>
                        ))}
                        {scan.gaps.length > 8 && (
                          <span className="text-[11px] text-[#6b7280]">+{scan.gaps.length - 8} more</span>
                        )}
                      </div>
                    )}

                    {scan.top_recommendation?.why && (
                      <div className="mt-3 rounded-md border border-[#30363d] bg-[#0d1117] p-2 text-xs text-[#9ca3af]">
                        <span className="font-medium text-[#f0f4f8]">
                          {scan.top_recommendation.service_id || 'Top recommendation'}
                        </span>
                        {' — '}
                        {scan.top_recommendation.why}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      onClick={() => handleGenerateGig(scan)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#6EE05A]/40 bg-[#6EE05A]/10 px-3 py-1.5 text-xs font-medium text-[#6EE05A] hover:bg-[#6EE05A]/20"
                    >
                      <Sparkles className="h-3 w-3" />
                      Generate Gig
                    </button>
                    <a
                      href={scan.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-xs text-[#9ca3af] hover:bg-[#1f242c]"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open site
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
