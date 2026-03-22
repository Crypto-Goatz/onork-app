'use client'

import { useState, useRef } from 'react'

interface Deal {
  id: string
  name: string
  company: string
  value: number
  assignee: string
  daysInStage: number
  priority: 'high' | 'medium' | 'low'
  tags: string[]
}

interface Stage {
  id: string
  name: string
  color: string
  deals: Deal[]
}

const initialStages: Stage[] = [
  {
    id: 'free',
    name: 'Free',
    color: 'var(--jp-text-muted)',
    deals: [
      { id: 'd1', name: 'Acme Corp Trial', company: 'Acme Corp', value: 0, assignee: 'MK', daysInStage: 3, priority: 'medium', tags: ['trial'] },
      { id: 'd2', name: 'Beta User Signup', company: 'Startup Labs', value: 0, assignee: 'JD', daysInStage: 1, priority: 'low', tags: ['beta'] },
      { id: 'd3', name: 'Demo Request', company: 'TechFlow Inc', value: 0, assignee: 'MK', daysInStage: 5, priority: 'high', tags: ['demo'] },
      { id: 'd4', name: 'Organic Lead', company: 'DataWorks', value: 0, assignee: 'SR', daysInStage: 2, priority: 'low', tags: ['inbound'] },
    ],
  },
  {
    id: 'supporter',
    name: 'Supporter',
    color: 'var(--jp-cyan)',
    deals: [
      { id: 'd5', name: 'Pro Upgrade', company: 'CloudBase', value: 29, assignee: 'JD', daysInStage: 7, priority: 'medium', tags: ['upgrade'] },
      { id: 'd6', name: 'Monthly Sub', company: 'DevHouse', value: 29, assignee: 'MK', daysInStage: 14, priority: 'low', tags: ['recurring'] },
      { id: 'd7', name: 'Support Tier', company: 'NexGen AI', value: 49, assignee: 'SR', daysInStage: 4, priority: 'high', tags: ['support'] },
    ],
  },
  {
    id: 'builder',
    name: 'Builder',
    color: 'var(--jp-green)',
    deals: [
      { id: 'd8', name: 'API Integration', company: 'MegaCorp', value: 199, assignee: 'MK', daysInStage: 10, priority: 'high', tags: ['api', 'enterprise'] },
      { id: 'd9', name: 'Custom Workflows', company: 'FlowState', value: 149, assignee: 'JD', daysInStage: 6, priority: 'medium', tags: ['custom'] },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    color: 'var(--jp-purple)',
    deals: [
      { id: 'd10', name: 'Enterprise Deal', company: 'GlobalTech', value: 999, assignee: 'MK', daysInStage: 21, priority: 'high', tags: ['enterprise', 'annual'] },
      { id: 'd11', name: 'White Label', company: 'AgencyPro', value: 599, assignee: 'SR', daysInStage: 15, priority: 'medium', tags: ['whitelabel'] },
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

export default function PipelinePage() {
  const [stages, setStages] = useState<Stage[]>(initialStages)
  const [draggedDeal, setDraggedDeal] = useState<{ dealId: string; fromStageId: string } | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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

  function handleDrop(targetStageId: string) {
    if (!draggedDeal || draggedDeal.fromStageId === targetStageId) {
      setDraggedDeal(null)
      setDragOverStage(null)
      return
    }

    setStages(prev => {
      const newStages = prev.map(s => ({ ...s, deals: [...s.deals] }))
      const fromStage = newStages.find(s => s.id === draggedDeal.fromStageId)
      const toStage = newStages.find(s => s.id === targetStageId)
      if (!fromStage || !toStage) return prev

      const dealIndex = fromStage.deals.findIndex(d => d.id === draggedDeal.dealId)
      if (dealIndex === -1) return prev

      const [deal] = fromStage.deals.splice(dealIndex, 1)
      toStage.deals.push({ ...deal, daysInStage: 0 })
      return newStages
    })

    setDraggedDeal(null)
    setDragOverStage(null)
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
          <p className="jp-page-subtitle">Drag deals between stages to update their status</p>
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

      {/* Kanban Board */}
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
    </div>
  )
}
