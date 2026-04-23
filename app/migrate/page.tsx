'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, CheckCircle, Loader2, Upload, Zap, Users,
  Mail, BarChart3, GitBranch, Database, Shield, Sparkles,
  ArrowLeftRight
} from 'lucide-react'

interface Platform {
  id: string
  name: string
  tagline: string
  color: string
  features: string[]
  status: 'live' | 'coming' | 'beta'
  importCapabilities: string[]
}

const PLATFORMS: Platform[] = [
  {
    id: 'brevo',
    name: 'Brevo',
    tagline: 'Sendinblue',
    color: '#0B996E',
    status: 'beta',
    features: ['Email Marketing', 'CRM', 'SMS', 'WhatsApp', 'Pipelines'],
    importCapabilities: ['Contacts', 'Deals', 'Pipelines', 'Email Templates', 'Automations', 'Lists'],
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    tagline: 'CRM + Marketing',
    color: '#FF7A59',
    status: 'coming',
    features: ['CRM', 'Marketing Hub', 'Sales Hub', 'Service Hub'],
    importCapabilities: ['Contacts', 'Companies', 'Deals', 'Sequences', 'Workflows', 'Properties'],
  },
  {
    id: 'activecampaign',
    name: 'ActiveCampaign',
    tagline: 'Marketing Automation',
    color: '#356AE6',
    status: 'coming',
    features: ['Email', 'Automation', 'CRM', 'Messaging'],
    importCapabilities: ['Contacts', 'Automations', 'Deals', 'Tags', 'Lists', 'Campaigns'],
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    tagline: 'Email + Audiences',
    color: '#FFE01B',
    status: 'coming',
    features: ['Email Campaigns', 'Audiences', 'Automations', 'Landing Pages'],
    importCapabilities: ['Contacts', 'Lists', 'Segments', 'Templates', 'Campaigns', 'Tags'],
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    tagline: 'Sales CRM',
    color: '#017737',
    status: 'coming',
    features: ['Deals', 'Pipelines', 'Activities', 'Contacts'],
    importCapabilities: ['Contacts', 'Organizations', 'Deals', 'Pipelines', 'Activities', 'Notes'],
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    tagline: 'Enterprise CRM',
    color: '#00A1E0',
    status: 'coming',
    features: ['Leads', 'Opportunities', 'Accounts', 'Workflows'],
    importCapabilities: ['Leads', 'Contacts', 'Opportunities', 'Accounts', 'Workflows', 'Reports'],
  },
  {
    id: 'zoho',
    name: 'Zoho CRM',
    tagline: 'Business Suite',
    color: '#E42527',
    status: 'coming',
    features: ['CRM', 'Campaigns', 'Desk', 'Projects'],
    importCapabilities: ['Contacts', 'Leads', 'Deals', 'Campaigns', 'Tasks', 'Notes'],
  },
  {
    id: 'freshworks',
    name: 'Freshworks',
    tagline: 'Freshsales + Freshdesk',
    color: '#2C5CC5',
    status: 'coming',
    features: ['CRM', 'Support', 'Marketing', 'Chat'],
    importCapabilities: ['Contacts', 'Deals', 'Tickets', 'Conversations', 'Automations'],
  },
]

export default function MigratePage() {
  const router = useRouter()
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<Record<string, number> | null>(null)
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(false)

  const platform = PLATFORMS.find(p => p.id === selectedPlatform)

  async function handleScan() {
    if (!apiKey.trim() || !selectedPlatform) return
    setScanning(true)
    setScanResult(null)

    try {
      const res = await fetch('/api/migrate/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: selectedPlatform, apiKey: apiKey.trim() }),
      })
      const data = await res.json()
      if (data.counts) setScanResult(data.counts)
    } catch {}
    setScanning(false)
  }

  async function handleImport() {
    if (!scanResult || !selectedPlatform) return
    setImporting(true)

    try {
      const res = await fetch('/api/migrate/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: selectedPlatform, apiKey: apiKey.trim() }),
      })
      const data = await res.json()
      if (data.success) setImportDone(true)
    } catch {}
    setImporting(false)
  }

  return (
    <div className="min-h-screen bg-core-bg px-4 py-16">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <ArrowLeftRight className="w-8 h-8 text-core-cyan" />
          </div>
          <h1 className="text-3xl font-bold text-core-text mb-3">Coming from another platform?</h1>
          <p className="text-sm text-core-text-muted max-w-lg mx-auto">
            We'll import your contacts, pipelines, templates, and automations automatically. Pick your current platform and connect — we handle the rest.
          </p>
        </div>

        {/* Platform not selected — show grid */}
        {!selectedPlatform && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => p.status !== 'coming' ? setSelectedPlatform(p.id) : null}
                disabled={p.status === 'coming'}
                className={`group relative text-left p-5 rounded-xl border transition-all ${
                  p.status === 'coming'
                    ? 'bg-core-card/50 border-core-border/50 opacity-60 cursor-not-allowed'
                    : 'bg-core-card border-core-border hover:border-core-green/30 cursor-pointer'
                }`}
              >
                {p.status === 'coming' && (
                  <span className="absolute top-3 right-3 text-[9px] font-bold text-core-amber bg-core-amber/10 px-2 py-0.5 rounded-full">SOON</span>
                )}
                {p.status === 'beta' && (
                  <span className="absolute top-3 right-3 text-[9px] font-bold text-core-cyan bg-core-cyan/10 px-2 py-0.5 rounded-full">BETA</span>
                )}
                {p.status === 'live' && (
                  <span className="absolute top-3 right-3 text-[9px] font-bold text-core-green bg-core-green/10 px-2 py-0.5 rounded-full">LIVE</span>
                )}

                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-sm font-black"
                  style={{ background: `${p.color}15`, color: p.color }}>
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="text-sm font-bold text-core-text mb-0.5">{p.name}</div>
                <div className="text-[11px] text-core-text-muted mb-3">{p.tagline}</div>
                <div className="flex flex-wrap gap-1">
                  {p.features.slice(0, 3).map(f => (
                    <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-core-border/30 text-core-text-muted">{f}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Platform selected — show connect flow */}
        {selectedPlatform && platform && !importDone && (
          <div className="max-w-lg mx-auto animate-fade-in">
            <button onClick={() => { setSelectedPlatform(null); setApiKey(''); setScanResult(null) }}
              className="text-xs text-core-text-muted hover:text-core-text mb-6 flex items-center gap-1 transition-colors">
              Back to platforms
            </button>

            <div className="bg-core-card border border-core-border rounded-xl p-6 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black"
                  style={{ background: `${platform.color}15`, color: platform.color }}>
                  {platform.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-lg font-bold text-core-text">Migrate from {platform.name}</div>
                  <div className="text-xs text-core-text-muted">Connect your account to scan what we can import</div>
                </div>
              </div>

              {/* API Key input */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-core-text-muted uppercase tracking-wide mb-1.5 block">
                  {platform.name} API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={`Paste your ${platform.name} API key...`}
                  className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-sm text-core-text font-mono focus:outline-none focus:border-core-cyan transition-colors"
                />
                <p className="text-[10px] text-core-text-muted mt-1.5">
                  Your key is used only during migration and never stored permanently.
                </p>
              </div>

              {/* What we'll import */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-core-text-muted uppercase tracking-wide mb-2">What we'll import</div>
                <div className="flex flex-wrap gap-1.5">
                  {platform.importCapabilities.map(cap => (
                    <span key={cap} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-core-green/5 border border-core-green/15 text-core-green">
                      <CheckCircle className="w-3 h-3" />
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Scan button */}
              {!scanResult && (
                <button onClick={handleScan} disabled={!apiKey.trim() || scanning}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-core-cyan text-core-bg font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50">
                  {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  {scanning ? 'Scanning your account...' : 'Scan Account'}
                </button>
              )}

              {/* Scan results */}
              {scanResult && (
                <div className="space-y-3">
                  <div className="bg-core-green/5 border border-core-green/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-core-green mb-2">
                      <CheckCircle className="w-4 h-4" />
                      Account scanned
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(scanResult).map(([key, count]) => (
                        <div key={key} className="text-center">
                          <div className="text-lg font-bold text-core-text">{count.toLocaleString()}</div>
                          <div className="text-[10px] text-core-text-muted capitalize">{key}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleImport} disabled={importing}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-core-green text-core-bg font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50">
                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {importing ? 'Importing...' : 'Import Everything'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Import complete */}
        {importDone && platform && (
          <div className="max-w-lg mx-auto text-center animate-fade-in py-8">
            <div className="w-20 h-20 rounded-2xl bg-core-green shadow-[0_0_40px_rgba(110,224,90,0.3)] flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-core-bg" />
            </div>
            <h2 className="text-2xl font-bold text-core-text mb-2">Migration complete</h2>
            <p className="text-sm text-core-text-muted mb-6">
              Your {platform.name} data is now in 0nCore. Everything is ready.
            </p>
            <button onClick={() => router.push('/dashboard')}
              className="flex items-center justify-center gap-2 mx-auto px-8 py-3 bg-core-green text-core-bg font-bold text-sm rounded-xl hover:brightness-110 transition-all">
              Launch Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Bottom: Fresh start option */}
        {!selectedPlatform && (
          <div className="text-center mt-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="h-px w-16 bg-core-border" />
              <span className="text-xs text-core-text-muted">or</span>
              <div className="h-px w-16 bg-core-border" />
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => router.push('/import')}
                className="flex items-center gap-2 px-5 py-2.5 bg-core-card border border-core-border rounded-xl text-sm text-core-text-dim hover:text-core-text hover:border-core-green/20 transition-all">
                <Sparkles className="w-4 h-4 text-core-green" />
                Start fresh with AI
              </button>
              <button onClick={() => router.push('/dashboard/onboarding')}
                className="flex items-center gap-2 px-5 py-2.5 bg-core-card border border-core-border rounded-xl text-sm text-core-text-dim hover:text-core-text hover:border-core-cyan/20 transition-all">
                <Zap className="w-4 h-4 text-core-cyan" />
                Guided setup
              </button>
            </div>
          </div>
        )}

        {/* Value prop */}
        {!selectedPlatform && (
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-core-card border border-core-border rounded-xl p-5 text-center">
              <Users className="w-6 h-6 text-core-cyan mx-auto mb-3" />
              <div className="text-sm font-bold text-core-text mb-1">All Your Contacts</div>
              <p className="text-xs text-core-text-muted">Contacts, tags, custom fields, and segments — all imported and mapped.</p>
            </div>
            <div className="bg-core-card border border-core-border rounded-xl p-5 text-center">
              <GitBranch className="w-6 h-6 text-core-green mx-auto mb-3" />
              <div className="text-sm font-bold text-core-text mb-1">Pipelines + Deals</div>
              <p className="text-xs text-core-text-muted">Your sales pipeline stages and open deals transfer with full history.</p>
            </div>
            <div className="bg-core-card border border-core-border rounded-xl p-5 text-center">
              <Mail className="w-6 h-6 text-core-purple mx-auto mb-3" />
              <div className="text-sm font-bold text-core-text mb-1">Templates + Automations</div>
              <p className="text-xs text-core-text-muted">Email templates and automation workflows converted to .0n files.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
