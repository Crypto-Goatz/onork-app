'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, GripVertical, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useLocation } from '@/lib/location-context'

interface Deal {
  id: string
  name: string
  company: string
  value: number
  urgency: number
  daysInStage: number
  stageId: string
}

interface Stage {
  id: string
  name: string
  color: string
  deals: Deal[]
}

const STAGE_COLORS = ['#6b7280', '#00d4ff', '#7ed957', '#a78bfa', '#f59e0b', '#ef4444']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCrmToStages(pipelines: any[]): Stage[] {
  if (!pipelines?.length) return []
  const pipeline = pipelines[0]
  return (pipeline.stages || []).map((stage: { id: string; name: string }, idx: number) => ({
    id: stage.id,
    name: stage.name,
    color: STAGE_COLORS[idx % STAGE_COLORS.length],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deals: (pipeline.opportunities || []).filter((o: any) => o.pipelineStageId === stage.id || o.stageId === stage.id).map((o: any) => ({
      id: o.id,
      name: o.name || o.contact?.name || 'Unnamed',
      company: o.contact?.companyName || '',
      value: o.monetaryValue || 0,
      urgency: (o.monetaryValue || 0) >= 500 ? 80 : (o.monetaryValue || 0) >= 100 ? 50 : 20,
      daysInStage: Math.floor((Date.now() - new Date(o.lastStageChangeAt || o.createdAt || Date.now()).getTime()) / 86400000),
      stageId: stage.id,
    })),
  }))
}

function urgencyColor(v: number) {
  if (v >= 70) return 'text-core-red'
  if (v >= 40) return 'text-core-amber'
  return 'text-core-green'
}

function urgencyHex(v: number) {
  if (v >= 70) return '#ef4444'
  if (v >= 40) return '#f59e0b'
  return '#7ed957'
}

export default function PipelinePage() {
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const [addDesc, setAddDesc] = useState('')
  const [addUrgency, setAddUrgency] = useState(30)
  const [addStageId, setAddStageId] = useState('')
  const [draggedDeal, setDraggedDeal] = useState<{ dealId: string; fromStageId: string } | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [pipelineId, setPipelineId] = useState('')
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const { locationId, refreshKey } = useLocation()

  useEffect(() => { load() }, [refreshKey])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/crm/pipeline')
      const data = await res.json()
      const pipelines = data.pipelines || []
      const mapped = mapCrmToStages(pipelines)
      setStages(mapped)
      setPipelineId(pipelines[0]?.id || '')
      if (mapped.length > 0) setAddStageId(mapped[0].id)
    } catch {}
    setLoading(false)
  }

  function openAdd(stageId?: string) {
    setAddTitle('')
    setAddDesc('')
    setAddUrgency(30)
    setAddStageId(stageId || stages[0]?.id || '')
    setShowAdd(true)
    setTimeout(() => titleRef.current?.focus(), 100)
  }

  async function submitAdd() {
    const title = addTitle.trim()
    if (!title || saving) return
    if (!pipelineId || !addStageId) {
      toast.error('No pipeline available', { description: 'Create a pipeline in your CRM first.' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/crm/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: title,
          pipelineId,
          pipelineStageId: addStageId,
          monetaryValue: 0,
          status: 'open',
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error('Could not add deal', { description: d.error || d.details || 'CRM rejected the request' })
        setSaving(false)
        return
      }
      toast.success('Deal added')
      setAddTitle('')
      setAddDesc('')
      setAddUrgency(30)
      await load()
      setTimeout(() => titleRef.current?.focus(), 50)
    } catch (e) {
      toast.error('Network error', { description: e instanceof Error ? e.message : 'Could not reach CRM' })
    }
    setSaving(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && addTitle.trim()) {
      e.preventDefault()
      submitAdd()
    }
  }

  function handleDragStart(dealId: string, fromStageId: string) { setDraggedDeal({ dealId, fromStageId }) }
  function handleDragOver(e: React.DragEvent, stageId: string) { e.preventDefault(); setDragOverStage(stageId) }
  function handleDragLeave() { setDragOverStage(null) }
  async function handleDrop(toStageId: string) {
    if (!draggedDeal || draggedDeal.fromStageId === toStageId) { setDraggedDeal(null); setDragOverStage(null); return }
    const { dealId, fromStageId } = draggedDeal
    const deal = stages.find(s => s.id === fromStageId)?.deals.find(d => d.id === dealId)
    setDraggedDeal(null)
    setDragOverStage(null)
    if (!deal) return

    // Optimistic move; keep a snapshot to revert if persistence fails.
    const prevStages = stages
    setStages(prev => prev.map(s => {
      if (s.id === fromStageId) return { ...s, deals: s.deals.filter(d => d.id !== dealId) }
      if (s.id === toStageId) return { ...s, deals: [...s.deals, { ...deal, stageId: toStageId }] }
      return s
    }))

    try {
      const res = await fetch('/api/crm/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: dealId,
          pipelineStageId: toStageId,
          ...(pipelineId ? { pipelineId } : {}),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error('Move not saved', { description: d.error || d.details || 'Reverted' })
        setStages(prevStages)
      }
    } catch (e) {
      toast.error('Move not saved', { description: e instanceof Error ? e.message : 'Reverted' })
      setStages(prevStages)
    }
  }

  const totalDeals = stages.reduce((s, st) => s + st.deals.length, 0)

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-core-text-muted animate-pulse">
      Loading pipeline...
    </div>
  )

  return (
    <div className="-mx-6 -mt-6 px-5 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-core-text m-0">Pipeline</h1>
          <Badge variant="outline" className="text-[10px] h-5">{totalDeals} deals</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-core-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="rounded-lg border border-core-border/50 bg-core-card/50 pl-8 pr-3 py-1.5 text-xs text-core-text placeholder:text-core-text-muted w-40"
            />
          </div>
          <Button variant="outline" size="sm" onClick={load} className="h-7 w-7 p-0">
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button size="sm" onClick={() => openAdd()} disabled={stages.length === 0 || !pipelineId} className="h-7 bg-accent text-cta-text hover:bg-accent-action gap-1 text-xs">
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
      </div>

      {/* Empty state — no pipeline/stages from CRM */}
      {stages.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <p className="text-sm text-core-text">No pipeline stages found.</p>
          <p className="text-xs text-core-text-muted mt-1">Create a pipeline in your CRM to start tracking deals here.</p>
        </div>
      ) : (
      /* Kanban board */
      <div className="flex gap-2 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 140px)' }}>
        {stages.map(stage => {
          const filtered = search
            ? stage.deals.filter(d =>
                d.name.toLowerCase().includes(search.toLowerCase()) ||
                d.company.toLowerCase().includes(search.toLowerCase())
              )
            : stage.deals
          const isOver = dragOverStage === stage.id
          return (
            <div
              key={stage.id}
              onDragOver={e => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(stage.id)}
              className={[
                'flex flex-col rounded-xl transition-all duration-150',
                'flex-[1_0_220px] min-w-[220px] max-w-[320px]',
                isOver
                  ? 'bg-core-green/[0.04] border border-core-green/20'
                  : 'bg-white/[0.015] border border-white/[0.04]',
              ].join(' ')}
            >
              {/* Stage header */}
              <div className="px-3 py-2.5 border-b border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: stage.color }}
                  />
                  <span className="text-xs font-semibold text-core-text">{stage.name}</span>
                  <span className="text-[10px] text-white/30">{filtered.length}</span>
                </div>
                <button
                  onClick={() => openAdd(stage.id)}
                  className="bg-transparent border-0 cursor-pointer text-white/20 p-0.5 hover:text-white/50 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Deals list */}
              <div className="flex-1 p-1.5 flex flex-col gap-1 overflow-y-auto">
                {filtered.map(deal => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => handleDragStart(deal.id, stage.id)}
                    className="px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] cursor-grab transition-colors duration-150 hover:border-white/10"
                  >
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="h-3 w-3 text-core-text-muted mt-0.5 shrink-0 opacity-30" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-core-text leading-snug mb-0.5">{deal.name}</div>
                        {deal.company && (
                          <div className="text-[10px] text-white/35">{deal.company}</div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex-1 h-[3px] rounded-sm bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-sm transition-all duration-300"
                              style={{
                                width: `${deal.urgency}%`,
                                background: urgencyHex(deal.urgency),
                              }}
                            />
                          </div>
                          <span
                            className={`text-[9px] font-bold ${urgencyColor(deal.urgency)}`}
                          >
                            {deal.urgency}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      )}

      {/* Quick Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-sm" onKeyDown={handleKeyDown}>
          <DialogHeader>
            <DialogTitle className="text-core-text text-base">Add Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-core-text-muted uppercase tracking-wider mb-1 block">Title</label>
              <input
                ref={titleRef}
                value={addTitle}
                onChange={e => setAddTitle(e.target.value)}
                placeholder="Deal name..."
                className="w-full rounded-lg border border-core-border/50 bg-core-card/50 px-3 py-2 text-sm text-core-text placeholder:text-core-text-muted"
                autoFocus
              />
            </div>
            <div>
              <label className="text-[10px] text-core-text-muted uppercase tracking-wider mb-1 block">Description</label>
              <input
                value={addDesc}
                onChange={e => setAddDesc(e.target.value)}
                placeholder="Company or notes..."
                className="w-full rounded-lg border border-core-border/50 bg-core-card/50 px-3 py-2 text-sm text-core-text placeholder:text-core-text-muted"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-core-text-muted uppercase tracking-wider">Urgency</label>
                <span className={`text-xs font-bold ${urgencyColor(addUrgency)}`}>{addUrgency}</span>
              </div>
              <div className="relative h-2 rounded bg-white/[0.06]">
                <div
                  className="absolute left-0 top-0 h-full rounded opacity-70"
                  style={{
                    width: `${addUrgency}%`,
                    background: 'linear-gradient(90deg, #7ed957, #f59e0b 50%, #ef4444)',
                  }}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={addUrgency}
                  onChange={e => setAddUrgency(parseInt(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
            {stages.length > 0 && (
              <div>
                <label className="text-[10px] text-core-text-muted uppercase tracking-wider mb-1 block">Stage</label>
                <div className="flex flex-wrap gap-1.5">
                  {stages.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setAddStageId(s.id)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                      style={{
                        background: addStageId === s.id ? `${s.color}15` : 'transparent',
                        color: addStageId === s.id ? s.color : 'rgba(255,255,255,0.4)',
                        border: `1px solid ${addStageId === s.id ? s.color + '40' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <p className="text-[10px] text-core-text-muted flex-1">Press Enter to add another</p>
            <Button
              size="sm"
              disabled={saving || !addTitle.trim()}
              onClick={() => { submitAdd(); setShowAdd(false) }}
              className="bg-accent text-cta-text hover:bg-accent-action"
            >
              {saving ? 'Saving...' : 'Add Deal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
