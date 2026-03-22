'use client'

import { useState, useEffect } from 'react'

interface Deal {
  id: string
  name: string
  company: string
  value: number
  assignee: string
  daysInStage: number
  priority: 'high' | 'medium' | 'low'
  tags: string[]
  stageId: string
}

interface Stage {
  id: string
  name: string
  color: string
  deals: Deal[]
}

const STAGE_COLORS = [
  'var(--jp-text-muted)',
  'var(--jp-cyan)',
  'var(--jp-green)',
  'var(--jp-purple)',
  'var(--jp-amber)',
  'var(--jp-red)',
]

const mockStages: Stage[] = [
  {
    id: 'free',
    name: 'Free',
    color: 'var(--jp-text-muted)',
    deals: [
      { id: 'd1', name: 'Acme Corp Trial', company: 'Acme Corp', value: 0, assignee: 'MK', daysInStage: 3, priority: 'medium', tags: ['trial'], stageId: 'free' },
      { id: 'd2', name: 'Beta User Signup', company: 'Startup Labs', value: 0, assignee: 'JD', daysInStage: 1, priority: 'low', tags: ['beta'], stageId: 'free' },
    ],
  },
  {
    id: 'supporter',
    name: 'Supporter',
    color: 'var(--jp-cyan)',
    deals: [
      { id: 'd5', name: 'Pro Upgrade', company: 'CloudBase', value: 29, assignee: 'JD', daysInStage: 7, priority: 'medium', tags: ['upgrade'], stageId: 'supporter' },
    ],
  },
  {
    id: 'builder',
    name: 'Builder',
    color: 'var(--jp-green)',
    deals: [
      { id: 'd8', name: 'API Integration', company: 'MegaCorp', value: 199, assignee: 'MK', daysInStage: 10, priority: 'high', tags: ['api', 'enterprise'], stageId: 'builder' },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    color: 'var(--jp-purple)',
    deals: [
      { id: 'd10', name: 'Enterprise Deal', company: 'GlobalTech', value: 999, assignee: 'MK', daysInStage: 21, priority: 'high', tags: ['enterprise', 'annual'], stageId: 'enterprise' },
    ],
  },
]

function formatCurrency(val: number) {
  return val === 0 ? 'Free' : `$${val.toLocaleString()}/mo`
}

function priorityColor(p: string) {
  switch (p) {
    case 'high': return 'var(--jp-red)'
    case 'medium': return 'var(--jp-amber)'
    case 'low': return 'var(--jp-green)'
    default: return 'var(--jp-text-muted)'
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCrmToStages(pipelines: any[]): Stage[] {
  if (!pipelines || pipelines.length === 0) return []

  const pipeline = pipelines[0] // Use the first pipeline
  const pipelineStages = pipeline.stages || []
  const opportunities = pipeline.opportunities || []

  return pipelineStages.map((stage: { id: string; name: string }, idx: number) => {
    const stageDeals = opportunities
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((opp: any) => opp.pipelineStageId === stage.id || opp.stageId === stage.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((opp: any) => {
        const createdAt = opp.createdAt ? new Date(opp.createdAt) : new Date()
        const lastStageChange = opp.lastStageChangeAt ? new Date(opp.lastStageChangeAt) : createdAt
        const daysInStage = Math.floor((Date.now() - lastStageChange.getTime()) / (1000 * 60 * 60 * 24))

        return {
          id: opp.id,
          name: opp.name || opp.contact?.name || 'Unnamed',
          company: opp.contact?.companyName || opp.companyName || '',
          value: opp.monetaryValue || 0,
          assignee: opp.assignedTo ? (opp.assignedTo.substring(0, 2).toUpperCase()) : 'NA',
          daysInStage,
          priority: (opp.monetaryValue || 0) >= 500 ? 'high' as const : (opp.monetaryValue || 0) >= 100 ? 'medium' as const : 'low' as const,
          tags: opp.tags || [],
          stageId: stage.id,
        }
      })

    return {
      id: stage.id,
      name: stage.name,
      color: STAGE_COLORS[idx % STAGE_COLORS.length],
      deals: stageDeals,
    }
  })
}

export default function PipelinePage() {
  const [stages, setStages] = useState<Stage[]>(mockStages)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draggedDeal, setDraggedDeal] = useState<{ dealId: string; fromStageId: string } | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [pipelineId, setPipelineId] = useState<string | null>(null)

  useEffect(() => {
    fetchPipeline()
  }, [])

  async function fetchPipeline() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/crm/pipeline')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch pipeline')

      const pipelines = data.pipelines || []
      if (pipelines.length > 0) {
        setPipelineId(pipelines[0].id)
        const mapped = mapCrmToStages(pipelines)
        if (mapped.length > 0) {
          setStages(mapped)
        }
        // If mapped is empty, keep mock data as fallback
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline')
      // Keep mock data on error
    } finally {
      setLoading(false)
    }
  }

  const totalValue = stages.reduce((sum, s) => sum + s.deals.reduce((ds, d) => ds + d.value, 0), 0)
  const totalDeals = stages.reduce((sum, s) => sum + s.deals.length, 0)

  function handleDragStart(dealId: string, fromStageId: string) {
    setDraggedDeal({ dealId, fromStageId })
  }

  function handleDragOver(e: React.DragEvent, stageId: string) {
    e.preventDefault()
    setDragOverStage(stageId)
  }

  function handleDragLeave() {
    setDragOverStage(null)
  }

  async function handleDrop(targetStageId: string) {
    if (!draggedDeal || draggedDeal.fromStageId === targetStageId) {
      setDraggedDeal(null)
      setDragOverStage(null)
      return
    }

    const dealId = draggedDeal.dealId
    const fromStageId = draggedDeal.fromStageId

    // Optimistic update
    setStages(prev => {
      const newStages = prev.map(s => ({ ...s, deals: [...s.deals] }))
      const fromStage = newStages.find(s => s.id === fromStageId)
      const toStage = newStages.find(s => s.id === targetStageId)
      if (!fromStage || !toStage) return prev

      const dealIndex = fromStage.deals.findIndex(d => d.id === dealId)
      if (dealIndex === -1) return prev

      const [deal] = fromStage.deals.splice(dealIndex, 1)
      toStage.deals.push({ ...deal, daysInStage: 0, stageId: targetStageId })
      return newStages
    })

    setDraggedDeal(null)
    setDragOverStage(null)

    // Persist to CRM
    if (pipelineId) {
      try {
        await fetch('/api/crm/pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            opportunityId: dealId,
            stageId: targetStageId,
            pipelineId,
          }),
        })
      } catch {
        // Revert on error — refetch
        fetchPipeline()
      }
    }
  }

  const filteredStages = stages.map(stage => ({
    ...stage,
    deals: stage.deals.filter(d =>
      !searchQuery ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
  }))

  return (
    <div>
      {/* Page Header */}
      <div className="jp-pipeline-header">
        <div>
          <h1 className="jp-page-title">Sales Pipeline</h1>
          <p className="jp-page-subtitle">
            {loading ? 'Loading pipeline data...' : error ? 'Using sample data' : 'Drag deals between stages to update their status'}
          </p>
        </div>
        <div className="jp-pipeline-stats">
          <div className="jp-pipeline-stat">
            <span className="jp-pipeline-stat-label">Pipeline Value</span>
            <span className="jp-pipeline-stat-value">${totalValue.toLocaleString()}/mo</span>
          </div>
          <div className="jp-pipeline-stat-divider" />
          <div className="jp-pipeline-stat">
            <span className="jp-pipeline-stat-label">Total Deals</span>
            <span className="jp-pipeline-stat-value">{totalDeals}</span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '8px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', fontSize: '0.8125rem', color: 'var(--jp-red)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error} — showing sample data</span>
          <button onClick={fetchPipeline} style={{ background: 'none', border: 'none', color: 'var(--jp-cyan)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>Retry</button>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          className="jp-search-input"
          placeholder="Search deals..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ maxWidth: 320, background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)' }}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 32, height: 32, border: '2px solid var(--jp-green)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      {/* Kanban Board */}
      {!loading && (
        <div className="jp-pipeline-board">
          {filteredStages.map(stage => (
            <div
              key={stage.id}
              className={`jp-pipeline-column ${dragOverStage === stage.id ? 'drag-over' : ''}`}
              onDragOver={e => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(stage.id)}
            >
              {/* Column Header */}
              <div className="jp-pipeline-column-header">
                <div className="jp-pipeline-column-title">
                  <span className="jp-pipeline-column-dot" style={{ background: stage.color }} />
                  <span>{stage.name}</span>
                  <span className="jp-pipeline-column-count">{stage.deals.length}</span>
                </div>
                <div className="jp-pipeline-column-value">
                  {stage.deals.reduce((s, d) => s + d.value, 0) === 0
                    ? 'Free tier'
                    : `$${stage.deals.reduce((s, d) => s + d.value, 0).toLocaleString()}/mo`}
                </div>
              </div>

              {/* Cards */}
              <div className="jp-pipeline-cards">
                {stage.deals.map(deal => (
                  <div
                    key={deal.id}
                    className="jp-pipeline-card"
                    draggable
                    onDragStart={() => handleDragStart(deal.id, stage.id)}
                  >
                    <div className="jp-pipeline-card-top">
                      <span className="jp-pipeline-card-name">{deal.name}</span>
                      <span className="jp-pipeline-card-priority" style={{ background: priorityColor(deal.priority) }} />
                    </div>
                    <div className="jp-pipeline-card-company">{deal.company}</div>
                    <div className="jp-pipeline-card-meta">
                      <span className="jp-pipeline-card-value">{formatCurrency(deal.value)}</span>
                      <span className="jp-pipeline-card-days">{deal.daysInStage}d</span>
                    </div>
                    <div className="jp-pipeline-card-footer">
                      <div className="jp-pipeline-card-tags">
                        {deal.tags.map(tag => (
                          <span key={tag} className="jp-pipeline-card-tag">{tag}</span>
                        ))}
                      </div>
                      <div className="jp-pipeline-card-assignee" style={{ background: stage.color }}>
                        {deal.assignee}
                      </div>
                    </div>
                  </div>
                ))}

                {stage.deals.length === 0 && (
                  <div className="jp-pipeline-empty">
                    {searchQuery ? 'No matching deals' : 'No deals in this stage'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
