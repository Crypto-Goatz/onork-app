'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getLogoSrc } from '@/lib/logo-map'

interface Integration {
  name: string
  key: string
  description: string
  icon: string
  iconBg: string
  iconColor: string
  connected: boolean
  tools: number
  category: string
  credentialKeys: string[]
  labels: string[]
  placeholders: string[]
}

const SERVICE_META: Record<string, { name: string; description: string; icon: string; iconBg: string; iconColor: string; tools: number; category: string }> = {
  crm: { name: 'CRM', description: 'Full contact, pipeline, calendar, and conversation management.', icon: 'CRM', iconBg: 'rgba(126,217,87,0.12)', iconColor: '#7ed957', tools: 245, category: 'Core' },
  stripe: { name: 'Stripe', description: 'Payment processing, subscriptions, invoices, and metered billing.', icon: 'S', iconBg: 'rgba(99,91,255,0.12)', iconColor: '#635bff', tools: 42, category: 'Core' },
  supabase: { name: 'Supabase', description: 'Database, authentication, storage, and edge functions.', icon: 'SB', iconBg: 'rgba(62,207,142,0.12)', iconColor: '#3ecf8e', tools: 38, category: 'Core' },
  openai: { name: 'OpenAI', description: 'GPT models, DALL-E, embeddings, and fine-tuning.', icon: 'AI', iconBg: 'rgba(0,212,255,0.12)', iconColor: '#00d4ff', tools: 22, category: 'AI' },
  anthropic: { name: 'Anthropic', description: 'Claude AI models, messages API, and tool use.', icon: 'CL', iconBg: 'rgba(204,169,128,0.12)', iconColor: '#cc9a80', tools: 18, category: 'AI' },
  slack: { name: 'Slack', description: 'Team messaging, channel management, and notifications.', icon: 'SL', iconBg: 'rgba(74,21,75,0.2)', iconColor: '#e01e5a', tools: 35, category: 'Communication' },
  sendgrid: { name: 'SendGrid', description: 'Transactional email, templates, and campaigns.', icon: 'SG', iconBg: 'rgba(0,116,212,0.12)', iconColor: '#0074d4', tools: 28, category: 'Communication' },
  resend: { name: 'Resend', description: 'Developer-first email API with React templates.', icon: 'RE', iconBg: 'rgba(255,255,255,0.08)', iconColor: '#ffffff', tools: 24, category: 'Communication' },
  discord: { name: 'Discord', description: 'Server management, bots, and community features.', icon: 'DC', iconBg: 'rgba(88,101,242,0.12)', iconColor: '#5865f2', tools: 32, category: 'Communication' },
  twilio: { name: 'Twilio', description: 'SMS, voice calls, video, and WhatsApp messaging.', icon: 'TW', iconBg: 'rgba(241,35,46,0.12)', iconColor: '#f1232e', tools: 24, category: 'Communication' },
  github: { name: 'GitHub', description: 'Repositories, issues, PRs, actions, and deployments.', icon: 'GH', iconBg: 'rgba(255,255,255,0.08)', iconColor: '#ffffff', tools: 45, category: 'Development' },
  linear: { name: 'Linear', description: 'Issue tracking, project management, and sprints.', icon: 'LN', iconBg: 'rgba(99,91,255,0.12)', iconColor: '#5e6ad2', tools: 18, category: 'Development' },
  shopify: { name: 'Shopify', description: 'E-commerce products, orders, customers, and inventory.', icon: 'SH', iconBg: 'rgba(150,191,72,0.12)', iconColor: '#96bf48', tools: 38, category: 'Commerce' },
  notion: { name: 'Notion', description: 'Workspace management, databases, and collaboration.', icon: 'N', iconBg: 'rgba(255,255,255,0.08)', iconColor: '#ffffff', tools: 28, category: 'Productivity' },
  airtable: { name: 'Airtable', description: 'Flexible databases, views, and automations.', icon: 'AT', iconBg: 'rgba(18,131,218,0.12)', iconColor: '#1283da', tools: 24, category: 'Productivity' },
  google_sheets: { name: 'Google Sheets', description: 'Spreadsheet operations, data sync, and reporting.', icon: 'GS', iconBg: 'rgba(52,168,83,0.12)', iconColor: '#34a853', tools: 18, category: 'Productivity' },
  google_drive: { name: 'Google Drive', description: 'Cloud file storage and sharing.', icon: 'GD', iconBg: 'rgba(66,133,244,0.12)', iconColor: '#4285f4', tools: 16, category: 'Productivity' },
  gmail: { name: 'Gmail', description: 'Email sending, reading, and management.', icon: 'GM', iconBg: 'rgba(234,67,53,0.12)', iconColor: '#ea4335', tools: 14, category: 'Productivity' },
  google_calendar: { name: 'Google Calendar', description: 'Events, scheduling, and calendar sync.', icon: 'GC', iconBg: 'rgba(66,133,244,0.12)', iconColor: '#4285f4', tools: 12, category: 'Productivity' },
  hubspot: { name: 'HubSpot', description: 'Marketing, sales, and CRM automation.', icon: 'HS', iconBg: 'rgba(255,122,89,0.12)', iconColor: '#ff7a59', tools: 35, category: 'CRM' },
  zendesk: { name: 'Zendesk', description: 'Customer support, tickets, and knowledge base.', icon: 'ZD', iconBg: 'rgba(3,54,61,0.2)', iconColor: '#03363d', tools: 28, category: 'Support' },
  jira: { name: 'Jira', description: 'Project tracking, sprints, and agile boards.', icon: 'JR', iconBg: 'rgba(0,82,204,0.12)', iconColor: '#0052cc', tools: 22, category: 'Development' },
  mailchimp: { name: 'Mailchimp', description: 'Email campaigns, audiences, and automations.', icon: 'MC', iconBg: 'rgba(255,224,27,0.12)', iconColor: '#ffe01b', tools: 20, category: 'Communication' },
  mongodb: { name: 'MongoDB', description: 'Document database CRUD and aggregation.', icon: 'MG', iconBg: 'rgba(0,237,100,0.12)', iconColor: '#00ed64', tools: 22, category: 'Database' },
  cloudflare: { name: 'Cloudflare', description: 'DNS, Workers, R2 storage, and edge compute.', icon: 'CF', iconBg: 'rgba(245,130,32,0.12)', iconColor: '#f58220', tools: 30, category: 'Infrastructure' },
  calendly: { name: 'Calendly', description: 'Scheduling links and appointment booking.', icon: 'CY', iconBg: 'rgba(0,107,255,0.12)', iconColor: '#006bff', tools: 10, category: 'Productivity' },
  zoom: { name: 'Zoom', description: 'Video meetings, webinars, and recordings.', icon: 'ZM', iconBg: 'rgba(45,140,255,0.12)', iconColor: '#2d8cff', tools: 14, category: 'Communication' },
  microsoft: { name: 'Microsoft 365', description: 'Outlook, Teams, OneDrive, and Calendar.', icon: 'MS', iconBg: 'rgba(0,120,212,0.12)', iconColor: '#0078d4', tools: 28, category: 'Productivity' },
}

const categories = ['All', 'Core', 'AI', 'Communication', 'Development', 'Productivity', 'Commerce', 'CRM', 'Database', 'Infrastructure', 'Support']

export default function IntegrationsPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [connectingService, setConnectingService] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [testing, setTesting] = useState<string | null>(null)

  const supabase = createClient()

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  // Close modal on Escape key
  useEffect(() => {
    if (!connectingService) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setConnectingService(null)
        setCredentials({})
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [connectingService])

  const loadIntegrations = useCallback(async (uid: string) => {
    try {
      const res = await fetch(`/api/integrations?user_id=${uid}`)
      if (!res.ok) return
      const data = await res.json()

      const merged: Integration[] = Object.entries(SERVICE_META).map(([key, meta]) => {
        const svc = (data.services || []).find((s: { key: string }) => s.key === key)
        return {
          ...meta,
          key,
          connected: svc?.connected || false,
          credentialKeys: svc?.credentialKeys || ['apiKey'],
          labels: svc?.labels || ['API Key'],
          placeholders: svc?.placeholders || ['...'],
        }
      })

      setIntegrations(merged)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        loadIntegrations(user.id)
      } else {
        setLoading(false)
      }
    })
  }, [supabase.auth, loadIntegrations])

  async function handleConnect(service: string) {
    if (!userId) return
    setSaving(true)
    setToast(null)

    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', user_id: userId, service, credentials }),
      })
      const data = await res.json()

      if (!res.ok) {
        setToast({ type: 'error', text: data.error || 'Connection failed' })
        setSaving(false)
        return
      }

      setToast({ type: 'success', text: `${SERVICE_META[service]?.name || service} connected!` })
      setConnectingService(null)
      setCredentials({})
      await loadIntegrations(userId)
    } catch {
      setToast({ type: 'error', text: 'Connection failed' })
    }
    setSaving(false)
  }

  async function handleDisconnect(service: string) {
    if (!userId) return
    setToast(null)

    try {
      await fetch('/api/integrations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, service }),
      })
      setToast({ type: 'success', text: `${SERVICE_META[service]?.name || service} disconnected` })
      await loadIntegrations(userId)
    } catch {
      setToast({ type: 'error', text: 'Failed to disconnect' })
    }
  }

  async function handleTest(service: string) {
    if (!userId) return
    setTesting(service)
    setToast(null)

    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', user_id: userId, service }),
      })
      const data = await res.json()

      if (!res.ok) {
        setToast({ type: 'error', text: data.error || 'Connection test failed' })
      } else {
        setToast({ type: 'success', text: `${SERVICE_META[service]?.name || service} connection verified` })
      }
    } catch {
      setToast({ type: 'error', text: 'Connection test failed' })
    }
    setTesting(null)
  }

  const filtered = integrations.filter(int => {
    const matchesCategory = activeCategory === 'All' || int.category === activeCategory
    const matchesSearch = !searchQuery || int.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const connectedCount = integrations.filter(i => i.connected).length
  const totalTools = integrations.reduce((sum, i) => sum + i.tools, 0)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ width: 36, height: 36, border: '2px solid var(--jp-border)', borderTopColor: 'var(--jp-green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const modalIntegration = connectingService ? integrations.find(i => i.key === connectingService) : null

  return (
    <div>
      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 10000,
          padding: '12px 20px',
          borderRadius: 10,
          fontSize: '0.85rem',
          fontWeight: 600,
          background: toast.type === 'success' ? 'rgba(126,217,87,0.12)' : 'rgba(248,113,113,0.12)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(126,217,87,0.3)' : 'rgba(248,113,113,0.3)'}`,
          color: toast.type === 'success' ? '#7ed957' : '#f87171',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'toastIn 0.3s ease-out',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          {toast.type === 'success' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7ed957" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.text}
        </div>
      )}

      {/* Connect Modal Overlay */}
      {connectingService && modalIntegration && (
        <div
          onClick={() => { setConnectingService(null); setCredentials({}) }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'modalFadeIn 0.2s ease-out',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 480,
              background: 'var(--jp-card-bg, #141414)',
              border: '1px solid var(--jp-border)',
              borderRadius: 16,
              overflow: 'hidden',
              animation: 'modalSlideIn 0.25s ease-out',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid var(--jp-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: SERVICE_META[connectingService]?.iconBg,
                  color: SERVICE_META[connectingService]?.iconColor,
                  fontSize: '0.7rem',
                  fontWeight: 800,
                }}>
                  {(() => {
                    const src = getLogoSrc(connectingService)
                    if (src) return <img src={src} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                    return SERVICE_META[connectingService]?.icon
                  })()}
                </div>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--jp-text)' }}>
                  Connect {SERVICE_META[connectingService]?.name}
                </span>
              </div>
              <button
                onClick={() => { setConnectingService(null); setCredentials({}) }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--jp-text-muted)',
                  cursor: 'pointer',
                  fontSize: '1.3rem',
                  lineHeight: 1,
                  padding: '4px 8px',
                  borderRadius: 6,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {modalIntegration.credentialKeys.map((key, i) => (
                  <div key={key}>
                    <label style={{
                      fontSize: '0.72rem',
                      color: 'var(--jp-text-muted)',
                      fontWeight: 600,
                      display: 'block',
                      marginBottom: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}>
                      {modalIntegration.labels[i] || key}
                    </label>
                    <input
                      type="password"
                      value={credentials[key] || ''}
                      onChange={e => setCredentials(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={modalIntegration.placeholders[i] || '...'}
                      autoComplete="off"
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--jp-border)',
                        background: 'var(--jp-bg, #0a0a0a)',
                        color: 'var(--jp-text)',
                        fontSize: '0.875rem',
                        fontFamily: 'var(--jp-font-mono)',
                        outline: 'none',
                        transition: 'border-color 0.15s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(126,217,87,0.4)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--jp-border)')}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '0 24px 24px' }}>
              <button
                onClick={() => handleConnect(connectingService)}
                disabled={saving || modalIntegration.credentialKeys.some(k => !credentials[k])}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#7ed957',
                  color: '#0a0a0a',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: saving || modalIntegration.credentialKeys.some(k => !credentials[k]) ? 'not-allowed' : 'pointer',
                  opacity: saving || modalIntegration.credentialKeys.some(k => !credentials[k]) ? 0.5 : 1,
                  fontFamily: 'inherit',
                  transition: 'opacity 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {saving && (
                  <div style={{
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(10,10,10,0.3)',
                    borderTopColor: '#0a0a0a',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                )}
                {saving ? 'Connecting...' : 'Connect'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <button
                  onClick={() => { setConnectingService(null); setCredentials({}) }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--jp-text-muted)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  Cancel
                </button>
              </div>

              <div style={{
                marginTop: 16,
                fontSize: '0.7rem',
                color: 'var(--jp-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--jp-green, #7ed957)">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                </svg>
                Credentials encrypted in your personal vault
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideIn { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes toastIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="jp-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="jp-page-title">Integrations</h1>
          <p className="jp-page-subtitle">
            {connectedCount} connected — {totalTools}+ tools available across {integrations.length} services
          </p>
        </div>
        <div className="jp-search" style={{ width: 220 }}>
          <span className="jp-search-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input type="text" className="jp-search-input" placeholder="Search services..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {/* Stats */}
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

      {/* Categories */}
      <div className="jp-tabs" style={{ flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button key={cat} className={`jp-tab ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
            {cat}
          </button>
        ))}
      </div>

      {/* Integration Grid */}
      <div className="jp-integration-grid">
        {filtered.map(integration => (
          <div key={integration.key} className="jp-integration-card">
            <div className="jp-integration-card-header">
              <div className="jp-integration-icon" style={{ background: integration.iconBg, color: integration.iconColor }}>
                {(() => {
                  const logoSrc = getLogoSrc(integration.key)
                  if (logoSrc) {
                    return <img src={logoSrc} alt={integration.name} style={{ width: 24, height: 24, objectFit: 'contain' }} />
                  }
                  return integration.icon
                })()}
              </div>
              <span className={`jp-integration-status ${integration.connected ? 'connected' : 'available'}`}>
                {integration.connected ? 'Connected' : 'Available'}
              </span>
            </div>
            <div className="jp-integration-name">{integration.name}</div>
            <div className="jp-integration-desc">{integration.description}</div>
            <div className="jp-integration-footer">
              <span className="jp-integration-tools">{integration.tools} tools</span>
              {integration.connected ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="jp-integration-btn"
                    onClick={() => handleTest(integration.key)}
                    disabled={testing === integration.key}
                    style={{
                      opacity: testing === integration.key ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {testing === integration.key ? (
                      <>
                        <div style={{
                          width: 10,
                          height: 10,
                          border: '1.5px solid var(--jp-border)',
                          borderTopColor: 'var(--jp-green)',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                        }} />
                        Testing
                      </>
                    ) : (
                      'Test'
                    )}
                  </button>
                  <button className="jp-integration-btn" onClick={() => { setConnectingService(integration.key); setCredentials({}) }}>Configure</button>
                  <button
                    className="jp-integration-btn"
                    onClick={() => handleDisconnect(integration.key)}
                    style={{ color: 'var(--jp-red)', borderColor: 'rgba(248,113,113,0.2)' }}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button className="jp-integration-btn" onClick={() => { setConnectingService(integration.key); setCredentials({}) }}>
                  Connect
                </button>
              )}
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
