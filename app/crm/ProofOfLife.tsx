'use client'

/**
 * Proof of Life — does this client's key actually work, right now.
 *
 * SALVAGED FROM THE LEGACY CHROME. The old dark sidebar is being retired, and
 * twelve of its thirteen nav items were one-line re-exports of dashboard pages.
 * This was the exception: a live probe against ten real endpoints, and the only
 * thing in the product that answers "why did that fail" with evidence rather
 * than a guess.
 *
 * IT CALLS THE REAL ENDPOINTS, not a health flag. A stored `status: active` tells
 * you what was true when it was written; a 401 from /contacts tells you what is
 * true now. Every failure this week — the double-wrapped keys, the scope
 * refusals, the expired installs — would have shown up here in one click.
 */
import { useState } from 'react'
import { Activity, Check, Loader2, X } from 'lucide-react'

const TESTS = [
  { label: 'Contacts', path: '/contacts/?limit=1' },
  { label: 'Pipelines', path: '/opportunities/pipelines' },
  { label: 'Calendars', path: '/calendars/' },
  { label: 'Tags', path: '/locations/tags' },
  { label: 'Invoices', path: '/invoices/?limit=1' },
  { label: 'Social accounts', path: '/social-media-posting/oauth' },
  { label: 'Workflows', path: '/workflows/' },
  { label: 'Users', path: '/users/' },
  { label: 'Custom fields', path: '/locations/customFields' },
  { label: 'Products', path: '/products/' },
] as const

interface Row { label: string; status: number; ok: boolean; detail: string }

export default function ProofOfLife({ locationId }: { locationId?: string }) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    setRows([])
    const out: Row[] = []
    // Sequential, not parallel: ten simultaneous calls on a key that is already
    // rate-limited produces 429s that look like auth failures.
    for (const t of TESTS) {
      try {
        const res = await fetch('/api/crm/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'GET', path: t.path, locationId }),
        })
        const body = await res.text()
        let detail = ''
        if (!res.ok) {
          try { detail = (JSON.parse(body) as { message?: string }).message ?? '' } catch { detail = body.slice(0, 80) }
        }
        out.push({ label: t.label, status: res.status, ok: res.ok, detail })
      } catch {
        out.push({ label: t.label, status: 0, ok: false, detail: 'No response' })
      }
      setRows([...out])
    }
    setBusy(false)
  }

  const passed = rows?.filter((r) => r.ok).length ?? 0

  return (
    <div className="rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-[18px] w-[18px] text-[color:var(--oc-green-d)]" strokeWidth={2} />
          <h3 className="text-[15px] font-semibold text-[color:var(--oc-ink)]">Proof of life</h3>
        </div>
        <button onClick={run} disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--oc-ink)] px-4 py-1.5 text-[12.5px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {busy ? 'Testing…' : 'Test this key'}
        </button>
      </div>

      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[color:var(--oc-muted)]">
        Calls ten real endpoints with this client&apos;s key. A stored status says what was true when
        it was saved; this says what is true now.
      </p>

      {rows && rows.length > 0 && (
        <>
          <div className="mt-4 space-y-1">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center gap-2.5 text-[12.5px]">
                {r.ok
                  ? <Check className="h-3.5 w-3.5 shrink-0 text-[color:var(--oc-green-d)]" strokeWidth={3} />
                  : <X className="h-3.5 w-3.5 shrink-0 text-[color:var(--oc-red)]" strokeWidth={3} />}
                <span className="text-[color:var(--oc-ink)]">{r.label}</span>
                <span className="ml-auto font-mono text-[11.5px] text-[color:var(--oc-muted)]">
                  {r.status || '—'}
                </span>
                {r.detail && (
                  <span className="max-w-[45%] truncate text-[11.5px] text-[color:var(--oc-amber)]" title={r.detail}>
                    {r.detail}
                  </span>
                )}
              </div>
            ))}
          </div>
          {!busy && (
            <p className="mt-3 text-[12.5px] font-medium text-[color:var(--oc-ink)]">
              {passed} of {rows.length} endpoints answered.
              {passed === 0 && ' That is a key problem, not a feature problem.'}
            </p>
          )}
        </>
      )}
    </div>
  )
}
