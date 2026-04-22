'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

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
  { id: 1, name: 'Enterprise SaaS Migration', contact: 'Sarah Chen', stage: 'Proposal', stageColor: 'var(--color-core-cyan)', value: 48000, probability: 75, lastActivity: '2 hours ago', assignee: 'Mike', assigneeInitials: 'MM', assigneeColor: 'var(--color-core-green)' },
  { id: 2, name: 'Marketing Automation Setup', contact: 'James Wilson', stage: 'Negotiation', stageColor: 'var(--color-core-purple)', value: 24000, probability: 60, lastActivity: '1 day ago', assignee: 'Mike', assigneeInitials: 'MM', assigneeColor: 'var(--color-core-green)' },
  { id: 3, name: 'CRM Integration Package', contact: 'Emily Davis', stage: 'Qualified', stageColor: 'var(--color-core-green)', value: 12000, probability: 40, lastActivity: '3 days ago', assignee: 'Mike', assigneeInitials: 'MM', assigneeColor: 'var(--color-core-green)' },
  { id: 4, name: 'Website Redesign + SEO', contact: 'Marcus Lee', stage: 'Proposal', stageColor: 'var(--color-core-cyan)', value: 18500, probability: 65, lastActivity: '5 hours ago', assignee: 'Mike', assigneeInitials: 'MM', assigneeColor: 'var(--color-core-green)' },
  { id: 5, name: 'Social Media Management', contact: 'Priya Patel', stage: 'Discovery', stageColor: 'var(--color-core-amber)', value: 6000, probability: 25, lastActivity: '2 days ago', assignee: 'Mike', assigneeInitials: 'MM', assigneeColor: 'var(--color-core-green)' },
  { id: 6, name: 'API Development Sprint', contact: 'Alex Rivera', stage: 'Closed Won', stageColor: 'var(--color-core-green)', value: 36000, probability: 100, lastActivity: '1 week ago', assignee: 'Mike', assigneeInitials: 'MM', assigneeColor: 'var(--color-core-green)' },
  { id: 7, name: 'Data Analytics Dashboard', contact: 'Lisa Thompson', stage: 'Qualified', stageColor: 'var(--color-core-green)', value: 15000, probability: 35, lastActivity: '4 days ago', assignee: 'Mike', assigneeInitials: 'MM', assigneeColor: 'var(--color-core-green)' },
  { id: 8, name: 'E-commerce Platform', contact: 'Derek Johnson', stage: 'Negotiation', stageColor: 'var(--color-core-purple)', value: 52000, probability: 55, lastActivity: '6 hours ago', assignee: 'Mike', assigneeInitials: 'MM', assigneeColor: 'var(--color-core-green)' },
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
    <span className={`inline-flex flex-col ml-1 ${active ? 'opacity-100' : 'opacity-30'}`}>
      <ChevronUp className={`h-2.5 w-2.5 -mb-1 ${active && asc ? 'text-core-green' : 'text-core-text-muted'}`} />
      <ChevronDown className={`h-2.5 w-2.5 ${active && !asc ? 'text-core-green' : 'text-core-text-muted'}`} />
    </span>
  )

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-bold text-core-text">Pipeline — List View</h1>
          <p className="text-sm text-core-text-muted mt-1">{mockDeals.length} deals in pipeline</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/dashboard/pipeline"
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-core-border text-xs font-semibold text-core-text-dim hover:border-core-border-hi transition-colors no-underline"
          >
            Board View
          </a>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-core-green text-core-bg text-xs font-semibold hover:opacity-90 transition-opacity">
            <ChevronUp className="h-3.5 w-3.5 rotate-90" />
            Add Deal
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-0 rounded-xl border border-core-border bg-core-card px-4 py-3">
          <div className="flex flex-col px-4 first:pl-0">
            <span className="text-[10px] uppercase tracking-wider text-core-text-muted font-semibold">Total Value</span>
            <span className="text-lg font-bold text-core-text">${totalValue.toLocaleString()}</span>
          </div>
          <div className="w-px h-8 bg-core-border mx-2" />
          <div className="flex flex-col px-4">
            <span className="text-[10px] uppercase tracking-wider text-core-text-muted font-semibold">Weighted</span>
            <span className="text-lg font-bold text-core-green">${Math.round(weightedValue).toLocaleString()}</span>
          </div>
          <div className="w-px h-8 bg-core-border mx-2" />
          <div className="flex flex-col px-4">
            <span className="text-[10px] uppercase tracking-wider text-core-text-muted font-semibold">Deals</span>
            <span className="text-lg font-bold text-core-text">{mockDeals.length}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-core-border bg-core-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-core-border">
                {([
                  { key: 'name', label: 'Deal Name' },
                  { key: 'contact', label: 'Contact' },
                  { key: 'stage', label: 'Stage' },
                  { key: 'value', label: 'Value' },
                  { key: 'probability', label: 'Probability' },
                ] as { key: SortKey; label: string }[]).map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left text-[11px] font-semibold text-core-text-muted uppercase tracking-wider cursor-pointer select-none hover:text-core-text transition-colors"
                  >
                    <span className="flex items-center">
                      {col.label}
                      <SortIcon active={sortKey === col.key} asc={sortAsc} />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-core-text-muted uppercase tracking-wider">Last Activity</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-core-text-muted uppercase tracking-wider">Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {sortedDeals.map(deal => (
                <tr key={deal.id} className="border-b border-core-border/50 hover:bg-core-card-hover transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-core-text">{deal.name}</span>
                  </td>
                  <td className="px-4 py-3 text-core-text-dim">{deal.contact}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap"
                      style={{
                        background: `color-mix(in srgb, ${deal.stageColor} 12%, transparent)`,
                        color: deal.stageColor,
                      }}
                    >
                      {deal.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-core-green">${deal.value.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 max-w-[80px] h-1.5 rounded bg-white/[0.04] overflow-hidden">
                        <div
                          className="h-full rounded bg-core-green"
                          style={{ width: `${deal.probability}%` }}
                        />
                      </div>
                      <span className="text-[13px] font-medium text-core-text-dim min-w-[32px]">
                        {deal.probability}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] text-core-text-muted">{deal.lastActivity}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-core-bg"
                        style={{ background: deal.assigneeColor }}
                      >
                        {deal.assigneeInitials}
                      </div>
                      <span className="text-[13px] text-core-text-dim">{deal.assignee}</span>
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
