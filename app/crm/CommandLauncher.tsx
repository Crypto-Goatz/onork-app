'use client'

/**
 * The tool launcher — the composable dashboard, per the Agency CRM handoff.
 *
 * COLOUR IS THE CATEGORY, THE ICON IS THE JOB. That pairing is what makes a
 * grid of thirty squares scannable: you find "something to do with content" by
 * colour from across the room, then pick the right one by glyph. Colouring by
 * tool instead would be prettier and useless.
 *
 * THE SERVER STORES AN ORDER, NOT A CATALOGUE. What exists comes from the
 * registry at render time; the layout is only the arrangement. So a tool that is
 * installed, renamed or removed shows up immediately rather than being frozen
 * into somebody's saved grid — which is precisely how SXO shipped working and
 * invisible, reachable only by typing the URL.
 *
 * EDIT MODE IS EXPLICIT. Drag-to-reorder while simply browsing means every
 * mis-grab rearranges the tools someone relies on. The jiggle is not decoration;
 * it is the signal that things can move now.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare, Mail, GitBranch, CalendarDays, ListChecks, Sparkles, Bot,
  FileText, GraduationCap, Users, Building2, KeyRound, BarChart3, ScrollText,
  Radar, Wrench, Plus, Check, X, Pencil,
} from 'lucide-react'
import { authHeaders } from './useSso'

type Category = 'messaging' | 'sales' | 'work' | 'content' | 'clients' | 'reporting'

/** Straight from the handoff. Colour = category, never anything else. */
const CATEGORY: Record<Category, { label: string; color: string }> = {
  messaging: { label: 'Messaging', color: '#0891b2' },
  sales:     { label: 'Sales',     color: '#7c3aed' },
  work:      { label: 'Work',      color: '#16a34a' },
  content:   { label: 'Content',   color: '#d97706' },
  clients:   { label: 'Clients',   color: '#2563eb' },
  reporting: { label: 'Reporting', color: '#db2777' },
}

interface Tool {
  id: string
  label: string
  category: Category
  icon: typeof MessageSquare
  /** A tool either goes somewhere or pre-fills the command box. Never both. */
  href?: string
  prompt?: string
}

const CATALOG: Tool[] = [
  { id: 'sms',        label: 'Send SMS',    category: 'messaging', icon: MessageSquare, prompt: 'Text ' },
  { id: 'email',      label: 'Send email',  category: 'messaging', icon: Mail,          prompt: 'Email ' },
  { id: 'pipeline',   label: 'Pipeline',    category: 'sales',     icon: GitBranch,     href: '/crm/pipeline' },
  { id: 'booking',    label: 'Booking',     category: 'sales',     icon: CalendarDays,  prompt: 'Book a call with ' },
  { id: 'tasks',      label: 'Tasks',       category: 'work',      icon: ListChecks,    prompt: 'Create a task: ' },
  { id: 'automations',label: 'Automations', category: 'work',      icon: Sparkles,      href: '/crm/automations' },
  { id: 'agents',     label: 'AI agents',   category: 'work',      icon: Bot,           href: '/crm/automations' },
  { id: 'blog',       label: 'Blog posts',  category: 'content',   icon: FileText,      prompt: 'Write a blog post about ' },
  { id: 'courses',    label: 'Courses',     category: 'content',   icon: GraduationCap, href: '/crm/courses' },
  { id: 'contacts',   label: 'Contacts',    category: 'clients',   icon: Users,         prompt: 'Find the contact ' },
  { id: 'clients',    label: 'Clients',     category: 'clients',   icon: Building2,     href: '/crm/clients' },
  { id: 'keys',       label: 'Keys',        category: 'clients',   icon: KeyRound,      href: '/crm/setup' },
  { id: 'usage',      label: 'Usage',       category: 'reporting', icon: BarChart3,     href: '/crm/billing' },
  { id: 'history',    label: 'History',     category: 'reporting', icon: ScrollText,    href: '/crm/log' },
  // Registered like any other tool rather than bolted into the nav — the whole
  // point of a registry-driven launcher.
  { id: 'sxo',        label: 'SXO',         category: 'reporting', icon: Radar,         href: '/crm/sxo' },
  { id: 'tools',      label: 'All tools',   category: 'work',      icon: Wrench,        href: '/crm/tools' },
]

const DEFAULT_ORDER = ['sxo', 'clients', 'tasks', 'pipeline', 'sms', 'email', 'courses', 'contacts', 'usage', 'history']

export default function CommandLauncher({ onPrompt }: { onPrompt?: (text: string) => void }) {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER)
  const [editing, setEditing] = useState(false)
  const [trayOpen, setTrayOpen] = useState(false)
  const dragFrom = useRef<number | null>(null)

  useEffect(() => { try { setToken(sessionStorage.getItem('oncore.app.jwt')) } catch { /* private mode */ } }, [])

  useEffect(() => {
    if (!token) return
    fetch('/api/dashboard/layout', { headers: authHeaders(token), cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { if (Array.isArray(j.tiles)) setOrder(j.tiles) })
      .catch(() => { /* an unreachable layout must not block the launcher */ })
  }, [token])

  const save = useCallback((next: string[]) => {
    setOrder(next)
    if (!token) return
    void fetch('/api/dashboard/layout', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({ tiles: next }),
    }).catch(() => { /* saved on the next change */ })
  }, [token])

  // Resolved against the CATALOG every render, so a removed tool simply
  // disappears rather than rendering as a broken square.
  const tiles = useMemo(
    () => order.map((id) => CATALOG.find((t) => t.id === id)).filter((t): t is Tool => Boolean(t)),
    [order],
  )
  const available = useMemo(() => CATALOG.filter((t) => !order.includes(t.id)), [order])

  function open(t: Tool) {
    if (editing) return
    if (t.href) router.push(t.href)
    else if (t.prompt && onPrompt) onPrompt(t.prompt)
  }

  function onDrop(to: number) {
    const from = dragFrom.current
    dragFrom.current = null
    if (from === null || from === to) return
    const next = [...order]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    save(next)
  }

  return (
    <section className="oncore-app">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--oc-muted)]">
          Your tools
        </h2>
        <div className="flex items-center gap-2">
          {editing && (
            <button onClick={() => setTrayOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--oc-border)] px-3 py-1 text-[12px] font-medium text-[color:var(--oc-ink)] hover:bg-[color:var(--oc-hover)]">
              <Plus className="h-3.5 w-3.5" /> Add tool
            </button>
          )}
          <button onClick={() => { setEditing((v) => !v); setTrayOpen(false) }}
            aria-pressed={editing}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold transition ${
              editing ? 'bg-[color:var(--oc-ink)] text-white' : 'text-[color:var(--oc-muted)] hover:bg-[color:var(--oc-hover)]'}`}>
            {editing ? <><Check className="h-3.5 w-3.5" /> Done</> : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        {tiles.map((t, i) => {
          const c = CATEGORY[t.category]
          const Icon = t.icon
          return (
            <div key={t.id} className="relative"
              draggable={editing}
              onDragStart={() => { dragFrom.current = i }}
              onDragOver={(e) => editing && e.preventDefault()}
              onDrop={() => onDrop(i)}>
              <button
                onClick={() => open(t)}
                title={`${t.label} — ${c.label}`}
                className={`oc-tile ${editing ? 'oc-tile-edit' : ''}`}
                style={{ background: c.color }}
              >
                <Icon className="h-7 w-7 text-white" strokeWidth={1.8} />
              </button>
              <p className="mt-1.5 w-16 truncate text-center text-[11px] text-[color:var(--oc-muted)]">{t.label}</p>
              {editing && (
                <button
                  onClick={() => save(order.filter((id) => id !== t.id))}
                  aria-label={`Remove ${t.label}`}
                  className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[color:var(--oc-red)] text-white shadow"
                >
                  <X className="h-3 w-3" strokeWidth={3} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {editing && trayOpen && (
        <div className="mt-5 rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--oc-muted)]">
            Not on your grid
          </p>
          {available.length === 0 && <p className="text-[12.5px] text-[color:var(--oc-muted)]">Everything is already here.</p>}
          <div className="flex flex-wrap gap-3">
            {available.map((t) => {
              const c = CATEGORY[t.category]
              const Icon = t.icon
              return (
                <button key={t.id} onClick={() => save([...order, t.id])}
                  className="flex items-center gap-2 rounded-full border border-[color:var(--oc-border)] py-1 pl-1 pr-3 hover:bg-[color:var(--oc-hover)]">
                  <span className="grid h-7 w-7 place-items-center rounded-full" style={{ background: c.color }}>
                    <Icon className="h-4 w-4 text-white" strokeWidth={2} />
                  </span>
                  <span className="text-[12.5px] font-medium text-[color:var(--oc-ink)]">{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
