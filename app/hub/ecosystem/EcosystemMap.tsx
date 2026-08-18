'use client'

/**
 * The interactive map.
 *
 * LAYERED, NOT FORCE-DIRECTED, deliberately. A force simulation looks alive and
 * says nothing: run it twice and the same system tells two different stories.
 * Here the vertical position IS the meaning — operator at the top, then the
 * agents that build, the surfaces people touch, the orchestrator everything
 * routes through, the data, and finally the outside world. Someone who has
 * never seen this can read the direction of dependency without being told.
 *
 * VERIFIED AND ASSERTED EDGES ARE DRAWN DIFFERENTLY, and that is the honest
 * core of the whole page. A solid animated line means somebody made that call
 * and recorded what came back. A dashed line means it is believed. Drawing them
 * identically is how a diagram becomes something you cannot defend in a room.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowUpRight, CheckCircle2, CircleDot, Cpu,
  Database, Globe, Loader2, RefreshCw, ShieldCheck, User, Zap, X,
} from 'lucide-react'
import type { EcoNode, EcoEdge } from '@/lib/ecosystem/graph'

type Health = { ok: boolean; status: number | null; ms: number; note?: string }
type Live = {
  measuredAt: string
  health: Record<string, Health>
  metrics: Record<string, { value: number | null; label: string; note?: string }>
  summary: { surfacesProbed: number; surfacesReachable: number; allReachable: boolean }
  notProbed: { id: string; why: string }[]
}

const KIND_META: Record<string, { ring: string; fill: string; text: string; icon: typeof Cpu; name: string }> = {
  operator:     { ring: 'stroke-[#f59e0b]', fill: 'fill-[#f59e0b]/15', text: 'text-[#f59e0b]', icon: User,       name: 'You' },
  build:        { ring: 'stroke-[#a78bfa]', fill: 'fill-[#a78bfa]/15', text: 'text-[#a78bfa]', icon: Zap,        name: 'Build loop' },
  surface:      { ring: 'stroke-[#6EE05A]', fill: 'fill-[#6EE05A]/15', text: 'text-[#6EE05A]', icon: Globe,      name: 'Surfaces' },
  orchestrator: { ring: 'stroke-[#22d3ee]', fill: 'fill-[#22d3ee]/15', text: 'text-[#22d3ee]', icon: Cpu,        name: 'Orchestrator' },
  data:         { ring: 'stroke-[#0891b2]', fill: 'fill-[#0891b2]/15', text: 'text-[#0891b2]', icon: Database,   name: 'Data' },
  external:     { ring: 'stroke-[#94a3b8]', fill: 'fill-[#94a3b8]/15', text: 'text-[#94a3b8]', icon: ShieldCheck,name: 'Outside world' },
}

const STATUS_DOT: Record<string, string> = {
  live: 'bg-[#6EE05A]', partial: 'bg-[#f59e0b]', building: 'bg-[#22d3ee]', planned: 'bg-white/25',
}

const W = 1180
const LAYER_H = 132
const PAD_TOP = 70

export default function EcosystemMap({ nodes, edges, laws }: { nodes: EcoNode[]; edges: EcoEdge[]; laws: { title: string; body: string; cost: string }[] }) {
  const [live, setLive] = useState<Live | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<EcoNode | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/hub/ecosystem', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLive(d))
      .catch(() => setLive(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // Re-probe while the page is open so a demo never shows a stale board.
    timer.current = setInterval(load, 60_000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [])

  /** Deterministic layout: layer → row, evenly spread across the row. */
  const pos = useMemo(() => {
    const byLayer = new Map<number, EcoNode[]>()
    for (const n of nodes) {
      if (!byLayer.has(n.layer)) byLayer.set(n.layer, [])
      byLayer.get(n.layer)!.push(n)
    }
    const p: Record<string, { x: number; y: number }> = {}
    for (const [layer, list] of byLayer) {
      const gap = W / (list.length + 1)
      list.forEach((n, i) => { p[n.id] = { x: gap * (i + 1), y: PAD_TOP + layer * LAYER_H } })
    }
    return p
  }, [nodes])

  const height = PAD_TOP + (Math.max(...nodes.map((n) => n.layer)) + 1) * LAYER_H

  /** An edge is lit when either end is hovered or selected. */
  const activeId = hover || selected?.id || null
  const isLit = (e: EcoEdge) => activeId !== null && (e.from === activeId || e.to === activeId)
  const dimmed = (id: string) =>
    activeId !== null && id !== activeId && !edges.some((e) => (e.from === activeId && e.to === id) || (e.to === activeId && e.from === id))

  const verifiedCount = edges.filter((e) => e.verified).length

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="border-b border-white/10 px-6 py-5 md:px-10">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#6EE05A]">Ecosystem</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">How the whole thing works</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
              Every connection below has been exercised, not assumed. Solid lines carry the date
              somebody proved them; dashed lines are believed and not yet demonstrated.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-white/40">Proven links</p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums text-[#6EE05A]">
                {verifiedCount}<span className="text-base text-white/30">/{edges.length}</span>
              </p>
            </div>
            <button
              onClick={load}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70 transition hover:border-[#6EE05A]/40 hover:text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Re-probe
            </button>
          </div>
        </div>
      </header>

      {/* ── Live strip ─────────────────────────────────────────────── */}
      <section className="border-b border-white/10 bg-white/[0.02] px-6 py-4 md:px-10">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-8 gap-y-3">
          {live ? (
            <>
              <Stat
                label="Surfaces answering"
                value={`${live.summary.surfacesReachable}/${live.summary.surfacesProbed}`}
                good={live.summary.allReachable}
              />
              {Object.entries(live.metrics).map(([k, m]) => (
                <Stat key={k} label={m.label} value={m.value === null ? 'unknown' : String(m.value)} note={m.note} good={m.value !== null} />
              ))}
              <p className="ml-auto text-[11px] text-white/35">
                measured {new Date(live.measuredAt).toLocaleTimeString()} · re-probes every 60s
              </p>
            </>
          ) : (
            <p className="text-sm text-white/40">{loading ? 'Probing live surfaces…' : 'Live probe unavailable — the map below is structural only.'}</p>
          )}
        </div>
      </section>

      {/* ── The map ────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1240px] px-2 py-6 md:px-10">
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0b0f14]">
          <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full min-w-[900px]" role="img" aria-label="Ecosystem architecture map">
            <defs>
              <marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" className="fill-white/30" />
              </marker>
              <style>{`
                @keyframes flow { to { stroke-dashoffset: -24; } }
                .flowing { stroke-dasharray: 5 7; animation: flow 1.1s linear infinite; }
                @media (prefers-reduced-motion: reduce) { .flowing { animation: none; } }
              `}</style>
            </defs>

            {/* Layer bands — quiet, but they carry the hierarchy */}
            {[...new Set(nodes.map((n) => n.layer))].sort((a, b) => a - b).map((l) => (
              <line key={l} x1="0" x2={W} y1={PAD_TOP + l * LAYER_H + 46} y2={PAD_TOP + l * LAYER_H + 46} className="stroke-white/[0.04]" strokeWidth="1" />
            ))}

            {/* Edges first, so nodes sit above them */}
            {edges.map((e, i) => {
              const a = pos[e.from]; const b = pos[e.to]
              if (!a || !b) return null
              const lit = isLit(e)
              const midY = (a.y + b.y) / 2
              const d = `M ${a.x} ${a.y + 26} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y - 26}`
              return (
                <g key={i}>
                  <path
                    d={d}
                    fill="none"
                    markerEnd="url(#ar)"
                    strokeWidth={lit ? 2.2 : 1.2}
                    strokeDasharray={e.verified ? undefined : '3 5'}
                    className={`${lit ? 'stroke-[#6EE05A]' : 'stroke-white/15'} ${lit && e.verified ? 'flowing' : ''} transition-all`}
                  />
                  {lit && (
                    <text x={(a.x + b.x) / 2} y={midY} textAnchor="middle" className="fill-[#6EE05A] text-[10px]">
                      {e.label}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Nodes */}
            {nodes.map((n) => {
              const p = pos[n.id]; if (!p) return null
              const meta = KIND_META[n.kind]
              const h = live?.health[n.id]
              const faded = dimmed(n.id)
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x} ${p.y})`}
                  className={`cursor-pointer transition-opacity ${faded ? 'opacity-25' : 'opacity-100'}`}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setSelected(n)}
                >
                  <rect x="-72" y="-26" width="144" height="52" rx="10"
                    className={`${meta.fill} ${meta.ring} transition-all`} strokeWidth={activeId === n.id ? 2 : 1} />
                  <text x="0" y="-4" textAnchor="middle" className="fill-white text-[12px] font-medium">{n.label}</text>
                  <text x="0" y="12" textAnchor="middle" className="fill-white/45 text-[9px]">{n.domain || n.repo || meta.name}</text>
                  {/* Live dot: measured health wins over declared status. */}
                  <circle cx="60" cy="-16" r="4"
                    className={h ? (h.ok ? 'fill-[#6EE05A]' : 'fill-[#ef4444]') : STATUS_DOT[n.status].replace('bg-', 'fill-')} />
                </g>
              )
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/45">
          {Object.entries(KIND_META).map(([k, m]) => (
            <span key={k} className="flex items-center gap-2">
              <m.icon className={`h-3.5 w-3.5 ${m.text}`} />{m.name}
            </span>
          ))}
          <span className="flex items-center gap-2"><span className="h-px w-6 bg-[#6EE05A]" />proven, with a date</span>
          <span className="flex items-center gap-2"><span className="h-px w-6 border-t border-dashed border-white/40" />asserted, not yet demonstrated</span>
        </div>
      </div>

      {/* ── Detail panel ───────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setSelected(null)}>
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0d1117] p-6" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-xs uppercase tracking-widest ${KIND_META[selected.kind].text}`}>{KIND_META[selected.kind].name}</p>
                <h2 className="mt-1 text-2xl font-semibold">{selected.label}</h2>
                {(selected.domain || selected.repo) && (
                  <p className="mt-1 font-mono text-xs text-white/40">{selected.domain || selected.repo}</p>
                )}
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close" className="rounded-full bg-white/10 p-2 text-white/70 transition hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-white/75">{selected.blurb}</p>
            {selected.detail && <p className="mt-3 text-sm leading-relaxed text-white/55">{selected.detail}</p>}

            {live?.health[selected.id] && (
              <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-wider text-white/40">Measured just now</p>
                <p className="mt-1 flex items-center gap-2 text-sm">
                  {live.health[selected.id].ok
                    ? <CheckCircle2 className="h-4 w-4 text-[#6EE05A]" />
                    : <AlertTriangle className="h-4 w-4 text-[#ef4444]" />}
                  HTTP {live.health[selected.id].status ?? '—'} · {live.health[selected.id].ms}ms
                </p>
                {live.health[selected.id].note && <p className="mt-1 text-xs text-white/45">{live.health[selected.id].note}</p>}
              </div>
            )}

            {live?.notProbed.some((x) => x.id === selected.id) && (
              <div className="mt-6 rounded-lg border border-[#f59e0b]/25 bg-[#f59e0b]/[0.06] p-4">
                <p className="text-[11px] uppercase tracking-wider text-[#f59e0b]">Not measured</p>
                <p className="mt-1 text-xs leading-relaxed text-white/60">{live.notProbed.find((x) => x.id === selected.id)!.why}</p>
              </div>
            )}

            <h3 className="mt-7 text-xs uppercase tracking-widest text-white/40">Connections</h3>
            <ul className="mt-3 space-y-2">
              {edges.filter((e) => e.from === selected.id || e.to === selected.id).map((e, i) => {
                const other = e.from === selected.id ? e.to : e.from
                const on = nodes.find((n) => n.id === other)
                return (
                  <li key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                    <p className="flex items-center gap-2 text-sm">
                      {e.from === selected.id ? <ArrowUpRight className="h-3.5 w-3.5 text-white/40" /> : <CircleDot className="h-3.5 w-3.5 text-white/40" />}
                      <span className="text-white/80">{on?.label || other}</span>
                      <span className="text-white/35">· {e.label}</span>
                    </p>
                    <p className={`mt-1 text-xs ${e.verified ? 'text-[#6EE05A]' : 'text-white/35'}`}>
                      {e.verified ? `Proven — ${e.verified}` : 'Asserted. Nobody has demonstrated this one yet.'}
                    </p>
                  </li>
                )
              })}
            </ul>
          </aside>
        </div>
      )}

      {/* ── What it cost to learn ──────────────────────────────────── */}
      <section className="border-t border-white/10 px-6 py-10 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          <h2 className="text-xl font-semibold">What this system knows that a new one wouldn&apos;t</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/50">
            Each of these was a real outage or a silent failure. They are written down because the
            expensive part was never the fix — it was the days spent looking in the wrong place.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {laws.map((l) => (
              <article key={l.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-start gap-2">
                  <Activity className="mt-0.5 h-4 w-4 shrink-0 text-[#6EE05A]" />
                  <h3 className="text-sm font-medium leading-snug text-white/90">{l.title}</h3>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-white/55">{l.body}</p>
                <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-relaxed text-white/40">
                  <span className="text-white/60">What it cost: </span>{l.cost}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, note, good }: { label: string; value: string; note?: string; good?: boolean }) {
  return (
    <div title={note}>
      <p className="text-[11px] uppercase tracking-wider text-white/40">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${good ? 'text-white' : 'text-[#f59e0b]'}`}>{value}</p>
    </div>
  )
}
