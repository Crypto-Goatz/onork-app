'use client'

/**
 * Scans — the SXO agency products, sellable to the agency's own clients.
 *
 * PRICES ARE THE REAL ONES from sxowebsite.com/agency. Inventing a price on a
 * page an agency will quote from is how someone charges a client the wrong
 * number, so anything not published there says so rather than guessing.
 *
 * THE SCANNER IS NOT REIMPLEMENTED. It runs through the 0nMCP bridge against
 * the live product. A second copy of a scanner is a second copy to keep
 * correct, and the first one is somebody's business.
 */
import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, Radar, ShieldCheck } from 'lucide-react'
import AppSidebar from './AppSidebar'

interface Client { locationId: string; name: string; connected: boolean }

/** Straight from sxowebsite.com/agency. Nothing here is estimated. */
const PLANS = [
  { name: 'Scout', price: '$49/mo', blurb: 'Scanning for one agency.' },
  { name: 'Growth', price: '$149/mo', blurb: 'White-label included.' },
  { name: 'Agency', price: '$399/mo', blurb: 'Full white-label across your book.' },
]
const PRODUCTS = [
  { name: 'SXO Rewrite', price: '$8', blurb: 'One page rewritten AI-ready.' },
  { name: 'White-label widget embed', price: '$17/mo', blurb: 'Branded scanner on your site, or a client’s, for lead capture.' },
  { name: 'Done-for-you sites', price: 'On request', blurb: 'Built for you to resell.' },
]
const SCANS = [
  { kind: 'score', name: 'SXO Score', blurb: 'The headline AI-readiness grade, and why it scores that way.' },
  { kind: 'report', name: 'AI Readiness Report', blurb: 'Full Living DOM report — visibility in AI Overviews, ChatGPT and Perplexity.' },
]

export default function ScansPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [target, setTarget] = useState('')
  const [domain, setDomain] = useState('')
  const [kind, setKind] = useState('score')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [needsTool, setNeedsTool] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/connect/accounts', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setClients((j.accounts ?? []).filter((a: Client) => a.connected)))
      .catch(() => {})
  }, [])

  async function run() {
    setBusy(true); setErr(null); setResult(null); setNeedsTool(null)
    try {
      const res = await fetch('/api/crm/scans', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, domain, locationId: target || undefined }),
      })
      const j = await res.json()
      if (!res.ok) { setErr(j.error); setNeedsTool(j.needsTool ?? null) }
      else setResult(j.text)
    } catch {
      setErr('Could not reach the server.')
    } finally { setBusy(false) }
  }

  return (
    <div className="oncore-app flex min-h-screen bg-[color:var(--oc-bg)]">
      <AppSidebar current="tools" activeCount={0} totalCount={0} usageLabel="$0" />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1080px] px-10 py-12">
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--oc-ink)]">Scans</h1>
          <p className="mt-1 max-w-lg text-[13.5px] leading-relaxed text-[color:var(--oc-muted)]">
            AI-readiness scanning you can run for yourself or sell to a client. White-labelled on
            the Growth and Agency plans.
          </p>

          {/* ── run one ── */}
          <div className="mt-8 rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-6">
            <div className="flex items-center gap-2">
              <Radar className="h-[18px] w-[18px] text-[color:var(--oc-green-d)]" strokeWidth={2} />
              <h2 className="text-[16px] font-semibold text-[color:var(--oc-ink)]">Run a scan</h2>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[12px] font-medium text-[color:var(--oc-muted)]">Website</label>
                <input value={domain} onChange={(e) => setDomain(e.target.value)}
                  placeholder="harbordental.com" className={INPUT} />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-[color:var(--oc-muted)]">Scan</label>
                <select value={kind} onChange={(e) => setKind(e.target.value)} className={INPUT}>
                  {SCANS.map((s) => <option key={s.kind} value={s.kind}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1.5 block text-[12px] font-medium text-[color:var(--oc-muted)]">
                On behalf of (optional)
              </label>
              <select value={target} onChange={(e) => setTarget(e.target.value)} className={INPUT}>
                <option value="">Just for me</option>
                {clients.map((c) => <option key={c.locationId} value={c.locationId}>{c.name}</option>)}
              </select>
              <p className="mt-1.5 text-[11.5px] text-[color:var(--oc-muted)]">
                Naming a client files the receipt against them, so it is billable work you can show.
              </p>
            </div>

            <p className="mt-3 text-[12.5px] text-[color:var(--oc-muted)]">
              {SCANS.find((s) => s.kind === kind)?.blurb}
            </p>

            {err && (
              <div className="mt-3 rounded-xl bg-[color:var(--oc-amber)]/10 px-3.5 py-3 text-[12.5px] leading-relaxed text-[color:var(--oc-amber)]">
                {err}
                {needsTool && (
                  <span className="mt-1 block font-mono text-[11.5px]">
                    add {needsTool} to MCP_ALLOWED_TOOLS
                  </span>
                )}
              </div>
            )}
            {result && (
              <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-[color:var(--oc-input)] px-3.5 py-3 font-mono text-[11.5px] leading-relaxed text-[#a5f3a0]">
                {result}
              </pre>
            )}

            <button onClick={run} disabled={busy || !domain.trim()} className={`${PRIMARY} mt-4`}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
              Run scan
            </button>
          </div>

          {/* ── what it costs ── */}
          <h2 className="mt-10 text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--oc-muted)]">
            Plans
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.name} className="rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-5">
                <div className="text-[14px] font-semibold text-[color:var(--oc-ink)]">{p.name}</div>
                <div className="mt-1 font-mono text-[18px] text-[color:var(--oc-green-d)]">{p.price}</div>
                <p className="mt-1.5 text-[12.5px] text-[color:var(--oc-muted)]">{p.blurb}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-8 text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--oc-muted)]">
            Sold separately
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {PRODUCTS.map((p) => (
              <div key={p.name} className="rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-5">
                <div className="text-[14px] font-semibold text-[color:var(--oc-ink)]">{p.name}</div>
                <div className="mt-1 font-mono text-[16px] text-[color:var(--oc-green-d)]">{p.price}</div>
                <p className="mt-1.5 text-[12.5px] text-[color:var(--oc-muted)]">{p.blurb}</p>
              </div>
            ))}
          </div>

          {/* Honest about the one thing that does not exist yet. */}
          <div className="mt-8 rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[color:var(--oc-amber)]" strokeWidth={2} />
              <span className="text-[14px] font-semibold text-[color:var(--oc-ink)]">
                Copy-paste widget — not wired yet
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-[color:var(--oc-muted)]">
              The white-label embed is a real product at $17/mo, but sxowebsite.com exposes no
              public embed endpoint I can point a snippet at — every candidate path returns 404. A
              snippet invented here would be copied onto a client&apos;s site and silently do
              nothing, so there isn&apos;t one. The embed route needs to exist first; then this
              becomes a copy button.
            </p>
            <a href="https://sxowebsite.com/agency" target="_blank" rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[color:var(--oc-green-d)]">
              The agency plans on sxowebsite.com <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}

const INPUT =
  'w-full rounded-xl border border-[#2a2a2a] bg-[color:var(--oc-input)] px-3.5 py-2.5 text-[13.5px] text-[#f5f5f5] outline-none transition placeholder:text-[#8a8a8a] focus:border-[color:var(--oc-green-d)]'
const PRIMARY =
  'inline-flex items-center gap-2 rounded-full bg-[color:var(--oc-ink)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-glow-sm transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none'
