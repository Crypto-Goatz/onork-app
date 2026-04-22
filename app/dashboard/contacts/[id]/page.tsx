'use client'

import { useState } from 'react'
import { Phone, Mail, MessageSquare, PenLine, ClipboardCheck, Check } from 'lucide-react'

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

const dotColorMap: Record<string, string> = {
  green: 'bg-core-green',
  cyan: 'bg-core-cyan',
  purple: 'bg-core-purple',
  amber: 'bg-core-amber',
  red: 'bg-core-red',
  muted: 'bg-core-text-muted',
}

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
                <Mail size={14} strokeWidth={1.75} />
                {mockContact.email}
              </span>
              <span className="jp-contact-meta-item">
                <Phone size={14} strokeWidth={1.75} />
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
            <Phone size={14} strokeWidth={2} />
            Call
          </button>
          <button className="jp-btn jp-btn-outline">
            <Mail size={14} strokeWidth={2} />
            Email
          </button>
          <button className="jp-btn jp-btn-outline">
            <MessageSquare size={14} strokeWidth={2} />
            SMS
          </button>
          <button className="jp-btn jp-btn-outline">
            <PenLine size={14} strokeWidth={2} />
            Add Note
          </button>
          <button className="jp-btn jp-btn-outline">
            <ClipboardCheck size={14} strokeWidth={2} />
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
                <span className="jp-contact-detail-value text-core-green">$30,000</span>
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
                  <span className="ml-1.5 text-[0.6875rem] opacity-60">({tab.count})</span>
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
                  <div className={`jp-timeline-dot ${dotColorMap[item.color] ?? 'bg-core-text-muted'}`} />
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
              <div className="mb-5">
                <textarea
                  className="jp-textarea"
                  placeholder="Add a note..."
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <button className="jp-btn jp-btn-primary mt-2">Save Note</button>
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
            <div className="flex flex-col gap-3">
              {mockDeals.map(deal => (
                <div key={deal.id} className="jp-card cursor-pointer">
                  <div className="jp-card-body">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-[0.9375rem] font-semibold text-core-text">{deal.name}</div>
                        <div className="text-[0.8125rem] text-core-text-muted mt-0.5">Stage: {deal.stage}</div>
                      </div>
                      <div className="text-lg font-bold text-core-green">
                        ${deal.value.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="jp-progress flex-1">
                        <div className="jp-progress-bar green" style={{ width: `${deal.probability}%` }} />
                      </div>
                      <span className="text-xs text-core-text-dim">{deal.probability}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="flex flex-col gap-2">
              {mockTasks.map(task => (
                <div key={task.id} className={`jp-card ${task.done ? 'opacity-50' : ''}`}>
                  <div className="jp-card-body flex items-center gap-3.5 py-3.5 px-5">
                    <div className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center shrink-0 cursor-pointer ${task.done ? 'border-core-green bg-core-green' : 'border-core-border bg-transparent'}`}>
                      {task.done && (
                        <Check size={12} strokeWidth={3} className="text-black" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-medium text-core-text ${task.done ? 'line-through' : ''}`}>
                        {task.title}
                      </div>
                      <div className="text-xs text-core-text-muted mt-0.5">
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
