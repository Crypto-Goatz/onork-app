'use client'

import { useEffect, useState, useCallback, use } from 'react'
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Activity,
  Clock,
  Mail,
  MessageSquare,
  Tag,
  Webhook,
  Slack,
  Zap,
} from 'lucide-react'
import { fmtDelay } from '@/lib/automations/delay'

interface FlowStep {
  id: string
  enrollment_id: string
  step_index: number
  action: string
  params: Record<string, unknown>
  scheduled_at: string
  status: string
  attempts: number
  last_error: string | null
  result: Record<string, unknown> | null
  sent_at: string | null
  created_at: string
}

interface Enrollment {
  id: string
  contact_id: string | null
  contact_email: string
  contact_data: Record<string, unknown> | null
  status: string
  current_step: number
  enrolled_at: string
  completed_at: string | null
  cancelled_at: string | null
  metadata: Record<string, unknown> | null
  steps: FlowStep[]
}

interface RunsResponse {
  workflow: {
    id: string
    name: string
    status: string
    flow_slug: string | null
    trigger_type: string | null
    last_executed_at: string | null
    execution_count: number | null
  }
  flow?: {
    id: string
    slug: string
    name: string
    active: boolean
    default_provider: string | null
    default_location_id: string | null
    created_at: string
  }
  summary?: {
    total: number
    active: number
    completed: number
    failed: number
    cancelled: number
  }
  enrollments: Enrollment[]
  note?: string
  error?: string
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  sms: MessageSquare,
  tag_add: Tag,
  webhook: Webhook,
  slack: Slack,
  wait: Clock,
}

function statusTone(status: string): string {
  switch (status) {
    case 'sent':
    case 'completed':
      return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
    case 'pending':
    case 'active':
    case 'scheduled':
      return 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300'
    case 'failed':
      return 'border-rose-500/30 bg-rose-500/15 text-rose-300'
    case 'cancelled':
      return 'border-amber-500/30 bg-amber-500/15 text-amber-300'
    default:
      return 'border-[#30363d] bg-[#161b22] text-[#9ca3af]'
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'sent':
    case 'completed':
      return CheckCircle2
    case 'failed':
      return XCircle
    case 'cancelled':
      return AlertTriangle
    default:
      return Loader2
  }
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function timeUntil(iso: string | null): string {
  if (!iso) return '—'
  try {
    const ms = new Date(iso).getTime() - Date.now()
    if (ms <= 0) return 'now'
    return fmtDelay(Math.round(ms / 1000))
  } catch {
    return iso
  }
}

export default function RunsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<RunsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/automations/${id}/runs?limit=100`, { cache: 'no-store' })
      const body = (await res.json()) as RunsResponse
      if (!res.ok) throw new Error((body as unknown as { error?: string }).error || `HTTP ${res.status}`)
      setData(body)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load runs')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 15s while there are active enrollments
  useEffect(() => {
    if (!data?.summary?.active) return
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [data?.summary?.active, load])

  const enrollments = data?.enrollments || []
  const summary = data?.summary

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#f0f4f8]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-[#6b7280]">
              <Activity className="h-4 w-4" />
              <span>Automations</span>
              <ChevronRight className="h-3 w-3" />
              <span className="truncate">{data?.workflow.name || 'Loading…'}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#f0f4f8]">Runs</span>
            </div>
            <h1 className="mt-2 truncate text-3xl font-semibold tracking-tight">
              {data?.workflow.name || 'Live runs'}
            </h1>
            <p className="mt-1 text-sm text-[#9ca3af]">
              0nFlow enrollments and step status — refreshes every 15 seconds while runs are active.
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

        {error && (
          <div className="mb-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {data?.note && (
          <div className="mb-4 rounded-md border border-[#30363d] bg-[#161b22] p-4 text-sm text-[#9ca3af]">
            {data.note}
          </div>
        )}

        {summary && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: 'Total', value: summary.total, tone: 'text-[#f0f4f8]' },
              { label: 'Active', value: summary.active, tone: 'text-cyan-300' },
              { label: 'Completed', value: summary.completed, tone: 'text-emerald-300' },
              { label: 'Failed', value: summary.failed, tone: 'text-rose-300' },
              { label: 'Cancelled', value: summary.cancelled, tone: 'text-amber-300' },
            ].map((c) => (
              <div key={c.label} className="rounded-md border border-[#30363d] bg-[#161b22] p-3">
                <div className="text-xs uppercase tracking-wider text-[#6b7280]">{c.label}</div>
                <div className={`mt-1 text-2xl font-bold ${c.tone}`}>{c.value}</div>
              </div>
            ))}
          </div>
        )}

        {loading && enrollments.length === 0 ? (
          <div className="flex items-center justify-center rounded-md border border-[#30363d] bg-[#161b22] p-12 text-sm text-[#6b7280]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading enrollments…
          </div>
        ) : enrollments.length === 0 ? (
          <div className="rounded-md border border-[#30363d] bg-[#161b22] p-12 text-center text-sm text-[#9ca3af]">
            {data?.workflow.flow_slug
              ? 'No enrollments yet. The first run will appear here within seconds of the trigger firing.'
              : 'This workflow has no time-delayed steps, so it does not use 0nFlow. Add a delay to any step to enable run history.'}
          </div>
        ) : (
          <div className="space-y-3">
            {enrollments.map((e) => {
              const isOpen = !!expanded[e.id]
              const Icon = statusIcon(e.status)
              const nextStep = e.steps.find((s) => s.status === 'pending' || s.status === 'scheduled')
              return (
                <div key={e.id} className="rounded-md border border-[#30363d] bg-[#161b22]">
                  <button
                    onClick={() => setExpanded((s) => ({ ...s, [e.id]: !s[e.id] }))}
                    className="flex w-full items-center gap-4 p-4 text-left hover:bg-[#1f242c]"
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4 text-[#6b7280]" /> : <ChevronRight className="h-4 w-4 text-[#6b7280]" />}
                    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${statusTone(e.status)}`}>
                      <Icon className={`h-3 w-3 ${e.status === 'active' ? 'animate-spin' : ''}`} />
                      {e.status}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{e.contact_email || e.contact_id || '—'}</div>
                      <div className="mt-0.5 text-xs text-[#6b7280]">
                        Enrolled {fmtTime(e.enrolled_at)} · Step {e.current_step + 1}/{e.steps.length}
                        {nextStep && e.status === 'active' && ` · Next fires ${timeUntil(nextStep.scheduled_at)}`}
                      </div>
                    </div>
                    <div className="text-xs text-[#9ca3af]">
                      {e.steps.filter((s) => s.status === 'sent' || s.status === 'completed').length}/{e.steps.length} done
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-[#30363d] p-4">
                      <div className="mb-3 text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                        Steps
                      </div>
                      <div className="space-y-2">
                        {e.steps.map((step) => {
                          const ActionIcon = ACTION_ICONS[step.action] || Zap
                          const StatusIcon = statusIcon(step.status)
                          return (
                            <div
                              key={step.id}
                              className="rounded-md border border-[#30363d] bg-[#0d1117] p-3"
                            >
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#1f242c] text-[10px] font-bold text-[#9ca3af]">
                                  {step.step_index + 1}
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                                  <ActionIcon className="h-3.5 w-3.5 text-[#6EE05A]" />
                                  {step.action}
                                </span>
                                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusTone(step.status)}`}>
                                  <StatusIcon className={`h-3 w-3 ${step.status === 'pending' || step.status === 'scheduled' ? 'animate-spin' : ''}`} />
                                  {step.status}
                                </span>
                                <span className="ml-auto text-xs text-[#6b7280]">
                                  {step.status === 'sent' || step.status === 'completed'
                                    ? `Sent ${fmtTime(step.sent_at)}`
                                    : `Scheduled ${fmtTime(step.scheduled_at)}`}
                                </span>
                              </div>
                              {step.last_error && (
                                <div className="mt-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200">
                                  {step.last_error}
                                  {step.attempts > 1 && (
                                    <span className="ml-2 text-[10px] text-rose-300/70">
                                      (attempts: {step.attempts})
                                    </span>
                                  )}
                                </div>
                              )}
                              {step.params && Object.keys(step.params).length > 0 && (
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-[11px] text-[#6b7280] hover:text-[#9ca3af]">
                                    Params
                                  </summary>
                                  <pre className="mt-1 max-h-32 overflow-auto rounded-md border border-[#30363d] bg-[#0d1117] p-2 text-[10px] text-[#9ca3af]">
                                    {JSON.stringify(step.params, null, 2)}
                                  </pre>
                                </details>
                              )}
                              {step.result && (
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-[11px] text-[#6b7280] hover:text-[#9ca3af]">
                                    Result
                                  </summary>
                                  <pre className="mt-1 max-h-32 overflow-auto rounded-md border border-[#30363d] bg-[#0d1117] p-2 text-[10px] text-[#9ca3af]">
                                    {JSON.stringify(step.result, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {e.contact_data && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs text-[#6b7280] hover:text-[#9ca3af]">
                            Contact data
                          </summary>
                          <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-[#30363d] bg-[#0d1117] p-2 text-[11px] text-[#9ca3af]">
                            {JSON.stringify(e.contact_data, null, 2)}
                          </pre>
                        </details>
                      )}
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
