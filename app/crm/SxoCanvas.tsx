'use client'

/**
 * SXO — the site as a health map.
 *
 * THE POINT IS THE COLOUR, NOT THE REPORT. A site owner should understand their
 * position in five seconds without reading anything: red is broken, amber needs
 * work, green is fine. A 40-page PDF says the same thing and gets skimmed once.
 *
 * ONE PANEL OPEN AT A TIME. The rail is fixed and panels slide over the canvas,
 * because the canvas is the product — a sidebar that permanently eats 320px of
 * it makes a 200-node map unreadable to save a click.
 *
 * LAYOUT IS BY DEPTH, DELIBERATELY. Column = how many clicks from the homepage.
 * A force layout looks better in a screenshot and tells you nothing; depth
 * columns make "this page is five clicks deep and has no inbound links" visible
 * at a glance, which is the thing worth seeing.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ReactFlow, Background, Controls, MiniMap, type Edge, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Loader2, Radar, Activity, Wrench, X } from 'lucide-react'
import AppSidebar from './AppSidebar'
import { authHeaders } from './useSso'

interface Page {
  url: string; path: string; depth: number; status_code: number
  title: string | null; score: number; severity: 'red' | 'amber' | 'green' | 'grey'
  issues: { rule: string; severity: string; message: string }[]
  node_type: string; word_count: number; response_ms: number
}
interface Site { id: string; domain: string; score: number | null; pages_found: number; last_crawled_at: string | null }

const COLOR: Record<string, string> = { red: '#dc2626', amber: '#d97706', green: '#16a34a', grey: '#a3a3a3' }
type PanelKey = 'scan' | 'health' | 'fixes' | null

export default function SxoCanvas() {
  const [token, setToken] = useState<string | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [site, setSite] = useState<Site | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [edges, setEdges] = useState<{ source_url: string; target_url: string }[]>([])
  const [counts, setCounts] = useState({ red: 0, amber: 0, green: 0, grey: 0 })
  const [panel, setPanel] = useState<PanelKey>('scan')
  const [domain, setDomain] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [selected, setSelected] = useState<Page | null>(null)

  useEffect(() => { try { setToken(sessionStorage.getItem('oncore.app.jwt')) } catch { /* private mode */ } }, [])

  const load = useCallback(async () => {
    const r = await fetch('/api/sxo/crawl', { headers: authHeaders(token), cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    setSites(j.sites ?? [])
  }, [token])

  useEffect(() => { if (token) void load() }, [token, load])

  async function open(s: Site) {
    setSite(s); setSelected(null)
    const r = await fetch(`/api/sxo/site?id=${encodeURIComponent(s.id)}`, { headers: authHeaders(token), cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    setPages(j.pages ?? []); setEdges(j.edges ?? []); setCounts(j.counts ?? { red: 0, amber: 0, green: 0, grey: 0 })
  }

  async function scan() {
    if (!domain.trim() || busy) return
    setBusy(true); setNote('Crawling — this can take a minute on a large site.')
    try {
      const r = await fetch('/api/sxo/crawl', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ domain: domain.trim() }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setNote(j.error || 'The crawl failed.'); return }
      setNote(`${j.pages} pages · score ${j.score}${j.orphans ? ` · ${j.orphans} orphan(s)` : ''}`)
      await load()
      await open({ id: j.siteId, domain: domain.trim(), score: j.score, pages_found: j.pages, last_crawled_at: null })
      setPanel('health')
    } finally { setBusy(false) }
  }

  /** Depth columns, so distance from the homepage is a spatial fact. */
  const nodes: Node[] = useMemo(() => {
    const byDepth = new Map<number, number>()
    return pages.map((p) => {
      const row = byDepth.get(p.depth) ?? 0
      byDepth.set(p.depth, row + 1)
      const bad = p.issues?.length ?? 0
      return {
        id: p.url,
        position: { x: p.depth * 300, y: row * 78 },
        data: {
          label: (
            <div className="text-left">
              <div className="truncate text-[11px] font-semibold">{p.path === '/' ? '/ (home)' : p.path}</div>
              <div className="text-[10px] opacity-70">{p.score}/100{bad ? ` · ${bad} issue${bad === 1 ? '' : 's'}` : ''}</div>
            </div>
          ),
        },
        style: {
          background: '#fff', color: '#171717', border: `2px solid ${COLOR[p.severity]}`,
          borderRadius: 10, padding: '6px 10px', width: 210, fontSize: 11,
          boxShadow: p.node_type === 'orphan' ? `0 0 0 3px ${COLOR.red}33` : undefined,
        },
      }
    })
  }, [pages])

  const flowEdges: Edge[] = useMemo(() => {
    const ids = new Set(pages.map((p) => p.url))
    return edges
      .filter((e) => ids.has(e.source_url) && ids.has(e.target_url))
      .slice(0, 1500)
      .map((e, i) => ({
        id: `e${i}`, source: e.source_url, target: e.target_url,
        style: { stroke: '#d4d4d4', strokeWidth: 1 }, animated: false,
      }))
  }, [edges, pages])

  const worst = useMemo(
    () => [...pages].sort((a, b) => a.score - b.score).slice(0, 25),
    [pages],
  )

  return (
    <div className="oncore-app flex min-h-screen bg-[color:var(--oc-bg)]">
      <AppSidebar current="tools" activeCount={sites.length} totalCount={sites.length} usageLabel="SXO" />

      <main className="relative min-w-0 flex-1">
        <div className="absolute inset-0">
          {pages.length > 0 ? (
            <ReactFlow
              nodes={nodes} edges={flowEdges} fitView minZoom={0.05}
              onNodeClick={(_, n) => setSelected(pages.find((p) => p.url === n.id) ?? null)}
              proOptions={{ hideAttribution: false }}
            >
              <Background color="#e5e5e5" gap={20} />
              <Controls />
              <MiniMap
                pannable zoomable
                nodeColor={(n) => COLOR[pages.find((p) => p.url === n.id)?.severity ?? 'grey']}
              />
            </ReactFlow>
          ) : (
            <div className="grid h-full place-items-center px-8 text-center">
              <div>
                <Radar className="mx-auto h-8 w-8 text-[color:var(--oc-muted)]" strokeWidth={1.5} />
                <p className="mt-3 text-[15px] font-semibold text-[color:var(--oc-ink)]">No site mapped yet</p>
                <p className="mt-1 text-[13px] text-[color:var(--oc-muted)]">Open Scan and crawl a client&apos;s domain.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── the accordion rail ── */}
        <div className="absolute right-0 top-0 z-10 flex h-full">
          {panel && (
            <div className="h-full w-[320px] overflow-y-auto border-l border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-bold uppercase tracking-wide text-[color:var(--oc-ink)]">
                  {panel === 'scan' ? 'Scan' : panel === 'health' ? 'Health' : 'Fixes'}
                </h2>
                <button onClick={() => setPanel(null)} aria-label="Close panel"
                  className="rounded p-1 text-[color:var(--oc-muted)] hover:bg-[color:var(--oc-hover)]">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {panel === 'scan' && (
                <div className="mt-4 space-y-3">
                  <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="harbordental.com"
                    className="w-full rounded-lg border border-[color:var(--oc-border)] bg-white px-3 py-2 text-[13px] text-[color:var(--oc-ink)] outline-none focus:border-[color:var(--oc-green-d)]" />
                  <button onClick={scan} disabled={busy || !domain.trim()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--oc-ink)] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />} Run scan
                  </button>
                  {note && <p className="text-[12px] text-[color:var(--oc-muted)]">{note}</p>}

                  {sites.length > 0 && (
                    <>
                      <div className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--oc-muted)]">Crawled</div>
                      {sites.map((s) => (
                        <button key={s.id} onClick={() => open(s)}
                          className="flex w-full items-center justify-between rounded-lg border border-[color:var(--oc-border)] px-3 py-2 text-left text-[12.5px] hover:bg-[color:var(--oc-hover)]">
                          <span className="truncate text-[color:var(--oc-ink)]">{s.domain}</span>
                          <span className="font-mono text-[color:var(--oc-muted)]">{s.score ?? '—'}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}

              {panel === 'health' && (
                <div className="mt-4 space-y-3">
                  {site ? (
                    <>
                      <div className="text-[28px] font-bold text-[color:var(--oc-ink)]">{site.score ?? '—'}<span className="text-[14px] text-[color:var(--oc-muted)]">/100</span></div>
                      <p className="text-[12.5px] text-[color:var(--oc-muted)]">{site.domain} · {pages.length} pages</p>
                      {(['red', 'amber', 'green'] as const).map((k) => (
                        <div key={k} className="flex items-center justify-between text-[12.5px]">
                          <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR[k] }} />
                            {k === 'red' ? 'Critical' : k === 'amber' ? 'Needs work' : 'Clean'}
                          </span>
                          <span className="font-mono text-[color:var(--oc-ink)]">{counts[k]}</span>
                        </div>
                      ))}
                    </>
                  ) : <p className="text-[12.5px] text-[color:var(--oc-muted)]">Crawl a site first.</p>}
                </div>
              )}

              {panel === 'fixes' && (
                <div className="mt-4 space-y-2">
                  {worst.length === 0 && <p className="text-[12.5px] text-[color:var(--oc-muted)]">Nothing to fix yet.</p>}
                  {worst.map((p) => (
                    <button key={p.url} onClick={() => setSelected(p)}
                      className="w-full rounded-lg border border-[color:var(--oc-border)] p-2.5 text-left hover:bg-[color:var(--oc-hover)]">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLOR[p.severity] }} />
                        <span className="truncate text-[12.5px] font-medium text-[color:var(--oc-ink)]">{p.path}</span>
                        <span className="ml-auto font-mono text-[11px] text-[color:var(--oc-muted)]">{p.score}</span>
                      </div>
                      {p.issues?.[0] && <p className="mt-1 truncate text-[11.5px] text-[color:var(--oc-muted)]">{p.issues[0].message}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Collapsed rail — always visible, so a closed panel is still one click away. */}
          <div className="flex h-full w-[56px] flex-col items-center gap-1 border-l border-[color:var(--oc-border)] bg-[color:var(--oc-card)] py-4">
            {([['scan', Radar], ['health', Activity], ['fixes', Wrench]] as const).map(([key, Icon]) => (
              <button key={key} onClick={() => setPanel(panel === key ? null : key)}
                aria-expanded={panel === key} aria-label={key}
                className={`grid h-10 w-10 place-items-center rounded-lg transition ${
                  panel === key ? 'bg-[color:var(--oc-ink)] text-white' : 'text-[color:var(--oc-muted)] hover:bg-[color:var(--oc-hover)]'}`}>
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            ))}
          </div>
        </div>

        {/* Node detail — every issue, named by its rule. */}
        {selected && (
          <div className="absolute bottom-4 left-4 z-20 max-h-[45%] w-[420px] overflow-y-auto rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold text-[color:var(--oc-ink)]">{selected.title || selected.path}</p>
                <p className="truncate font-mono text-[11.5px] text-[color:var(--oc-muted)]">{selected.url}</p>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close"
                className="rounded p-1 text-[color:var(--oc-muted)] hover:bg-[color:var(--oc-hover)]"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-[11.5px] text-[color:var(--oc-muted)]">
              <span>HTTP {selected.status_code}</span><span>{selected.word_count} words</span>
              <span>{selected.response_ms}ms</span><span>depth {selected.depth}</span>
              <span className="font-mono text-[color:var(--oc-ink)]">{selected.score}/100</span>
            </div>
            <div className="mt-3 space-y-1.5">
              {(selected.issues ?? []).length === 0 && <p className="text-[12.5px] text-[color:var(--oc-green-d)]">No issues found.</p>}
              {(selected.issues ?? []).map((i, n) => (
                <div key={n} className="flex gap-2 text-[12.5px]">
                  <span className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]"
                    style={{ background: `${COLOR[i.severity === 'critical' ? 'red' : i.severity === 'serious' ? 'amber' : 'green']}22`,
                             color: COLOR[i.severity === 'critical' ? 'red' : i.severity === 'serious' ? 'amber' : 'green'] }}>
                    {i.rule}
                  </span>
                  <span className="text-[color:var(--oc-text)]">{i.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
