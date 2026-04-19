'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, GripVertical, RefreshCw, Search } from 'lucide-react'
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
  const titleRef = useRef<HTMLInputElement>(null)
  const { locationId, refreshKey } = useLocation()

  useEffect(() => { load() }, [refreshKey])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/crm/pipeline')
      const data = await res.json()
      const mapped = mapCrmToStages(data.pipelines || [])
      setStages(mapped.length > 0 ? mapped : [
        { id: 'new', name: 'New', color: '#6b7280', deals: [] },
        { id: 'contacted', name: 'Contacted', color: '#00d4ff', deals: [] },
        { id: 'qualified', name: 'Qualified', color: '#7ed957', deals: [] },
        { id: 'closed', name: 'Closed', color: '#a78bfa', deals: [] },
      ])
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

  function submitAdd() {
    if (!addTitle.trim()) return
    const newDeal: Deal = {
      id: `local-${Date.now()}`,
      name: addTitle.trim(),
      company: addDesc.trim(),
      value: 0,
      urgency: addUrgency,
      daysInStage: 0,
      stageId: addStageId,
    }
    setStages(prev => prev.map(s => s.id === addStageId ? { ...s, deals: [...s.deals, newDeal] } : s))
    // Reset for next quick add
    setAddTitle('')
    setAddDesc('')
    setAddUrgency(30)
    setTimeout(() => titleRef.current?.focus(), 50)
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
  function handleDrop(toStageId: string) {
    if (!draggedDeal || draggedDeal.fromStageId === toStageId) { setDraggedDeal(null); setDragOverStage(null); return }
    setStages(prev => {
      const deal = prev.find(s => s.id === draggedDeal.fromStageId)?.deals.find(d => d.id === draggedDeal.dealId)
      if (!deal) return prev
      return prev.map(s => {
        if (s.id === draggedDeal.fromStageId) return { ...s, deals: s.deals.filter(d => d.id !== draggedDeal.dealId) }
        if (s.id === toStageId) return { ...s, deals: [...s.deals, { ...deal, stageId: toStageId }] }
        return s
      })
    })
    setDraggedDeal(null)
    setDragOverStage(null)
  }

  const totalDeals = stages.reduce((s, st) => s + st.deals.length, 0)

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-text-muted animate-pulse">Loading pipeline...</div>

  return (
    <div style={{ margin: '-24px -24px 0', padding: '16px 20px' }}>
      {/* Header — compressed */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Pipeline</h1>
          <Badge variant="outline" className="text-[10px] h-5">{totalDeals} deals</Badge>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="rounded-lg border border-border/50 bg-bg-card/50 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-text-muted w-40" />
          </div>
          <Button variant="outline" size="sm" onClick={load} className="h-7 w-7 p-0"><RefreshCw className="h-3 w-3" /></Button>
          <Button size="sm" onClick={() => openAdd()} className="h-7 bg-accent text-cta-text hover:bg-accent-action gap-1 text-xs"><Plus className="h-3 w-3" /> Add</Button>
        </div>
      </div>

      {/* Kanban — full width, horizontal scroll */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, minHeight: 'calc(100vh - 140px)' }}>
        {stages.map(stage => {
          const filtered = search ? stage.deals.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.company.toLowerCase().includes(search.toLowerCase())) : stage.deals
          return (
            <div
              key={stage.id}
              onDragOver={e => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(stage.id)}
              style={{
                flex: '1 0 220px',
                minWidth: 220,
                maxWidth: 320,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 12,
                background: dragOverStage === stage.id ? 'rgba(126,217,87,0.04)' : 'rgba(255,255,255,0.015)',
                border: `1px solid ${dragOverStage === stage.id ? 'rgba(126,217,87,0.2)' : 'rgba(255,255,255,0.04)'}`,
                transition: 'all 0.15s',
              }}
            >
              {/* Stage header */}
              <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: stage.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{stage.name}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{filtered.length}</span>
                </div>
                <button onClick={() => openAdd(stage.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: 2 }}>
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Deals */}
              <div style={{ flex: 1, padding: 6, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
                {filtered.map(deal => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => handleDragStart(deal.id, stage.id)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'grab',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <GripVertical className="h-3 w-3 text-text-muted mt-0.5 shrink-0 opacity-30" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.3, marginBottom: 2 }}>{deal.name}</div>
                        {deal.company && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{deal.company}</div>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${deal.urgency}%`, background: urgencyColor(deal.urgency), borderRadius: 2, transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: 9, color: urgencyColor(deal.urgency), fontWeight: 600 }}>{deal.urgency}</span>
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

      {/* Quick Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-sm" onKeyDown={handleKeyDown}>
          <DialogHeader>
            <DialogTitle className="text-white text-base">Add Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block">Title</label>
              <input ref={titleRef} value={addTitle} onChange={e => setAddTitle(e.target.value)} placeholder="Deal name..." className="w-full rounded-lg border border-border/50 bg-bg-card/50 px-3 py-2 text-sm text-white placeholder:text-text-muted" autoFocus />
            </div>
            <div>
              <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block">Description</label>
              <input value={addDesc} onChange={e => setAddDesc(e.target.value)} placeholder="Company or notes..." className="w-full rounded-lg border border-border/50 bg-bg-card/50 px-3 py-2 text-sm text-white placeholder:text-text-muted" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-text-muted uppercase tracking-wider">Urgency</label>
                <span style={{ fontSize: 12, fontWeight: 700, color: urgencyColor(addUrgency) }}>{addUrgency}</span>
              </div>
              <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${addUrgency}%`, borderRadius: 4, background: `linear-gradient(90deg, #7ed957, #f59e0b ${50}%, #ef4444)`, opacity: 0.7 }} />
                <input type="range" min={0} max={100} value={addUrgency} onChange={e => setAddUrgency(parseInt(e.target.value))} style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer' }} />
              </div>
            </div>
            {stages.length > 0 && (
              <div>
                <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block">Stage</label>
                <div className="flex flex-wrap gap-1.5">
                  {stages.map(s => (
                    <button key={s.id} onClick={() => setAddStageId(s.id)} className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors" style={{ background: addStageId === s.id ? `${s.color}15` : 'transparent', color: addStageId === s.id ? s.color : 'rgba(255,255,255,0.4)', border: `1px solid ${addStageId === s.id ? s.color + '40' : 'rgba(255,255,255,0.06)'}` }}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <p className="text-[10px] text-text-muted flex-1">Press Enter to add another</p>
            <Button size="sm" onClick={() => { submitAdd(); setShowAdd(false) }} className="bg-accent text-cta-text hover:bg-accent-action">Add Deal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
