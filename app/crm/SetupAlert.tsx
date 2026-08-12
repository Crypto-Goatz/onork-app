'use client'

/**
 * The unfinished-setup alert.
 *
 * WHY IT IS LOUD. Without a sub-account key, 0nCORE looks like it works right up
 * until the moment something writes to a client — the command plans, the course
 * generates, and then the last step fails. That reads as a broken product
 * rather than unfinished setup. This says which it is, before the failure.
 *
 * Styling is the existing .oncore-app tokens only. No new look invented here.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, X } from 'lucide-react'

interface Status {
  authed: boolean
  step: 'agency' | 'pick_free' | 'need_pit' | 'clients_need_key' | 'done'
  complete: boolean
  title: string
  detail: string
  cta: string
  freeLocationName?: string | null
  missingCount?: number
  missingClients?: string[]
}

export default function SetupAlert() {
  const [status, setStatus] = useState<Status | null>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let live = true
    fetch('/api/connect/status', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (live && j?.authed) setStatus(j) })
      .catch(() => { /* an alert that cannot load must not break the page */ })
    return () => { live = false }
  }, [])

  // A missing client key is NOT dismissible. Every other setup step is a task
  // the agency has not started; this one is money already being charged for a
  // client that cannot be written to, and a banner they can wave away is how
  // that stays true for a month.
  const dismissible = status?.step !== 'clients_need_key'

  if (!status || status.complete || (hidden && dismissible)) return null

  const missing = status.step === 'clients_need_key' ? status.missingClients ?? [] : []
  const href = status.step === 'clients_need_key' ? '/crm/clients' : '/connect'

  return (
    <div className="border-b border-[color:var(--oc-line)] bg-[color:var(--oc-amber)]/10">
      <div className="mx-auto flex max-w-5xl items-start gap-3 px-6 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--oc-amber)]" />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-[color:var(--oc-ink)]">{status.title}</div>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-[color:var(--oc-text)]/75">
            {status.detail}
            {status.step === 'need_pit' && status.freeLocationName
              ? ` Account: ${status.freeLocationName}.`
              : ''}
          </p>
          {/* NAMED, not counted. "3 clients need keys" sends someone hunting
              through the list; the names say which rows to open. */}
          {missing.length > 0 && (
            <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--oc-amber)]">
              {missing.join(' · ')}
              {(status.missingCount ?? 0) > missing.length
                ? ` +${(status.missingCount ?? 0) - missing.length} more`
                : ''}
            </p>
          )}
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[color:var(--oc-ink)] px-3 py-1.5 text-[12px] font-medium text-white transition hover:opacity-90"
        >
          {status.cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        {/* Dismissible for this page view only — deliberately NOT remembered.
            Setup is not optional, and a banner that stays dismissed is how an
            agency forgets why nothing writes to their clients. */}
        {dismissible && (
          <button
            onClick={() => setHidden(true)}
            aria-label="Hide for now"
            className="shrink-0 rounded-lg p-1.5 text-[color:var(--oc-text)]/40 transition hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
