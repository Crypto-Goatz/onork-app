'use client'

import { useState, useEffect } from 'react'
import { useLocation } from '@/lib/location-context'
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, X } from 'lucide-react'
import Link from 'next/link'

type CrmStatus = 'checking' | 'connected' | 'disconnected' | 'error' | 'provisioning'

export function CrmStatusBar() {
  const { locationId, loading: locationLoading } = useLocation()
  const [status, setStatus] = useState<CrmStatus>('checking')
  const [errorMsg, setErrorMsg] = useState('')
  const [dismissed, setDismissed] = useState(false)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    if (locationLoading) { setStatus('checking'); return }

    if (!locationId) {
      setStatus('disconnected')
      setErrorMsg('CRM sub-location not provisioned. Your account needs a CRM connection to work.')
      return
    }

    // Test CRM connection
    checkCrmConnection(locationId)
  }, [locationId, locationLoading])

  async function checkCrmConnection(locId: string) {
    setStatus('checking')
    try {
      const res = await fetch(`/api/dashboard/stats`)
      if (res.ok) {
        const data = await res.json()
        if (data.stats?.contacts >= 0 && data.locationId) {
          setStatus('connected')
        } else if (data.error) {
          setStatus('error')
          setErrorMsg(data.error)
        } else {
          setStatus('connected')
        }
      } else {
        const data = await res.json().catch(() => ({}))
        setStatus('error')
        setErrorMsg(data.error || `CRM returned ${res.status}`)
      }
    } catch {
      setStatus('error')
      setErrorMsg('Cannot reach CRM. Check your connection.')
    }
  }

  async function handleRetry() {
    setRetrying(true)
    setDismissed(false)
    if (locationId) {
      await checkCrmConnection(locationId)
    } else {
      // Try to provision
      setStatus('provisioning')
      try {
        const res = await fetch('/api/provision/location', { method: 'POST' })
        const data = await res.json()
        if (data.success && data.locationId) {
          setStatus('connected')
          window.location.reload() // Reload to pick up new location
        } else {
          setStatus('error')
          setErrorMsg(data.errors?.join(', ') || 'Provisioning failed')
        }
      } catch {
        setStatus('error')
        setErrorMsg('Provisioning failed. Try again.')
      }
    }
    setRetrying(false)
  }

  // Don't show anything if connected or still checking on initial load
  if (status === 'connected' || status === 'checking') return null
  if (dismissed) return null

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[9000] px-4 py-2.5 flex items-center justify-center gap-3 text-[13px] font-medium ${
      status === 'disconnected' || status === 'error'
        ? 'bg-gradient-to-r from-red-950/95 via-red-900/95 to-red-950/95 border-t border-red-500/20 text-red-200'
        : 'bg-gradient-to-r from-amber-950/95 via-amber-900/95 to-amber-950/95 border-t border-amber-500/20 text-amber-200'
    }`}>
      {status === 'provisioning' ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 shrink-0" />
      )}

      <span className="truncate">
        {status === 'disconnected' && 'CRM not connected — your account needs a sub-location to access contacts, pipeline, and automations.'}
        {status === 'error' && `CRM connection error: ${errorMsg}`}
        {status === 'provisioning' && 'Setting up your CRM sub-location...'}
      </span>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="flex items-center gap-1 px-3 py-1 rounded-md bg-white/10 text-white text-[12px] font-semibold cursor-pointer border-none hover:bg-white/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
          {status === 'disconnected' ? 'Provision Now' : 'Retry'}
        </button>

        {status === 'error' && (
          <Link
            href="/dashboard/settings"
            className="px-3 py-1 rounded-md bg-white/10 text-white text-[12px] font-semibold no-underline hover:bg-white/20 transition-colors"
          >
            Settings
          </Link>
        )}

        <button
          onClick={() => setDismissed(true)}
          className="w-6 h-6 rounded flex items-center justify-center bg-transparent border-none text-white/40 hover:text-white/70 cursor-pointer transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
