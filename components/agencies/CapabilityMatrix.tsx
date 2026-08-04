'use client'

import { Fragment, useMemo, useState } from 'react'
import { Check, Minus, X, Search, Filter } from 'lucide-react'
import { track } from '@/lib/track'

/**
 * The capability matrix — three setups on the same plan, side by side.
 *
 * THE ARGUMENT THIS MAKES. The middle column is the point: every gap there is
 * the PLATFORM's ceiling, not ours — read-only APIs, no cross-client view, no
 * generation. That is why the "only gaps" filter exists as a first-class
 * control rather than a nicety: it collapses 30 rows into the handful that
 * carry the whole case, and it lets a sceptical agency owner audit the claim
 * instead of taking it.
 *
 * INTERACTIVE, NOT ANIMATED. Search, filter by whether a gap exists, filter by
 * category, and a running count of what is showing. On a comparison table the
 * useful interaction is finding your own objection, not motion.
 *
 * Mobile keeps the table and scrolls it horizontally rather than collapsing to
 * cards: the entire argument is the three columns next to each other, and a
 * stacked card destroys the comparison it exists to make.
 */

type Mark = 'yes' | 'partial' | 'no'
type Row = {
  cat: string
  capability: string
  a: Mark; aNote?: string
  b: Mark; bNote?: string
  c: Mark; cNote?: string
}

const ROWS: Row[] = [
  { cat: 'Contacts & leads', capability: 'Create, update and tag contacts', a: 'partial', aNote: 'manual, per account', b: 'yes', c: 'yes', cNote: 'by chat, any client' },
  { cat: 'Contacts & leads', capability: 'Bulk segment or tag across every client at once', a: 'no', b: 'partial', bNote: 'script per location', c: 'yes', cNote: 'one sentence' },
  { cat: 'Contacts & leads', capability: 'Create custom fields and objects', a: 'partial', b: 'yes', c: 'yes', cNote: 'by chat' },

  { cat: 'Messaging', capability: 'Send SMS to contacts', a: 'partial', b: 'yes', c: 'yes' },
  { cat: 'Messaging', capability: 'Send email reliably', a: 'partial', b: 'partial', bNote: 'native send is unreliable', c: 'yes', cNote: 'reroutes automatically' },
  { cat: 'Messaging', capability: 'Summarise conversation history', a: 'partial', aNote: 'read it yourself', b: 'yes', c: 'yes', cNote: 'AI summary' },

  { cat: 'Calendar & pipeline', capability: 'Book and reschedule appointments', a: 'partial', b: 'yes', c: 'yes' },
  { cat: 'Calendar & pipeline', capability: 'Move and update opportunities', a: 'partial', b: 'yes', c: 'yes' },
  { cat: 'Calendar & pipeline', capability: 'Cross-client pipeline view in one place', a: 'no', b: 'partial', bNote: 'build your own report', c: 'yes', cNote: 'native roll-up' },

  { cat: 'Provisioning', capability: 'Create a new sub-account', a: 'partial', aNote: 'manual setup', b: 'yes', bNote: 'API call', c: 'yes', cNote: 'by chat or voice' },
  { cat: 'Provisioning', capability: 'Provision an account AI-ready on day one', a: 'no', b: 'partial', bNote: 'you code the pipeline', c: 'yes', cNote: 'snapshot, layers, agents' },
  { cat: 'Provisioning', capability: 'Apply or push snapshots to clients', a: 'partial', b: 'yes', c: 'yes', cNote: 'push to a whole segment' },

  { cat: 'Workflows', capability: 'Trigger an existing workflow', a: 'partial', b: 'yes', c: 'yes' },
  { cat: 'Workflows', capability: 'Set up a workflow for a client from a template', a: 'partial', aNote: 'rebuild by hand', b: 'partial', bNote: 'clone via snapshot', c: 'yes', cNote: 'chat picks and clones' },
  { cat: 'Workflows', capability: 'Generate a brand-new workflow from a prompt', a: 'no', b: 'no', bNote: 'API is read-only', c: 'partial', cNote: 'runs our side, drives the CRM' },

  { cat: 'Sites & funnels', capability: 'Clone an existing funnel template', a: 'partial', b: 'partial', bNote: 'snapshot clone', c: 'yes', cNote: 'by chat' },
  { cat: 'Sites & funnels', capability: 'Build a real website or landing page by chat', a: 'no', b: 'no', bNote: 'no page-write API', c: 'yes', cNote: 'built and deployed' },
  { cat: 'Sites & funnels', capability: 'Edit funnel page content by automation', a: 'partial', aNote: 'by hand', b: 'no', bNote: 'read-only', c: 'partial', cNote: 'equivalent, our side' },
  { cat: 'Sites & funnels', capability: 'Create forms or surveys programmatically', a: 'partial', b: 'no', bNote: 'read-only', c: 'partial', cNote: 'clone, or our form' },

  { cat: 'Social', capability: 'Schedule social posts', a: 'partial', b: 'yes', bNote: 'planner API', c: 'yes' },
  { cat: 'Social', capability: 'Write and schedule a week of posts by chat', a: 'no', b: 'partial', bNote: 'bring your own AI', c: 'yes' },

  { cat: 'AI agents', capability: 'Deploy a pre-built agent team to a client', a: 'partial', aNote: 'manual per account', b: 'partial', bNote: 'snapshot clone', c: 'yes', cNote: 'by chat, any client' },
  { cat: 'AI agents', capability: 'Generate a brand-new native agent from a prompt', a: 'no', b: 'no', bNote: 'created in the UI only', c: 'partial', cNote: 'our agent instead' },
  { cat: 'AI agents', capability: 'Agents and people on one shared task list', a: 'no', b: 'no', c: 'yes', cNote: '0nTask' },

  { cat: 'Team & commerce', capability: 'Create users and assign work to them', a: 'partial', b: 'yes', c: 'yes', cNote: 'assign by name' },
  { cat: 'Team & commerce', capability: 'Create and send invoices', a: 'partial', b: 'yes', c: 'yes' },
  { cat: 'Team & commerce', capability: 'Reach 100+ services beyond the CRM', a: 'no', b: 'no', c: 'yes', cNote: 'mail, payments, docs, more' },

  { cat: 'The command layer', capability: 'One paragraph, many actions, many clients at once', a: 'no', b: 'no', c: 'yes', cNote: 'patent pending' },
  { cat: 'The command layer', capability: 'Automatic failure recovery and logging', a: 'no', b: 'no', c: 'yes' },
  { cat: 'The command layer', capability: 'Run the whole agency from one screen', a: 'no', b: 'partial', bNote: 'build it yourself', c: 'yes', cNote: 'the tile dashboard' },
]

const CATS = Array.from(new Set(ROWS.map((r) => r.cat)))

function Cell({ v, note, accent }: { v: Mark; note?: string; accent?: boolean }) {
  const box =
    v === 'yes'
      ? 'bg-[#6EE05A]/15 text-[#6EE05A]'
      : v === 'partial'
        ? 'bg-[#d29922]/15 text-[#d29922]'
        : 'bg-[#f85149]/10 text-[#f85149]/70'
  const Icon = v === 'yes' ? Check : v === 'partial' ? Minus : X
  const label = v === 'yes' ? 'Supported' : v === 'partial' ? 'Partly' : 'Not possible'
  return (
    <td className={`px-4 py-3.5 align-top ${accent ? 'bg-[#6EE05A]/[0.04]' : ''}`}>
      <div className="flex flex-col items-center gap-1">
        <span className={`inline-grid h-7 w-7 place-items-center rounded-lg ${box}`} title={label}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">{label}</span>
        </span>
        {note && (
          <span className={`text-center text-[10.5px] leading-tight ${accent ? 'text-[#6EE05A]/80' : 'text-[#6e7681]'}`}>
            {note}
          </span>
        )}
      </div>
    </td>
  )
}

export default function CapabilityMatrix() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('all')
  const [gapsOnly, setGapsOnly] = useState(false)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return ROWS.filter((r) => {
      if (cat !== 'all' && r.cat !== cat) return false
      // "Gaps" means the platform cannot fully do it on its own — that is the
      // whole argument, so it is defined off column B, not off ours.
      if (gapsOnly && r.b === 'yes') return false
      if (needle && !(`${r.capability} ${r.cat}`.toLowerCase().includes(needle))) return false
      return true
    })
  }, [q, cat, gapsOnly])

  const grouped = useMemo(() => {
    const m = new Map<string, Row[]>()
    for (const r of rows) m.set(r.cat, [...(m.get(r.cat) ?? []), r])
    return [...m.entries()]
  }, [rows])

  const gapCount = ROWS.filter((r) => r.b !== 'yes').length

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e7681]" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a capability…"
            aria-label="Search capabilities"
            className="w-full rounded-xl border border-[#30363d] bg-[#0d1117] py-2.5 pl-9 pr-3 text-sm text-[#e6edf3] outline-none transition-colors placeholder:text-[#6e7681] focus:border-[#6EE05A]/60"
          />
        </div>

        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6e7681]" aria-hidden="true" />
          <select
            value={cat}
            onChange={(e) => { setCat(e.target.value); track('capability_expand', { filter: e.target.value }) }}
            aria-label="Filter by category"
            className="rounded-xl border border-[#30363d] bg-[#0d1117] py-2.5 pl-8 pr-3 text-sm text-[#e6edf3] outline-none focus:border-[#6EE05A]/60"
          >
            <option value="all">All categories</option>
            {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <button
          type="button"
          onClick={() => { setGapsOnly((v) => !v); track('capability_expand', { gapsOnly: !gapsOnly }) }}
          aria-pressed={gapsOnly}
          className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
            gapsOnly
              ? 'border-[#6EE05A]/50 bg-[#6EE05A]/10 text-[#6EE05A]'
              : 'border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]'
          }`}
        >
          Only the gaps ({gapCount})
        </button>

        <span className="text-xs text-[#6e7681]">
          {rows.length} of {ROWS.length} shown
        </span>
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto rounded-2xl border border-[#30363d] bg-[#161b22]">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="sr-only">
            Capability comparison across three setups on the same agency plan
          </caption>
          <thead>
            <tr className="border-b border-[#30363d]">
              <th scope="col" className="px-5 py-4">
                <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#6e7681]">Capability</span>
              </th>
              <th scope="col" className="px-4 py-4 text-center">
                <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#6e7681]">Setup A</span>
                <span className="block text-[13px] font-bold text-[#e6edf3]">Plan only</span>
                <span className="block text-[10px] text-[#6e7681]">UI, by hand</span>
              </th>
              <th scope="col" className="px-4 py-4 text-center">
                <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#6e7681]">Setup B</span>
                <span className="block text-[13px] font-bold text-[#e6edf3]">Plan + their API</span>
                <span className="block text-[10px] text-[#6e7681]">you build it</span>
              </th>
              <th scope="col" className="bg-[#6EE05A]/[0.07] px-4 py-4 text-center">
                <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#6EE05A]">Setup C</span>
                <span className="block text-[13px] font-bold text-[#e6edf3]">Plan + 0nCORE</span>
                <span className="block text-[10px] text-[#6e7681]">installed</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(([category, list]) => (
              <Fragment key={category}>
                <tr>
                  <td colSpan={4} className="bg-[#0d1117] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8b949e]">
                    {category}
                  </td>
                </tr>
                {list.map((r) => (
                  <tr key={r.capability} className="border-b border-[#30363d] last:border-0">
                    <th scope="row" className="px-5 py-3.5 text-left align-top font-medium text-[#e6edf3]">
                      {r.capability}
                    </th>
                    <Cell v={r.a} note={r.aNote} />
                    <Cell v={r.b} note={r.bNote} />
                    <Cell v={r.c} note={r.cNote} accent />
                  </tr>
                ))}
              </Fragment>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-[#8b949e]">
                  Nothing matches that. Try a different word.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend + the argument */}
      <div className="flex flex-wrap gap-5 text-xs text-[#8b949e]">
        <span className="inline-flex items-center gap-2">
          <span className="inline-grid h-5 w-5 place-items-center rounded-md bg-[#6EE05A]/15 text-[#6EE05A]"><Check className="h-3 w-3" /></span>
          Fully supported
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-grid h-5 w-5 place-items-center rounded-md bg-[#d29922]/15 text-[#d29922]"><Minus className="h-3 w-3" /></span>
          Partly — manual, one at a time, or template only
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-grid h-5 w-5 place-items-center rounded-md bg-[#f85149]/10 text-[#f85149]/70"><X className="h-3 w-3" /></span>
          Not possible
        </span>
      </div>

      <div className="rounded-2xl border-2 border-[#6EE05A]/40 bg-[#161b22] p-6">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6EE05A]">
          What this actually shows
        </div>
        <p className="mt-2.5 leading-relaxed text-[#e6edf3]">
          Read down the middle column. Every gap there is the{' '}
          <span className="font-semibold">platform&apos;s own ceiling</span> — read-only APIs, no
          cross-client view, no generation, no command layer. 0nCORE doesn&apos;t compete with your
          CRM; it finishes it, and every account and every dollar stays where they are.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-[#8b949e]">
          All three setups assume the same agency plan. A &ldquo;partly&rdquo; in the 0nCORE column
          on a generation row means we deliver the equivalent with our own products rather than
          writing into objects the platform keeps read-only. Verified against current platform
          developer documentation — their API expands over time, which can only move the middle
          column upward.
        </p>
      </div>
    </div>
  )
}
