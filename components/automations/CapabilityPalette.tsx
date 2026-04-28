'use client'

import { useState, useEffect, type DragEvent } from 'react'
import { Search, Zap, Play, Package, Loader2, ExternalLink, Power } from 'lucide-react'
import { CAPABILITIES } from './capabilities'
import { LUCIDE_ICONS } from './CapabilityNode'

type Tab = 'triggers' | 'actions' | 'apps' | 'switches'

interface InstalledAppCard {
  id: string
  slug: string
  name: string
  description: string
  icon: string | null
  category: string
  installed?: boolean
  installation_id?: string
  active?: boolean
}

interface SwitchCard {
  id: string
  name: string
  description: string | null
  spec: { tool?: { name: string; service: string; method: string }; inputs?: Record<string, unknown> }
  steps: Array<{ tool: string; params: Record<string, unknown> }>
  is_multi: boolean
  tags: string[]
  execution_count: number
  last_run_at: string | null
  schedule: { enabled?: boolean; cron?: string } | null
  status: string
}

interface PaletteProps {
  size?: 'expand' | 'compact'
}

export default function CapabilityPalette({ size = 'expand' }: PaletteProps) {
  const [tab, setTab] = useState<Tab>('triggers')
  const [search, setSearch] = useState('')
  const [apps, setApps] = useState<InstalledAppCard[]>([])
  const [appsLoading, setAppsLoading] = useState(false)
  const [switches, setSwitches] = useState<SwitchCard[]>([])
  const [switchesLoading, setSwitchesLoading] = useState(false)

  const isCompact = size === 'compact'

  // Load switches when tab opens
  useEffect(() => {
    if (tab !== 'switches') return
    setSwitchesLoading(true)
    fetch('/api/switches')
      .then(r => r.json())
      .then(d => {
        setSwitches(d.switches || [])
        setSwitchesLoading(false)
      })
      .catch(() => {
        setSwitches([])
        setSwitchesLoading(false)
      })
  }, [tab])

  useEffect(() => {
    if (tab !== 'apps') return
    setAppsLoading(true)
    Promise.all([
      fetch('/api/marketplace/apps?limit=60').then(r => r.json()).catch(() => ({ apps: [] })),
      fetch('/api/marketplace/my-apps').then(r => r.json()).catch(() => ({ installations: [] })),
    ]).then(([catalog, mine]) => {
      const installedById = new Map<string, { installation_id: string; status: string }>()
      for (const inst of mine.installations || []) {
        installedById.set(inst.app_id, { installation_id: inst.id, status: inst.status })
      }
      const cards: InstalledAppCard[] = (catalog.apps || []).map((a: { id: string; slug: string; name: string; description: string; icon: string | null; category: string }) => {
        const meta = installedById.get(a.id)
        return {
          id: a.id, slug: a.slug, name: a.name, description: a.description,
          icon: a.icon, category: a.category,
          installed: !!meta,
          installation_id: meta?.installation_id,
          active: meta?.status === 'active',
        }
      })
      setApps(cards)
      setAppsLoading(false)
    })
  }, [tab])

  const triggers = CAPABILITIES.filter(c => c.category === 'triggers')
  const actions = CAPABILITIES.filter(c => c.category !== 'triggers')

  const filterText = search.toLowerCase()
  const filtered = (() => {
    if (tab === 'triggers') {
      return search ? triggers.filter(c => c.name.toLowerCase().includes(filterText) || c.description.toLowerCase().includes(filterText)) : triggers
    }
    if (tab === 'actions') {
      return search ? actions.filter(c => c.name.toLowerCase().includes(filterText) || c.description.toLowerCase().includes(filterText)) : actions
    }
    return []
  })()

  const filteredApps = search
    ? apps.filter(a => a.name.toLowerCase().includes(filterText) || a.description.toLowerCase().includes(filterText))
    : apps

  const filteredSwitches = search
    ? switches.filter(s =>
        s.name.toLowerCase().includes(filterText) ||
        (s.description ?? '').toLowerCase().includes(filterText) ||
        (s.spec?.tool?.name ?? '').toLowerCase().includes(filterText)
      )
    : switches

  function onDragStartSwitch(e: DragEvent, sw: SwitchCard) {
    const payload = {
      kind: 'switch',
      switch_id: sw.id,
      name: sw.name,
      description: sw.description ?? '',
      tool: sw.spec?.tool ?? null,
      steps: sw.steps ?? [],
      is_multi: !!sw.is_multi,
      tags: sw.tags ?? [],
    }
    e.dataTransfer.setData('application/0n-switch', JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragStartCapability(e: DragEvent, capabilityId: string) {
    const cap = CAPABILITIES.find(c => c.id === capabilityId)
    if (!cap) return
    e.dataTransfer.setData('application/0n-capability', JSON.stringify(cap))
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragStartApp(e: DragEvent, app: InstalledAppCard) {
    const payload = {
      kind: 'app',
      app_id: app.id,
      slug: app.slug,
      name: app.name,
      description: app.description,
      icon: app.icon,
      category: app.category,
      installation_id: app.installation_id || null,
      installed: app.installed,
    }
    e.dataTransfer.setData('application/0n-app', JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      className="bg-core-surface border-l border-[#1c2b42] flex flex-col h-full shrink-0"
      style={{ width: isCompact ? 220 : 300 }}
    >
      {/* Tabs */}
      <div className="flex border-b border-[#1c2b42]">
        <TabButton tab="triggers" current={tab} onSelect={setTab} icon={Zap} label="Triggers" count={triggers.length} compact={isCompact} />
        <TabButton tab="actions" current={tab} onSelect={setTab} icon={Play} label="Actions" count={actions.length} compact={isCompact} />
        <TabButton tab="switches" current={tab} onSelect={setTab} icon={Power} label="Switches" count={switches.length || undefined} compact={isCompact} />
        <TabButton tab="apps" current={tab} onSelect={setTab} icon={Package} label="Apps" count={apps.length || undefined} compact={isCompact} />
      </div>

      {/* Search */}
      {!isCompact && (
        <div className="px-3 py-2 border-b border-[#1c2b42]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-core-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${tab}...`}
              className="w-full pl-8 pr-2.5 py-1.5 bg-core-card border border-[#1c2b42] rounded-md text-core-text text-[12px] outline-none focus:border-[#14b8a6] transition-colors"
            />
          </div>
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-2">
        {(tab === 'triggers' || tab === 'actions') && (
          <div>
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-[11px] text-core-text-muted">No {tab} match search.</div>
            ) : (
              filtered.map(cap => <CapItem key={cap.id} cap={cap} onDragStart={onDragStartCapability} />)
            )}
          </div>
        )}

        {tab === 'switches' && (
          <div>
            {switchesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-core-text-muted" />
              </div>
            ) : filteredSwitches.length === 0 ? (
              <div className="text-center py-8 px-3">
                <Power className="w-6 h-6 mx-auto mb-2 text-core-text-muted opacity-40" />
                <p className="text-[11px] text-core-text-muted mb-2">No switches yet.</p>
                <a href="/dashboard/tools" className="text-[11px] text-[#7ed957] hover:underline inline-flex items-center gap-1">
                  Run a tool to save one <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              filteredSwitches.map(sw => <SwitchItem key={sw.id} sw={sw} onDragStart={onDragStartSwitch} />)
            )}
          </div>
        )}

        {tab === 'apps' && (
          <div>
            {appsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-core-text-muted" />
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="text-center py-8 px-3">
                <Package className="w-6 h-6 mx-auto mb-2 text-core-text-muted opacity-40" />
                <p className="text-[11px] text-core-text-muted mb-2">No apps yet.</p>
                <a href="/dashboard/marketplace" className="text-[11px] text-[#7ed957] hover:underline inline-flex items-center gap-1">
                  Browse marketplace <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              filteredApps.map(app => <AppItem key={app.id} app={app} onDragStart={onDragStartApp} />)
            )}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-[#1c2b42] text-[10px] text-core-text-muted text-center">
        {tab === 'apps'
          ? 'Drag installed apps onto the canvas'
          : tab === 'switches'
          ? 'Drag saved switches as workflow steps'
          : 'Drag onto canvas'}
      </div>
    </div>
  )
}

interface SwitchItemProps {
  sw: SwitchCard
  onDragStart: (e: DragEvent, sw: SwitchCard) => void
}

function SwitchItem({ sw, onDragStart }: SwitchItemProps) {
  const method = sw.spec?.tool?.method ?? null
  const toolName = sw.spec?.tool?.name ?? null
  const stepCount = sw.is_multi ? (sw.steps?.length ?? 0) : 1

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, sw)}
      className="bg-core-card border border-transparent hover:border-[#7ed957]/40 rounded-lg p-2.5 mb-1 cursor-grab transition-all flex items-start gap-2.5"
    >
      <div className="w-7 h-7 rounded-md bg-[#7ed957]/10 border border-[#7ed957]/30 flex items-center justify-center shrink-0">
        <Power className="w-3.5 h-3.5 text-[#7ed957]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-[12px] font-semibold text-core-text truncate">{sw.name}</span>
          {method && (
            <span className="text-[9px] px-1 py-px rounded bg-cyan-500/15 text-cyan-300 font-mono">{method}</span>
          )}
          {sw.is_multi && (
            <span className="text-[9px] px-1 py-px rounded bg-amber-500/15 text-amber-300">{stepCount} steps</span>
          )}
        </div>
        {toolName && (
          <div className="text-[10px] text-core-text-muted font-mono truncate">{toolName}</div>
        )}
        {sw.description && (
          <div className="text-[10px] text-core-text-muted leading-snug line-clamp-1 mt-0.5">{sw.description}</div>
        )}
      </div>
    </div>
  )
}

interface TabButtonProps {
  tab: Tab
  current: Tab
  onSelect: (t: Tab) => void
  icon: typeof Zap
  label: string
  count?: number
  compact: boolean
}

function TabButton({ tab, current, onSelect, icon: Icon, label, count, compact }: TabButtonProps) {
  const active = tab === current
  return (
    <button
      onClick={() => onSelect(tab)}
      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-[11px] font-semibold border-none cursor-pointer transition-all ${
        active
          ? 'bg-[#7ed957]/10 text-[#7ed957] border-b-2 border-[#7ed957]'
          : 'bg-transparent text-core-text-muted hover:text-core-text border-b-2 border-transparent'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {!compact && <span>{label}</span>}
      {!compact && count !== undefined && <span className="text-[10px] opacity-60">{count}</span>}
    </button>
  )
}

interface CapItemProps {
  cap: typeof CAPABILITIES[number]
  onDragStart: (e: DragEvent, id: string) => void
}

function CapItem({ cap, onDragStart }: CapItemProps) {
  const Icon = LUCIDE_ICONS[cap.icon]
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, cap.id)}
      className="bg-core-card border border-transparent hover:border-[#1c2b42] rounded-lg p-2.5 mb-1 cursor-grab transition-all flex items-start gap-2.5"
    >
      {Icon ? (
        <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: cap.color }} />
      ) : (
        <span className="text-base shrink-0">{cap.icon}</span>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-core-text mb-0.5 truncate">{cap.name}</div>
        <div className="text-[10px] text-core-text-muted leading-snug line-clamp-2">{cap.description}</div>
      </div>
    </div>
  )
}

interface AppItemProps {
  app: InstalledAppCard
  onDragStart: (e: DragEvent, app: InstalledAppCard) => void
}

function AppItem({ app, onDragStart }: AppItemProps) {
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, app)}
      className="bg-core-card border border-transparent hover:border-[#7ed957]/40 rounded-lg p-2.5 mb-1 cursor-grab transition-all flex items-start gap-2.5"
    >
      <div className="w-7 h-7 rounded-md bg-[#7ed957]/10 border border-[#7ed957]/30 flex items-center justify-center text-[12px] font-bold text-[#7ed957] shrink-0">
        {app.icon || app.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[12px] font-semibold text-core-text truncate">{app.name}</span>
          {app.installed ? (
            app.active
              ? <span className="text-[9px] px-1 py-px rounded bg-[#7ed957]/20 text-[#7ed957]">installed</span>
              : <span className="text-[9px] px-1 py-px rounded bg-yellow-500/20 text-yellow-400">paused</span>
          ) : (
            <span className="text-[9px] px-1 py-px rounded bg-white/[0.06] text-core-text-muted">install first</span>
          )}
        </div>
        <div className="text-[10px] text-core-text-muted leading-snug line-clamp-2">{app.description}</div>
      </div>
    </div>
  )
}
