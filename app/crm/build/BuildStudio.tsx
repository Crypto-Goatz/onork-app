'use client'

/**
 * The web0n studio, framed, with 0nCore's import panel beside it.
 *
 * WHY EMBED RATHER THAN COPY. The builder is 5,500 lines in another repo. A
 * fork agrees on the day it is made and diverges on the first fix applied to
 * only one side — and the divergence surfaces on somebody's live page, not in a
 * test. One builder, two surfaces, no versioning to maintain.
 *
 * THE HANDOFF IS postMessage, ORIGIN-CHECKED BOTH WAYS. The studio posts only
 * to 0n hosts; this listens only to web0n. A bundle is the entire site — every
 * page, every custom value — and "it is only a design" stops being true the
 * moment somebody puts a phone number in one.
 *
 * DRY RUN ALWAYS RUNS FIRST, and it is not a formality. Importing into a live
 * account has no undo, so the plan is fetched, shown in full, and only then is
 * there a button that writes. The button does not exist until the plan does.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowRight, CheckCircle2, ExternalLink, FileJson, Loader2, TriangleAlert, XCircle,
  Sparkles, Eye, PencilLine, LayoutTemplate, RefreshCw,
} from 'lucide-react'
import { useSso, authHeaders } from '@/app/crm/useSso'

const STUDIO_ORIGIN = 'https://web0n.com'
const STUDIO_URL = `${STUDIO_ORIGIN}/studio`
// 0n3 Pages (2026-11-14): the same builder, hosted by 0n3, where pages are SAVED — one 0n3 project per sub-account, with
// a thumbnail, a preview link and a 12-hour edit link each. Its "Send to 0nCore" export lands in the import panel too.
const ON3_ORIGIN = 'https://0n3.app'

interface Page { id: string; name: string; title: string; updatedAt: number | null; previewUrl: string; editUrl: string; thumbUrl: string }

interface Receipt {
  externalId: string
  title: string
  action: 'would-create' | 'created' | 'skipped-exists' | 'refused' | 'failed'
  detail?: string
  supportedPath?: string
}

interface DryRun {
  willCreate: number
  willRefuse: number
  customValues?: { inBundle: number; alreadyOnTarget: number; missing: string[] }
  receipts: Receipt[]
  notes: string[]
  tokenResolution?: string
  bundle?: { name: string; generatedBy?: string }
}

interface Client { id: string; name: string }

export default function BuildStudio() {
  const sso = useSso()
  const [bundle, setBundle] = useState<unknown>(null)
  const [bundleName, setBundleName] = useState<string>('')
  const [clients, setClients] = useState<Client[]>([])
  const [target, setTarget] = useState('')
  const [plan, setPlan] = useState<DryRun | null>(null)
  const [done, setDone] = useState<{ created: number; failed: number; receipts: Receipt[] } | null>(null)
  const [busy, setBusy] = useState<'plan' | 'run' | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Receive from the framed studio ──────────────────────────────────────
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // The origin check is the whole security boundary. Without it any framed
      // page could push a bundle into someone's account.
      if (e.origin !== STUDIO_ORIGIN && e.origin !== ON3_ORIGIN) return
      const data = e.data as { type?: string; bundle?: { name?: string } }
      if (data?.type !== '0nblueprint:bundle' || !data.bundle) return
      setBundle(data.bundle)
      setBundleName(data.bundle.name || 'Untitled site')
      setPlan(null); setDone(null); setErr(null)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    if (sso.state !== 'authed' || !sso.token) return
    fetch('/api/bootstrap', { headers: authHeaders(sso.token), cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        const list = (j.locations ?? []) as Client[]
        setClients(list)
        if (list.length === 1) setTarget(list[0].id)
      })
      .catch(() => { /* the picker just stays empty; the file drop still works */ })
  }, [sso.state, sso.token])

  // ── Pages (0n3 Pages) ─────────────────────────────────────────────────
  // Inside a sub-account the session is pinned to it; at agency level the picked client is used (checked server-side).
  const pagesLocation = sso.activeLocationId || target
  const [pages, setPages] = useState<Page[]>([])
  const [pagesBusy, setPagesBusy] = useState<'load' | 'build' | 'change' | null>(null)
  const [pagesErr, setPagesErr] = useState<string | null>(null)
  const [question, setQuestion] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [open, setOpen] = useState<Page | null>(null)
  const [editUrl, setEditUrl] = useState<string | null>(null)
  const [stamp, setStamp] = useState(Date.now())

  const loadPages = useCallback(async () => {
    if (!sso.token || !pagesLocation) return
    setPagesBusy('load'); setPagesErr(null)
    try {
      const r = await fetch(`/api/crm/pages?locationId=${encodeURIComponent(pagesLocation)}`, { headers: authHeaders(sso.token), cache: 'no-store' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || `Pages could not be loaded (${r.status})`)
      setPages(j.pages || []); setStamp(Date.now())
    } catch (e) { setPagesErr((e as Error).message) } finally { setPagesBusy(null) }
  }, [sso.token, pagesLocation])
  useEffect(() => { loadPages() }, [loadPages])

  const pagesCall = useCallback(async (payload: Record<string, unknown>) => {
    const r = await fetch('/api/crm/pages', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(sso.token ?? '') }, body: JSON.stringify({ locationId: pagesLocation, ...payload }) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j.error || `That did not work (${r.status})`)
    return j
  }, [sso.token, pagesLocation])

  async function describe() {
    const text = prompt.trim(); if (!text) return
    const action = open ? 'change' : 'build'
    setPagesBusy(action); setPagesErr(null); setQuestion(null)
    try {
      const j = await pagesCall(open ? { action, pageId: open.id, prompt: text } : { action, prompt: text })
      if (j.question) { setQuestion(j.question); return }
      setPrompt('')
      await loadPages()
      if (j.page) await openPage(j.page as Page)
    } catch (e) { setPagesErr((e as Error).message) } finally { setPagesBusy(null) }
  }

  async function openPage(p: Page) {
    setOpen(p); setPagesErr(null)
    try { const j = await pagesCall({ action: 'links', pageId: p.id }); setEditUrl(j.editUrl) } catch (e) { setEditUrl(p.editUrl); setPagesErr((e as Error).message) }
  }

  const call = useCallback(async (mode: 'dry_run' | 'execute') => {
    const r = await fetch('/api/bundle/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(sso.token ?? '') },
      body: JSON.stringify({ bundle, locationId: target, mode }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      const problems = (j.problems as { path: string; message: string }[] | undefined)
      throw new Error(problems?.length
        ? problems.map((p) => `${p.path}: ${p.message}`).join('\n')
        : j.error || `Import failed (${r.status})`)
    }
    return j
  }, [bundle, target, sso.token])

  async function preview() {
    setBusy('plan'); setErr(null); setDone(null)
    try { setPlan(await call('dry_run')) } catch (e) { setErr((e as Error).message) } finally { setBusy(null) }
  }

  async function run() {
    setBusy('run'); setErr(null)
    try { setDone(await call('execute')); setPlan(null) } catch (e) { setErr((e as Error).message) } finally { setBusy(null) }
  }

  function readFile(f: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        setBundle(parsed); setBundleName(parsed?.name || f.name); setPlan(null); setDone(null); setErr(null)
      } catch {
        setErr('That file is not valid JSON.')
      }
    }
    reader.readAsText(f)
  }

  return (
    <div className="oncore-app flex h-screen flex-col bg-[color:var(--oc-bg)]">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[color:var(--oc-border)] px-5 py-3">
        <h1 className="text-[15px] font-semibold text-[color:var(--oc-ink)]">Build a site</h1>
        <p className="text-[12.5px] text-[color:var(--oc-muted)]">
          Design it here, then send it into a client account.
        </p>
        <a
          href={editUrl || STUDIO_URL}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[color:var(--oc-green-d)] hover:underline"
        >
          Open the builder full screen <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── PAGES: describe a page, see it, open it ── */}
        <aside className="flex w-[300px] shrink-0 flex-col overflow-y-auto border-r border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-4">
          <h2 className="text-[13px] font-semibold text-[color:var(--oc-ink)]">{open ? `Change "${open.title}"` : 'Describe a page'}</h2>
          {!pagesLocation ? (
            <p className="mt-2 text-[12.5px] leading-relaxed text-[color:var(--oc-muted)]">Pick the client on the right first; their pages are kept with their account.</p>
          ) : (
            <>
              <textarea
                id="page-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                placeholder={open ? 'Make the hero darker and add a pricing section with three plans.' : 'A landing page for our fall facial special: what it includes, three benefits, and a Book now button.'}
                className="mt-2 w-full resize-y rounded-lg border border-[color:var(--oc-border)] bg-[color:var(--oc-bg)] p-2.5 text-[12.5px] text-[color:var(--oc-ink)] outline-none focus:border-[color:var(--oc-green-d)]"
              />
              <button
                onClick={describe}
                disabled={!!pagesBusy || !prompt.trim()}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[color:var(--oc-green-d)] px-3 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50"
              >
                {pagesBusy === 'build' || pagesBusy === 'change' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {pagesBusy === 'build' ? 'Building the page…' : pagesBusy === 'change' ? 'Changing the page…' : open ? 'Change this page' : 'Build the page'}
              </button>
              {open && <button onClick={() => { setOpen(null); setEditUrl(null) }} className="mt-1.5 text-[12px] text-[color:var(--oc-muted)] hover:underline">Start a new page instead</button>}
              {question && <p className="mt-2 rounded-lg bg-[color:var(--oc-bg)] p-2.5 text-[12.5px] text-[color:var(--oc-ink)]">{question}</p>}
              {pagesErr && <p className="mt-2 flex gap-1.5 text-[12px] text-red-600"><TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />{pagesErr}</p>}

              <div className="mt-5 flex items-center gap-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[color:var(--oc-muted)]">Pages</h3>
                <button onClick={loadPages} title="Refresh" className="ml-auto text-[color:var(--oc-muted)] hover:text-[color:var(--oc-ink)]">{pagesBusy === 'load' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}</button>
              </div>
              {!pages.length && pagesBusy !== 'load' && <p className="mt-2 text-[12.5px] text-[color:var(--oc-muted)]">No pages yet. Describe the first one above.</p>}
              <div className="mt-2 flex flex-col gap-3">
                {pages.map((p) => (
                  <div key={p.id} className={`overflow-hidden rounded-xl border ${open?.id === p.id ? 'border-[color:var(--oc-green-d)]' : 'border-[color:var(--oc-border)]'} bg-[color:var(--oc-bg)]`}>
                    <button onClick={() => openPage(p)} className="block w-full" title="Open in the editor">
                      <img src={`${p.thumbUrl}?t=${stamp}`} alt={`${p.title} preview`} className="aspect-[16/10] w-full object-cover object-top" loading="lazy" />
                    </button>
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[color:var(--oc-ink)]">{p.title}</span>
                      <a href={p.previewUrl} target="_blank" rel="noreferrer" title="Preview" className="text-[color:var(--oc-muted)] hover:text-[color:var(--oc-ink)]"><Eye className="h-4 w-4" /></a>
                      <button onClick={() => openPage(p)} title="Edit visually" className="text-[color:var(--oc-muted)] hover:text-[color:var(--oc-ink)]"><PencilLine className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* The builder itself — 0n3 Pages, framed, on the page that is open. */}
        {editUrl ? (
          <iframe
            key={editUrl}
            src={editUrl}
            title="Page editor"
            className="min-w-0 flex-1 border-0"
            // allow-same-origin keeps the editor on its own origin (0n3.app) so it can save to it; it gains nothing here.
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
          />
        ) : (
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <LayoutTemplate className="h-10 w-10 text-[color:var(--oc-muted)]" />
            <p className="max-w-sm text-[13px] text-[color:var(--oc-muted)]">Describe a page on the left and it is built here, ready to drag, drop and edit. Or open one of the client's pages.</p>
          </div>
        )}

        {/* ── IMPORT PANEL ── */}
        <aside className="flex w-[360px] shrink-0 flex-col overflow-y-auto border-l border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-5">
          <h2 className="text-[13px] font-semibold text-[color:var(--oc-ink)]">Import into a client</h2>

          {!bundle ? (
            <>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[color:var(--oc-muted)]">
                In the builder, open the JSON panel and press <strong>Send to 0nCore</strong>. It
                will land here.
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-[color:var(--oc-border)] px-4 py-6 text-[12.5px] text-[color:var(--oc-muted)] transition-colors hover:border-[color:var(--oc-green-d)]"
              >
                <FileJson className="h-4 w-4" /> …or drop a .0nblueprint.json file
              </button>
              <input
                ref={fileRef} type="file" accept=".json,application/json" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f) }}
              />
            </>
          ) : (
            <>
              <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-[color:var(--oc-green-d)]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> {bundleName}
              </p>

              <label className="mt-4 block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[color:var(--oc-muted)]">
                  Which account
                </span>
                <select
                  value={target}
                  onChange={(e) => { setTarget(e.target.value); setPlan(null); setDone(null) }}
                  className="oc-input w-full px-3 py-2 text-[13px]"
                >
                  <option value="">Choose a client…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>

              <button
                onClick={preview}
                disabled={!target || busy !== null}
                className="oc-btn mt-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] disabled:opacity-60"
              >
                {busy === 'plan' ? <><Loader2 className="h-4 w-4 animate-spin" />Checking…</> : <>Preview the import <ArrowRight className="h-4 w-4" /></>}
              </button>
              <p className="mt-2 text-[11.5px] leading-relaxed text-[color:var(--oc-faint)]">
                Nothing is written until you approve the plan. There is no undo on the other side.
              </p>
            </>
          )}

          {err && (
            <p className="mt-4 whitespace-pre-line rounded-xl bg-[color:var(--oc-amber)]/10 px-3 py-2.5 text-[12px] leading-relaxed text-[color:var(--oc-amber)]">
              {err}
            </p>
          )}

          {plan && (
            <div className="mt-5">
              <p className="text-[13px] font-semibold text-[color:var(--oc-ink)]">
                {plan.willCreate} to create
                {plan.willRefuse > 0 && <span className="text-[color:var(--oc-muted)]"> · {plan.willRefuse} refused</span>}
              </p>

              {/* Said before approval. A page that renders a literal {{token}}
                  is the failure this warning exists to prevent. */}
              {plan.customValues?.missing?.length ? (
                <p className="mt-2 flex gap-1.5 rounded-lg bg-[color:var(--oc-amber)]/10 px-3 py-2 text-[11.5px] leading-relaxed text-[color:var(--oc-amber)]">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  This account is missing {plan.customValues.missing.length} value(s) the design uses:{' '}
                  {plan.customValues.missing.join(', ')}. Those will show as raw tokens on the page.
                </p>
              ) : null}

              <ul className="mt-3 space-y-1.5">
                {plan.receipts.map((r) => (
                  <li key={r.externalId} className="rounded-lg border border-[color:var(--oc-border)] px-3 py-2">
                    <div className="flex items-baseline gap-2">
                      {r.action === 'refused'
                        ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--oc-muted)]" />
                        : <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--oc-green-d)]" />}
                      <span className="text-[12.5px] font-medium text-[color:var(--oc-ink)]">{r.title}</span>
                    </div>
                    {r.detail && <p className="mt-0.5 pl-5 text-[11.5px] leading-relaxed text-[color:var(--oc-muted)]">{r.detail}</p>}
                    {r.supportedPath && <p className="mt-0.5 pl-5 text-[11.5px] leading-relaxed text-[color:var(--oc-green-d)]">{r.supportedPath}</p>}
                  </li>
                ))}
              </ul>

              {plan.notes?.map((n, i) => (
                <p key={i} className="mt-2 text-[11.5px] leading-relaxed text-[color:var(--oc-muted)]">{n}</p>
              ))}

              {plan.willCreate > 0 && (
                <button
                  onClick={run}
                  disabled={busy !== null}
                  className="oc-btn mt-4 inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-[13px] disabled:opacity-60"
                >
                  {busy === 'run' ? <><Loader2 className="h-4 w-4 animate-spin" />Importing…</> : `Import ${plan.willCreate} into this account`}
                </button>
              )}
            </div>
          )}

          {done && (
            <div className="mt-5 rounded-xl bg-[color:var(--0n-soft)] px-3 py-3">
              <p className="text-[13px] font-semibold text-[color:var(--oc-green-d)]">
                {done.created} imported{done.failed > 0 ? `, ${done.failed} failed` : ''}.
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {done.receipts.filter((r) => r.action === 'failed').map((r) => (
                  <li key={r.externalId} className="text-[11.5px] text-[color:var(--oc-muted)]">{r.title} — {r.detail}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
