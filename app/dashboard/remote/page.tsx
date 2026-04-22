'use client'

import { useState, useEffect } from 'react'
import {
  Bot, Plus, Play, Clock, Loader2,
  Zap, Activity,
  FileText, Shield, BarChart3, Mail, Globe, Terminal
} from 'lucide-react'

interface Agent {
  id: string
  name: string
  description: string
  prompt: string
  cron_expression: string | null
  enabled: boolean
  model: string
  category: string
  total_runs: number
  last_run_at: string | null
  last_status: string | null
  last_result: string | null
  trigger_id: string | null
  created_at: string
  remote_agent_runs?: { id: string; status: string; started_at: string; duration_ms: number }[]
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Bot; dotClass: string; bgClass: string }> = {
  content:       { icon: FileText,  dotClass: 'bg-core-cyan',   bgClass: 'bg-core-cyan/10 border border-core-cyan/20'   },
  monitoring:    { icon: Activity,  dotClass: 'bg-core-green',  bgClass: 'bg-core-green/10 border border-core-green/20'  },
  security:      { icon: Shield,    dotClass: 'bg-core-red',    bgClass: 'bg-core-red/10 border border-core-red/20'      },
  analytics:     { icon: BarChart3, dotClass: 'bg-core-purple', bgClass: 'bg-core-purple/10 border border-core-purple/20'},
  communication: { icon: Mail,      dotClass: 'bg-core-amber',  bgClass: 'bg-core-amber/10 border border-core-amber/20'  },
  deployment:    { icon: Globe,     dotClass: 'bg-core-cyan',   bgClass: 'bg-core-cyan/10 border border-core-cyan/20'   },
  general:       { icon: Bot,       dotClass: 'bg-core-green',  bgClass: 'bg-core-green/10 border border-core-green/20'  },
  automation:    { icon: Zap,       dotClass: 'bg-core-amber',  bgClass: 'bg-core-amber/10 border border-core-amber/20'  },
}

const TEMPLATES = [
  { name: 'Daily Blog Generator', category: 'content', prompt: 'Generate one new SXO-optimized blog post by calling: curl -s https://0ncore.com/api/cron/blog\nAlso generate a use case: curl -s https://0ncore.com/api/cron/use-cases\nReport results.', cron: '0 10 * * *' },
  { name: 'Health Check', category: 'monitoring', prompt: 'Check all endpoints: 0ncore.com, rocketopp.com, 0nmcp.com. Report HTTP status codes. Flag any non-200 as CRITICAL.', cron: '0 12 * * *' },
  { name: 'HIPAA Site Scan', category: 'security', prompt: 'Run a HIPAA compliance scan on a target URL by calling: curl -s -X POST https://0ncore.com/api/hipaa/scan with publicUrl and dashboardUrl. Report the scores.', cron: null },
  { name: 'CRM Sync Check', category: 'monitoring', prompt: 'Verify CRM connection is active. Check contact count, pipeline status, and recent activity. Report any issues.', cron: '0 14 * * 1-5' },
  { name: 'SEO Analysis', category: 'analytics', prompt: 'Analyze the latest CRO9 Neuro Engine results. Check for new tasks, scoring changes, and brief generation status.', cron: null },
  { name: 'Custom Agent', category: 'general', prompt: '', cron: null },
]

// Run dot color based on status
const RUN_DOT: Record<string, string> = {
  success: 'bg-core-green',
  failure: 'bg-core-red',
  default: 'bg-core-amber',
}

export default function RemotePage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', prompt: '', cronExpression: '', category: 'general' })

  useEffect(() => { fetchAgents() }, [])

  async function fetchAgents() {
    setLoading(true)
    try {
      const res = await fetch('/api/remote/agents')
      const data = await res.json()
      setAgents(data.agents || [])
    } catch {}
    setLoading(false)
  }

  async function createAgent(template?: typeof TEMPLATES[0]) {
    const payload = template
      ? { name: template.name, prompt: template.prompt, category: template.category, cronExpression: template.cron }
      : form
    if (!payload.name || !payload.prompt) return
    setCreating(true)
    try {
      const res = await fetch('/api/remote/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        fetchAgents()
        setShowCreate(false)
        setForm({ name: '', description: '', prompt: '', cronExpression: '', category: 'general' })
      }
    } catch {}
    setCreating(false)
  }

  async function runAgent(id: string) {
    setRunningId(id)
    try {
      await fetch(`/api/remote/agents/${id}/run`, { method: 'POST' })
      setTimeout(fetchAgents, 2000)
    } catch {}
    setTimeout(() => setRunningId(null), 3000)
  }

  return (
    <div className="max-w-[1000px] mx-auto px-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-core-text flex items-center gap-2">
            <Terminal className="size-5 text-core-green" />
            0nRemote
          </h1>
          <p className="text-xs text-core-text-muted mt-1">
            AI agents that run on schedule or on demand. Powered by Claude + Groq.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-core-green text-core-bg text-sm font-semibold hover:bg-core-green/90 transition-colors"
        >
          <Plus className="size-4" /> New Agent
        </button>
      </div>

      {/* Create panel */}
      {showCreate && (
        <div className="rounded-xl border border-core-border bg-core-card p-6 mb-6">
          <h3 className="text-sm font-semibold text-core-text mb-4">Quick Start Templates</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {TEMPLATES.map(t => {
              const cfg = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG.general
              const Icon = cfg.icon
              return (
                <button
                  key={t.name}
                  onClick={() => t.prompt ? createAgent(t) : setForm({ ...form, name: t.name, category: t.category })}
                  disabled={creating}
                  className="flex items-center gap-3 p-3 rounded-lg border border-core-border bg-core-bg hover:bg-core-card-hover hover:border-core-green/20 transition-all text-left"
                >
                  <Icon className={`size-4 shrink-0 ${cfg.dotClass.replace('bg-', 'text-')}`} />
                  <div>
                    <div className="text-xs font-semibold text-core-text">{t.name}</div>
                    <div className="text-[10px] text-core-text-muted">{t.cron ? 'Scheduled' : 'On demand'}</div>
                  </div>
                </button>
              )
            })}
          </div>

          <h3 className="text-sm font-semibold text-core-text mb-3">Custom Agent</h3>
          <div className="space-y-3">
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Agent name"
              className="w-full rounded-lg border border-core-border bg-core-bg px-4 py-2.5 text-sm text-core-text placeholder:text-core-text-muted focus:border-core-green/40 focus:outline-none"
            />
            <textarea
              value={form.prompt}
              onChange={e => setForm({ ...form, prompt: e.target.value })}
              placeholder="What should this agent do? Be specific — it runs in an isolated environment with no context."
              rows={4}
              className="w-full rounded-lg border border-core-border bg-core-bg px-4 py-2.5 text-sm text-core-text placeholder:text-core-text-muted focus:border-core-green/40 focus:outline-none resize-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={form.cronExpression}
                onChange={e => setForm({ ...form, cronExpression: e.target.value })}
                placeholder="Cron (e.g. 0 10 * * *) — leave blank for on-demand"
                className="rounded-lg border border-core-border bg-core-bg px-4 py-2.5 text-sm text-core-text placeholder:text-core-text-muted focus:border-core-green/40 focus:outline-none font-mono"
              />
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="rounded-lg border border-core-border bg-core-bg px-4 py-2.5 text-sm text-core-text focus:border-core-green/40 focus:outline-none"
              >
                {Object.keys(CATEGORY_CONFIG).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg border border-core-border text-sm font-medium text-core-text-muted hover:text-core-text transition-colors bg-transparent"
              >
                Cancel
              </button>
              <button
                onClick={() => createAgent()}
                disabled={creating || !form.name || !form.prompt}
                className="px-4 py-2 rounded-lg bg-core-green text-core-bg text-sm font-semibold hover:bg-core-green/90 transition-colors disabled:opacity-40"
              >
                {creating ? 'Creating...' : 'Create Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-core-green" />
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-xl border border-core-border bg-core-card p-12 text-center">
          <Terminal className="size-10 text-core-text-muted/30 mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-core-text mb-2">No agents yet</h3>
          <p className="text-xs text-core-text-muted mb-4">Create your first remote AI agent to automate tasks.</p>
          <button onClick={() => setShowCreate(true)} className="text-sm font-semibold text-core-green hover:underline bg-transparent border-0 cursor-pointer">
            Create Agent
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map(agent => {
            const cfg = CATEGORY_CONFIG[agent.category] || CATEGORY_CONFIG.general
            const Icon = cfg.icon
            const isRunning = runningId === agent.id
            const recentRuns = agent.remote_agent_runs || []
            const successRate = recentRuns.length > 0
              ? Math.round(recentRuns.filter(r => r.status === 'success').length / recentRuns.length * 100)
              : null

            return (
              <div key={agent.id} className="rounded-xl border border-core-border bg-core-card p-5 group hover:border-core-green/15 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${cfg.bgClass}`}>
                    <Icon className={`size-4 ${cfg.dotClass.replace('bg-', 'text-')}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-core-text">{agent.name}</h3>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${agent.enabled ? 'bg-core-green/10 text-core-green' : 'bg-core-card-hover text-core-text-muted'}`}>
                        {agent.enabled ? 'ACTIVE' : 'PAUSED'}
                      </span>
                      {agent.cron_expression && (
                        <span className="flex items-center gap-1 text-[10px] text-core-text-muted">
                          <Clock className="size-2.5" /> {agent.cron_expression}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-core-text-muted truncate">{agent.prompt.slice(0, 120)}...</p>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mt-3 text-[10px] text-core-text-muted">
                      <span>{agent.total_runs} runs</span>
                      {successRate !== null && <span className="text-core-green">{successRate}% success</span>}
                      {agent.last_run_at && (
                        <span>
                          Last: {new Date(agent.last_run_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <span className="text-core-text-muted/50">{agent.model}</span>
                    </div>

                    {/* Recent run dots */}
                    {recentRuns.length > 0 && (
                      <div className="flex gap-0.5 mt-2">
                        {recentRuns.slice(0, 10).map(run => (
                          <div
                            key={run.id}
                            className={`w-2 h-2 rounded-full ${RUN_DOT[run.status] || RUN_DOT.default}`}
                            title={`${run.status} — ${run.duration_ms}ms`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => runAgent(agent.id)}
                      disabled={isRunning}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-core-green/20 text-xs font-semibold text-core-green hover:bg-core-green/10 transition-colors disabled:opacity-50 bg-transparent cursor-pointer"
                    >
                      {isRunning ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
                      {isRunning ? 'Running...' : 'Run'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info footer */}
      <div className="mt-8 rounded-xl border border-core-border bg-core-card p-5">
        <h3 className="text-xs font-semibold text-core-text-muted uppercase tracking-wider mb-3">How 0nRemote Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-core-text-muted">
          <div>
            <div className="font-semibold text-core-text mb-1 flex items-center gap-1.5">
              <Bot className="size-3 text-core-green" /> Create
            </div>
            Define what the agent should do. Use templates or write custom prompts. Set a schedule or run on demand.
          </div>
          <div>
            <div className="font-semibold text-core-text mb-1 flex items-center gap-1.5">
              <Zap className="size-3 text-core-green" /> Execute
            </div>
            Agents run via Groq AI (free) for quick tasks. Claude Code cloud sessions for full builds. Slack notifications on completion.
          </div>
          <div>
            <div className="font-semibold text-core-text mb-1 flex items-center gap-1.5">
              <Activity className="size-3 text-core-green" /> Monitor
            </div>
            Track run history, success rates, and duration. View results inline. Get notified via Slack on success or failure.
          </div>
        </div>
      </div>
    </div>
  )
}
