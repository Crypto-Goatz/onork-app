'use client'

import { useState } from 'react'

const mockContact = {
  id: 'c-001',
  firstName: 'Sarah',
  lastName: 'Chen',
  email: 'sarah.chen@acmecorp.io',
  phone: '+1 (412) 555-0199',
  company: 'Acme Corp',
  role: 'VP of Marketing',
  tags: ['VIP', 'Enterprise', 'Active'],
  source: 'Website',
  created: '2026-01-15',
  lastActivity: '2026-03-20',
}

const mockActivity = [
  { id: 1, type: 'email_sent', text: 'Sent "Q1 Campaign Results" email', time: '2 hours ago', color: 'green' as const },
  { id: 2, type: 'note_added', text: 'Added note: "Interested in premium tier"', time: '1 day ago', color: 'cyan' as const },
  { id: 3, type: 'deal_created', text: 'Created deal "Enterprise Onboarding"', time: '3 days ago', color: 'purple' as const },
  { id: 4, type: 'tag_added', text: 'Tag "VIP" added', time: '5 days ago', color: 'amber' as const },
  { id: 5, type: 'call_logged', text: 'Call logged — 12 min, discussed pricing', time: '1 week ago', color: 'green' as const },
  { id: 6, type: 'form_submitted', text: 'Submitted contact form on website', time: '2 weeks ago', color: 'cyan' as const },
  { id: 7, type: 'email_opened', text: 'Opened "Welcome to 0nCore" email', time: '2 weeks ago', color: 'muted' as const },
]

const mockNotes = [
  { id: 1, text: 'Interested in premium tier. Wants demo next Tuesday.', author: 'Mike', date: '2026-03-19' },
  { id: 2, text: 'Met at SaaStr conference. Strong lead for enterprise plan.', author: 'Mike', date: '2026-03-10' },
  { id: 3, text: 'Referred by John Davis at TechFlow. Very warm intro.', author: 'System', date: '2026-01-15' },
]

const mockDeals = [
  { id: 1, name: 'Enterprise Onboarding', stage: 'Proposal', value: 24000, probability: 75 },
  { id: 2, name: 'Premium Support Add-on', stage: 'Negotiation', value: 6000, probability: 60 },
]

const mockTasks = [
  { id: 1, title: 'Send proposal document', due: '2026-03-24', assignee: 'Mike', done: false },
  { id: 2, title: 'Follow up on pricing discussion', due: '2026-03-25', assignee: 'Mike', done: false },
  { id: 3, title: 'Schedule demo call', due: '2026-03-22', assignee: 'Mike', done: true },
]

type TabKey = 'activity' | 'notes' | 'deals' | 'tasks' | 'files'

export default function ContactDetailPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('activity')
  const [noteText, setNoteText] = useState('')

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'activity', label: 'Activity', count: mockActivity.length },
    { key: 'notes', label: 'Notes', count: mockNotes.length },
    { key: 'deals', label: 'Deals', count: mockDeals.length },
    { key: 'tasks', label: 'Tasks', count: mockTasks.length },
    { key: 'files', label: 'Files', count: 0 },
  ]

  const initials = `${mockContact.firstName[0]}${mockContact.lastName[0]}`

  return (
    <div className="jp-contact-detail">
      {/* Contact Header */}
      <div className="jp-contact-header">
        <div className="jp-contact-header-left">
          <div className="jp-contact-avatar-lg">{initials}</div>
          <div className="jp-contact-header-info">
            <h1 className="jp-contact-name">{mockContact.firstName} {mockContact.lastName}</h1>
            <p className="jp-contact-role">{mockContact.role} at {mockContact.company}</p>
            <div className="jp-contact-meta-row">
              <span className="jp-contact-meta-item">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {mockContact.email}
              </span>
              <span className="jp-contact-meta-item">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {mockContact.phone}
              </span>
            </div>
            <div className="jp-contact-tags">
              {mockContact.tags.map(tag => (
                <span key={tag} className="jp-contact-tag">{tag}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="jp-contact-actions">
          <button className="jp-btn jp-btn-primary">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call
          </button>
          <button className="jp-btn jp-btn-outline">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email
          </button>
          <button className="jp-btn jp-btn-outline">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            SMS
          </button>
          <button className="jp-btn jp-btn-outline">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Add Note
          </button>
          <button className="jp-btn jp-btn-outline">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Add Task
          </button>
        </div>
      </div>

      {/* Info Sidebar + Tabs Content */}
      <div className="jp-contact-body">
        {/* Left: Info Panel */}
        <div className="jp-contact-info-panel">
          <div className="jp-card">
            <div className="jp-card-header"><h4>Details</h4></div>
            <div className="jp-card-body">
              <div className="jp-contact-detail-row">
                <span className="jp-contact-detail-label">Source</span>
                <span className="jp-contact-detail-value">{mockContact.source}</span>
              </div>
              <div className="jp-contact-detail-row">
                <span className="jp-contact-detail-label">Created</span>
                <span className="jp-contact-detail-value">{mockContact.created}</span>
              </div>
              <div className="jp-contact-detail-row">
                <span className="jp-contact-detail-label">Last Activity</span>
                <span className="jp-contact-detail-value">{mockContact.lastActivity}</span>
              </div>
              <div className="jp-contact-detail-row">
                <span className="jp-contact-detail-label">Company</span>
                <span className="jp-contact-detail-value">{mockContact.company}</span>
              </div>
              <div className="jp-contact-detail-row">
                <span className="jp-contact-detail-label">Total Deals</span>
                <span className="jp-contact-detail-value" style={{ color: 'var(--jp-green)' }}>$30,000</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Tabbed Content */}
        <div className="jp-contact-content">
          <div className="jp-tabs">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`jp-tab ${activeTab === tab.key ? 'active' : ''}`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span style={{ marginLeft: 6, fontSize: '0.6875rem', opacity: 0.6 }}>({tab.count})</span>
                )}
              </button>
            ))}
          </div>

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="jp-timeline">
              {mockActivity.map(item => (
                <div key={item.id} className="jp-timeline-item">
                  <div className="jp-timeline-line" />
                  <div className={`jp-timeline-dot ${item.color}`} />
                  <div className="jp-timeline-content">
                    <p className="jp-timeline-text">{item.text}</p>
                    <span className="jp-timeline-time">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <textarea
                  className="jp-textarea"
                  placeholder="Add a note..."
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <button className="jp-btn jp-btn-primary" style={{ marginTop: 8 }}>Save Note</button>
              </div>
              {mockNotes.map(note => (
                <div key={note.id} className="jp-note-card">
                  <p className="jp-note-text">{note.text}</p>
                  <div className="jp-note-meta">
                    <span>{note.author}</span>
                    <span>{note.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Deals Tab */}
          {activeTab === 'deals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {mockDeals.map(deal => (
                <div key={deal.id} className="jp-card" style={{ cursor: 'pointer' }}>
                  <div className="jp-card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--jp-text)' }}>{deal.name}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--jp-text-muted)', marginTop: 2 }}>Stage: {deal.stage}</div>
                      </div>
                      <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--jp-green)' }}>
                        ${deal.value.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="jp-progress" style={{ flex: 1 }}>
                        <div className="jp-progress-bar green" style={{ width: `${deal.probability}%` }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--jp-text-secondary)' }}>{deal.probability}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mockTasks.map(task => (
                <div key={task.id} className="jp-card" style={{ opacity: task.done ? 0.5 : 1 }}>
                  <div className="jp-card-body" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px' }}>
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: `2px solid ${task.done ? 'var(--jp-green)' : 'var(--jp-border-hi)'}`,
                      background: task.done ? 'var(--jp-green)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      cursor: 'pointer',
                    }}>
                      {task.done && (
                        <svg width="12" height="12" fill="none" stroke="#000" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'var(--jp-text)',
                        textDecoration: task.done ? 'line-through' : 'none',
                      }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)', marginTop: 2 }}>
                        Due: {task.due} — {task.assignee}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="jp-empty-state">
              <div className="jp-empty-state-icon">
                <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div className="jp-empty-state-title">No files yet</div>
              <div className="jp-empty-state-text">Upload files or attach documents to this contact.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
