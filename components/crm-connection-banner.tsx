'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, RefreshCw, Plug } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InstallationHealth {
  locationId: string | null
  status: 'healthy' | 'expired' | 'no_refresh' | 'no_install' | 'unknown'
  source: 'oauth' | 'agency_pit' | 'pit_fallback'
  tokenPresent: boolean
  refreshTokenPresent: boolean
  expiresAt: string | null
  expiresInMinutes: number | null
  needsReauth: boolean
  message: string
  reauthUrl: string | null
}

export function CrmConnectionBanner() {
  const [health, setHealth] = useState<InstallationHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  async function check() {
    try {
      setLoading(true)
      const res = await fetch('/api/crm/installation-status', { cache: 'no-store' })
      if (!res.ok) return
      const data: InstallationHealth = await res.json()
      setHealth(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    check()
  }, [])

  if (loading) return null
  if (!health) return null
  if (dismissed && !health.needsReauth) return null

  // Healthy — quiet success row, dismissable
  if (health.status === 'healthy' && !dismissed) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-md border border-green-500/20 bg-green-500/5 px-4 py-2 text-sm">
        <div className="flex items-center gap-2 text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>CRM connected and healthy.</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-white/40 hover:text-white/70"
        >
          Dismiss
        </button>
      </div>
    )
  }

  // Needs reauth — loud, persistent
  if (health.needsReauth) {
    return (
      <div className="mb-4 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
          <div className="flex-1">
            <div className="font-semibold text-yellow-100">CRM connection needs to be repaired</div>
            <p className="mt-1 text-sm text-yellow-100/80">{health.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  window.location.href = '/api/oauth/reauth'
                }}
                variant="outline"
                className="border-yellow-500/40 bg-yellow-500/10 text-yellow-100 hover:bg-yellow-500/20 hover:text-yellow-50"
              >
                <Plug className="mr-1.5 h-3.5 w-3.5" />
                Reconnect CRM
              </Button>
              <Button size="sm" variant="ghost" onClick={check}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Re-check
              </Button>
            </div>
            {health.expiresInMinutes !== null && (
              <p className="mt-2 text-xs text-yellow-100/50">
                Token state: {health.tokenPresent ? 'present' : 'missing'} · refresh token:{' '}
                {health.refreshTokenPresent ? 'present' : 'MISSING'} · expires in{' '}
                {health.expiresInMinutes} min · source: {health.source}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
