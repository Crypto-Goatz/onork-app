'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  LogOut,
  RefreshCw,
  Shield,
  AlertTriangle,
  XCircle,
} from 'lucide-react'

interface Connection {
  id: string
  provider: string
  provider_email: string | null
  provider_name: string | null
  provider_avatar: string | null
  status: string
  health_status: string
  scopes: string | null
  metadata: Record<string, unknown> | null
  last_used_at: string | null
  created_at: string
}

interface GA4Property {
  id: string
  name: string
  accountName: string
}

const PROVIDERS = [
  {
    id: 'google',
    name: 'Google',
    description: 'Analytics, Gmail, Drive, Sheets, Calendar, Docs, Search Console',
    color: '#4285F4',
    icon: '/icons/google.svg',
    features: ['GA4 Analytics', 'Gmail', 'Drive', 'Sheets', 'Calendar', 'Search Console'],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Pages, Ads Manager, Pixel data, Insights',
    color: '#1877F2',
    icon: '/icons/facebook.svg',
    features: ['Page Management', 'Ads Reporting', 'Audience Insights'],
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Repositories, issues, pull requests, organizations',
    color: '#333',
    icon: '/icons/github.svg',
    features: ['Repos', 'Issues', 'PRs', 'Orgs'],
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    description: 'Posts, analytics, audience data',
    color: '#000',
    icon: '/icons/x.svg',
    features: ['Post', 'Analytics', 'Audience'],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Company page, posts, analytics',
    color: '#0A66C2',
    icon: '/icons/linkedin.svg',
    features: ['Company Page', 'Posts', 'Analytics'],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Channels, messages, notifications, team data',
    color: '#611F69',
    icon: '/icons/slack.svg',
    features: ['Channels', 'Messages', 'Notifications', 'Team Info'],
  },
]

export default function ConnectedAccountsPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // GA4 property selection
  const [ga4Properties, setGa4Properties] = useState<GA4Property[]>([])
  const [loadingProperties, setLoadingProperties] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null)

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/connections')
      if (res.ok) {
        const data = await res.json()
        setConnections(data.connections || [])

        // Check for selected GA4 property
        const google = data.connections?.find((c: Connection) => c.provider === 'google')
        if (google?.metadata?.ga4_property_id) {
          setSelectedProperty(google.metadata.ga4_property_id as string)
        }
      }
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConnections()

    // Handle URL params
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected')) {
      setSuccess(`${params.get('connected')} connected successfully`)
      window.history.replaceState({}, '', window.location.pathname)
      fetchConnections()
    }
    if (params.get('error')) {
      setError(`Connection failed: ${params.get('error')} (${params.get('provider') || ''})`)
      window.history.replaceState({}, '', window.location.pathname)
    }

    // Listen for popup messages
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'oauth-connected') {
        setSuccess(`${e.data.provider} connected as ${e.data.email}`)
        setConnecting(null)
        fetchConnections()
      }
      // Legacy google-connect handler
      if (e.data?.type === 'google-connected') {
        setSuccess(`Google connected as ${e.data.email}`)
        setConnecting(null)
        fetchConnections()
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [fetchConnections])

  function getConnection(providerId: string): Connection | undefined {
    return connections.find(c => c.provider === providerId)
  }

  async function handleConnect(providerId: string) {
    setConnecting(providerId)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/auth/connect/${providerId}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to start connection')
        setConnecting(null)
        return
      }

      const { url } = await res.json()

      // Open popup
      const popup = window.open(url, `connect-${providerId}`, 'width=600,height=700,left=200,top=100')

      // Poll for popup close (fallback if postMessage fails)
      const check = setInterval(() => {
        if (popup?.closed) {
          clearInterval(check)
          setConnecting(null)
          fetchConnections()
        }
      }, 1000)
    } catch {
      setError('Failed to start OAuth flow')
      setConnecting(null)
    }
  }

  async function handleDisconnect(providerId: string) {
    setDisconnecting(providerId)
    setError('')

    try {
      const res = await fetch(`/api/auth/connect/${providerId}`, { method: 'DELETE' })
      if (res.ok) {
        setSuccess(`${providerId} disconnected`)
        fetchConnections()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to disconnect')
      }
    } catch {
      setError('Failed to disconnect')
    } finally {
      setDisconnecting(null)
    }
  }

  async function loadGA4Properties() {
    setLoadingProperties(true)
    try {
      const res = await fetch('/api/google/properties')
      if (res.ok) {
        const data = await res.json()
        setGa4Properties(data.properties || [])
        if (data.selectedProperty) setSelectedProperty(data.selectedProperty)
      }
    } catch {
      setError('Failed to load GA4 properties')
    } finally {
      setLoadingProperties(false)
    }
  }

  async function selectGA4Property(propertyId: string, propertyName: string) {
    try {
      const res = await fetch('/api/google/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: propertyId, property_name: propertyName }),
      })
      if (res.ok) {
        setSelectedProperty(propertyId)
        setSuccess(`GA4 property set to ${propertyName}`)
        fetchConnections()
      }
    } catch {
      setError('Failed to select property')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-core-green" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Connected Accounts</h1>
        <p className="text-[13px] text-white/50">
          Connect your accounts to let 0nCore access your data and take action on your behalf.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-core-red/[0.08] border border-core-red/20 text-core-red text-[13px]">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-3 rounded-lg bg-core-green/[0.08] border border-core-green/20 text-core-green text-[13px]">
          {success}
        </div>
      )}

      {/* Provider Cards */}
      <div className="space-y-3">
        {PROVIDERS.map((provider) => {
          const conn = getConnection(provider.id)
          const isConnected = conn?.status === 'active'
          const isExpanded = expandedProvider === provider.id

          return (
            <div
              key={provider.id}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Provider icon/initial */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white font-bold text-sm"
                  style={{ backgroundColor: `${provider.color}20` }}
                >
                  {provider.name[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{provider.name}</h3>
                    {isConnected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-core-green/10 px-2 py-0.5 text-[11px] font-medium text-core-green">
                        <Check className="h-3 w-3" /> Connected
                      </span>
                    )}
                    {conn?.status === 'expired' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-core-amber/10 px-2 py-0.5 text-[11px] font-medium text-core-amber">
                        <AlertTriangle className="h-3 w-3" /> Expired
                      </span>
                    )}
                    {conn?.health_status === 'unhealthy' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-core-red/10 px-2 py-0.5 text-[11px] font-medium text-core-red">
                        <XCircle className="h-3 w-3" /> Error
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-white/40 truncate">
                    {isConnected
                      ? conn.provider_email || conn.provider_name || 'Connected'
                      : provider.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {isConnected ? (
                    <>
                      {provider.id === 'google' && (
                        <button
                          onClick={() => {
                            setExpandedProvider(isExpanded ? null : provider.id)
                            if (!isExpanded && ga4Properties.length === 0) loadGA4Properties()
                          }}
                          className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[12px] text-white/60 hover:text-white hover:border-white/20 transition-colors"
                        >
                          <ChevronDown className={`h-3.5 w-3.5 inline mr-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          Configure
                        </button>
                      )}
                      <button
                        onClick={() => handleDisconnect(provider.id)}
                        disabled={disconnecting === provider.id}
                        className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[12px] text-white/40 hover:text-core-red hover:border-core-red/30 transition-colors"
                      >
                        {disconnecting === provider.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <LogOut className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleConnect(provider.id)}
                      disabled={connecting === provider.id}
                      className="rounded-lg bg-core-green px-4 py-1.5 text-[13px] font-medium text-core-dark hover:bg-core-green/90 transition-colors disabled:opacity-50"
                    >
                      {connecting === provider.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Connect'
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded section — Google GA4 property picker */}
              {isExpanded && provider.id === 'google' && (
                <div className="border-t border-white/[0.06] px-5 py-4 space-y-4">
                  <div>
                    <h4 className="text-[13px] font-medium text-white mb-1">GA4 Property</h4>
                    <p className="text-[11px] text-white/40">
                      Select which Google Analytics property to display in your dashboard.
                    </p>
                  </div>

                  {loadingProperties ? (
                    <div className="flex items-center gap-2 text-[12px] text-white/40">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading properties...
                    </div>
                  ) : ga4Properties.length > 0 ? (
                    <div className="space-y-1.5">
                      {ga4Properties.map((prop) => (
                        <button
                          key={prop.id}
                          onClick={() => selectGA4Property(prop.id, prop.name)}
                          className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                            selectedProperty === prop.id
                              ? 'border-core-green/30 bg-core-green/[0.06]'
                              : 'border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]'
                          }`}
                        >
                          <div>
                            <p className="text-[13px] text-white">{prop.name}</p>
                            <p className="text-[11px] text-white/40">
                              {prop.accountName} &middot; ID: {prop.id}
                            </p>
                          </div>
                          {selectedProperty === prop.id && (
                            <Check className="h-4 w-4 text-core-green shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[12px] text-white/40">
                      No GA4 properties found. Make sure your Google account has access to at least one GA4 property.
                    </div>
                  )}

                  <button
                    onClick={loadGA4Properties}
                    disabled={loadingProperties}
                    className="inline-flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white transition-colors"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingProperties ? 'animate-spin' : ''}`} />
                    Refresh properties
                  </button>

                  {/* Features list */}
                  <div className="pt-2 border-t border-white/[0.06]">
                    <p className="text-[11px] text-white/30 mb-2 flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Permissions granted
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {provider.features.map((feat) => (
                        <span
                          key={feat}
                          className="rounded-md bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[11px] text-white/50"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Security note */}
      <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
        <Shield className="h-5 w-5 shrink-0 text-white/30 mt-0.5" />
        <div>
          <p className="text-[13px] font-medium text-white/70">Your data is secure</p>
          <p className="text-[11px] text-white/40">
            OAuth tokens are encrypted and stored in your private account. 0nCore only accesses the
            data you authorize. You can disconnect any account at any time.
          </p>
        </div>
      </div>
    </div>
  )
}
