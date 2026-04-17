'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Zap, Play, Pause, Clock, BarChart3, RefreshCw, Eye,
  CheckCircle, XCircle, AlertTriangle, Activity,
} from 'lucide-react'

interface WorkflowStats {
  total: number
  lastRun: string | null
  errors: number
}

interface Workflow {
  id: string
  name: string
  status: string
  version: number
  createdAt: string
  updatedAt: string
  locationId: string
  stats: WorkflowStats
}

export default function WorkflowsPage() {
  const supabase = createClient()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Workflow | null>(null)
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const res = await fetch('/api/crm/workflows', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setWorkflows(data.workflows || [])
    }
    setLoading(false)
  }

  const filtered = filter === 'all' ? workflows
    : workflows.filter(w => w.status === filter)

  const publishedCount = workflows.filter(w => w.status === 'published').length
  const draftCount = workflows.filter(w => w.status === 'draft').length
  const totalExecutions = workflows.reduce((sum, w) => sum + w.stats.total, 0)
  const totalErrors = workflows.reduce((sum, w) => sum + w.stats.errors, 0)

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-text-muted animate-pulse">Loading workflows...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Workflows</h1>
          <p className="mt-1 text-sm text-text-muted">
            CRM automation workflows. Read-only view — automations are built from the Automations page.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: workflows.length, icon: <Zap className="h-4 w-4" />, color: 'text-accent' },
          { label: 'Active', value: publishedCount, icon: <Play className="h-4 w-4" />, color: 'text-success' },
          { label: 'Executions', value: totalExecutions, icon: <Activity className="h-4 w-4" />, color: 'text-cyan' },
          { label: 'Errors', value: totalErrors, icon: <AlertTriangle className="h-4 w-4" />, color: totalErrors > 0 ? 'text-red' : 'text-text-muted' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border/50 bg-bg-card/50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={s.color}>{s.icon}</span>
              <span className="text-[11px] text-text-muted uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'published', 'draft'] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === t ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-white'
            }`}
          >
            {t === 'all' ? `All (${workflows.length})` : t === 'published' ? `Active (${publishedCount})` : `Draft (${draftCount})`}
          </button>
        ))}
      </div>

      {/* Workflow List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-bg-card/50 p-12 text-center">
          <Zap className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">
            {filter === 'all' ? 'No workflows found in this location.' : `No ${filter} workflows.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(w => (
            <div
              key={w.id}
              onClick={() => setSelected(w)}
              className="cursor-pointer rounded-xl border border-border/50 bg-bg-card/50 p-4 flex items-center justify-between transition-colors hover:border-border"
            >
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                  w.status === 'published' ? 'bg-success/10' : 'bg-bg-secondary'
                }`}>
                  {w.status === 'published'
                    ? <Play className="h-4 w-4 text-success" />
                    : <Pause className="h-4 w-4 text-text-muted" />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{w.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-text-muted">v{w.version}</span>
                    {w.stats.total > 0 && (
                      <span className="text-[11px] text-text-muted flex items-center gap-1">
                        <Activity className="h-3 w-3" /> {w.stats.total} runs
                      </span>
                    )}
                    {w.stats.lastRun && (
                      <span className="text-[11px] text-text-muted flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {new Date(w.stats.lastRun).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {w.stats.errors > 0 && (
                  <Badge className="bg-red/10 text-red border-red/20 text-[10px]">
                    {w.stats.errors} errors
                  </Badge>
                )}
                <Badge className={
                  w.status === 'published'
                    ? 'bg-success/10 text-success border-success/20 text-[10px]'
                    : 'bg-bg-secondary text-text-muted border-border/50 text-[10px]'
                }>
                  {w.status === 'published' ? 'Active' : 'Draft'}
                </Badge>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="sm:max-w-lg bg-bg-secondary border-border">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  selected.status === 'published' ? 'bg-success/10' : 'bg-bg-card'
                }`}>
                  {selected.status === 'published'
                    ? <Play className="h-5 w-5 text-success" />
                    : <Pause className="h-5 w-5 text-text-muted" />
                  }
                </div>
                <div>
                  <DialogTitle className="text-white">{selected.name}</DialogTitle>
                  <DialogDescription>Workflow ID: {selected.id.slice(0, 12)}...</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-bg-card p-3">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Status</p>
                  <div className="flex items-center gap-1.5">
                    {selected.status === 'published'
                      ? <CheckCircle className="h-4 w-4 text-success" />
                      : <XCircle className="h-4 w-4 text-text-muted" />
                    }
                    <span className="text-sm text-white font-medium">{selected.status === 'published' ? 'Active' : 'Draft'}</span>
                  </div>
                </div>
                <div className="rounded-lg bg-bg-card p-3">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Version</p>
                  <p className="text-sm text-white font-medium">v{selected.version}</p>
                </div>
                <div className="rounded-lg bg-bg-card p-3">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Total Runs</p>
                  <p className="text-sm text-white font-medium">{selected.stats.total}</p>
                </div>
                <div className="rounded-lg bg-bg-card p-3">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Errors</p>
                  <p className={`text-sm font-medium ${selected.stats.errors > 0 ? 'text-red' : 'text-white'}`}>{selected.stats.errors}</p>
                </div>
              </div>

              <div className="border-t border-border/50 pt-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Details</p>
                <div className="space-y-1.5 text-xs text-text-secondary">
                  <div className="flex justify-between"><span>Created</span><span>{new Date(selected.createdAt).toLocaleDateString()}</span></div>
                  <div className="flex justify-between"><span>Updated</span><span>{new Date(selected.updatedAt).toLocaleDateString()}</span></div>
                  <div className="flex justify-between"><span>Location</span><span className="font-mono">{selected.locationId?.slice(0, 12)}...</span></div>
                  {selected.stats.lastRun && (
                    <div className="flex justify-between"><span>Last Run</span><span>{new Date(selected.stats.lastRun).toLocaleString()}</span></div>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-text-muted">
                Workflows are read-only from this view. To edit, pause, or create workflows, use the Automations builder.
              </p>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
