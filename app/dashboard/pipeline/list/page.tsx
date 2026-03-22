'use client'

import { useState } from 'react'

interface Deal {
  id: number
  name: string
  contact: string
  stage: string
  stageColor: string
  value: number
  probability: number
  lastActivity: string
  assignee: string
  assigneeInitials: string
  assigneeColor: string
}

const mockDeals: Deal[] = [
  { id: 1, name: 'Enterprise SaaS Migration', contact: 'Sarah Chen', stage: 'Proposal', stageColor: 'var(--jp-cyan)', value: 48000, probability: 75, lastActivity: '2 hours ago', assignee: 'Mike', assigneeInitials: 'MM', assigneeColor: 'var(--jp-green)' },
  { id: 2, name: 'Marketing Automation Setup', contact: 'James Wilson', stage: 'Negotiation', stageColor: 'var(--jp-purple)', value: 24000, probability: 60, lastActivity: '1 day ago', assignee: 'Mike', assigneeInitials: 'MM', assigneeColor: 'var(--jp-green)' },
  { id: 3, name: 'CRM Integration Package', contact: 'Emily Davis', stage: 'Qualified', stageColor: 'var(--jp-green)', value: 12000, probability: 40, lastActivity: '3 days ago', assignee: 'Mike', assigneeInitials: 'MM', assigneeColor: 'var(--jp-green)' },
  { id: 4, name: 'Website Redesign + SEO', contact: 'Marcus Lee', stage: 'Proposal', stageColor: 'var(--jp-cyan)', value: 18500, probability: 65, lastActivity: '5 hours ago', assignee: 'Mike', assigneeInitials: 'MM', assigneeColor: 'var(--jp-green)' },
  { id: 5, name: 'Social Media Management', contact: 'Priya Patel', stage: 'Discovery', stageColor: 'var(--jp-amber)', value: 6000, probability: 25, lastActivity: '2 days ago', assignee: 'Mike', assigneeInitials: 'MM', assigneeColor: 'var(--jp-green)' },
  { id: 6, name: 'API Development Sprint', contact: 'Alex Rivera', stage: 'Closed Won', stageColor: 'var(--jp-green)', value: 36000, probability: 100, lastActivity: '1 week ago', assignee: 'Mike', assigneeInitials: 'MM', assigneeColor: 'var(--jp-green)' },
  { id: 7, name: 'Data Analytics Dashboard', contact: 'Lisa Thompson', stage: 'Qualified', stageColor: 'var(--jp-green)', value: 15000, probability: 35, lastActivity: '4 days ago', assignee: 'Mike', assigneeInitials: 'MM', assigneeColor: 'var(--jp-green)' },
  { id: 8, name: 'E-commerce Platform', contact: 'Derek Johnson', stage: 'Negotiation', stageColor: 'var(--jp-purple)', value: 52000, probability: 55, lastActivity: '6 hours ago', assignee: 'Mike', assigneeInitials: 'MM', assigneeColor: 'var(--jp-green)' },
]

type SortKey = 'name' | 'contact' | 'stage' | 'value' | 'probability' | 'lastActivity'

export default function PipelineListPage() {
  const [sortKey, setSortKey] = useState<SortKey>('value')
  const [sortAsc, setSortAsc] = useState(false)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(key === 'name' || key === 'contact')
    }
  }

  const sortedDeals = [...mockDeals].sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case 'name': cmp = a.name.localeCompare(b.name); break
      case 'contact': cmp = a.contact.localeCompare(b.contact); break
      case 'stage': cmp = a.stage.localeCompare(b.stage); break
      case 'value': cmp = a.value - b.value; break
      case 'probability': cmp = a.probability - b.probability; break
      default: cmp = 0
    }
    return sortAsc ? cmp : -cmp
  })

  const totalValue = mockDeals.reduce((sum, d) => sum + d.value, 0)
  const weightedValue = mockDeals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0)

  const SortIcon = ({ active, asc }: { active: boolean; asc: boolean }) => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 4, opacity: active ? 1 : 0.3 }}>
      <path d="M6 2L9 5H3L6 2Z" fill={active && asc ? 'var(--jp-green)' : 'var(--jp-text-muted)'} />
      <path d="M6 10L3 7H9L6 10Z" fill={active && !asc ? 'var(--jp-green)' : 'var(--jp-text-muted)'} />
    </svg>
  )

  return (
    <div>
      <div className="jp-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="jp-page-title">Pipeline — List View</h1>
          <p className="jp-page-subtitle">{mockDeals.length} deals in pipeline</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/dashboard/pipeline" className="jp-btn jp-btn-outline" style={{ textDecoration: 'none' }}>Board View</a>
          <button className="jp-btn jp-btn-primary">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Deal
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div className="jp-pipeline-stats">
          <div className="jp-pipeline-stat">
            <span className="jp-pipeline-stat-label">Total Value</span>
            <span className="jp-pipeline-stat-value">${totalValue.toLocaleString()}</span>
          </div>
          <div className="jp-pipeline-stat-divider" />
          <div className="jp-pipeline-stat">
            <span className="jp-pipeline-stat-label">Weighted</span>
            <span className="jp-pipeline-stat-value" style={{ color: 'var(--jp-green)' }}>${Math.round(weightedValue).toLocaleString()}</span>
          </div>
          <div className="jp-pipeline-stat-divider" />
          <div className="jp-pipeline-stat">
            <span className="jp-pipeline-stat-label">Deals</span>
            <span className="jp-pipeline-stat-value">{mockDeals.length}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="jp-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="jp-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    Deal Name <SortIcon active={sortKey === 'name'} asc={sortAsc} />
                  </span>
                </th>
                <th onClick={() => handleSort('contact')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    Contact <SortIcon active={sortKey === 'contact'} asc={sortAsc} />
                  </span>
                </th>
                <th onClick={() => handleSort('stage')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    Stage <SortIcon active={sortKey === 'stage'} asc={sortAsc} />
                  </span>
                </th>
                <th onClick={() => handleSort('value')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    Value <SortIcon active={sortKey === 'value'} asc={sortAsc} />
                  </span>
                </th>
                <th onClick={() => handleSort('probability')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    Probability <SortIcon active={sortKey === 'probability'} asc={sortAsc} />
                  </span>
                </th>
                <th>Last Activity</th>
                <th>Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {sortedDeals.map(deal => (
                <tr key={deal.id} style={{ cursor: 'pointer' }}>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--jp-text)' }}>{deal.name}</span>
                  </td>
                  <td>{deal.contact}</td>
                  <td>
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: 20,
                      background: `color-mix(in srgb, ${deal.stageColor} 12%, transparent)`,
                      color: deal.stageColor,
                      whiteSpace: 'nowrap',
                    }}>
                      {deal.stage}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--jp-green)' }}>
                      ${deal.value.toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="jp-progress" style={{ flex: 1, maxWidth: 80 }}>
                        <div className="jp-progress-bar green" style={{ width: `${deal.probability}%` }} />
                      </div>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--jp-text-secondary)', minWidth: 32 }}>
                        {deal.probability}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--jp-text-muted)' }}>{deal.lastActivity}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: deal.assigneeColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.5625rem',
                        fontWeight: 700,
                        color: '#000',
                      }}>
                        {deal.assigneeInitials}
                      </div>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--jp-text-secondary)' }}>{deal.assignee}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
