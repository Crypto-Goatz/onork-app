'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw, Zap, Layers, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface BridgeExecution {
  id: string
  action: string
  intent: string
  status: string
  result: {
    success: boolean
    summary: string
    created: { type: string; id?: string; name: string; detail?: string }[]
    errors?: string[]
  } | null
  created_at: string
  completed_at: string | null
}

interface Template {
  key: string
  name: string
  description: string
  trigger: string
  stepCount: number
}

const TEMPLATES: Template[] = [
  { key: 'lead-followup', name: 'Lead Follow-up Sequence', description: 'Text in 5 min, email in 1 hour, call task in 24 hours', trigger: 'contact.created', stepCount: 3 },
  { key: 'appointment-reminder', name: 'Appointment Reminder', description: 'Email 24h before, text 1h before appointment', trigger: 'appointment.scheduled', stepCount: 2 },
  { key: 'review-request', name: 'Review Request', description: 'Text after 2h, email at 24h asking for a review', trigger: 'appointment.completed', stepCount: 2 },
  { key: 'winback', name: 'Win-back Campaign', description: 'Re-engage inactive contacts over 60 days', trigger: 'contact.inactive', stepCount: 3 },
  { key: 'onboarding', name: 'Client Onboarding', description: 'Welcome email, getting started guide, pro tips, check-in call', trigger: 'contact.created', stepCount: 4 },
  { key: 'missed-call', name: 'Missed Call Text-back', description: 'Instant text when a call is missed', trigger: 'call.missed', stepCount: 2 },
  { key: 'invoice-followup', name: 'Invoice Follow-up', description: 'Reminder emails for unpaid invoices', trigger: 'invoice.sent', stepCount: 3 },
]

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed: 'bg-core-green/10 text-core-green',
    running: 'bg-core-cyan/10 text-core-cyan',
    failed: 'bg-core-red/10 text-core-red',
  }
  const cls = map[status] ?? map.running
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${cls}`}>
      {status}
    </span>
  )
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export default function BridgePage() {
  const [executions, setExecutions] = useState<BridgeExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [tryInput, setTryInput] = useState('')
  const [tryLoading, setTryLoading] = useState(false)
  const [tryResult, setTryResult] = useState<BridgeExecution['result'] | null>(null)
  const [deployingTemplate, setDeployingTemplate] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadExecutions()
  }, [])

  async function loadExecutions() {
    setLoading(true)
    const { data } = await supabase
      .from('bridge_executions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    setExecutions((data as BridgeExecution[]) || [])
    setLoading(false)
  }

  async function tryBridge() {
    if (!tryInput.trim() || tryLoading) return
    setTryLoading(true)
    setTryResult(null)

    try {
      const res = await fetch('/api/agent-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: tryInput.trim() }),
      })
      const data = await res.json()
      setTryResult(data)
      loadExecutions()
    } catch {
      setTryResult({ success: false, summary: 'Connection error', created: [], errors: ['Failed to reach Agent Bridge'] })
    }
    setTryLoading(false)
  }

  async function deployTemplate(key: string) {
    const tpl = TEMPLATES.find((t) => t.key === key)
    if (!tpl) return
    setDeployingTemplate(key)

    try {
      const res = await fetch('/api/agent-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-workflow',
          intent: `Deploy the ${tpl.name} template: ${tpl.description}`,
        }),
      })
      const data = await res.json()
      setTryResult(data)
      loadExecutions()
    } catch {
      setTryResult({ success: false, summary: 'Failed to deploy template', created: [], errors: ['Connection error'] })
    }
    setDeployingTemplate(null)
  }

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-core-text m-0">
          <span className="text-core-green">Agent</span> Bridge
        </h1>
        <p className="text-sm text-core-text-muted mt-1.5 mb-0">
          Create agents, workflows, voice AI, and more from natural language.
        </p>
      </div>

      {/* Try It Section */}
      <div className="bg-core-card border border-core-border rounded-xl p-5 mb-6">
        <h2 className="text-base font-bold text-core-text mb-3">
          Try It
        </h2>
        <p className="text-[13px] text-core-text-muted mb-3">
          Describe what you want to automate in plain English.
        </p>
        <form
          onSubmit={(e) => { e.preventDefault(); tryBridge() }}
          className="flex gap-2"
        >
          <input
            value={tryInput}
            onChange={(e) => setTryInput(e.target.value)}
            placeholder="e.g., Set up a lead follow-up sequence with text, email, and a call task"
            disabled={tryLoading}
            className="flex-1 px-3.5 py-2.5 rounded-lg bg-core-bg border border-core-border text-core-text text-[13px] outline-none font-[inherit] disabled:opacity-60 placeholder:text-core-text-muted"
          />
          <button
            type="submit"
            disabled={tryLoading || !tryInput.trim()}
            className={[
              'px-5 py-2.5 rounded-lg border-none text-[13px] font-bold whitespace-nowrap transition-all duration-200',
              tryInput.trim()
                ? 'bg-core-green text-black cursor-pointer'
                : 'bg-core-border text-core-text-muted cursor-default',
              tryLoading ? 'opacity-60' : '',
            ].join(' ')}
          >
            {tryLoading ? 'Running...' : 'Execute'}
          </button>
        </form>

        {/* Try Result */}
        {tryResult && (
          <div className={[
            'mt-4 p-4 rounded-lg border',
            tryResult.success
              ? 'bg-core-green/5 border-core-green/15'
              : 'bg-core-red/5 border-core-red/15',
          ].join(' ')}>
            <div className="flex items-center gap-2 mb-2">
              {tryResult.success
                ? <CheckCircle className="w-4 h-4 text-core-green" />
                : <XCircle className="w-4 h-4 text-core-red" />
              }
              <span className="text-[13px] font-bold text-core-text">
                {tryResult.success ? 'Success' : 'Failed'}
              </span>
            </div>
            <p className="text-[13px] text-core-text-dim leading-relaxed m-0">
              {tryResult.summary}
            </p>
            {tryResult.created?.length > 0 && (
              <div className="mt-2.5">
                {tryResult.created.map((c, i) => (
                  <div
                    key={i}
                    className={[
                      'flex items-center gap-2 py-1.5',
                      i > 0 ? 'border-t border-core-border' : '',
                    ].join(' ')}
                  >
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-core-cyan/10 text-core-cyan uppercase">
                      {c.type}
                    </span>
                    <span className="text-xs text-core-text font-semibold">{c.name}</span>
                    {c.detail && (
                      <span className="text-[11px] text-core-text-muted">{c.detail}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {tryResult.errors && tryResult.errors.length > 0 && (
              <div className="mt-2">
                {tryResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-core-red m-0.5">{e}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Templates */}
      <div className="mb-6">
        <h2 className="text-base font-bold text-core-text mb-3">
          Templates
        </h2>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
          {TEMPLATES.map((tpl) => (
            <div
              key={tpl.key}
              className="bg-core-card border border-core-border rounded-[10px] p-4 flex flex-col gap-2 transition-colors duration-150 hover:border-core-border/80"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-core-text m-0">
                  {tpl.name}
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-core-green/8 text-core-green">
                  {tpl.stepCount} steps
                </span>
              </div>
              <p className="text-xs text-core-text-muted m-0 leading-relaxed">
                {tpl.description}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-core-cyan/8 text-core-cyan font-mono">
                  {tpl.trigger}
                </span>
              </div>
              <button
                onClick={() => deployTemplate(tpl.key)}
                disabled={deployingTemplate === tpl.key}
                className={[
                  'mt-2 py-2 rounded-md border border-core-green/20 bg-core-green/6',
                  'text-core-green text-xs font-bold cursor-pointer transition-all duration-150',
                  deployingTemplate === tpl.key ? 'opacity-50 cursor-not-allowed' : 'hover:bg-core-green/10',
                ].join(' ')}
              >
                {deployingTemplate === tpl.key ? 'Deploying...' : 'Deploy'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Executions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-core-text m-0">
            Recent Executions
          </h2>
          <button
            onClick={loadExecutions}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md border border-core-border bg-transparent text-core-text-muted text-xs cursor-pointer hover:text-core-text transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center bg-core-card border border-core-border rounded-[10px]">
            <Loader2 className="w-6 h-6 text-core-green animate-spin mx-auto" />
          </div>
        ) : executions.length === 0 ? (
          <div className="p-10 text-center bg-core-card border border-core-border rounded-[10px]">
            <p className="text-sm text-core-text-muted m-0">
              No executions yet. Try the Agent Bridge above or deploy a template.
            </p>
          </div>
        ) : (
          <div className="bg-core-card border border-core-border rounded-[10px] overflow-hidden">
            {executions.map((exec, i) => (
              <div
                key={exec.id}
                className={[
                  'px-4 py-3.5 flex items-start gap-3',
                  i < executions.length - 1 ? 'border-b border-core-border' : '',
                ].join(' ')}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-core-purple/10 text-core-purple uppercase font-mono">
                      {exec.action}
                    </span>
                    {statusBadge(exec.status)}
                    <span className="text-[11px] text-core-text-muted">
                      {timeAgo(exec.created_at)}
                    </span>
                  </div>
                  <p className="text-[13px] text-core-text m-0 mb-1 font-medium">
                    {exec.intent}
                  </p>
                  {exec.result?.summary && (
                    <p className="text-xs text-core-text-dim m-0">
                      {exec.result.summary}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
