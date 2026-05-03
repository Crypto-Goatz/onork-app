'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  LayoutDashboard,
  Zap,
  Package,
  Bot,
  ChevronDown,
  Check,
  CircleAlert,
  Loader2,
  Search,
  Plus,
  Send,
  Download,
  Tag as TagIcon,
  Users,
  Workflow,
} from 'lucide-react'
import { ADMIN_LOCATIONS, DEFAULT_ADMIN_LOCATION_ID, type AdminLocation } from '@/lib/admin-locations'

// ── Types ────────────────────────────────────────────────────────

type TabId = 'dashboard' | 'actions' | 'campaigns' | 'jaxx'

interface CrmResponse<T = unknown> {
  ok: boolean
  status?: number
  data?: T
  error?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  actions?: ActionResult[]
}

interface ActionResult {
  type: string
  ok: boolean
  summary: string
  detail?: unknown
}

// ── CRM client (calls /api/admin/crm) ────────────────────────────

async function crm<T = unknown>(
  action: string,
  locationId: string,
  params: Record<string, unknown> = {},
): Promise<CrmResponse<T>> {
  const res = await fetch('/api/admin/crm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, locationId, params }),
  })
  try {
    return (await res.json()) as CrmResponse<T>
  } catch {
    return { ok: false, error: `bad_response_${res.status}` }
  }
}

// ── Page ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState<TabId>('dashboard')
  const [location, setLocation] = useState<AdminLocation>(
    ADMIN_LOCATIONS.find((l) => l.id === DEFAULT_ADMIN_LOCATION_ID) ?? ADMIN_LOCATIONS[0],
  )
  const [locOpen, setLocOpen] = useState(false)

  // Persist location across reloads
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('admin_location_id') : null
    if (stored) {
      const found = ADMIN_LOCATIONS.find((l) => l.id === stored)
      if (found) setLocation(found)
    }
  }, [])

  const switchLocation = (loc: AdminLocation) => {
    setLocation(loc)
    setLocOpen(false)
    if (typeof window !== 'undefined') localStorage.setItem('admin_location_id', loc.id)
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0d1117] text-[#c9d1d9]">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#30363d] bg-[#0d1117]/90 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#6EE05A]/10 text-[#6EE05A]">
            <Bot className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-[#e6edf3]">RocketOpp</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setLocOpen((v) => !v)}
            className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-sm font-medium text-[#e6edf3] hover:border-[#484f58] hover:bg-[#1c2128] transition-colors"
            aria-label="Switch location"
          >
            <span className="max-w-[140px] truncate">{location.name}</span>
            <ChevronDown className="h-4 w-4 text-[#8b949e]" />
          </button>
          {locOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setLocOpen(false)}
                aria-hidden
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-[#30363d] bg-[#1c2128] shadow-lg shadow-black/40">
                {ADMIN_LOCATIONS.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => switchLocation(loc)}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-[#c9d1d9] hover:bg-[#21262d]"
                  >
                    <span>{loc.name}</span>
                    {loc.id === location.id && <Check className="h-4 w-4 text-[#6EE05A]" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main scroll area */}
      <main className="flex-1 overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom))]">
        {tab === 'dashboard' && <DashboardTab location={location} onJump={setTab} />}
        {tab === 'actions' && <ActionsTab location={location} />}
        {tab === 'campaigns' && <CampaignsTab location={location} />}
        {tab === 'jaxx' && <JaxxTab location={location} />}
      </main>

      {/* Bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-[#30363d] bg-[#0d1117]/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <TabButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={LayoutDashboard} label="Dash" />
        <TabButton active={tab === 'actions'} onClick={() => setTab('actions')} icon={Zap} label="Act" />
        <TabButton active={tab === 'campaigns'} onClick={() => setTab('campaigns')} icon={Package} label="Camp" />
        <TabButton active={tab === 'jaxx'} onClick={() => setTab('jaxx')} icon={Bot} label="AI" />
      </nav>
    </div>
  )
}

// ── Bottom tab button ────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: typeof LayoutDashboard
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors"
      aria-label={label}
    >
      {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[#6EE05A]" />}
      <Icon className={`h-5 w-5 ${active ? 'text-[#6EE05A]' : 'text-[#8b949e]'}`} />
      <span className={active ? 'text-[#6EE05A]' : 'text-[#8b949e]'}>{label}</span>
    </button>
  )
}

// ── Tab 1: Dashboard ─────────────────────────────────────────────

function DashboardTab({ location, onJump }: { location: AdminLocation; onJump: (t: TabId) => void }) {
  const [pingState, setPingState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [pingMsg, setPingMsg] = useState<string>('')
  const [stats, setStats] = useState<{ tags?: number; workflows?: number; fields?: number }>({})
  const [statsLoading, setStatsLoading] = useState(false)

  const runPing = useCallback(async () => {
    setPingState('loading')
    const r = await crm('ping', location.id)
    if (r.ok) {
      setPingState('ok')
      const loc = (r.data as { location?: { name?: string } } | null)?.location
      setPingMsg(loc?.name ? `Connected: ${loc.name}` : 'Connected')
    } else {
      setPingState('error')
      setPingMsg(r.error || `HTTP ${r.status ?? '?'}`)
    }
  }, [location.id])

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    const [tagsRes, wfRes, cfRes] = await Promise.all([
      crm<{ tags?: unknown[] }>('getTags', location.id),
      crm<{ workflows?: unknown[] }>('getWorkflows', location.id),
      crm<{ customFields?: unknown[] }>('getCustomFields', location.id),
    ])
    setStats({
      tags: tagsRes.ok ? (tagsRes.data?.tags?.length ?? 0) : undefined,
      workflows: wfRes.ok ? (wfRes.data?.workflows?.length ?? 0) : undefined,
      fields: cfRes.ok ? (cfRes.data?.customFields?.length ?? 0) : undefined,
    })
    setStatsLoading(false)
  }, [location.id])

  useEffect(() => {
    runPing()
    loadStats()
  }, [runPing, loadStats])

  return (
    <div className="space-y-4 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-[#e6edf3]">Dashboard</h1>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                pingState === 'ok' ? 'bg-[#6EE05A]' :
                pingState === 'error' ? 'bg-[#f87171]' :
                pingState === 'loading' ? 'bg-[#fbbf24] animate-pulse' :
                'bg-[#8b949e]'
              }`}
            />
            <div>
              <div className="text-sm font-medium text-[#e6edf3]">CRM connection</div>
              <div className="text-xs text-[#8b949e]">{pingMsg || 'Checking…'}</div>
            </div>
          </div>
          <button
            onClick={runPing}
            className="rounded-lg border border-[#30363d] bg-[#21262d] px-3 py-1.5 text-xs font-medium text-[#c9d1d9] hover:bg-[#30363d]"
          >
            Retest
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Users} label="Contacts" value="—" hint="search to load" />
        <StatCard icon={TagIcon} label="Tags" value={statsLoading ? '…' : stats.tags?.toString() ?? '—'} />
        <StatCard icon={Workflow} label="Workflows" value={statsLoading ? '…' : stats.workflows?.toString() ?? '—'} />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#e6edf3]">Quick actions</h2>
        <button
          onClick={() => onJump('actions')}
          className="flex w-full items-center justify-between rounded-xl border border-[#30363d] bg-[#161b22] p-4 text-left hover:border-[#484f58] hover:bg-[#1c2128]"
        >
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-[#6EE05A]" />
            <div>
              <div className="text-sm font-medium text-[#e6edf3]">Search contacts</div>
              <div className="text-xs text-[#8b949e]">Find by name, email or phone</div>
            </div>
          </div>
        </button>
        <button
          onClick={() => onJump('actions')}
          className="flex w-full items-center justify-between rounded-xl border border-[#30363d] bg-[#161b22] p-4 text-left hover:border-[#484f58] hover:bg-[#1c2128]"
        >
          <div className="flex items-center gap-3">
            <TagIcon className="h-5 w-5 text-[#6EE05A]" />
            <div>
              <div className="text-sm font-medium text-[#e6edf3]">Create tags</div>
              <div className="text-xs text-[#8b949e]">Bulk-create campaign tags</div>
            </div>
          </div>
        </button>
        <button
          onClick={() => onJump('campaigns')}
          className="flex w-full items-center justify-between rounded-xl border border-[#30363d] bg-[#161b22] p-4 text-left hover:border-[#484f58] hover:bg-[#1c2128]"
        >
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-[#6EE05A]" />
            <div>
              <div className="text-sm font-medium text-[#e6edf3]">Deploy campaign</div>
              <div className="text-xs text-[#8b949e]">Mother&apos;s Day template ready</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-3">
      <Icon className="mb-2 h-4 w-4 text-[#8b949e]" />
      <div className="text-lg font-semibold text-[#e6edf3]">{value}</div>
      <div className="text-[11px] text-[#8b949e]">{label}</div>
      {hint && <div className="mt-1 text-[10px] text-[#484f58]">{hint}</div>}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">{children}</div>
  )
}

// ── Tab 2: Actions ───────────────────────────────────────────────

interface Tag { id?: string; name: string }
interface Contact {
  id?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  contactName?: string
}
interface CustomField { id?: string; name?: string; fieldKey?: string; dataType?: string }

function ActionsTab({ location }: { location: AdminLocation }) {
  // Contact search
  const [query, setQuery] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searching, setSearching] = useState(false)

  // Tags
  const [tags, setTags] = useState<Tag[]>([])
  const [newTag, setNewTag] = useState('')
  const [tagBusy, setTagBusy] = useState(false)
  const [tagError, setTagError] = useState<string | null>(null)

  // Custom fields
  const [fields, setFields] = useState<CustomField[]>([])

  const loadAll = useCallback(async () => {
    const [tagsRes, fieldsRes] = await Promise.all([
      crm<{ tags?: Tag[] }>('getTags', location.id),
      crm<{ customFields?: CustomField[] }>('getCustomFields', location.id),
    ])
    setTags(tagsRes.data?.tags ?? [])
    setFields(fieldsRes.data?.customFields ?? [])
  }, [location.id])

  useEffect(() => { loadAll() }, [loadAll])

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    const res = await crm<{ contacts?: Contact[] }>('searchContacts', location.id, { query: query.trim(), limit: 25 })
    setContacts(res.data?.contacts ?? [])
    setSearching(false)
  }

  const createTag = async () => {
    const name = newTag.trim()
    if (!name) return
    setTagBusy(true)
    setTagError(null)
    const res = await crm('createTag', location.id, { name })
    if (res.ok) {
      setNewTag('')
      loadAll()
    } else {
      setTagError(res.error || `HTTP ${res.status ?? '?'}`)
    }
    setTagBusy(false)
  }

  return (
    <div className="space-y-6 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-[#e6edf3]">Actions</h1>

      {/* Contact search */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[#e6edf3]">Contact search</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b949e]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') search() }}
              placeholder="Name, email, phone…"
              className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] py-2.5 pl-9 pr-3 text-sm text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#6EE05A] focus:outline-none focus:ring-1 focus:ring-[#6EE05A]/20"
            />
          </div>
          <button
            onClick={search}
            disabled={searching}
            className="min-h-[44px] rounded-lg bg-[#6EE05A] px-4 text-sm font-medium text-[#0d1117] hover:bg-[#5bc74a] disabled:opacity-50"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </button>
        </div>
        {contacts.length > 0 && (
          <div className="space-y-2">
            {contacts.map((c, i) => (
              <div key={c.id ?? i} className="rounded-xl border border-[#30363d] bg-[#161b22] p-3">
                <div className="text-sm font-medium text-[#e6edf3]">
                  {c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ') || '(no name)'}
                </div>
                <div className="text-xs text-[#8b949e]">{c.email || c.phone || '—'}</div>
              </div>
            ))}
          </div>
        )}
        {!searching && query && contacts.length === 0 && (
          <div className="text-xs text-[#8b949e]">No matches.</div>
        )}
      </section>

      {/* Tags */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[#e6edf3]">Tags ({tags.length})</h2>
        <div className="flex gap-2">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') createTag() }}
            placeholder="new-tag-name"
            className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#6EE05A] focus:outline-none focus:ring-1 focus:ring-[#6EE05A]/20"
          />
          <button
            onClick={createTag}
            disabled={tagBusy || !newTag.trim()}
            className="flex min-h-[44px] items-center gap-1 rounded-lg bg-[#6EE05A] px-4 text-sm font-medium text-[#0d1117] hover:bg-[#5bc74a] disabled:opacity-50"
          >
            {tagBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </button>
        </div>
        {tagError && <div className="text-xs text-[#f87171]">{tagError}</div>}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t, i) => (
              <span
                key={t.id ?? i}
                className="inline-flex items-center rounded-full bg-[#6EE05A]/10 px-2.5 py-0.5 text-xs font-medium text-[#6EE05A]"
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Custom fields */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[#e6edf3]">Custom fields ({fields.length})</h2>
        <div className="space-y-2">
          {fields.length === 0 && <div className="text-xs text-[#8b949e]">No custom fields yet.</div>}
          {fields.slice(0, 50).map((f, i) => (
            <div key={f.id ?? i} className="flex items-center justify-between rounded-lg border border-[#30363d] bg-[#161b22] px-3 py-2">
              <div>
                <div className="text-sm text-[#e6edf3]">{f.name || f.fieldKey}</div>
                <div className="text-[11px] text-[#8b949e]">{f.dataType || '—'}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ── Tab 3: Campaigns ─────────────────────────────────────────────

interface DeployStep {
  label: string
  status: 'pending' | 'ok' | 'error'
  detail?: string
}

const MOTHERS_DAY_CAMPAIGN = {
  slug: 'mothers-day-2026',
  name: 'Mother’s Day 2026',
  tags: ['mothers-day-2026', 'mothers-day-vip', 'mothers-day-gift-card'],
  customFields: [
    { name: 'Mothers Day Gift Recipient', dataType: 'TEXT' },
    { name: 'Mothers Day Preferred Service', dataType: 'TEXT' },
  ],
  triggerLinks: [
    { name: 'Mother’s Day Booking', redirectTo: 'https://example.com/booking' },
  ],
  emailTemplates: [
    { title: 'Mother’s Day — Save the date' },
  ],
}

function CampaignsTab({ location }: { location: AdminLocation }) {
  const [steps, setSteps] = useState<DeployStep[]>([])
  const [running, setRunning] = useState(false)

  const deploy = async () => {
    setRunning(true)
    const out: DeployStep[] = []

    const push = (s: DeployStep) => {
      out.push(s)
      setSteps([...out])
    }

    for (const tag of MOTHERS_DAY_CAMPAIGN.tags) {
      const r = await crm('createTag', location.id, { name: tag })
      push({ label: `Tag · ${tag}`, status: r.ok ? 'ok' : 'error', detail: r.ok ? '' : r.error })
    }

    for (const cf of MOTHERS_DAY_CAMPAIGN.customFields) {
      const r = await crm('createCustomField', location.id, cf)
      push({ label: `Custom field · ${cf.name}`, status: r.ok ? 'ok' : 'error', detail: r.ok ? '' : r.error })
    }

    for (const tl of MOTHERS_DAY_CAMPAIGN.triggerLinks) {
      const r = await crm('createTriggerLink', location.id, tl)
      push({ label: `Trigger link · ${tl.name}`, status: r.ok ? 'ok' : 'error', detail: r.ok ? '' : r.error })
    }

    for (const tpl of MOTHERS_DAY_CAMPAIGN.emailTemplates) {
      const r = await crm('createEmailTemplate', location.id, tpl)
      push({ label: `Email · ${tpl.title}`, status: r.ok ? 'ok' : 'error', detail: r.ok ? '' : r.error })
    }

    setRunning(false)
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(MOTHERS_DAY_CAMPAIGN, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${MOTHERS_DAY_CAMPAIGN.slug}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-[#e6edf3]">Campaigns</h1>

      <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-medium text-[#e6edf3]">{MOTHERS_DAY_CAMPAIGN.name}</div>
            <div className="mt-1 text-xs text-[#8b949e]">
              {MOTHERS_DAY_CAMPAIGN.tags.length} tags · {MOTHERS_DAY_CAMPAIGN.customFields.length} fields ·{' '}
              {MOTHERS_DAY_CAMPAIGN.triggerLinks.length} links · {MOTHERS_DAY_CAMPAIGN.emailTemplates.length} emails
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-[#fbbf24]/10 px-2.5 py-0.5 text-[10px] font-medium text-[#fbbf24]">
            template
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={deploy}
            disabled={running}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#6EE05A] px-4 py-2 text-sm font-medium text-[#0d1117] hover:bg-[#5bc74a] disabled:opacity-50"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {running ? 'Deploying…' : `Deploy to ${location.name}`}
          </button>
          <button
            onClick={exportJson}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[#30363d] bg-[#21262d] px-3 py-2 text-sm font-medium text-[#c9d1d9] hover:bg-[#30363d]"
            aria-label="Export campaign JSON"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {steps.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-[#e6edf3]">Deployment log</h2>
          {steps.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-[#30363d] bg-[#161b22] px-3 py-2 text-sm"
            >
              {s.status === 'ok' ? (
                <Check className="h-4 w-4 text-[#6EE05A]" />
              ) : s.status === 'error' ? (
                <CircleAlert className="h-4 w-4 text-[#f87171]" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-[#fbbf24]" />
              )}
              <div className="flex-1">
                <div className="text-[#e6edf3]">{s.label}</div>
                {s.detail && <div className="text-xs text-[#f87171]">{s.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab 4: Jaxx AI chat ──────────────────────────────────────────

function JaxxTab({ location }: { location: AdminLocation }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `I'm Jaxx — wired into ${location.name}. Ask me to find contacts, create tags, deploy a campaign, or anything else CRM-related.`,
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setSending(true)

    const res = await fetch('/api/admin/jaxx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: next.map(({ role, content }) => ({ role, content })),
        locationId: location.id,
        locationName: location.name,
      }),
    })
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string }

    if (!data.ok || !data.message) {
      setMessages([...next, { role: 'assistant', content: `(Jaxx error: ${data.error || 'unknown'})` }])
      setSending(false)
      return
    }

    // Parse + run any action blocks in the response
    const { stripped, actions } = parseActions(data.message)
    const actionResults: ActionResult[] = []
    for (const a of actions) {
      actionResults.push(await runAction(a, location.id))
    }

    setMessages([...next, { role: 'assistant', content: stripped, actions: actionResults }])
    setSending(false)
  }

  return (
    <div className="flex h-[calc(100dvh-56px-56px)] flex-col">
      <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <ChatBubble key={i} message={m} />
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-xs text-[#8b949e]">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6EE05A]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6EE05A] [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6EE05A] [animation-delay:300ms]" />
            </span>
            Jaxx is thinking…
          </div>
        )}
      </div>

      <div
        className="sticky bottom-0 border-t border-[#30363d] bg-[#0d1117]/95 px-3 py-3 backdrop-blur"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={`Ask about ${location.name}…`}
            rows={1}
            className="min-h-[44px] max-h-32 flex-1 resize-none rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#6EE05A] focus:outline-none focus:ring-1 focus:ring-[#6EE05A]/20"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            aria-label="Send"
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#6EE05A] text-[#0d1117] hover:bg-[#5bc74a] disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-[#6EE05A]/20 bg-[#6EE05A]/10 px-3.5 py-2 text-sm text-[#e6edf3] whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-[#1c2128] px-3.5 py-2 text-sm text-[#c9d1d9] whitespace-pre-wrap">
        {message.content}
      </div>
      {message.actions?.map((a, i) => (
        <div
          key={i}
          className={`max-w-[90%] rounded-xl border px-3 py-2 text-xs ${
            a.ok
              ? 'border-[#6EE05A]/20 bg-[#6EE05A]/5 text-[#6EE05A]'
              : 'border-[#f87171]/20 bg-[#f87171]/5 text-[#f87171]'
          }`}
        >
          <div className="flex items-center gap-1.5 font-medium">
            {a.ok ? <Check className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
            {a.type}
          </div>
          <div className="mt-1 text-[#c9d1d9]">{a.summary}</div>
        </div>
      ))}
    </div>
  )
}

// ── Action parser + runner ───────────────────────────────────────

interface JaxxAction {
  type: string
  [k: string]: unknown
}

function parseActions(text: string): { stripped: string; actions: JaxxAction[] } {
  const actions: JaxxAction[] = []
  const stripped = text.replace(/```action\s*([\s\S]*?)```/g, (_match, body: string) => {
    try {
      const parsed = JSON.parse(body.trim())
      if (parsed && typeof parsed === 'object' && typeof parsed.type === 'string') {
        actions.push(parsed as JaxxAction)
      }
    } catch {
      // ignore — show in stripped text? We strip the block silently.
    }
    return ''
  }).trim()
  return { stripped, actions }
}

async function runAction(action: JaxxAction, locationId: string): Promise<ActionResult> {
  switch (action.type) {
    case 'CREATE_TAGS': {
      const names = Array.isArray(action.names) ? (action.names as string[]) : []
      let okCount = 0
      const failures: string[] = []
      for (const name of names) {
        const r = await crm('createTag', locationId, { name })
        if (r.ok) okCount++
        else failures.push(`${name}: ${r.error || r.status}`)
      }
      return {
        type: action.type,
        ok: failures.length === 0,
        summary: failures.length === 0
          ? `Created ${okCount} tag${okCount === 1 ? '' : 's'}.`
          : `Created ${okCount}, failed ${failures.length}: ${failures.join('; ')}`,
      }
    }
    case 'SEARCH_CONTACTS': {
      const r = await crm<{ contacts?: Contact[] }>('searchContacts', locationId, {
        query: String(action.query || ''),
        limit: Number(action.limit ?? 10),
      })
      const list = r.data?.contacts ?? []
      return {
        type: action.type,
        ok: r.ok,
        summary: r.ok
          ? `${list.length} match${list.length === 1 ? '' : 'es'}: ${list.slice(0, 5).map((c) => c.contactName || c.email || c.phone || '?').join(', ')}`
          : (r.error || `HTTP ${r.status}`),
      }
    }
    case 'CREATE_CONTACT': {
      const r = await crm('createContact', locationId, {
        firstName: action.firstName,
        lastName: action.lastName,
        email: action.email,
        phone: action.phone,
      })
      return {
        type: action.type,
        ok: r.ok,
        summary: r.ok ? 'Contact created.' : (r.error || `HTTP ${r.status}`),
      }
    }
    case 'LIST_WORKFLOWS': {
      const r = await crm<{ workflows?: { name?: string }[] }>('getWorkflows', locationId)
      const list = r.data?.workflows ?? []
      return {
        type: action.type,
        ok: r.ok,
        summary: r.ok
          ? `${list.length} workflow${list.length === 1 ? '' : 's'}: ${list.slice(0, 5).map((w) => w.name).join(', ')}`
          : (r.error || `HTTP ${r.status}`),
      }
    }
    case 'CREATE_CUSTOM_FIELD': {
      const r = await crm('createCustomField', locationId, {
        name: action.name,
        dataType: action.dataType || 'TEXT',
      })
      return {
        type: action.type,
        ok: r.ok,
        summary: r.ok ? `Field "${action.name}" created.` : (r.error || `HTTP ${r.status}`),
      }
    }
    case 'GET_LOCATION_INFO': {
      const r = await crm<{ location?: { name?: string; address?: string } }>('getLocation', locationId)
      const loc = r.data?.location
      return {
        type: action.type,
        ok: r.ok,
        summary: r.ok ? `${loc?.name ?? 'Unknown'} — ${loc?.address ?? 'no address'}` : (r.error || `HTTP ${r.status}`),
      }
    }
    default:
      return { type: action.type, ok: false, summary: `Unknown action type: ${action.type}` }
  }
}
