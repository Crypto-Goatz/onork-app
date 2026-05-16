'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Check,
  Loader2,
  LogOut,
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

const PROVIDERS = [
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
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchConnections = useCallback(async () => {
    try {
      // Fetch local user_connections
      const res = await fetch('/api/auth/connections')
      let localConns: Connection[] = []
      if (res.ok) {
        const data = await res.json()
        localConns = data.connections || []
      }

      // Also fetch CRM social accounts (these are connected via CRM's Social Planner)
      try {
        const socialRes = await fetch('/api/social/accounts')
        if (socialRes.ok) {
          const socialData = await socialRes.json()
          const crmAccounts = socialData.accounts || []
          // Merge CRM social accounts as connections if not already in local list
          for (const acct of crmAccounts) {
            const platform = (acct.platform || acct.type || '').toLowerCase()
            if (platform && !localConns.find(c => c.provider === platform)) {
              localConns.push({
                id: acct.id || platform,
                provider: platform,
                provider_email: acct.email || null,
                provider_name: acct.name || acct.accountName || null,
                provider_avatar: acct.avatar || acct.profilePicture || null,
                status: 'active',
                health_status: 'healthy',
                scopes: 'crm-social-planner',
                metadata: { source: 'crm', crm_account_id: acct.id },
                last_used_at: null,
                created_at: acct.createdAt || new Date().toISOString(),
              })
            }
          }
        }
      } catch {
        // CRM social fetch is best-effort
      }

      setConnections(localConns)
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
      // Use CRM Social Planner OAuth (has all the scopes already configured)
      const res = await fetch('/api/social/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: providerId }),
      })

      const data = await res.json()

      if (!res.ok || !data.url) {
        // If CRM social connect fails, show helpful message
        setError(data.error || `Could not start ${providerId} connection. Make sure your CRM location is provisioned.`)
        setConnecting(null)
        return
      }

      // Open popup to CRM's social OAuth flow
      const popup = window.open(data.url, `connect-${providerId}`, 'width=600,height=700,left=200,top=100')

      // Poll for popup close
      const check = setInterval(() => {
        if (popup?.closed) {
          clearInterval(check)
          setConnecting(null)
          setSuccess(`${providerId} connection updated`)
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
