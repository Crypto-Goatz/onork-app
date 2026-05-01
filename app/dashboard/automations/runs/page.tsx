'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Activity,
  Filter,
} from 'lucide-react'

interface RunStep {
  stepId: string
  name: string
  tool: string
  status: 'success' | 'failed' | string
  output?: unknown
  error?: string | null
  duration?: number
}

interface Run {
  id: string
  workflow_id: string | null
  workflow_name: string | null
  trigger_type: string | null
  trigger_data: unknown
  status: string
  error: string | null
  total_steps: number | null
  succeeded: number | null
  failed: number | null
  duration_ms: number | null
  steps: RunStep[]
  started_at: string | null
  completed_at: string | null
}

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'success', label: 'Success' },
  { key: 'partial', label: 'Partial' },
  { key: 'failed', label: 'Failed' },
]

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'success'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : status === 'partial'
      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
  const Icon = status === 'success' ? CheckCircle2 : status === 'partial' ? AlertTriangle : XCircle
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${tone}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  )
}

function fmtMs(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch {
    return iso
  }
}

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/automations/runs?limit=100', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setRuns(data.runs || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load runs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = runs.filter(r => statusFilter === 'all' || r.status === statusFilter)

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#f0f4f8]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-[#6b7280]">
              <Activity className="h-4 w-4" />
              <span>Automations</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#f0f4f8]">Run History</span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Run History</h1>
            <p className="mt-1 text-sm text-[#9ca3af]">
              Every automation fire — webhook trigger, step-by-step trace, errors inline.
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

        <div className="mb-4 flex items-center gap-2 text-sm">
          <Filter className="h-4 w-4 text-[#6b7280]" />
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-md border px-3 py-1 ${
                statusFilter === f.key
                  ? 'border-[#6EE05A] bg-[#6EE05A]/10 text-[#6EE05A]'
                  : 'border-[#30363d] bg-[#161b22] text-[#9ca3af] hover:bg-[#1f242c]'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-[#6b7280]">{filtered.length} runs</span>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {loading && runs.length === 0 ? (
          <div className="flex items-center justify-center rounded-md border border-[#30363d] bg-[#161b22] p-12 text-sm text-[#6b7280]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading runs…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border border-[#30363d] bg-[#161b22] p-12 text-center text-sm text-[#9ca3af]">
            No runs yet. When a CRM webhook fires this workflow, it will appear here within seconds.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(run => {
              const isOpen = !!expanded[run.id]
              return (
                <div key={run.id} className="rounded-md border border-[#30363d] bg-[#161b22]">
                  <button
                    onClick={() => setExpanded(s => ({ ...s, [run.id]: !s[run.id] }))}
                    className="flex w-full items-center gap-4 p-4 text-left hover:bg-[#1f242c]"
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4 text-[#6b7280]" /> : <ChevronRight className="h-4 w-4 text-[#6b7280]" />}
                    <StatusPill status={run.status} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{run.workflow_name || 'Unknown workflow'}</div>
                      <div className="mt-0.5 text-xs text-[#6b7280]">
                        {run.trigger_type || '—'} · {fmtTime(run.started_at)} · {fmtMs(run.duration_ms)}
                      </div>
                    </div>
                    <div className="text-xs text-[#9ca3af]">
                      {run.succeeded ?? 0}/{run.total_steps ?? 0} steps
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-[#30363d] p-4">
                      {run.error && (
                        <div className="mb-3 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200">
                          {run.error}
                        </div>
                      )}
                      <div className="mb-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                        <div>
                          <div className="text-[#6b7280]">Workflow ID</div>
                          <div className="font-mono text-[#f0f4f8]">{run.workflow_id || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[#6b7280]">Status</div>
                          <div className="text-[#f0f4f8]">{run.status}</div>
                        </div>
                        <div>
                          <div className="text-[#6b7280]">Steps</div>
                          <div className="text-[#f0f4f8]">
                            {run.succeeded ?? 0} succeeded · {run.failed ?? 0} failed
                          </div>
                        </div>
                        <div>
                          <div className="text-[#6b7280]">Duration</div>
                          <div className="text-[#f0f4f8]">{fmtMs(run.duration_ms)}</div>
                        </div>
                      </div>

                      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                        Steps
                      </div>
                      <div className="space-y-2">
                        {(run.steps || []).map((step, i) => (
                          <div
                            key={step.stepId || i}
                            className="rounded-md border border-[#30363d] bg-[#0d1117] p-3"
                          >
                            <div className="flex items-center gap-3">
                              <StatusPill status={step.status} />
                              <div className="font-medium">{step.name}</div>
                              <span className="rounded bg-[#1f242c] px-2 py-0.5 font-mono text-xs text-[#9ca3af]">
                                {step.tool}
                              </span>
                              <span className="ml-auto text-xs text-[#6b7280]">
                                {fmtMs(step.duration ?? null)}
                              </span>
                            </div>
                            {step.error && (
                              <div className="mt-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200">
                                {step.error}
                              </div>
                            )}
                            {step.output != null && (
                              <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-[#30363d] bg-[#0d1117] p-2 text-[11px] text-[#9ca3af]">
                                {JSON.stringify(step.output, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>

                      {run.trigger_data != null ? (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs text-[#6b7280] hover:text-[#9ca3af]">
                            Trigger payload
                          </summary>
                          <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-[#30363d] bg-[#0d1117] p-2 text-[11px] text-[#9ca3af]">
                            {JSON.stringify(run.trigger_data, null, 2)}
                          </pre>
                        </details>
                      ) : null}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
