'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Power, Play, Pause, Trash2, Download, Upload, Clock, Activity,
  Zap, ChevronRight, Layers, Plus, RefreshCw, Settings,
} from 'lucide-react'

interface Switch {
  id: string
  name: string
  description: string | null
  spec: { tool?: { name: string; service: string; method: string }; inputs?: Record<string, unknown> }
  tags: string[]
  steps: Array<{ tool: string; params: Record<string, unknown>; label?: string }>
  is_multi: boolean
  execution_count: number
  last_run_at: string | null
  schedule: { enabled: boolean; cron?: string; interval?: string } | null
  status: string
  created_at: string
  updated_at: string
}

export default function SwitchesPage() {
  const supabase = createClient()
  const [switches, setSwitches] = useState<Switch[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Switch | null>(null)
  const [executing, setExecuting] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const res = await fetch('/api/switches', { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (res.ok) {
      const data = await res.json()
      setSwitches(data.switches || [])
    }
    setLoading(false)
  }

  async function deleteSwitch(id: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch(`/api/switches?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } })
    setSwitches(prev => prev.filter(s => s.id !== id))
    setSelected(null)
  }

  function exportSwitch(sw: Switch) {
    const blob = new Blob([JSON.stringify(sw.is_multi ? { name: sw.name, description: sw.description, steps: sw.steps, tags: sw.tags } : sw.spec, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sw.name.replace(/\s+/g, '-').toLowerCase()}.0n`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importSwitch() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.0n,.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      const spec = JSON.parse(text)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await fetch('/api/switches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: spec.name || file.name.replace(/\.(0n|json)$/, ''), description: spec.description, spec, tags: spec.tags || [] }),
      })
      load()
    }
    input.click()
  }

  const active = switches.filter(s => s.status === 'active')
  const scheduled = switches.filter(s => s.schedule?.enabled)
  const multiStep = switches.filter(s => s.is_multi)
  const totalRuns = switches.reduce((sum, s) => sum + s.execution_count, 0)

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-text-muted animate-pulse">Loading switches...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Switches</h1>
          <p className="mt-1 text-sm text-text-muted">
            One-click automation buttons. Each switch compiles one or more tools into a single execution.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={importSwitch} className="gap-1.5">
            <Upload className="h-3.5 w-3.5" /> Import .0n
          </Button>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Switches', value: switches.length, icon: <Power className="h-4 w-4" />, color: 'text-accent' },
          { label: 'Multi-Step', value: multiStep.length, icon: <Layers className="h-4 w-4" />, color: 'text-purple' },
          { label: 'Scheduled', value: scheduled.length, icon: <Clock className="h-4 w-4" />, color: 'text-cyan' },
          { label: 'Total Runs', value: totalRuns, icon: <Activity className="h-4 w-4" />, color: 'text-orange' },
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

      {/* Switch Grid */}
      {switches.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-bg-card/50 p-12 text-center">
          <Power className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">No switches yet.</p>
          <p className="text-xs text-text-muted mt-1">Build an automation or save a tool execution as a Switch.</p>
          <div className="flex gap-2 justify-center mt-4">
            <Button variant="outline" size="sm" onClick={importSwitch} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Import .0n File
            </Button>
            <Button size="sm" className="bg-accent text-cta-text hover:bg-accent-action gap-1.5" onClick={() => window.location.href = '/dashboard/automations'}>
              <Plus className="h-3.5 w-3.5" /> Build Automation
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {switches.map(sw => (
            <div
              key={sw.id}
              onClick={() => setSelected(sw)}
              className="cursor-pointer rounded-xl border border-border/50 bg-bg-card/50 p-5 transition-colors hover:border-border group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    sw.status === 'active' ? 'bg-accent/10' : 'bg-bg-secondary'
                  }`}>
                    <Power className={`h-4 w-4 ${sw.status === 'active' ? 'text-accent' : 'text-text-muted'}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">{sw.name}</h3>
                    {sw.is_multi && (
                      <span className="text-[10px] text-purple flex items-center gap-0.5">
                        <Layers className="h-2.5 w-2.5" /> {sw.steps.length} steps
                      </span>
                    )}
                  </div>
                </div>
                {sw.schedule?.enabled && (
                  <Badge className="bg-cyan/10 text-cyan border-cyan/20 text-[10px]">
                    <Clock className="h-2.5 w-2.5 mr-0.5" /> Scheduled
                  </Badge>
                )}
              </div>

              {sw.description && (
                <p className="text-xs text-text-muted line-clamp-2 mb-2">{sw.description}</p>
              )}

              {sw.spec?.tool?.name && !sw.is_multi && (
                <p className="font-mono text-[11px] text-text-muted mb-2">{sw.spec.tool.name}</p>
              )}

              {sw.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {sw.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline" className="text-[9px] h-4">{tag}</Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
                <span className="text-[11px] text-text-muted">
                  {sw.execution_count} runs
                  {sw.last_run_at && ` · ${new Date(sw.last_run_at).toLocaleDateString()}`}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={e => { e.stopPropagation(); /* execute */ }}
                >
                  <Play className="h-3.5 w-3.5 text-accent" />
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
                  selected.status === 'active' ? 'bg-accent/10' : 'bg-bg-card'
                }`}>
                  <Power className={`h-5 w-5 ${selected.status === 'active' ? 'text-accent' : 'text-text-muted'}`} />
                </div>
                <div>
                  <DialogTitle className="text-white">{selected.name}</DialogTitle>
                  <DialogDescription>
                    {selected.is_multi ? `${selected.steps.length} steps` : selected.spec?.tool?.name || 'Single tool'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {selected.description && (
              <p className="text-sm text-text-secondary">{selected.description}</p>
            )}

            {/* Steps visualization for multi-step */}
            {selected.is_multi && selected.steps.length > 0 && (
              <div className="border-t border-border/50 pt-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Execution Steps</p>
                <div className="space-y-1.5">
                  {selected.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-bg-card p-2.5">
                      <div className="h-5 w-5 rounded bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate">{step.label || step.tool}</p>
                        <p className="text-[10px] text-text-muted font-mono truncate">{step.tool}</p>
                      </div>
                      {i < selected.steps.length - 1 && <ChevronRight className="h-3 w-3 text-text-muted shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-3">
              <div className="rounded-lg bg-bg-card p-2.5 text-center">
                <p className="text-lg font-bold text-white">{selected.execution_count}</p>
                <p className="text-[10px] text-text-muted">Runs</p>
              </div>
              <div className="rounded-lg bg-bg-card p-2.5 text-center">
                <p className="text-lg font-bold text-white">{selected.status === 'active' ? 'On' : 'Off'}</p>
                <p className="text-[10px] text-text-muted">Status</p>
              </div>
              <div className="rounded-lg bg-bg-card p-2.5 text-center">
                <p className="text-lg font-bold text-white">{selected.schedule?.enabled ? 'Yes' : 'No'}</p>
                <p className="text-[10px] text-text-muted">Scheduled</p>
              </div>
            </div>

            <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-2 border-t border-border/50 pt-3">
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => exportSwitch(selected)} className="gap-1">
                  <Download className="h-3 w-3" /> Export
                </Button>
                <Button variant="outline" size="sm" className="text-red hover:text-red gap-1" onClick={() => deleteSwitch(selected.id)}>
                  <Trash2 className="h-3 w-3" /> Delete
                </Button>
              </div>
              <Button size="sm" className="bg-accent text-cta-text hover:bg-accent-action gap-1.5">
                <Play className="h-3.5 w-3.5" /> Run Switch
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
