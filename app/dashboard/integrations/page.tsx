'use client'

import { useState } from 'react'

interface Integration {
  name: string
  description: string
  icon: string
  iconBg: string
  iconColor: string
  status: 'connected' | 'available'
  tools: number
  category: string
}

const integrations: Integration[] = [
  {
    name: 'CRM',
    description: 'Full contact, pipeline, calendar, and conversation management with 245 tools.',
    icon: 'CRM',
    iconBg: 'rgba(126, 217, 87, 0.12)',
    iconColor: '#7ed957',
    status: 'connected',
    tools: 245,
    category: 'Core',
  },
  {
    name: 'Stripe',
    description: 'Payment processing, subscriptions, invoices, and metered billing.',
    icon: 'S',
    iconBg: 'rgba(99, 91, 255, 0.12)',
    iconColor: '#635bff',
    status: 'connected',
    tools: 42,
    category: 'Core',
  },
  {
    name: 'Supabase',
    description: 'Database, authentication, storage, and edge functions.',
    icon: 'SB',
    iconBg: 'rgba(62, 207, 142, 0.12)',
    iconColor: '#3ecf8e',
    status: 'connected',
    tools: 38,
    category: 'Core',
  },
  {
    name: 'Slack',
    description: 'Team messaging, channel management, and workflow notifications.',
    icon: 'SL',
    iconBg: 'rgba(74, 21, 75, 0.2)',
    iconColor: '#e01e5a',
    status: 'available',
    tools: 35,
    category: 'Communication',
  },
  {
    name: 'SendGrid',
    description: 'Transactional email, templates, and email marketing campaigns.',
    icon: 'SG',
    iconBg: 'rgba(0, 116, 212, 0.12)',
    iconColor: '#0074d4',
    status: 'available',
    tools: 28,
    category: 'Communication',
  },
  {
    name: 'Discord',
    description: 'Server management, bots, webhooks, and community features.',
    icon: 'DC',
    iconBg: 'rgba(88, 101, 242, 0.12)',
    iconColor: '#5865f2',
    status: 'available',
    tools: 32,
    category: 'Communication',
  },
  {
    name: 'Twilio',
    description: 'SMS, voice calls, video, and WhatsApp messaging.',
    icon: 'TW',
    iconBg: 'rgba(241, 35, 46, 0.12)',
    iconColor: '#f1232e',
    status: 'available',
    tools: 24,
    category: 'Communication',
  },
  {
    name: 'GitHub',
    description: 'Repository management, issues, PRs, actions, and deployments.',
    icon: 'GH',
    iconBg: 'rgba(255, 255, 255, 0.08)',
    iconColor: '#ffffff',
    status: 'connected',
    tools: 45,
    category: 'Development',
  },
  {
    name: 'Shopify',
    description: 'E-commerce products, orders, customers, and inventory.',
    icon: 'SH',
    iconBg: 'rgba(150, 191, 72, 0.12)',
    iconColor: '#96bf48',
    status: 'available',
    tools: 38,
    category: 'Commerce',
  },
  {
    name: 'OpenAI',
    description: 'GPT models, DALL-E, embeddings, and fine-tuning.',
    icon: 'AI',
    iconBg: 'rgba(0, 212, 255, 0.12)',
    iconColor: '#00d4ff',
    status: 'available',
    tools: 22,
    category: 'AI',
  },
  {
    name: 'Google Sheets',
    description: 'Spreadsheet operations, data sync, and reporting automation.',
    icon: 'GS',
    iconBg: 'rgba(52, 168, 83, 0.12)',
    iconColor: '#34a853',
    status: 'available',
    tools: 18,
    category: 'Productivity',
  },
  {
    name: 'Notion',
    description: 'Workspace management, databases, pages, and team collaboration.',
    icon: 'N',
    iconBg: 'rgba(255, 255, 255, 0.08)',
    iconColor: '#ffffff',
    status: 'available',
    tools: 28,
    category: 'Productivity',
  },
  {
    name: 'Airtable',
    description: 'Flexible databases, views, automations, and integrations.',
    icon: 'AT',
    iconBg: 'rgba(18, 131, 218, 0.12)',
    iconColor: '#1283da',
    status: 'available',
    tools: 24,
    category: 'Productivity',
  },
  {
    name: 'Cloudflare',
    description: 'DNS, Workers, R2 storage, and edge compute.',
    icon: 'CF',
    iconBg: 'rgba(245, 130, 32, 0.12)',
    iconColor: '#f58220',
    status: 'available',
    tools: 30,
    category: 'Infrastructure',
  },
  {
    name: 'MongoDB',
    description: 'Document database CRUD, aggregation, and indexing.',
    icon: 'MG',
    iconBg: 'rgba(0, 237, 100, 0.12)',
    iconColor: '#00ed64',
    status: 'available',
    tools: 22,
    category: 'Database',
  },
]

const categories = ['All', 'Core', 'Communication', 'Development', 'AI', 'Productivity', 'Commerce', 'Infrastructure', 'Database']

export default function IntegrationsPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = integrations.filter((int) => {
    const matchesCategory = activeCategory === 'All' || int.category === activeCategory
    const matchesSearch = !searchQuery || int.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const connectedCount = integrations.filter((i) => i.status === 'connected').length
  const totalTools = integrations.reduce((sum, i) => sum + i.tools, 0)

  return (
    <div>
      <div className="jp-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="jp-page-title">Integrations</h1>
          <p className="jp-page-subtitle">
            {connectedCount} connected -- {totalTools}+ tools available across {integrations.length} services
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="jp-search" style={{ width: 220 }}>
            <span className="jp-search-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              className="jp-search-input"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="jp-stat-card green">
          <div className="jp-stat-label">Connected</div>
          <div className="jp-stat-value" style={{ marginTop: 8 }}>{connectedCount}</div>
          <span className="jp-stat-change up">Active</span>
        </div>
        <div className="jp-stat-card cyan">
          <div className="jp-stat-label">Available</div>
          <div className="jp-stat-value" style={{ marginTop: 8 }}>{integrations.length - connectedCount}</div>
          <span className="jp-stat-change up">Ready</span>
        </div>
        <div className="jp-stat-card purple">
          <div className="jp-stat-label">Total Tools</div>
          <div className="jp-stat-value" style={{ marginTop: 8 }}>{totalTools}+</div>
          <span className="jp-stat-change up">0nMCP</span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="jp-tabs">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`jp-tab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Integration Grid */}
      <div className="jp-integration-grid">
        {filtered.map((integration) => (
          <div key={integration.name} className="jp-integration-card">
            <div className="jp-integration-card-header">
              <div
                className="jp-integration-icon"
                style={{ background: integration.iconBg, color: integration.iconColor }}
              >
                {integration.icon}
              </div>
              <span className={`jp-integration-status ${integration.status}`}>
                {integration.status === 'connected' ? 'Connected' : 'Available'}
              </span>
            </div>
            <div className="jp-integration-name">{integration.name}</div>
            <div className="jp-integration-desc">{integration.description}</div>
            <div className="jp-integration-footer">
              <span className="jp-integration-tools">{integration.tools} tools</span>
              <button className="jp-integration-btn">
                {integration.status === 'connected' ? 'Configure' : 'Connect'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="jp-empty-state" style={{ marginTop: 40 }}>
          <div className="jp-empty-state-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="jp-empty-state-title">No integrations found</div>
          <div className="jp-empty-state-text">Try a different search term or category</div>
        </div>
      )}
    </div>
  )
}
