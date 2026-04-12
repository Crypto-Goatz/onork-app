'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getLogoSrc } from '@/lib/logo-map'

interface ServiceField {
  key: string; label: string; type: string; placeholder: string; required: boolean
}

interface ServiceItem {
  id: string; name: string; category: string; icon: string; color: string
  description: string; fields: ServiceField[]; docUrl: string
  tools: number; guide: string[]; keyUrl: string; keyLabel: string
  capabilities: string[]; setupNote: string; affiliateUrl?: string
  connected: boolean; health?: string; lastVerified?: string | null
}

const SERVICE_EXTRAS: Record<string, { tools?: number; guide?: string[]; keyUrl?: string; keyLabel?: string; capabilities?: string[]; setupNote?: string; affiliateUrl?: string }> = {
  sendgrid: { tools: 28, guide: ['Go to app.sendgrid.com/settings/api_keys', 'Click "Create API Key"', 'Choose "Full Access" and name it "0nCore"', 'Copy the key (starts with SG.)'], keyUrl: 'https://app.sendgrid.com/settings/api_keys', keyLabel: 'Get API Key', capabilities: ['Send Email', 'Templates', 'Contacts', 'Lists', 'Stats'], setupNote: 'Create a Full Access API key from Settings → API Keys' },
  twilio: { tools: 24, guide: ['Go to console.twilio.com', 'Account SID is on the dashboard', 'Click "Show" to reveal Auth Token', 'Get a phone number from Phone Numbers → Manage'], keyUrl: 'https://console.twilio.com', keyLabel: 'Get Credentials', capabilities: ['SMS', 'Voice', 'WhatsApp', 'Verify', 'Lookup'], setupNote: 'You need Account SID + Auth Token + a Twilio phone number', affiliateUrl: 'https://www.twilio.com/referral' },
  stripe: { tools: 42, guide: ['Go to dashboard.stripe.com/apikeys', 'Copy your "Secret key" (live mode)', 'Starts with sk_live_ or rk_live_'], keyUrl: 'https://dashboard.stripe.com/apikeys', keyLabel: 'Get API Key', capabilities: ['Payments', 'Subscriptions', 'Invoices', 'Customers', 'Products', 'Checkout', 'Webhooks', 'Balance'], setupNote: 'Get your Secret Key from Stripe Dashboard → Developers → API Keys', affiliateUrl: 'https://stripe.com/partners/referral' },
  openai: { tools: 22, guide: ['Go to platform.openai.com/api-keys', 'Click "Create new secret key"', 'Name it "0nCore" and copy the key'], keyUrl: 'https://platform.openai.com/api-keys', keyLabel: 'Get API Key', capabilities: ['Chat', 'Images', 'Audio', 'Embeddings', 'Files', 'Fine-tuning'], setupNote: 'Create a new secret key from the OpenAI platform dashboard' },
  anthropic: { tools: 18, guide: ['Go to console.anthropic.com/settings/keys', 'Click "Create Key"', 'Name it "0nCore" and copy (starts with sk-ant-)'], keyUrl: 'https://console.anthropic.com/settings/keys', keyLabel: 'Get API Key', capabilities: ['Chat', 'Tool Use', 'Vision', 'Streaming', 'System Prompts'], setupNote: 'Get your API key from console.anthropic.com → Settings → API Keys' },
  groq: { tools: 12, guide: ['Go to console.groq.com/keys', 'Click "Create API Key"', 'Copy the key (starts with gsk_)'], keyUrl: 'https://console.groq.com/keys', keyLabel: 'Get Free Key', capabilities: ['Chat Completions', 'Models', 'Ultra-fast inference'], setupNote: 'Free tier available — no credit card required' },
  slack: { tools: 35, guide: ['Go to api.slack.com/apps', 'Create or select your app', 'Go to OAuth & Permissions', 'Copy the "Bot User OAuth Token" (xoxb-)'], keyUrl: 'https://api.slack.com/apps', keyLabel: 'Create App', capabilities: ['Messages', 'Channels', 'Users', 'Files', 'Reactions', 'Slash Commands'], setupNote: 'Bot token (xoxb-) from api.slack.com → Your Apps → OAuth & Permissions' },
  github: { tools: 45, guide: ['Go to github.com/settings/tokens', 'Click "Generate new token (classic)"', 'Select scopes: repo, workflow, read:org', 'Copy the token (starts with ghp_)'], keyUrl: 'https://github.com/settings/tokens/new', keyLabel: 'Generate Token', capabilities: ['Repos', 'Issues', 'Pull Requests', 'Actions', 'Releases', 'Gists'], setupNote: 'Generate a classic PAT with repo + workflow scopes' },
  hubspot: { tools: 35, guide: ['Go to app.hubspot.com → Settings → Integrations → Private Apps', 'Create a new private app', 'Grant CRM scopes and copy the token'], keyUrl: 'https://app.hubspot.com', keyLabel: 'Get Token', capabilities: ['Contacts', 'Companies', 'Deals', 'Tickets', 'Marketing', 'Forms'], setupNote: 'Create a Private App and grant CRM + Marketing scopes' },
  notion: { tools: 28, guide: ['Go to notion.so/my-integrations', 'Create a new integration', 'Copy the "Internal Integration Token" (secret_)'], keyUrl: 'https://www.notion.so/my-integrations', keyLabel: 'Create Integration', capabilities: ['Pages', 'Databases', 'Blocks', 'Users', 'Search', 'Comments'], setupNote: 'Create an internal integration and share pages with it' },
  shopify: { tools: 38, guide: ['Go to your Shopify admin → Settings → Apps', 'Click "Develop apps" → Create an app', 'Install and copy the Admin API access token (shpat_)'], keyUrl: 'https://admin.shopify.com', keyLabel: 'Create App', capabilities: ['Products', 'Orders', 'Customers', 'Inventory', 'Themes', 'Metafields'], setupNote: 'Need your store URL (yourstore.myshopify.com) + Admin API access token' },
  supabase: { tools: 38, guide: ['Go to supabase.com/dashboard', 'Select your project', 'Go to Settings → API', 'Copy the URL + service_role key'], keyUrl: 'https://supabase.com/dashboard', keyLabel: 'Get Keys', capabilities: ['Database', 'Auth', 'Storage', 'Realtime', 'Edge Functions', 'RLS'], setupNote: 'You need both the Project URL and the service_role key' },
  cloudflare: { tools: 30, guide: ['Go to dash.cloudflare.com/profile/api-tokens', 'Create a new API token', 'Use "Edit zone DNS" template or custom'], keyUrl: 'https://dash.cloudflare.com/profile/api-tokens', keyLabel: 'Create Token', capabilities: ['DNS', 'CDN', 'Workers', 'R2', 'Pages', 'WAF', 'Analytics'], setupNote: 'Create an API token with the permissions you need' },
  airtable: { tools: 24, guide: ['Go to airtable.com/create/tokens', 'Create a personal access token', 'Grant scopes for your bases', 'Copy the token (starts with pat)'], keyUrl: 'https://airtable.com/create/tokens', keyLabel: 'Create Token', capabilities: ['Records', 'Tables', 'Bases', 'Views', 'Fields', 'Webhooks'], setupNote: 'Create a PAT and grant access to specific bases' },
  mailchimp: { tools: 20, guide: ['Go to mailchimp.com → Account → Extras → API keys', 'Click "Create A Key"', 'Copy the key — the server prefix is after the dash (e.g. us1)'], keyUrl: 'https://us1.admin.mailchimp.com/account/api/', keyLabel: 'Get API Key', capabilities: ['Campaigns', 'Lists', 'Templates', 'Automations', 'Reports'], setupNote: 'You need the API key + server prefix (e.g. us1)' },
  hostinger: { tools: 118, guide: ['Log in to hPanel at hpanel.hostinger.com', 'Go to Profile → Account Information → API', 'Generate an API token and set expiration', 'Copy the token'], keyUrl: 'https://hpanel.hostinger.com', keyLabel: 'Generate Token', capabilities: ['Domains', 'DNS', 'Hosting', 'VPS', 'WordPress', 'Email', 'Billing', 'SSL'], setupNote: '118 tools — domains, DNS, hosting, VPS, WordPress management, and more' },
  resend: { tools: 24, guide: ['Go to resend.com/api-keys', 'Click "Create API Key"', 'Copy the key (starts with re_)'], keyUrl: 'https://resend.com/api-keys', keyLabel: 'Get API Key', capabilities: ['Send', 'Domains', 'Audiences', 'Emails'], setupNote: 'Developer-friendly email API — simple and modern' },
  godaddy: { tools: 20, guide: ['Go to developer.godaddy.com/keys', 'Create a new API key', 'Copy both the Key and Secret'], keyUrl: 'https://developer.godaddy.com/keys', keyLabel: 'Get API Key', capabilities: ['Domains', 'DNS', 'Certificates', 'Aftermarket'], setupNote: 'Need both API Key and API Secret' },
  linear: { tools: 18, guide: ['Go to linear.app → Settings → API', 'Create a personal API key', 'Copy the key (starts with lin_api_)'], keyUrl: 'https://linear.app/settings/api', keyLabel: 'Get API Key', capabilities: ['Issues', 'Projects', 'Teams', 'Cycles', 'Labels'], setupNote: 'GraphQL API — create a personal key from Settings → API' },
  calendly: { tools: 10, guide: ['Go to calendly.com → Integrations → API', 'Generate a Personal Access Token', 'Copy the token'], keyUrl: 'https://calendly.com/integrations/api_webhooks', keyLabel: 'Get Token', capabilities: ['Events', 'Scheduling', 'Invitees', 'Webhooks'], setupNote: 'Personal access token from Integrations → API & Webhooks' },
}

const CATEGORIES = ['All', 'Core', 'AI', 'Communication', 'Development', 'Productivity', 'Commerce', 'CRM', 'Database', 'Infrastructure', 'Marketing', 'Analytics', 'Payments', 'Support']

function buildService(raw: Record<string, unknown>): ServiceItem {
  const id = raw.id as string
  const extras = SERVICE_EXTRAS[id] || {}
  const fields = (raw.fields as ServiceField[]) || []
  return {
    id,
    name: raw.name as string || id,
    category: raw.category as string || 'Other',
    icon: raw.icon as string || id.slice(0, 2).toUpperCase(),
    color: raw.color as string || '#6EE05A',
    description: raw.description as string || '',
    fields,
    docUrl: raw.docUrl as string || '',
    tools: extras.tools || (raw as Record<string, unknown>).tools as number || fields.length * 4,
    guide: extras.guide || [],
    keyUrl: extras.keyUrl || raw.docUrl as string || '',
    keyLabel: extras.keyLabel || 'Get API Key',
    capabilities: extras.capabilities || [],
    setupNote: extras.setupNote || '',
    affiliateUrl: extras.affiliateUrl,
    connected: !!(raw.connection as Record<string, unknown>),
    health: (raw.connection as Record<string, unknown>)?.health as string,
    lastVerified: (raw.connection as Record<string, unknown>)?.lastVerified as string,
  }
}

export default function IntegrationsPage() {
  const [services, setServices] = useState<ServiceItem[]>([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [connectingService, setConnectingService] = useState<ServiceItem | null>(null)
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [testing, setTesting] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!connectingService) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setConnectingService(null); setCredentials({}) } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [connectingService])

  const loadServices = useCallback(async () => {
    try {
      const res = await fetch('/api/services/list')
      if (!res.ok) return
      const data = await res.json()
      const items = ((data.services || []) as Record<string, unknown>[]).map(buildService)
      setServices(items)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadServices() }, [loadServices])

  async function handleConnect() {
    if (!connectingService) return
    setSaving(true)
    try {
      const res = await fetch('/api/services/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: connectingService.id, credentials }),
      })
      const data = await res.json()
      if (data.status === 'active' || data.verified) {
        setToast({ type: 'success', text: `${connectingService.name} connected!` })
        setConnectingService(null)
        setCredentials({})
        await loadServices()
      } else {
        setToast({ type: 'error', text: data.error || 'Verification failed — check your credentials' })
      }
    } catch {
      setToast({ type: 'error', text: 'Connection failed' })
    }
    setSaving(false)
  }

  async function handleDisconnect(serviceId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const admin = createClient()
      await admin.from('user_service_connections').delete().eq('user_id', user.id).eq('service', serviceId)
      setToast({ type: 'success', text: 'Disconnected' })
      await loadServices()
    } catch {
      setToast({ type: 'error', text: 'Failed to disconnect' })
    }
  }

  async function handleTest(service: ServiceItem) {
    setTesting(service.id)
    try {
      const res = await fetch('/api/services/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: service.id, credentials: {} }),
      })
      const data = await res.json()
      setToast({ type: data.verified ? 'success' : 'error', text: data.verified ? `${service.name} verified` : 'Verification failed' })
    } catch {
      setToast({ type: 'error', text: 'Test failed' })
    }
    setTesting(null)
  }

  const filtered = services.filter(s => {
    const matchesCat = activeCategory === 'All' || s.category.toLowerCase() === activeCategory.toLowerCase()
    const matchesSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCat && matchesSearch
  })

  const connectedCount = services.filter(s => s.connected).length
  const totalTools = services.reduce((sum, s) => sum + s.tools, 0)
  const usedCategories = CATEGORIES.filter(c => c === 'All' || services.some(s => s.category.toLowerCase() === c.toLowerCase()))

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ width: 36, height: 36, border: '2px solid var(--jp-border, #30363d)', borderTopColor: '#7ed957', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideIn { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes toastIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cardHover { from { box-shadow: 0 2px 12px rgba(0,0,0,0.2); } to { box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(126,217,87,0.06); } }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 10000,
          padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: toast.type === 'success' ? 'rgba(126,217,87,0.12)' : 'rgba(248,113,113,0.12)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(126,217,87,0.3)' : 'rgba(248,113,113,0.3)'}`,
          color: toast.type === 'success' ? '#7ed957' : '#f87171',
          backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'toastIn 0.3s ease-out', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.text}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--jp-text, #f0f4f8)', margin: '0 0 4px' }}>Integrations</h1>
          <p style={{ fontSize: 13, color: 'var(--jp-text-muted, #8b95a5)', margin: 0 }}>
            {connectedCount} connected — {totalTools}+ tools across {services.length} services
          </p>
        </div>
        <div style={{ position: 'relative', width: 220 }}>
          <input
            type="text" placeholder="Search services..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '9px 14px 9px 36px', borderRadius: 8,
              background: 'var(--jp-bg-card, #161b22)', border: '1px solid var(--jp-border, #30363d)',
              color: 'var(--jp-text, #f0f4f8)', fontSize: 13, outline: 'none',
            }}
          />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--jp-text-muted, #6b7280)" strokeWidth="2" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Connected', value: connectedCount, color: '#7ed957', tag: 'Active' },
          { label: 'Available', value: services.length - connectedCount, color: '#00d4ff', tag: 'Ready' },
          { label: 'Total Tools', value: `${totalTools}+`, color: '#a78bfa', tag: '0nMCP' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14,
            padding: '18px 20px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
            <div style={{ fontSize: 11, color: 'var(--jp-text-muted, #8b95a5)', fontWeight: 600, letterSpacing: '0.04em' }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--jp-text, #f0f4f8)', margin: '6px 0 4px', fontFamily: 'var(--jp-font-mono, monospace)' }}>{s.value}</div>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: `${s.color}15`, color: s.color, fontWeight: 600 }}>{s.tag}</span>
          </div>
        ))}
      </div>

      {/* Category Tabs */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap',
        background: 'var(--jp-bg-card, #161b22)', borderRadius: 10, padding: 4,
        border: '1px solid rgba(255,255,255,0.04)', width: 'fit-content',
      }}>
        {usedCategories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{
            padding: '7px 14px', borderRadius: 7, border: 'none',
            background: activeCategory === cat ? 'rgba(126,217,87,0.1)' : 'transparent',
            color: activeCategory === cat ? '#7ed957' : 'var(--jp-text-muted, #6b7280)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}>{cat}</button>
        ))}
      </div>

      {/* Integration Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filtered.map(svc => {
          const logoSrc = getLogoSrc(svc.id)
          return (
            <div
              key={svc.id}
              style={{
                background: 'rgba(255,255,255,0.02)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${svc.connected ? 'rgba(126,217,87,0.2)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 16, padding: 22,
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = `0 16px 48px rgba(0,0,0,0.35), 0 0 30px ${svc.color}18`
                e.currentTarget.style.borderColor = `${svc.color}60`
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)'
                e.currentTarget.style.borderColor = svc.connected ? 'rgba(126,217,87,0.2)' : 'rgba(255,255,255,0.06)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
              }}
              onClick={() => { if (!svc.connected) { setConnectingService(svc); setCredentials({}) } }}
            >
              {/* Top accent line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${svc.color}, ${svc.color}40)`, opacity: svc.connected ? 1 : 0.4 }} />

              {/* Header: icon + status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: `${svc.color}12`, border: `1px solid ${svc.color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {logoSrc ? (
                    <img src={logoSrc} alt={svc.name} style={{ width: 24, height: 24, objectFit: 'contain' }} />
                  ) : (
                    <span style={{ color: svc.color, fontSize: 13, fontWeight: 800, fontFamily: 'var(--jp-font-mono, monospace)' }}>{svc.icon}</span>
                  )}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                  background: svc.connected ? 'rgba(126,217,87,0.1)' : 'rgba(255,255,255,0.04)',
                  color: svc.connected ? '#7ed957' : 'var(--jp-text-muted, #6b7280)',
                  border: `1px solid ${svc.connected ? 'rgba(126,217,87,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  letterSpacing: '0.04em',
                }}>
                  {svc.connected ? 'CONNECTED' : 'AVAILABLE'}
                </span>
              </div>

              {/* Name + description */}
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--jp-text, #f0f4f8)', marginBottom: 6 }}>{svc.name}</div>
              <div style={{ fontSize: 12, color: 'var(--jp-text-muted, #8b95a5)', lineHeight: 1.5, marginBottom: 16, minHeight: 36 }}>{svc.description}</div>

              {/* Footer: tools + actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'var(--jp-text-muted, #8b95a5)', fontFamily: 'var(--jp-font-mono, monospace)' }}>
                  {svc.tools} tools
                </span>
                {svc.connected ? (
                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleTest(svc)} disabled={testing === svc.id} style={{
                      padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)', color: 'var(--jp-text-muted, #8b95a5)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      {testing === svc.id ? '...' : 'Test'}
                    </button>
                    <button onClick={() => { setConnectingService(svc); setCredentials({}) }} style={{
                      padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)', color: 'var(--jp-text-muted, #8b95a5)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}>
                      Configure
                    </button>
                    <button onClick={() => handleDisconnect(svc.id)} style={{
                      padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.15)',
                      background: 'rgba(248,113,113,0.05)', color: '#f87171',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}>
                      ×
                    </button>
                  </div>
                ) : (
                  <button onClick={e => { e.stopPropagation(); setConnectingService(svc); setCredentials({}) }} style={{
                    padding: '5px 14px', borderRadius: 6, border: 'none',
                    background: `${svc.color}15`, color: svc.color,
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    Connect
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--jp-text-muted, #8b95a5)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No integrations found</div>
          <div style={{ fontSize: 13 }}>Try a different search or category</div>
        </div>
      )}

      {/* ═══ CONNECT MODAL ═══ */}
      {connectingService && (
        <div
          onClick={() => { setConnectingService(null); setCredentials({}) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)', zIndex: 9000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'modalFadeIn 0.2s ease-out',
          }}
        >
          <div style={{
            position: 'absolute', width: 600, height: 600, borderRadius: '50%',
            background: `radial-gradient(circle, ${connectingService.color}15 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative', width: '100%', maxWidth: 520,
              background: 'rgba(15,17,23,0.9)', backdropFilter: 'blur(24px)',
              border: `1px solid ${connectingService.color}30`,
              borderRadius: 20, overflow: 'hidden',
              animation: 'modalSlideIn 0.25s ease-out',
              boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 40px ${connectingService.color}08`,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${connectingService.color}12`, border: `1px solid ${connectingService.color}20`,
                }}>
                  {(() => {
                    const src = getLogoSrc(connectingService.id)
                    return src ? <img src={src} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} /> :
                      <span style={{ color: connectingService.color, fontSize: 13, fontWeight: 800 }}>{connectingService.icon}</span>
                  })()}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--jp-text, #f0f4f8)' }}>Connect {connectingService.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--jp-text-muted, #8b95a5)' }}>{connectingService.tools} tools unlocked</div>
                </div>
              </div>
              <button onClick={() => { setConnectingService(null); setCredentials({}) }} style={{
                background: 'none', border: 'none', color: 'var(--jp-text-muted, #8b95a5)',
                cursor: 'pointer', fontSize: 18, padding: '4px 8px', borderRadius: 6,
              }}>✕</button>
            </div>

            <div style={{ padding: 24 }}>
              {/* Setup Note */}
              {connectingService.setupNote && (
                <div style={{
                  padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                  background: `${connectingService.color}06`, border: `1px solid ${connectingService.color}15`,
                  fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5,
                }}>
                  {connectingService.setupNote}
                </div>
              )}

              {/* Step-by-step Guide */}
              {connectingService.guide.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--jp-text-muted, #8b95a5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    How to get your key
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {connectingService.guide.map((step, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: `${connectingService.color}12`, color: connectingService.color,
                          fontSize: 10, fontWeight: 800,
                        }}>{i + 1}</span>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, paddingTop: 2 }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Get Key Button */}
              {connectingService.keyUrl && (
                <a href={connectingService.affiliateUrl || connectingService.keyUrl} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: 12, borderRadius: 10, marginBottom: 20,
                  background: connectingService.color, color: '#fff', fontSize: 13, fontWeight: 700,
                  textDecoration: 'none', transition: 'opacity 0.15s',
                }}>
                  ↗ {connectingService.keyLabel}
                </a>
              )}

              {/* Capability tags */}
              {connectingService.capabilities.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--jp-text-muted, #8b95a5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    Capabilities
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {connectingService.capabilities.map(cap => (
                      <span key={cap} style={{
                        fontSize: 10, padding: '3px 8px', borderRadius: 6,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.55)',
                      }}>{cap}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Credential fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                {connectingService.fields.map(field => (
                  <div key={field.key}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--jp-text-muted, #8b95a5)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                      {field.label} {field.required && <span style={{ color: connectingService.color }}>*</span>}
                    </label>
                    <input
                      type={field.type === 'password' ? 'password' : 'text'}
                      value={credentials[field.key] || ''}
                      onChange={e => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      autoComplete="off"
                      style={{
                        width: '100%', padding: '11px 14px', borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(0,0,0,0.3)', color: 'var(--jp-text, #f0f4f8)',
                        fontSize: 13, fontFamily: 'var(--jp-font-mono, monospace)',
                        outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = `${connectingService.color}50`)}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                    />
                  </div>
                ))}
              </div>

              {/* Connect button */}
              <button
                onClick={handleConnect}
                disabled={saving || connectingService.fields.filter(f => f.required).some(f => !credentials[f.key])}
                style={{
                  width: '100%', padding: 13, borderRadius: 10, border: 'none',
                  background: '#7ed957', color: '#0a0a0a', fontSize: 14, fontWeight: 700,
                  cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit',
                  opacity: saving || connectingService.fields.filter(f => f.required).some(f => !credentials[f.key]) ? 0.5 : 1,
                  transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {saving && <div style={{ width: 16, height: 16, border: '2px solid rgba(10,10,10,0.3)', borderTopColor: '#0a0a0a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
                {saving ? 'Connecting...' : 'Connect & Verify'}
              </button>

              {/* Doc link + security note */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                {connectingService.docUrl && (
                  <a href={connectingService.docUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
                    Documentation ↗
                  </a>
                )}
                <div style={{ fontSize: 11, color: 'var(--jp-text-muted, #8b95a5)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#7ed957"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
                  Encrypted in vault
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
