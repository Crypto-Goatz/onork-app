'use client'

/**
 * Live status card for /welcome — polls /api/profile/provision-status every
 * 2.5s and shows the user real-time progress on background CRM sub-location
 * provisioning.
 *
 * Renders when crm_location_id is null AND provisioning_started_at is set.
 * On completed → router.refresh() so the page re-renders with the workspace
 * cards. On failed → shows error + Retry button that POSTs to
 * /api/workspace/claim (idempotent).
 *
 * Aesthetic matches ClaimWorkspaceBanner: green-accent card, dark gradient,
 * Lucide icons only, no inline styles.
 */

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, Sparkles, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react'

type ProvisionState = 'pending' | 'in_progress' | 'completed' | 'failed'

interface StatusResponse {
  state: ProvisionState
  crm_location_id: string | null
  crm_contact_id: string | null
  provisioning_started_at: string | null
  provisioning_error: string | null
  elapsed_seconds: number | null
}

const POLL_INTERVAL_MS = 2500

const PHASES = [
  { label: 'Creating your CRM workspace', min: 0, max: 8 },
  { label: 'Deploying pipelines + custom fields', min: 8, max: 18 },
  { label: 'Setting up your token', min: 18, max: Infinity },
] as const

function phaseIndex(elapsed: number | null): number {
  if (elapsed === null) return 0
  const idx = PHASES.findIndex((p) => elapsed >= p.min && elapsed < p.max)
  return idx < 0 ? PHASES.length - 1 : idx
}

export default function WorkspaceProvisioningStatus({
  userName,
  initialStartedAt,
}: {
  userName: string | null
  initialStartedAt: string | null
}) {
  const router = useRouter()
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)
  const refreshTriggered = useRef(false)

  // Derive a live elapsed_seconds count between polls so the phase ticks
  // forward smoothly. Falls back to the server-reported value at each poll.
  const [liveElapsed, setLiveElapsed] = useState<number | null>(() => {
    if (!initialStartedAt) return null
    return Math.max(0, Math.floor((Date.now() - new Date(initialStartedAt).getTime()) / 1000))
  })

  // Poll the status endpoint
  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch('/api/profile/provision-status', {
          cache: 'no-store',
          credentials: 'include',
        })
        if (!res.ok) return
        const data = (await res.json()) as StatusResponse
        if (cancelled) return
        setStatus(data)
        if (data.elapsed_seconds !== null) setLiveElapsed(data.elapsed_seconds)

        if (data.state === 'completed' && !refreshTriggered.current) {
          refreshTriggered.current = true
          // Brief hold so the user sees the success state, then refresh
          setTimeout(() => {
            if (!cancelled) router.refresh()
          }, 1200)
        }
      } catch (err) {
        console.error('[provision-status poll]', err)
      }
    }

    poll()
    const id = window.setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [router])

  // Tick liveElapsed every second between polls
  useEffect(() => {
    const id = window.setInterval(() => {
      setLiveElapsed((prev) => (prev === null ? prev : prev + 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  async function retry() {
    setRetrying(true)
    setRetryError(null)
    try {
      const r = await fetch('/api/workspace/claim', {
        method: 'POST',
        credentials: 'include',
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok || !body?.ok) {
        setRetryError(body?.error || `Failed (HTTP ${r.status})`)
        setRetrying(false)
        return
      }
      // Success — let the next poll pick up the completed state, or refresh now
      router.refresh()
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : 'Network error')
      setRetrying(false)
    }
  }

  const state: ProvisionState = status?.state ?? 'in_progress'
  const activePhase = phaseIndex(liveElapsed)
  const firstName = userName?.trim().split(/\s+/)[0] ?? null

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#6EE05A]/30 bg-gradient-to-br from-[#161b22] via-[#0d1117] to-[#161b22] p-6 sm:p-8 mb-8">
      <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-[#6EE05A] to-[#00B4FF] blur-3xl opacity-15" />

      <div className="relative">
        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[#6EE05A] mb-3">
          <Sparkles className="w-3 h-3" />
          {state === 'completed'
            ? 'Workspace ready'
            : state === 'failed'
              ? 'Something went sideways'
              : state === 'pending'
                ? 'One step left'
                : 'Setting up your workspace'}
        </div>

        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-2">
          {state === 'completed'
            ? firstName
              ? `${firstName}, you're all set.`
              : "You're all set."
            : state === 'failed'
              ? firstName
                ? `${firstName}, we hit a snag.`
                : 'We hit a snag.'
              : state === 'pending'
                ? firstName
                  ? `${firstName}, claim your workspace.`
                  : 'Claim your workspace.'
                : firstName
                  ? `Hold tight, ${firstName} — building your workspace.`
                  : 'Hold tight — building your workspace.'}
        </h2>

        <p className="text-sm text-[#8b949e] max-w-xl leading-relaxed">
          {state === 'completed'
            ? 'Your private CRM workspace is provisioned. Pipelines, custom fields, tags, and your token are deployed. Refreshing your dashboard now.'
            : state === 'failed'
              ? "Your CRM workspace didn't finish provisioning. The error is shown below — one click will retry. This is safe to run again."
              : state === 'pending'
                ? "We've held a CRM workspace for you. One click spins it up: contacts, pipelines, automations, your own webhook secret."
                : 'This usually takes 15–20 seconds. Stay on this page — it will update automatically when ready.'}
        </p>

        {(state === 'in_progress' || state === 'completed') && (
          <div className="mt-6 space-y-2">
            {PHASES.map((p, i) => {
              const isComplete = state === 'completed' || i < activePhase
              const isActive = state !== 'completed' && i === activePhase
              return (
                <div key={p.label} className="flex items-center gap-2.5 text-sm">
                  {isComplete ? (
                    <div className="w-4 h-4 rounded-full bg-[#6EE05A]/15 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-[#6EE05A]" strokeWidth={3.5} />
                    </div>
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 text-[#6EE05A] animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-[#30363d] shrink-0" />
                  )}
                  <span
                    className={
                      isComplete
                        ? 'text-white'
                        : isActive
                          ? 'text-white'
                          : 'text-[#6b7681]'
                    }
                  >
                    {p.label}
                    {isActive && '…'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {state === 'failed' && (
          <div className="mt-5 rounded-lg border border-[#f87171]/30 bg-[#f87171]/5 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#f87171] shrink-0 mt-0.5" />
              <div className="text-xs text-[#f87171] break-words">
                {status?.provisioning_error || 'Unknown provisioning error'}
              </div>
            </div>
          </div>
        )}

        {retryError && (
          <div className="mt-3 text-xs text-[#f87171]">Retry failed: {retryError}</div>
        )}

        {state === 'failed' && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={retry}
              disabled={retrying}
              className="inline-flex items-center gap-2 bg-[#6EE05A] text-[#0d1117] px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#7dec6e] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {retrying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Retrying…
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Retry provisioning
                </>
              )}
            </button>
          </div>
        )}

        {state === 'pending' && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={retry}
              disabled={retrying}
              className="inline-flex items-center gap-2 bg-[#6EE05A] text-[#0d1117] px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#7dec6e] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {retrying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  Set up my workspace
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {liveElapsed !== null && state === 'in_progress' && (
          <div className="mt-5 text-xs text-[#6b7681]">{liveElapsed}s elapsed</div>
        )}

        {state === 'completed' && (
          <div className="mt-5 text-xs text-[#6EE05A]">
            Workspace ready · Refreshing…
          </div>
        )}
      </div>
    </div>
  )
}
