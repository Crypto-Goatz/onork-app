'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Kanban, Plus, DollarSign, X, Loader2, RefreshCw, ChevronDown,
} from 'lucide-react'
import * as crm from '@/lib/crm/sdk'

interface Stage {
  id: string
  name: string
  position: number
}

interface Pipeline {
  id: string
  name: string
  stages: Stage[]
}

interface Opportunity {
  id: string
  name: string
  monetaryValue?: number
  status?: string
  pipelineStageId?: string
  contactId?: string
}

export default function PipelinePage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [activePipelineId, setActivePipelineId] = useState<string>('')
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Create form state
  const [createName, setCreateName] = useState('')
  const [createValue, setCreateValue] = useState('')
  const [createContactId, setCreateContactId] = useState('')
  const [createStageId, setCreateStageId] = useState('')
  const [creating, setCreating] = useState(false)

  const activePipeline = pipelines.find(p => p.id === activePipelineId)

  const loadPipelines = useCallback(async () => {
    try {
      const data = await crm.opportunities.pipelines()
      const pList = data.pipelines || []
      setPipelines(pList)
      if (pList.length > 0 && !activePipelineId) {
        setActivePipelineId(pList[0].id)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load pipelines')
    }
  }, [activePipelineId])

  const loadOpportunities = useCallback(async (pipelineId: string) => {
    if (!pipelineId) return
    setLoading(true)
    try {
      const data = await crm.opportunities.list(pipelineId, { limit: 100 })
      setOpportunities(data.opportunities || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load opportunities')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadPipelines().then(() => setLoading(false))
  }, [loadPipelines])

  useEffect(() => {
    if (activePipelineId) {
      loadOpportunities(activePipelineId)
    }
  }, [activePipelineId, loadOpportunities])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadPipelines()
    if (activePipelineId) {
      await loadOpportunities(activePipelineId)
    }
    setRefreshing(false)
    toast.success('Pipeline refreshed')
  }

  const handleCreate = async () => {
    if (!createName.trim() || !activePipelineId) return
    const stageId = createStageId || activePipeline?.stages?.[0]?.id
    if (!stageId) return

    setCreating(true)
    try {
      await crm.opportunities.create({
        pipelineId: activePipelineId,
        pipelineStageId: stageId,
        name: createName.trim(),
        contactId: createContactId.trim() || undefined,
        monetaryValue: createValue ? parseFloat(createValue) : undefined,
        status: 'open',
      })
      toast.success('Opportunity created')
      setShowCreate(false)
      setCreateName('')
      setCreateValue('')
      setCreateContactId('')
      setCreateStageId('')
      await loadOpportunities(activePipelineId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create opportunity')
    }
    setCreating(false)
  }

  const oppsForStage = (stageId: string) =>
    opportunities.filter(o => o.pipelineStageId === stageId)

  const stageTotal = (stageId: string) =>
    oppsForStage(stageId).reduce((sum, o) => sum + (o.monetaryValue || 0), 0)

  const formatCurrency = (val: number) =>
    val >= 1000 ? `$${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : `$${val.toLocaleString()}`

  const sortedStages = activePipeline?.stages
    ? [...activePipeline.stages].sort((a, b) => a.position - b.position)
    : []

  return (
    <div className="max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Kanban className="w-5 h-5 text-[#7ed957]" />
          <div>
            <h1 className="text-xl font-extrabold text-white m-0">Pipeline</h1>
            <p className="text-[12px] text-white/40 mt-0.5">
              {opportunities.length} opportunit{opportunities.length === 1 ? 'y' : 'ies'}
              {activePipeline ? ` in ${activePipeline.name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Pipeline selector */}
          {pipelines.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/70 text-[12px] font-medium cursor-pointer hover:text-white transition-colors"
              >
                {activePipeline?.name || 'Select pipeline'}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 min-w-[180px] rounded-xl bg-[#1a1a1a] border border-white/[0.06] py-1 z-50 shadow-xl">
                  {pipelines.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setActivePipelineId(p.id); setDropdownOpen(false) }}
                      className={`w-full text-left px-3 py-2 text-[12px] cursor-pointer border-none transition-colors ${
                        p.id === activePipelineId
                          ? 'bg-[#7ed957]/10 text-[#7ed957] font-semibold'
                          : 'bg-transparent text-white/60 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-transparent text-white/40 text-[12px] font-medium cursor-pointer hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7ed957] text-black text-[12px] font-bold cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Deal
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#7ed957]" />
        </div>
      )}

      {/* Empty state */}
      {!loading && sortedStages.length === 0 && (
        <div className="text-center py-20">
          <Kanban className="w-10 h-10 mx-auto text-white/10 mb-3" />
          <p className="text-white/50 text-sm mb-1">No pipeline found</p>
          <p className="text-white/30 text-xs">Create a pipeline in your CRM to get started</p>
        </div>
      )}

      {/* Kanban Board */}
      {!loading && sortedStages.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {sortedStages.map(stage => {
            const stageOpps = oppsForStage(stage.id)
            const total = stageTotal(stage.id)
            return (
              <div
                key={stage.id}
                className="min-w-[240px] w-[260px] shrink-0 rounded-xl bg-white/[0.02] border border-white/[0.06]"
              >
                {/* Column header */}
                <div className="px-3 py-3 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[12px] font-bold text-white/70 uppercase tracking-wider truncate m-0">
                      {stage.name}
                    </h3>
                    <span className="text-[10px] font-semibold text-white/30 bg-white/[0.06] px-1.5 py-0.5 rounded-md">
                      {stageOpps.length}
                    </span>
                  </div>
                  {total > 0 && (
                    <div className="flex items-center gap-1 text-[11px] text-[#7ed957] font-mono font-semibold">
                      <DollarSign className="w-3 h-3" />
                      {formatCurrency(total)}
                    </div>
                  )}
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto">
                  {stageOpps.length === 0 && (
                    <div className="px-3 py-6 text-center text-white/20 text-[11px]">
                      No deals
                    </div>
                  )}
                  {stageOpps.map(opp => (
                    <div
                      key={opp.id}
                      className="px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-[#7ed957]/20 transition-colors cursor-default"
                    >
                      <div className="text-[13px] font-semibold text-white truncate">
                        {opp.name}
                      </div>
                      {(opp.monetaryValue !== undefined && opp.monetaryValue !== null) && (
                        <div className="flex items-center gap-1 mt-1 text-[12px] text-[#7ed957] font-mono font-semibold">
                          <DollarSign className="w-3 h-3" />
                          {opp.monetaryValue.toLocaleString()}
                        </div>
                      )}
                      {opp.status && (
                        <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          opp.status === 'won'
                            ? 'bg-[#7ed957]/10 text-[#7ed957]'
                            : opp.status === 'lost'
                              ? 'bg-red-500/10 text-red-400'
                              : opp.status === 'abandoned'
                                ? 'bg-white/[0.04] text-white/30'
                                : 'bg-white/[0.04] text-white/50'
                        }`}>
                          {opp.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-white/[0.06] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-bold text-white m-0">New Opportunity</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-transparent border-none text-white/40 hover:text-white hover:bg-white/[0.06] cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  placeholder="Deal name..."
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-white text-[13px] placeholder:text-white/20 outline-none focus:border-[#7ed957]/40 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                  Value
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                  <input
                    type="number"
                    value={createValue}
                    onChange={e => setCreateValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-white text-[13px] placeholder:text-white/20 outline-none focus:border-[#7ed957]/40 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                  Contact ID (optional)
                </label>
                <input
                  type="text"
                  value={createContactId}
                  onChange={e => setCreateContactId(e.target.value)}
                  placeholder="Contact ID..."
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-white text-[13px] placeholder:text-white/20 outline-none focus:border-[#7ed957]/40 transition-colors"
                />
              </div>

              {sortedStages.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                    Stage
                  </label>
                  <select
                    value={createStageId || sortedStages[0]?.id || ''}
                    onChange={e => setCreateStageId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-white text-[13px] outline-none focus:border-[#7ed957]/40 transition-colors appearance-none cursor-pointer"
                  >
                    {sortedStages.map(s => (
                      <option key={s.id} value={s.id} className="bg-[#1a1a1a] text-white">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.06] bg-transparent text-white/50 text-[13px] font-medium cursor-pointer hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !createName.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#7ed957] text-black text-[13px] font-bold cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {creating ? 'Creating...' : 'Create Deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
