'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Search, Play, Pause, Trash2, Copy, Download, Upload,
  GitBranch, Clock, Zap, CheckCircle, AlertCircle, ChevronDown,
  MoreHorizontal, ArrowRight, Layers, FileJson, ExternalLink,
  Filter, SortAsc, Eye, Pencil, X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnFlow {
  id: string
  name: string
  description: string
  status: 'active' | 'draft' | 'paused'
  trigger_type: string
  node_count: number
  execution_count: number
  last_executed_at: string | null
  created_at: string
  updated_at: string
  dot_on_file: Record<string, unknown>
  nodes: unknown[]
  edges: unknown[]
  webhook_id?: string
  contains_subflows?: string[] // IDs of nested 0nFlows
}

type SortKey = 'name' | 'status' | 'updated_at' | 'execution_count' | 'node_count'
type SortDir = 'asc' | 'desc'

const STATUS_CONFIG = {
  active: { label: 'Active', dotClass: 'bg-core-green', badgeClass: 'bg-core-green/10 text-core-green border-core-green/20' },
  draft: { label: 'Draft', dotClass: 'bg-core-amber', badgeClass: 'bg-core-amber/10 text-core-amber border-core-amber/20' },
  paused: { label: 'Paused', dotClass: 'bg-core-text-muted', badgeClass: 'bg-core-border/30 text-core-text-muted border-core-border' },
}

const TRIGGER_LABELS: Record<string, string> = {
  trigger_new_lead: 'New Lead',
  trigger_form_submit: 'Form Submit',
  trigger_appointment_booked: 'Appointment',
  trigger_payment_received: 'Payment',
  trigger_tag_added: 'Tag Added',
  trigger_no_response: 'No Response',
  manual: 'Manual',
}

export default function FlowsPage() {
  const router = useRouter()
  const [flows, setFlows] = useState<OnFlow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('updated_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  // Load flows
  useEffect(() => {
    loadFlows()
  }, [])

  async function loadFlows() {
    setLoading(true)
    try {
      const res = await fetch('/api/automations/list')
      const data = await res.json()
      setFlows(data.workflows || [])
    } catch {
      // Fallback: load from localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('0ncore-automations') || '[]')
        setFlows(stored.map((s: any) => ({
          id: s.id,
          name: s.name,
          description: `${s.nodes?.length || 0} steps`,
          status: s.status || 'draft',
          trigger_type: 'manual',
          node_count: s.nodes?.length || 0,
          execution_count: 0,
          last_executed_at: null,
          created_at: new Date(s.updatedAt || Date.now()).toISOString(),
          updated_at: new Date(s.updatedAt || Date.now()).toISOString(),
          dot_on_file: {},
          nodes: s.nodes || [],
          edges: s.edges || [],
        })))
      } catch {}
    }
    setLoading(false)
  }

  // Sort + filter
  const filtered = flows
    .filter(f => statusFilter === 'all' || f.status === statusFilter)
    .filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.description?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'name') return a.name.localeCompare(b.name) * dir
      if (sortKey === 'status') return a.status.localeCompare(b.status) * dir
      if (sortKey === 'execution_count') return ((a.execution_count || 0) - (b.execution_count || 0)) * dir
      if (sortKey === 'node_count') return ((a.node_count || 0) - (b.node_count || 0)) * dir
      return (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * dir
    })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(f => f.id)))
  }

  // Actions
  async function handleDelete(id: string) {
    await fetch('/api/automations/list', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {})
    setFlows(prev => prev.filter(f => f.id !== id))
    setActionMenuId(null)
  }

  async function handleDuplicate(flow: OnFlow) {
    const newFlow = {
      ...flow,
      name: `${flow.name} (Copy)`,
      status: 'draft' as const,
    }
    // Save via API
    await fetch('/api/automations/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newFlow.name,
        description: newFlow.description,
        dot_on_file: newFlow.dot_on_file,
        nodes: newFlow.nodes,
        edges: newFlow.edges,
        status: 'draft',
      }),
    }).catch(() => {})
    loadFlows()
    setActionMenuId(null)
  }

  function handleExport(flow: OnFlow) {
    const dotOn = {
      schema: '0n-workflow/v1',
      name: flow.name,
      version: '1.0.0',
      description: flow.description,
      ...flow.dot_on_file,
      metadata: {
        exported_at: new Date().toISOString(),
        node_count: flow.node_count,
        source: '0ncore-flows',
      },
    }
    const blob = new Blob([JSON.stringify(dotOn, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${flow.name.replace(/\s+/g, '-').toLowerCase()}.0n`
    a.click()
    URL.revokeObjectURL(url)
    setActionMenuId(null)
  }

  async function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.0n,.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setImporting(true)
      try {
        const text = await file.text()
        const parsed = JSON.parse(text)
        await fetch('/api/automations/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: parsed.name || file.name.replace('.0n', ''),
            description: parsed.description || 'Imported workflow',
            dot_on_file: parsed,
            nodes: parsed.steps?.map((s: any, i: number) => ({
              id: s.id || `imported_${i}`,
              type: 'capability',
              position: { x: 400, y: 80 + i * 140 },
              data: { capabilityId: s.action, name: s.input?.name || s.action, description: '', icon: 'Zap', color: '#14b8a6', category: 'ai', configured: true, steps: [], config: s.input?.config || {} },
            })) || [],
            edges: [],
            status: 'draft',
          }),
        })
        loadFlows()
      } catch {}
      setImporting(false)
    }
    input.click()
  }

  const activeCount = flows.filter(f => f.status === 'active').length
  const totalExecutions = flows.reduce((sum, f) => sum + (f.execution_count || 0), 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-core-text">0nFlows</h1>
          <p className="text-sm text-core-text-muted mt-0.5">
            {flows.length} workflows · {activeCount} active · {totalExecutions.toLocaleString()} executions
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleImport} disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 bg-core-card border border-core-border rounded-lg text-xs text-core-text-dim hover:text-core-text hover:border-core-green/20 transition-all">
            <Upload className="w-3.5 h-3.5" />
            Import .0n
          </button>
          <button onClick={() => router.push('/dashboard/automations')}
            className="flex items-center gap-1.5 px-4 py-2 bg-core-green text-core-bg font-bold text-xs rounded-lg hover:brightness-110 transition-all">
            <Plus className="w-3.5 h-3.5" />
            New Flow
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-core-text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search flows..."
            className="w-full pl-9 pr-3 py-2 bg-core-card border border-core-border rounded-lg text-sm text-core-text placeholder:text-core-text-muted focus:outline-none focus:border-core-green/40 transition-colors" />
        </div>
        <div className="flex bg-core-card border border-core-border rounded-lg overflow-hidden">
          {['all', 'active', 'draft', 'paused'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-2 text-xs font-medium transition-colors capitalize',
                statusFilter === s ? 'bg-core-green/15 text-core-green' : 'text-core-text-muted hover:text-core-text')}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-core-card border border-core-border rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[32px_1fr_100px_100px_80px_100px_120px_40px] gap-2 px-4 py-2.5 border-b border-core-border bg-core-bg/50 text-[11px] font-semibold text-core-text-muted uppercase tracking-wide">
          <div className="flex items-center">
            <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={selectAll}
              className="w-3.5 h-3.5 rounded border-core-border accent-core-green cursor-pointer" />
          </div>
          <button onClick={() => toggleSort('name')} className="flex items-center gap-1 text-left cursor-pointer bg-transparent border-none text-[11px] font-semibold text-core-text-muted uppercase tracking-wide hover:text-core-text transition-colors">
            Name {sortKey === 'name' && <SortAsc className={cn('w-3 h-3', sortDir === 'desc' && 'rotate-180')} />}
          </button>
          <button onClick={() => toggleSort('status')} className="flex items-center gap-1 cursor-pointer bg-transparent border-none text-[11px] font-semibold text-core-text-muted uppercase tracking-wide hover:text-core-text transition-colors">
            Status
          </button>
          <div>Trigger</div>
          <button onClick={() => toggleSort('node_count')} className="flex items-center gap-1 cursor-pointer bg-transparent border-none text-[11px] font-semibold text-core-text-muted uppercase tracking-wide hover:text-core-text transition-colors text-right">
            Steps
          </button>
          <button onClick={() => toggleSort('execution_count')} className="flex items-center gap-1 cursor-pointer bg-transparent border-none text-[11px] font-semibold text-core-text-muted uppercase tracking-wide hover:text-core-text transition-colors text-right">
            Runs
          </button>
          <button onClick={() => toggleSort('updated_at')} className="flex items-center gap-1 cursor-pointer bg-transparent border-none text-[11px] font-semibold text-core-text-muted uppercase tracking-wide hover:text-core-text transition-colors">
            Updated
          </button>
          <div />
        </div>

        {/* Table rows */}
        {loading ? (
          <div className="py-12 text-center text-sm text-core-text-muted">Loading flows...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <GitBranch className="w-8 h-8 text-core-text-muted mx-auto mb-3" />
            <p className="text-sm text-core-text-muted">
              {search ? 'No flows match your search' : 'No flows yet — create your first automation'}
            </p>
          </div>
        ) : (
          filtered.map(flow => {
            const statusCfg = STATUS_CONFIG[flow.status] || STATUS_CONFIG.draft
            return (
              <div key={flow.id}
                className="grid grid-cols-[32px_1fr_100px_100px_80px_100px_120px_40px] gap-2 px-4 py-3 border-b border-core-border/50 hover:bg-core-card-hover/30 transition-colors items-center group">

                <div>
                  <input type="checkbox" checked={selectedIds.has(flow.id)} onChange={() => toggleSelect(flow.id)}
                    className="w-3.5 h-3.5 rounded border-core-border accent-core-green cursor-pointer" />
                </div>

                {/* Name + description */}
                <div className="min-w-0">
                  <button onClick={() => router.push(`/dashboard/automations?load=${flow.id}`)}
                    className="text-sm font-semibold text-core-text hover:text-core-green transition-colors truncate block text-left bg-transparent border-none cursor-pointer p-0">
                    {flow.name}
                  </button>
                  <p className="text-[11px] text-core-text-muted truncate">{flow.description}</p>
                </div>

                {/* Status */}
                <div>
                  <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border', statusCfg.badgeClass)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dotClass)} />
                    {statusCfg.label}
                  </span>
                </div>

                {/* Trigger */}
                <div className="text-xs text-core-text-dim">
                  {TRIGGER_LABELS[flow.trigger_type] || flow.trigger_type}
                </div>

                {/* Steps */}
                <div className="text-xs text-core-text-dim text-right font-mono">
                  {flow.node_count}
                </div>

                {/* Executions */}
                <div className="text-xs text-core-text-dim text-right font-mono">
                  {(flow.execution_count || 0).toLocaleString()}
                </div>

                {/* Updated */}
                <div className="text-[11px] text-core-text-muted">
                  {new Date(flow.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>

                {/* Actions */}
                <div className="relative">
                  <button onClick={() => setActionMenuId(actionMenuId === flow.id ? null : flow.id)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-core-text-muted hover:text-core-text hover:bg-core-card-hover transition-colors cursor-pointer bg-transparent border-none opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {actionMenuId === flow.id && (
                    <>
                      <div className="fixed inset-0 z-[1]" onClick={() => setActionMenuId(null)} />
                      <div className="absolute right-0 top-full mt-1 w-[180px] bg-core-card border border-core-border rounded-lg p-1 z-[2] shadow-lg">
                        <button onClick={() => { router.push(`/dashboard/automations?load=${flow.id}`); setActionMenuId(null) }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-core-text hover:bg-core-card-hover rounded-md cursor-pointer bg-transparent border-none text-left transition-colors">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button onClick={() => handleDuplicate(flow)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-core-text hover:bg-core-card-hover rounded-md cursor-pointer bg-transparent border-none text-left transition-colors">
                          <Copy className="w-3.5 h-3.5" /> Duplicate
                        </button>
                        <button onClick={() => handleExport(flow)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-core-text hover:bg-core-card-hover rounded-md cursor-pointer bg-transparent border-none text-left transition-colors">
                          <Download className="w-3.5 h-3.5" /> Export .0n
                        </button>
                        <div className="border-t border-core-border my-1" />
                        <button onClick={() => handleDelete(flow.id)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-core-red hover:bg-core-red/10 rounded-md cursor-pointer bg-transparent border-none text-left transition-colors">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 bg-core-card border border-core-green/20 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50">
          <span className="text-xs text-core-green font-semibold">{selectedIds.size} selected</span>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-core-text-dim hover:text-core-text bg-transparent border border-core-border rounded-lg cursor-pointer transition-colors">
            <Download className="w-3 h-3" /> Export All
          </button>
          <button onClick={() => { selectedIds.forEach(id => handleDelete(id)); setSelectedIds(new Set()) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-core-red bg-transparent border border-core-red/20 rounded-lg cursor-pointer hover:bg-core-red/10 transition-colors">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="text-core-text-muted hover:text-core-text cursor-pointer bg-transparent border-none transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
