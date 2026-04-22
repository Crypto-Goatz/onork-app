'use client'

import { Users, Plus, Clock, Star, Ban } from 'lucide-react'

const mockSegments = [
  {
    id: 1,
    name: 'All Contacts',
    description: 'Every contact in your database',
    count: 2847,
    criteria: 'No filters applied',
    colorClass: 'text-core-text-dim',
    Icon: Users,
  },
  {
    id: 2,
    name: 'New This Week',
    description: 'Contacts added in the last 7 days',
    count: 34,
    criteria: 'created_at >= 7 days ago',
    colorClass: 'text-core-green',
    Icon: Plus,
  },
  {
    id: 3,
    name: 'Needs Follow-up',
    description: 'Contacts with pending tasks or no recent activity',
    count: 156,
    criteria: 'last_activity > 14 days ago OR has_pending_task = true',
    colorClass: 'text-core-amber',
    Icon: Clock,
  },
  {
    id: 4,
    name: 'VIP',
    description: 'High-value contacts tagged as VIP',
    count: 42,
    criteria: 'tags contains "VIP"',
    colorClass: 'text-core-purple',
    Icon: Star,
  },
  {
    id: 5,
    name: 'Inactive 30 Days',
    description: 'Contacts with no activity in the past 30 days',
    count: 389,
    criteria: 'last_activity > 30 days ago',
    colorClass: 'text-core-red',
    Icon: Ban,
  },
]

export default function SegmentsPage() {
  return (
    <div>
      <div className="jp-page-header flex justify-between items-start">
        <div>
          <h1 className="jp-page-title">Segments</h1>
          <p className="jp-page-subtitle">Organize contacts into smart groups for targeted outreach</p>
        </div>
        <button className="jp-btn jp-btn-primary">
          <Plus size={14} />
          New Segment
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {mockSegments.map(segment => {
          const Icon = segment.Icon
          return (
            <div key={segment.id} className="jp-card cursor-pointer">
              <div className="jp-card-body flex items-center gap-5">
                <div className={`w-11 h-11 rounded-[var(--jp-radius-sm)] bg-core-bg border border-core-border flex items-center justify-center shrink-0 ${segment.colorClass}`}>
                  <Icon size={20} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="text-[0.9375rem] font-semibold text-core-text">{segment.name}</span>
                  </div>
                  <p className="text-[0.8125rem] text-core-text-muted m-0">{segment.description}</p>
                </div>
                <div className="px-3.5 py-1.5 bg-core-bg border border-core-border rounded-[var(--jp-radius-sm)] text-center shrink-0">
                  <div className="text-lg font-bold text-core-text">
                    {segment.count.toLocaleString()}
                  </div>
                  <div className="text-[0.6875rem] text-core-text-muted">contacts</div>
                </div>
                <div className="text-xs text-core-text-muted font-mono bg-core-bg px-2.5 py-1.5 rounded-[var(--jp-radius-xs)] border border-core-border max-w-[280px] whitespace-nowrap overflow-hidden text-ellipsis shrink-0">
                  {segment.criteria}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
