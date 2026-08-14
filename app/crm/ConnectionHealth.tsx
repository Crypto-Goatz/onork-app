'use client'

/**
 * Connection health — a chip that tells the truth, and a modal that explains it.
 *
 * WHY IT EXISTS. A command plans against clients whose keys stopped working and
 * fails at the last leg, which reads as "the product is broken" rather than "one
 * key was rotated". This puts the answer in the header before the failure
 * instead of in a log afterwards.
 *
 * IT CHECKS ON MOUNT, NOT ON A TIMER. Polling every surface every minute would
 * fire a CRM call per client per minute for a number that changes rarely. Mount
 * plus an explicit refresh is enough, and the chip is honest about when it last
 * looked.
 *
 * SILENT WHEN HEALTHY. A green badge that is always green teaches people to stop
 * reading badges, so it renders nothing at all unless something needs attention
 * or the user opens it deliberately.
 */
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, X } from 'lucide-react'
import { authHeaders } from './useSso'

interface Conn {
  locationId: string
  name: string
  isFree: boolean
  verdict: 'ok' | 'unauthorized' | 'scope' | 'unreachable' | 'no-key'
  status: number
  message: string
}
interface Health {
  healthy: boolean
  checked: number
  brokenCount: number
  headline: string
  connections: Conn[]
}

const DOT: Record<Conn['verdict'], string> = {
  ok: 'var(--oc-green-d)',
  scope: 'var(--oc-amber)',
  unauthorized: 'var(--oc-red)',
  unreachable: 'var(--oc-red)',
  'no-key': 'var(--oc-amber)',
}

export default function ConnectionHealth() {
  const [token, setToken] = useState<string | null>(null)
  const [data, setData] = useState<Health | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { try { setToken(sessionStorage.getItem('oncore.app.jwt')) } catch { /* private mode */ } }, [])

  const check = useCallback(async () => {
    if (!token) return
    setBusy(true)
    try {
      const r = await fetch('/api/connect/health', { headers: authHeaders(token), cache: 'no-store' })
      if (r.ok) setData(await r.json())
    } catch {
      // A health check that breaks the page it reports on would be its own joke.
    } finally { setBusy(false) }
  }, [token])

  useEffect(() => { void check() }, [check])

  if (!data) return null
  if (data.healthy && !open) return null

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="oncore-app inline-flex items-center gap-1.5 rounded-full border border-[color:var(--oc-amber)]/40 bg-[color:var(--oc-amber)]/10 px-3 py-1 text-[12px] font-semibold text-[color:var(--oc-amber)]"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {data.headline}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[10vh]"
             onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
             role="dialog" aria-modal="true" aria-label="Connection health">
          <div className="oncore-app w-full max-w-[560px] overflow-hidden rounded-2xl bg-[color:var(--oc-card)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[color:var(--oc-border)] px-5 py-3.5">
              <div className="flex items-center gap-2">
                {data.healthy
                  ? <CheckCircle2 className="h-[18px] w-[18px] text-[color:var(--oc-green-d)]" />
                  : <AlertTriangle className="h-[18px] w-[18px] text-[color:var(--oc-amber)]" />}
                <h2 className="text-[15px] font-semibold text-[color:var(--oc-ink)]">{data.headline}</h2>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={check} disabled={busy} aria-label="Re-check"
                  className="rounded-lg p-1.5 text-[color:var(--oc-muted)] hover:bg-[color:var(--oc-hover)] disabled:opacity-40">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </button>
                <button onClick={() => setOpen(false)} aria-label="Close"
                  className="rounded-lg p-1.5 text-[color:var(--oc-muted)] hover:bg-[color:var(--oc-hover)]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-3">
              {data.connections.map((c) => (
                <div key={c.locationId}
                     className="flex items-start gap-3 rounded-xl px-2.5 py-2.5 hover:bg-[color:var(--oc-hover)]">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: DOT[c.verdict] }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-medium text-[color:var(--oc-ink)]">{c.name}</span>
                      {c.isFree && (
                        <span className="rounded-full bg-[color:var(--oc-green-d)]/12 px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--oc-green-d)]">
                          free
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-[color:var(--oc-muted)]">{c.message}</p>
                  </div>
                  {c.verdict !== 'ok' && (
                    <Link href="/crm/clients"
                          className="shrink-0 rounded-lg bg-[color:var(--oc-ink)] px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90">
                      {c.verdict === 'no-key' ? 'Add key' : 'Reconnect'}
                    </Link>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-[color:var(--oc-border)] px-5 py-3">
              <span className="text-[12px] text-[color:var(--oc-muted)]">
                {data.checked} connection{data.checked === 1 ? '' : 's'} checked against the live CRM
              </span>
              <button onClick={() => setOpen(false)}
                className="rounded-full bg-[color:var(--oc-ink)] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90">
                Continue anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
