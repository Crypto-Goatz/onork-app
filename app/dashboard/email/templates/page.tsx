'use client'

const mockTemplates = [
  {
    id: 1,
    name: 'Welcome Email',
    subject: 'Welcome to 0nCore — Let\'s get started!',
    preview: 'Thanks for joining 0nCore! Here\'s everything you need to know to get started with your new CRM...',
    usageCount: 342,
    lastUsed: '2 hours ago',
    category: 'Onboarding',
    color: 'var(--jp-green)',
  },
  {
    id: 2,
    name: 'Follow-up',
    subject: 'Just checking in — any questions?',
    preview: 'Hi {{first_name}}, I wanted to follow up on our conversation. Is there anything else I can help with...',
    usageCount: 218,
    lastUsed: '1 day ago',
    category: 'Sales',
    color: 'var(--jp-cyan)',
  },
  {
    id: 3,
    name: 'Invoice Reminder',
    subject: 'Reminder: Invoice #{{invoice_number}} is due',
    preview: 'This is a friendly reminder that invoice #{{invoice_number}} for {{amount}} is due on {{due_date}}...',
    usageCount: 156,
    lastUsed: '3 days ago',
    category: 'Billing',
    color: 'var(--jp-amber)',
  },
  {
    id: 4,
    name: 'Onboarding Sequence',
    subject: 'Step {{step_number}}: {{step_title}}',
    preview: 'Great progress! You\'ve completed the first steps. Next up: connecting your integrations and setting up...',
    usageCount: 89,
    lastUsed: '5 days ago',
    category: 'Onboarding',
    color: 'var(--jp-purple)',
  },
  {
    id: 5,
    name: 'Re-engagement',
    subject: 'We miss you, {{first_name}} — Here\'s what\'s new',
    preview: 'It\'s been a while since we last connected. We\'ve shipped some amazing updates including...',
    usageCount: 67,
    lastUsed: '1 week ago',
    category: 'Retention',
    color: 'var(--jp-red)',
  },
]

export default function EmailTemplatesPage() {
  return (
    <div>
      <div className="jp-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="jp-page-title">Email Templates</h1>
          <p className="jp-page-subtitle">Reusable templates for faster communication</p>
        </div>
        <button className="jp-btn jp-btn-primary">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Template
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: 16,
      }}>
        {mockTemplates.map(template => (
          <div key={template.id} className="jp-card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
            <div className="jp-card-body" style={{ flex: 1 }}>
              {/* Category badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '3px 10px',
                  borderRadius: 20,
                  background: `color-mix(in srgb, ${template.color} 12%, transparent)`,
                  color: template.color,
                }}>
                  {template.category}
                </span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--jp-text-muted)' }}>
                  Used {template.usageCount}x
                </span>
              </div>

              {/* Template name */}
              <h3 style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--jp-text)',
                marginBottom: 6,
              }}>
                {template.name}
              </h3>

              {/* Subject line */}
              <div style={{
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--jp-text-secondary)',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8" />
                </svg>
                {template.subject}
              </div>

              {/* Preview */}
              <p style={{
                fontSize: '0.8125rem',
                color: 'var(--jp-text-muted)',
                lineHeight: 1.5,
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {template.preview}
              </p>
            </div>

            <div className="jp-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)' }}>
                Last used {template.lastUsed}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="jp-btn jp-btn-outline" style={{ padding: '5px 12px', fontSize: '0.75rem' }}>
                  Edit
                </button>
                <button className="jp-btn jp-btn-primary" style={{ padding: '5px 12px', fontSize: '0.75rem' }}>
                  Use
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
