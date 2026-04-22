'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bot, Plus, Play, Clock, CheckCircle2, XCircle, Loader2,
  Zap, RefreshCw, Settings, ChevronRight, Activity,
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

const CATEGORY_CONFIG: Record<string, { icon: typeof Bot; color: string }> = {
  content: { icon: FileText, color: '#00B4FF' },
  monitoring: { icon: Activity, color: '#6EE05A' },
  security: { icon: Shield, color: '#ef4444' },
  analytics: { icon: BarChart3, color: '#8b5cf6' },
  communication: { icon: Mail, color: '#f59e0b' },
  deployment: { icon: Globe, color: '#14b8a6' },
  general: { icon: Bot, color: '#6EE05A' },
  automation: { icon: Zap, color: '#f59e0b' },
}

const TEMPLATES = [
  { name: 'Daily Blog Generator', category: 'content', prompt: 'Generate one new SXO-optimized blog post by calling: curl -s https://0ncore.com/api/cron/blog\nAlso generate a use case: curl -s https://0ncore.com/api/cron/use-cases\nReport results.', cron: '0 10 * * *' },
  { name: 'Health Check', category: 'monitoring', prompt: 'Check all endpoints: 0ncore.com, rocketopp.com, 0nmcp.com. Report HTTP status codes. Flag any non-200 as CRITICAL.', cron: '0 12 * * *' },
  { name: 'HIPAA Site Scan', category: 'security', prompt: 'Run a HIPAA compliance scan on a target URL by calling: curl -s -X POST https://0ncore.com/api/hipaa/scan with publicUrl and dashboardUrl. Report the scores.', cron: null },
  { name: 'CRM Sync Check', category: 'monitoring', prompt: 'Verify CRM connection is active. Check contact count, pipeline status, and recent activity. Report any issues.', cron: '0 14 * * 1-5' },
  { name: 'SEO Analysis', category: 'analytics', prompt: 'Analyze the latest CRO9 Neuro Engine results. Check for new tasks, scoring changes, and brief generation status.', cron: null },
  { name: 'Custom Agent', category: 'general', prompt: '', cron: null },
]

export default function RemotePage() {
  const router = useRouter()
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
    const payload = template ? { name: template.name, prompt: template.prompt, category: template.category, cronExpression: template.cron } : form
    if (!payload.name || !payload.prompt) return
    setCreating(true)
    try {
      const res = await fetch('/api/remote/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) { fetchAgents(); setShowCreate(false); setForm({ name: '', description: '', prompt: '', cronExpression: '', category: 'general' }) }
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
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 8px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Terminal className="size-5 text-primary" />
            0nRemote
          </h1>
          <p className="text-xs text-muted-foreground mt-1">AI agents that run on schedule or on demand. Powered by Claude + Groq.</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="size-4" /> New Agent
        </button>
      </div>

      {/* Create Panel */}
      {showCreate && (
        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Quick Start Templates</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {TEMPLATES.map(t => {
              const cfg = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG.general
              const Icon = cfg.icon
              return (
                <button key={t.name} onClick={() => t.prompt ? createAgent(t) : setForm({ ...form, name: t.name, category: t.category })}
                  disabled={creating}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted hover:border-primary/20 transition-all text-left">
                  <Icon className="size-4 shrink-0" style={{ color: cfg.color }} />
                  <div>
                    <div className="text-xs font-semibold text-foreground">{t.name}</div>
                    <div className="text-[10px] text-muted-foreground">{t.cron ? 'Scheduled' : 'On demand'}</div>
                  </div>
                </button>
              )
            })}
          </div>

          <h3 className="text-sm font-semibold text-foreground mb-3">Custom Agent</h3>
          <div className="space-y-3">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Agent name"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none" />
            <textarea value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })} placeholder="What should this agent do? Be specific — it runs in an isolated environment with no context." rows={4}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.cronExpression} onChange={e => setForm({ ...form, cronExpression: e.target.value })} placeholder="Cron (e.g. 0 10 * * *) — leave blank for on-demand"
                className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none font-mono" />
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary/40 focus:outline-none">
                {Object.keys(CATEGORY_CONFIG).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button onClick={() => createAgent()} disabled={creating || !form.name || !form.prompt}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40">
                {creating ? 'Creating...' : 'Create Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : agents.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Terminal className="size-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-foreground mb-2">No agents yet</h3>
          <p className="text-xs text-muted-foreground mb-4">Create your first remote AI agent to automate tasks.</p>
          <button onClick={() => setShowCreate(true)} className="text-sm font-semibold text-primary hover:underline">Create Agent</button>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map(agent => {
            const cfg = CATEGORY_CONFIG[agent.category] || CATEGORY_CONFIG.general
            const Icon = cfg.icon
            const isRunning = runningId === agent.id
            const recentRuns = agent.remote_agent_runs || []
            const successRate = recentRuns.length > 0 ? Math.round(recentRuns.filter(r => r.status === 'success').length / recentRuns.length * 100) : null

            return (
              <div key={agent.id} className="rounded-xl border border-border bg-card p-5 group hover:border-primary/15 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}25` }}>
                    <Icon className="size-4" style={{ color: cfg.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground">{agent.name}</h3>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${agent.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {agent.enabled ? 'ACTIVE' : 'PAUSED'}
                      </span>
                      {agent.cron_expression && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="size-2.5" /> {agent.cron_expression}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{agent.prompt.slice(0, 120)}...</p>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                      <span>{agent.total_runs} runs</span>
                      {successRate !== null && <span className="text-primary">{successRate}% success</span>}
                      {agent.last_run_at && <span>Last: {new Date(agent.last_run_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                      <span className="text-muted-foreground/50">{agent.model}</span>
                    </div>

                    {/* Recent runs indicator */}
                    {recentRuns.length > 0 && (
                      <div className="flex gap-0.5 mt-2">
                        {recentRuns.slice(0, 10).map(run => (
                          <div key={run.id} className="w-2 h-2 rounded-full" style={{
                            background: run.status === 'success' ? '#6EE05A' : run.status === 'failure' ? '#ef4444' : '#f59e0b',
                          }} title={`${run.status} — ${run.duration_ms}ms`} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => runAgent(agent.id)} disabled={isRunning}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-50">
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
      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">How 0nRemote Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
          <div>
            <div className="font-semibold text-foreground mb-1 flex items-center gap-1.5"><Bot className="size-3 text-primary" /> Create</div>
            Define what the agent should do. Use templates or write custom prompts. Set a schedule or run on demand.
          </div>
          <div>
            <div className="font-semibold text-foreground mb-1 flex items-center gap-1.5"><Zap className="size-3 text-primary" /> Execute</div>
            Agents run via Groq AI (free) for quick tasks. Claude Code cloud sessions for full builds. Slack notifications on completion.
          </div>
          <div>
            <div className="font-semibold text-foreground mb-1 flex items-center gap-1.5"><Activity className="size-3 text-primary" /> Monitor</div>
            Track run history, success rates, and duration. View results inline. Get notified via Slack on success or failure.
          </div>
        </div>
      </div>
    </div>
  )
}
