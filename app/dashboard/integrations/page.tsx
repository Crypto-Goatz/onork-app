'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Download,
  Upload,
  Terminal,
  CheckCircle2,
  XCircle,
  Shield,
  ExternalLink,
  X,
  Loader2,
  PlugZap,
  Layers,
} from 'lucide-react'
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
  heygen: { tools: 11, guide: ['Go to app.heygen.com → Settings → API', 'Generate an API key', 'Copy the key'], keyUrl: 'https://app.heygen.com/settings/api', keyLabel: 'Get API Key', capabilities: ['AI Video Generation', 'Avatar Videos', 'Text-to-Speech', 'Video Translation', 'Voice Library', 'Personalized Outreach', 'Multi-language'], setupNote: 'Generate an API key from your HeyGen dashboard. Also available as a remote MCP server at mcp.heygen.com' },
  heygen_mcp: { tools: 11, guide: ['The HeyGen MCP server is remote — no install needed', 'URL: https://mcp.heygen.com/mcp/v1/', 'Authenticate via OAuth with your HeyGen account', 'Works with Claude Desktop, Cursor, and any MCP client'], keyUrl: 'https://developers.heygen.com/mcp/overview', keyLabel: 'View MCP Docs', capabilities: ['create_video_agent', 'create_avatar_video', 'text_to_speech', 'list_videos', 'translate_video', 'list_voices'], setupNote: 'Remote MCP server — OAuth authentication, no API key needed. Add to Claude: mcp.heygen.com/mcp/v1/' },
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
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showClaudeCode, setShowClaudeCode] = useState(false)

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
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="w-9 h-9 text-core-green animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <style>{`
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideIn { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes toastIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .integration-card { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
        .integration-card:hover { transform: translateY(-4px); }
        .action-btn { transition: all 0.15s; }
        .tool-btn:hover { background: rgba(255,255,255,0.06) !important; }
        .connect-input:focus { border-color: var(--focus-color, rgba(255,255,255,0.2)) !important; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div
          className={[
            'fixed top-6 right-6 z-[10000] flex items-center gap-2',
            'px-5 py-3 rounded-xl text-[13px] font-semibold',
            'backdrop-blur-xl shadow-2xl',
            toast.type === 'success'
              ? 'bg-core-green/10 border border-core-green/30 text-core-green'
              : 'bg-core-red/10 border border-core-red/30 text-core-red',
          ].join(' ')}
          style={{ animation: 'toastIn 0.3s ease-out' }}
        >
          {toast.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <XCircle className="w-4 h-4 shrink-0" />
          }
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-core-text m-0 mb-1">Integrations</h1>
          <p className="text-[13px] text-core-text-muted m-0">
            {connectedCount} connected — {totalTools}+ tools across {services.length} services
          </p>
        </div>
        <div className="relative w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-core-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-[9px] rounded-lg bg-core-card border border-core-border text-core-text text-[13px] outline-none focus:border-core-border-hi"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[
          { label: 'Connected', value: connectedCount, colorClass: 'text-core-green', barClass: 'from-core-green', badgeBg: 'bg-core-green/10', badgeText: 'text-core-green', tag: 'Active' },
          { label: 'Available', value: services.length - connectedCount, colorClass: 'text-core-cyan', barClass: 'from-core-cyan', badgeBg: 'bg-core-cyan/10', badgeText: 'text-core-cyan', tag: 'Ready' },
          { label: 'Total Tools', value: `${totalTools}+`, colorClass: 'text-core-purple', barClass: 'from-core-purple', badgeBg: 'bg-core-purple/10', badgeText: 'text-core-purple', tag: '0nMCP' },
        ].map(s => (
          <div key={s.label} className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl px-5 py-[18px]">
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${s.barClass} to-transparent`} />
            <div className="text-[11px] text-core-text-muted font-semibold tracking-[0.04em] uppercase">{s.label}</div>
            <div className={`text-[28px] font-extrabold ${s.colorClass} my-[6px] font-mono`}>{s.value}</div>
            <span className={`text-[10px] px-2 py-[2px] rounded font-semibold ${s.badgeBg} ${s.badgeText}`}>{s.tag}</span>
          </div>
        ))}
      </div>

      {/* Action Cards — Export / Import / Claude Code */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* Export */}
        <button
          onClick={async () => {
            setExporting(true)
            try {
              const res = await fetch('/api/export?format=download')
              const blob = await res.blob()
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = '0n-setup.0n'; a.click()
              URL.revokeObjectURL(url)
              setToast({ type: 'success', text: '.0n file downloaded!' })
            } catch { setToast({ type: 'error', text: 'Export failed' }) }
            setExporting(false)
          }}
          className="group rounded-xl p-4 text-left cursor-pointer transition-all duration-200 bg-core-green/[0.06] border border-core-green/20 hover:border-core-green/40 hover:-translate-y-[2px] hover:shadow-xl"
        >
          <Download className="w-5 h-5 text-core-green mb-2" />
          <div className="text-[13px] font-bold text-core-green mb-1">
            {exporting ? 'Exporting...' : 'Export .0n File'}
          </div>
          <div className="text-[11px] text-core-text-muted leading-relaxed">
            Download your connections as a portable .0n file
          </div>
        </button>

        {/* Import */}
        <button
          onClick={() => setShowImport(!showImport)}
          className="group rounded-xl p-4 text-left cursor-pointer transition-all duration-200 bg-core-cyan/[0.06] border border-core-cyan/20 hover:border-core-cyan/40 hover:-translate-y-[2px] hover:shadow-xl"
        >
          <Upload className="w-5 h-5 text-core-cyan mb-2" />
          <div className="text-[13px] font-bold text-core-cyan mb-1">Import .0n File</div>
          <div className="text-[11px] text-core-text-muted leading-relaxed">
            Paste a .0n file to auto-connect services
          </div>
        </button>

        {/* Claude Code */}
        <button
          onClick={() => setShowClaudeCode(!showClaudeCode)}
          className="group rounded-xl p-4 text-left cursor-pointer transition-all duration-200 bg-core-purple/[0.06] border border-core-purple/20 hover:border-core-purple/40 hover:-translate-y-[2px] hover:shadow-xl"
        >
          <Terminal className="w-5 h-5 text-core-purple mb-2" />
          <div className="text-[13px] font-bold text-core-purple mb-1">Claude Code Setup</div>
          <div className="text-[11px] text-core-text-muted leading-relaxed">
            Copy-paste config for Claude Desktop
          </div>
        </button>
      </div>

      {/* Import Panel */}
      {showImport && (
        <div className="rounded-2xl border border-core-cyan/15 bg-core-cyan/[0.03] p-5 mb-6">
          <div className="text-[13px] font-bold text-core-cyan mb-2">Paste your .0n file</div>
          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder={'{\n  "$0n": { "type": "config", "version": "1.0.0" },\n  "connections": [...]\n}'}
            className="w-full min-h-[120px] p-4 rounded-xl bg-black/30 border border-white/[0.08] text-core-text text-[12px] font-mono resize-y outline-none focus:border-core-border-hi"
          />
          <div className="flex gap-2 mt-[10px]">
            <button
              onClick={async () => {
                if (!importText.trim()) return
                setImporting(true)
                try {
                  const parsed = JSON.parse(importText)
                  const res = await fetch('/api/import', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(parsed),
                  })
                  const data = await res.json()
                  setToast({ type: data.failed === 0 ? 'success' : 'error', text: `${data.connected} services connected${data.failed ? `, ${data.failed} failed` : ''}` })
                  setShowImport(false)
                  setImportText('')
                  loadServices()
                } catch { setToast({ type: 'error', text: 'Invalid .0n file' }) }
                setImporting(false)
              }}
              disabled={importing || !importText.trim()}
              className={[
                'px-5 py-[10px] rounded-lg text-[13px] font-bold cursor-pointer border-none transition-all',
                importText.trim()
                  ? 'bg-core-cyan text-[#0a0a0a]'
                  : 'bg-core-card text-core-text-muted cursor-not-allowed opacity-50',
              ].join(' ')}
            >
              {importing ? 'Importing...' : 'Import & Connect'}
            </button>
            <button
              onClick={() => { setShowImport(false); setImportText('') }}
              className="px-5 py-[10px] rounded-lg border border-white/10 bg-transparent text-core-text-muted text-[13px] cursor-pointer hover:bg-white/[0.04] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Claude Code Panel */}
      {showClaudeCode && (
        <div className="rounded-2xl border border-core-purple/15 bg-core-purple/[0.03] p-5 mb-6">
          <div className="text-[13px] font-bold text-core-purple mb-1">Claude Desktop / Claude Code Setup</div>
          <div className="text-[12px] text-core-text-muted mb-3 leading-relaxed">
            Copy this config and paste it into your Claude Desktop settings.json or run the CLI command in Claude Code.
          </div>

          <div className="text-[11px] font-semibold text-core-text-muted mb-[6px]">Option 1: Claude Code (Terminal)</div>
          <div
            className="relative rounded-lg bg-black/30 p-3 mb-[14px] font-mono text-[12px] text-core-purple cursor-pointer hover:bg-black/40 transition-all"
            onClick={() => {
              navigator.clipboard.writeText('claude mcp add --scope user 0nMCP -- npx -y 0nmcp@latest')
              setToast({ type: 'success', text: 'CLI command copied!' })
            }}
          >
            <span className="absolute top-2 right-2.5 text-[10px] text-core-text-muted">click to copy</span>
            claude mcp add --scope user 0nMCP -- npx -y 0nmcp@latest
          </div>

          <div className="text-[11px] font-semibold text-core-text-muted mb-[6px]">Option 2: Claude Desktop settings.json</div>
          <div
            className="relative rounded-lg bg-black/30 p-3 mb-[14px] font-mono text-[11px] text-core-green cursor-pointer whitespace-pre overflow-x-auto hover:bg-black/40 transition-all"
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify({ mcpServers: { '0nMCP': { command: 'npx', args: ['-y', '0nmcp@latest'] } } }, null, 2))
              setToast({ type: 'success', text: 'Config copied!' })
            }}
          >
            <span className="absolute top-2 right-2.5 text-[10px] text-core-text-muted">click to copy</span>
{`{
  "mcpServers": {
    "0nMCP": {
      "command": "npx",
      "args": ["-y", "0nmcp@latest"]
    }
  }
}`}
          </div>

          <div className="text-[11px] font-semibold text-core-text-muted mb-[6px]">Option 3: Export your full .0n setup file</div>
          <div className="text-[12px] text-core-text-muted leading-relaxed">
            Click <strong className="text-core-green">Export .0n File</strong> above to download a portable config with all your connected services. Then paste the contents into Claude Code when prompted for credentials.
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-[6px] mb-7 flex-wrap bg-core-card rounded-[10px] p-1 border border-white/[0.04] w-fit">
        {usedCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={[
              'px-[14px] py-[7px] rounded-[7px] border-none text-[12px] font-semibold cursor-pointer transition-all whitespace-nowrap',
              activeCategory === cat
                ? 'bg-core-green/10 text-core-green'
                : 'bg-transparent text-core-text-muted hover:text-core-text-dim',
            ].join(' ')}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Integration Grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {filtered.map(svc => {
          const logoSrc = getLogoSrc(svc.id)
          return (
            <div
              key={svc.id}
              className="integration-card relative overflow-hidden rounded-2xl p-[22px] cursor-pointer bg-white/[0.02] backdrop-blur-xl shadow-[0_2px_12px_rgba(0,0,0,0.15)]"
              style={{
                border: `1px solid ${svc.connected ? 'rgba(110,224,90,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}
              onMouseEnter={e => {
                const el = e.currentTarget
                el.style.boxShadow = `0 16px 48px rgba(0,0,0,0.35), 0 0 30px ${svc.color}18`
                el.style.borderColor = `${svc.color}60`
                el.style.background = 'rgba(255,255,255,0.05)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)'
                el.style.borderColor = svc.connected ? 'rgba(110,224,90,0.2)' : 'rgba(255,255,255,0.06)'
                el.style.background = 'rgba(255,255,255,0.02)'
              }}
              onClick={() => { if (!svc.connected) { setConnectingService(svc); setCredentials({}) } }}
            >
              {/* Top accent line */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                  background: `linear-gradient(90deg, ${svc.color}, ${svc.color}40)`,
                  opacity: svc.connected ? 1 : 0.4,
                }}
              />

              {/* Header: icon + status badge */}
              <div className="flex items-center justify-between mb-[14px]">
                <div
                  className="w-[42px] h-[42px] rounded-xl flex items-center justify-center"
                  style={{ background: `${svc.color}12`, border: `1px solid ${svc.color}20` }}
                >
                  {logoSrc ? (
                    <img src={logoSrc} alt={svc.name} className="w-6 h-6 object-contain" />
                  ) : (
                    <span className="text-[13px] font-extrabold font-mono" style={{ color: svc.color }}>{svc.icon}</span>
                  )}
                </div>
                <span
                  className="text-[10px] font-bold px-[10px] py-[3px] rounded-md tracking-[0.04em]"
                  style={{
                    background: svc.connected ? 'rgba(110,224,90,0.1)' : 'rgba(255,255,255,0.04)',
                    color: svc.connected ? '#6EE05A' : '#6b7280',
                    border: `1px solid ${svc.connected ? 'rgba(110,224,90,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {svc.connected ? 'CONNECTED' : 'AVAILABLE'}
                </span>
              </div>

              {/* Name + description */}
              <div className="text-[15px] font-bold text-core-text mb-[6px]">{svc.name}</div>
              <div className="text-[12px] text-core-text-muted leading-relaxed mb-4 min-h-9">{svc.description}</div>

              {/* Footer: tools count + actions */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-core-text-muted font-mono flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {svc.tools} tools
                </span>
                {svc.connected ? (
                  <div className="flex gap-[6px]" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleTest(svc)}
                      disabled={testing === svc.id}
                      className="action-btn tool-btn px-3 py-[5px] rounded-md border border-white/[0.08] bg-white/[0.03] text-core-text-muted text-[11px] font-semibold cursor-pointer"
                    >
                      {testing === svc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Test'}
                    </button>
                    <button
                      onClick={() => { setConnectingService(svc); setCredentials({}) }}
                      className="action-btn tool-btn px-3 py-[5px] rounded-md border border-white/[0.08] bg-white/[0.03] text-core-text-muted text-[11px] font-semibold cursor-pointer"
                    >
                      Configure
                    </button>
                    <button
                      onClick={() => handleDisconnect(svc.id)}
                      className="action-btn px-3 py-[5px] rounded-md border border-core-red/15 bg-core-red/[0.05] text-core-red text-[11px] font-semibold cursor-pointer hover:bg-core-red/10 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); setConnectingService(svc); setCredentials({}) }}
                    className="action-btn px-[14px] py-[5px] rounded-md border-none text-[11px] font-semibold cursor-pointer transition-all hover:opacity-80"
                    style={{ background: `${svc.color}15`, color: svc.color }}
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-core-text-muted">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <div className="text-[15px] font-semibold mb-1">No integrations found</div>
          <div className="text-[13px]">Try a different search or category</div>
        </div>
      )}

      {/* Connect Modal */}
      {connectingService && (
        <div
          onClick={() => { setConnectingService(null); setCredentials({}) }}
          className="fixed inset-0 bg-black/60 backdrop-blur-lg z-[9000] flex items-center justify-center"
          style={{ animation: 'modalFadeIn 0.2s ease-out' }}
        >
          {/* glow orb */}
          <div
            className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${connectingService.color}15 0%, transparent 70%)` }}
          />

          <div
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-[520px] bg-[rgba(15,17,23,0.9)] backdrop-blur-3xl rounded-[20px] overflow-hidden"
            style={{
              border: `1px solid ${connectingService.color}30`,
              boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 40px ${connectingService.color}08`,
              animation: 'modalSlideIn 0.25s ease-out',
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${connectingService.color}12`, border: `1px solid ${connectingService.color}20` }}
                >
                  {(() => {
                    const src = getLogoSrc(connectingService.id)
                    return src
                      ? <img src={src} alt="" className="w-6 h-6 object-contain" />
                      : <span className="text-[13px] font-extrabold" style={{ color: connectingService.color }}>{connectingService.icon}</span>
                  })()}
                </div>
                <div>
                  <div className="text-[16px] font-bold text-core-text">Connect {connectingService.name}</div>
                  <div className="text-[11px] text-core-text-muted">{connectingService.tools} tools unlocked</div>
                </div>
              </div>
              <button
                onClick={() => { setConnectingService(null); setCredentials({}) }}
                className="p-2 rounded-md border-none bg-transparent text-core-text-muted cursor-pointer hover:bg-white/[0.06] hover:text-core-text transition-all"
              >
                <X className="w-[18px] h-[18px]" />
              </button>
            </div>

            <div className="p-6">
              {/* Setup Note */}
              {connectingService.setupNote && (
                <div
                  className="px-[14px] py-[10px] rounded-xl mb-4 text-[12px] text-white/50 leading-relaxed"
                  style={{ background: `${connectingService.color}06`, border: `1px solid ${connectingService.color}15` }}
                >
                  {connectingService.setupNote}
                </div>
              )}

              {/* Step-by-step Guide */}
              {connectingService.guide.length > 0 && (
                <div className="mb-5">
                  <div className="text-[10px] font-bold text-core-text-muted uppercase tracking-[0.08em] mb-[10px]">
                    How to get your key
                  </div>
                  <div className="flex flex-col gap-[6px]">
                    {connectingService.guide.map((step, i) => (
                      <div key={i} className="flex items-start gap-[10px]">
                        <span
                          className="w-[22px] h-[22px] rounded-md shrink-0 flex items-center justify-center text-[10px] font-extrabold"
                          style={{ background: `${connectingService.color}12`, color: connectingService.color }}
                        >
                          {i + 1}
                        </span>
                        <span className="text-[12px] text-white/60 leading-relaxed pt-[2px]">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Get Key Button */}
              {connectingService.keyUrl && (
                <a
                  href={connectingService.affiliateUrl || connectingService.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl mb-5 text-[13px] font-bold text-white no-underline hover:opacity-90 transition-opacity"
                  style={{ background: connectingService.color }}
                >
                  <ExternalLink className="w-4 h-4" />
                  {connectingService.keyLabel}
                </a>
              )}

              {/* Capabilities */}
              {connectingService.capabilities.length > 0 && (
                <div className="mb-4">
                  <div className="text-[10px] font-bold text-core-text-muted uppercase tracking-[0.08em] mb-2">
                    Capabilities
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {connectingService.capabilities.map(cap => (
                      <span
                        key={cap}
                        className="text-[10px] px-2 py-[3px] rounded-md bg-white/[0.04] border border-white/[0.06] text-white/55"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Credential fields */}
              <div className="flex flex-col gap-[14px] mb-5">
                {connectingService.fields.map(field => (
                  <div key={field.key}>
                    <label className="text-[10px] font-bold text-core-text-muted uppercase tracking-[0.06em] block mb-[6px]">
                      {field.label}{' '}
                      {field.required && <span style={{ color: connectingService.color }}>*</span>}
                    </label>
                    <input
                      type={field.type === 'password' ? 'password' : 'text'}
                      value={credentials[field.key] || ''}
                      onChange={e => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      autoComplete="off"
                      className="connect-input w-full px-[14px] py-[11px] rounded-xl border border-white/[0.08] bg-black/30 text-core-text text-[13px] font-mono outline-none transition-all box-border"
                      style={{ '--focus-color': `${connectingService.color}50` } as React.CSSProperties}
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
                className="w-full py-[13px] rounded-xl border-none bg-core-green text-[#0a0a0a] text-[14px] font-bold cursor-pointer flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <PlugZap className="w-4 h-4" />
                {saving ? 'Connecting...' : 'Connect & Verify'}
              </button>

              {/* Doc link + security note */}
              <div className="flex justify-between items-center mt-[14px]">
                {connectingService.docUrl && (
                  <a
                    href={connectingService.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-white/50 no-underline hover:text-white/70 transition-colors flex items-center gap-1"
                  >
                    Documentation
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <div className="flex items-center gap-1 text-[11px] text-core-text-muted ml-auto">
                  <Shield className="w-3 h-3 text-core-green" />
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
