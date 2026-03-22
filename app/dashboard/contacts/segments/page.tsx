'use client'

const mockSegments = [
  {
    id: 1,
    name: 'All Contacts',
    description: 'Every contact in your database',
    count: 2847,
    criteria: 'No filters applied',
    color: 'var(--jp-text-secondary)',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 2,
    name: 'New This Week',
    description: 'Contacts added in the last 7 days',
    count: 34,
    criteria: 'created_at >= 7 days ago',
    color: 'var(--jp-green)',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
  },
  {
    id: 3,
    name: 'Needs Follow-up',
    description: 'Contacts with pending tasks or no recent activity',
    count: 156,
    criteria: 'last_activity > 14 days ago OR has_pending_task = true',
    color: 'var(--jp-amber)',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 4,
    name: 'VIP',
    description: 'High-value contacts tagged as VIP',
    count: 42,
    criteria: 'tags contains "VIP"',
    color: 'var(--jp-purple)',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    id: 5,
    name: 'Inactive 30 Days',
    description: 'Contacts with no activity in the past 30 days',
    count: 389,
    criteria: 'last_activity > 30 days ago',
    color: 'var(--jp-red)',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
]

export default function SegmentsPage() {
  return (
    <div>
      <div className="jp-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="jp-page-title">Segments</h1>
          <p className="jp-page-subtitle">Organize contacts into smart groups for targeted outreach</p>
        </div>
        <button className="jp-btn jp-btn-primary">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Segment
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mockSegments.map(segment => (
          <div key={segment.id} className="jp-card" style={{ cursor: 'pointer' }}>
            <div className="jp-card-body" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--jp-radius-sm)',
                background: 'var(--jp-bg)',
                border: '1px solid var(--jp-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: segment.color,
                flexShrink: 0,
              }}>
                {segment.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--jp-text)' }}>{segment.name}</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--jp-text-muted)', margin: 0 }}>{segment.description}</p>
              </div>
              <div style={{
                padding: '6px 14px',
                background: 'var(--jp-bg)',
                border: '1px solid var(--jp-border)',
                borderRadius: 'var(--jp-radius-sm)',
                textAlign: 'center',
                flexShrink: 0,
              }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--jp-text)' }}>
                  {segment.count.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--jp-text-muted)' }}>contacts</div>
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--jp-text-muted)',
                fontFamily: 'monospace',
                background: 'var(--jp-bg)',
                padding: '6px 10px',
                borderRadius: 'var(--jp-radius-xs)',
                border: '1px solid var(--jp-border)',
                maxWidth: 280,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flexShrink: 0,
              }}>
                {segment.criteria}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
