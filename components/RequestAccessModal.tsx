'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Loader2, CheckCircle2, ArrowRight } from 'lucide-react'
import { track } from '@/lib/track'

/**
 * Request access — a modal, not a page.
 *
 * A CTA that navigates away loses the person who was mid-scroll on the pitch.
 * The form opens over the page they were reading and closes back onto it.
 *
 * Accessibility is not optional on the highest-intent element on the site:
 * focus moves in on open and is restored on close, Escape closes, focus is
 * trapped while open, and the backdrop click only fires on the backdrop itself.
 * Body scroll locks so the page behind does not slide around on iOS.
 */

const CLIENT_BANDS = ['Just me', '1–5', '6–20', '21–50', '50+']

export default function RequestAccessModal({
  open,
  onClose,
  source = 'unknown',
}: {
  open: boolean
  onClose: () => void
  source?: string
}) {
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const restoreFocusTo = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    restoreFocusTo.current = document.activeElement as HTMLElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => firstFieldRef.current?.focus(), 40)

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab' || !panelRef.current) return
      const nodes = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'
      )
      if (!nodes.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      restoreFocusTo.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (sending) return
    setSending(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/access-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fd.get('name'),
          email: fd.get('email'),
          company: fd.get('company'),
          phone: fd.get('phone'),
          clients: fd.get('clients'),
          usesCrm: fd.get('usesCrm'),
          message: fd.get('message'),
          website: fd.get('website'), // honeypot
          source,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Something went wrong. Try again?')
      setDone(true)
      track('cta_signup_direct', { form: 'access_request', source })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSending(false)
    }
  }

  const field =
    'w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3.5 py-3 text-[#e6edf3] outline-none transition-colors placeholder:text-[#6e7681] focus:border-[#6EE05A]/60'
  const label = 'mb-1.5 block text-xs font-semibold text-[#8b949e]'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-access-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
    >
      <div
        ref={panelRef}
        className="my-8 w-full max-w-lg rounded-2xl border border-[#30363d] bg-[#161b22] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#30363d] p-6">
          <div>
            <h2 id="request-access-title" className="text-xl font-bold tracking-tight text-[#e6edf3]">
              {done ? "You're on the list" : 'Request access'}
            </h2>
            <p className="mt-1 text-sm text-[#8b949e]">
              {done
                ? 'Check your inbox — a confirmation is on the way.'
                : 'We let agencies in a group at a time. Tell us about yours.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-[#30363d] p-2 text-[#8b949e] transition-colors hover:text-[#e6edf3]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {done ? (
          <div className="p-6">
            <div className="flex items-start gap-3 rounded-xl border border-[#6EE05A]/25 bg-[#6EE05A]/10 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#6EE05A]" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-[#e6edf3]">
                Thanks — we&apos;ll be in touch directly, usually within a few days.
              </p>
            </div>
            <a
              href="/0nagent"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6EE05A] px-5 py-3 font-semibold text-[#0d1117] transition-opacity hover:opacity-90"
            >
              Watch the walkthrough
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 p-6">
            {/* Honeypot — off-screen, not display:none, so bots still fill it. */}
            <input
              type="text" name="website" tabIndex={-1} autoComplete="off"
              aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 opacity-0"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="ra-name">Your name *</label>
                <input ref={firstFieldRef} id="ra-name" name="name" required autoComplete="name" className={field} placeholder="Mike Mento" />
              </div>
              <div>
                <label className={label} htmlFor="ra-email">Email *</label>
                <input id="ra-email" name="email" type="email" required autoComplete="email" className={field} placeholder="you@agency.com" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="ra-company">Agency</label>
                <input id="ra-company" name="company" autoComplete="organization" className={field} placeholder="RocketOpp" />
              </div>
              <div>
                <label className={label} htmlFor="ra-phone">Phone</label>
                <input id="ra-phone" name="phone" type="tel" autoComplete="tel" className={field} placeholder="Optional" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="ra-clients">Clients you manage</label>
                <select id="ra-clients" name="clients" defaultValue="" className={field}>
                  <option value="">Choose…</option>
                  {CLIENT_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="ra-uses">Already on the CRM?</label>
                <select id="ra-uses" name="usesCrm" defaultValue="" className={field}>
                  <option value="">Choose…</option>
                  <option value="yes">Yes</option>
                  <option value="no">Not yet</option>
                </select>
              </div>
            </div>

            <div>
              <label className={label} htmlFor="ra-message">Anything we should know?</label>
              <textarea id="ra-message" name="message" rows={3} className={field} placeholder="What would you want it doing first?" />
            </div>

            {error && (
              <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6EE05A] px-5 py-3.5 font-semibold text-[#0d1117] transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {sending ? 'Sending…' : 'Request access'}
            </button>

            <p className="text-center text-xs text-[#6e7681]">
              No spam. We only use this to get you set up.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
