'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  SearchX,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bell,
  X,
  Bot,
  Sparkles,
  Globe,
  Chrome,
  Compass,
  FileCode,
  ShoppingBag,
  MessageCircle,
  MessagesSquare,
  Hash,
  CheckSquare,
  List,
  Calendar,
  Brain,
  Database,
  Building2,
  Briefcase,
  Package,
  Key,
  Terminal,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react'
import {
  INTEGRATIONS,
  CATEGORY_LABELS,
  type Integration,
  type IntegrationCategory,
  type LucideIconName,
  searchIntegrations,
} from '@/lib/install/registry'
import {
  getWalkthroughForIntegration,
  COMING_SOON_PLACEHOLDER,
} from '@/lib/install/walkthroughs'
import type { Walkthrough, WalkthroughStep } from '@/lib/install/walkthroughs/types'

const ICON_MAP: Record<LucideIconName, typeof Bot> = {
  Bot,
  Sparkles,
  Globe,
  Chrome,
  Compass,
  FileCode,
  ShoppingBag,
  MessageCircle,
  MessagesSquare,
  Hash,
  CheckSquare,
  List,
  Calendar,
  Brain,
  Database,
  Building2,
  Briefcase,
  Package,
  Key,
  Terminal,
}

interface UserInstall {
  integration_id: string
  status: 'not_started' | 'in_progress' | 'installed' | 'needs_setup' | 'error'
  current_step: number
  total_steps: number
}

const FILTERS: Array<{ id: 'all' | IntegrationCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'ai', label: 'AI' },
  { id: 'browser', label: 'Browser' },
  { id: 'cms', label: 'CMS' },
  { id: 'team', label: 'Team' },
  { id: 'pm', label: 'PM' },
  { id: 'crm', label: 'CRM' },
  { id: 'dev', label: 'Dev' },
]

const CATEGORY_BADGE_CLASS: Record<IntegrationCategory, string> = {
  ai: 'bg-[#7ed957]/10 text-[#7ed957]',
  browser: 'bg-[#58a6ff]/10 text-[#58a6ff]',
  cms: 'bg-[#fbbf24]/10 text-[#fbbf24]',
  team: 'bg-[#a78bfa]/10 text-[#a78bfa]',
  pm: 'bg-[#22d3ee]/10 text-[#22d3ee]',
  crm: 'bg-[#f87171]/10 text-[#f87171]',
  dev: 'bg-white/10 text-white/75',
}

export interface InstallHubProps {
  mode: 'public' | 'dashboard'
  initialInstallId?: string
}

export function InstallHub({ mode, initialInstallId }: InstallHubProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | IntegrationCategory>('all')
  const [installs, setInstalls] = useState<UserInstall[]>([])
  const [openId, setOpenId] = useState<string | null>(initialInstallId ?? null)
  const [notifyId, setNotifyId] = useState<string | null>(null)

  // Load per-user state in dashboard mode
  useEffect(() => {
    if (mode !== 'dashboard') return
    fetch('/api/installs/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && Array.isArray(d.installs)) setInstalls(d.installs)
      })
      .catch(() => {})
  }, [mode])

  // Strip ?install= from URL once we open the drawer.
  useEffect(() => {
    if (!initialInstallId || mode !== 'dashboard') return
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (url.searchParams.has('install')) {
      url.searchParams.delete('install')
      router.replace(url.pathname + (url.search ? `?${url.searchParams.toString()}` : ''))
    }
  }, [initialInstallId, mode, router])

  const filtered = useMemo(() => {
    let list = searchIntegrations(query)
    if (filter !== 'all') list = list.filter((i) => i.category === filter)
    if (mode === 'dashboard') {
      const statusOrder: Record<UserInstall['status'], number> = {
        in_progress: 0,
        needs_setup: 1,
        error: 2,
        not_started: 3,
        installed: 4,
      }
      const installMap = new Map(installs.map((i) => [i.integration_id, i]))
      list = [...list].sort((a, b) => {
        if (a.status === 'coming_soon' && b.status !== 'coming_soon') return 1
        if (b.status === 'coming_soon' && a.status !== 'coming_soon') return -1
        const ai = installMap.get(a.id)
        const bi = installMap.get(b.id)
        const ar = statusOrder[ai?.status ?? 'not_started']
        const br = statusOrder[bi?.status ?? 'not_started']
        return ar - br
      })
    }
    return list
  }, [query, filter, mode, installs])

  const inProgress = useMemo(
    () => installs.find((i) => i.status === 'in_progress'),
    [installs],
  )
  const inProgressIntegration = inProgress
    ? INTEGRATIONS.find((i) => i.id === inProgress.integration_id)
    : null

  function onCardClick(integration: Integration) {
    if (integration.status === 'coming_soon') {
      setNotifyId(integration.id)
      return
    }
    if (mode === 'public') {
      router.push(
        `/signup?next=${encodeURIComponent(`/dashboard/installs?install=${integration.id}`)}`,
      )
      return
    }
    setOpenId(integration.id)
    fetch('/api/installs/start', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ integration_id: integration.id }),
    }).catch(() => {})
  }

  return (
    <div className="bg-[#020810] text-white/75 font-sans antialiased min-h-screen">
      {/* Header / search */}
      <div className="sticky top-0 z-30 bg-[#020810]/80 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-black tracking-tight text-white">
            {mode === 'dashboard' ? (
              'Your installs'
            ) : (
              <>
                Install{' '}
                <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                  0n every tool you use
                </span>
              </>
            )}
          </h1>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search integrations…"
              className="bg-white/[0.03] border border-white/10 rounded-lg pl-9 pr-3 py-2 w-full text-sm text-white placeholder:text-white/30 focus:border-[#7ed957] focus:ring-1 focus:ring-[#7ed957]/20 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pb-3 flex items-center gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(filter === f.id ? 'all' : f.id)}
              className={
                filter === f.id
                  ? 'bg-[#7ed957]/10 text-[#7ed957] border border-[#7ed957]/30 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap'
                  : 'bg-white/[0.03] text-white/45 border border-white/10 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap hover:text-white hover:border-white/20'
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Resume banner */}
        {mode === 'dashboard' && inProgress && inProgressIntegration && (
          <div className="bg-[#7ed957]/5 border border-[#7ed957]/30 rounded-xl p-4 flex items-center justify-between backdrop-blur">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-[#7ed957] animate-spin" />
              <div>
                <div className="text-sm font-medium text-white">
                  Continue {inProgressIntegration.name} install
                </div>
                <div className="text-xs text-white/45">
                  Step {inProgress.current_step} of {inProgress.total_steps}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpenId(inProgress.integration_id)}
              className="bg-[#7ed957] text-[#020810] font-bold rounded-xl px-4 py-2 text-sm shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-2"
            >
              Resume
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Grid */}
        {filtered.length === 0 ? (
          <EmptyState
            onClear={() => {
              setQuery('')
              setFilter('all')
            }}
          />
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((i) => (
              <IntegrationCard
                key={i.id}
                integration={i}
                userInstall={installs.find((u) => u.integration_id === i.id)}
                mode={mode}
                onClick={() => onCardClick(i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      {openId && (
        <WalkthroughDrawer
          integrationId={openId}
          onClose={() => setOpenId(null)}
          onCompleted={(allDone) => {
            if (allDone) {
              fetch('/api/installs/me', { credentials: 'include' })
                .then((r) => r.json())
                .then((d) => {
                  if (d?.ok && Array.isArray(d.installs)) setInstalls(d.installs)
                })
                .catch(() => {})
            }
          }}
        />
      )}

      {/* Notify modal */}
      {notifyId && (
        <NotifyModal
          integrationId={notifyId}
          onClose={() => setNotifyId(null)}
        />
      )}
    </div>
  )
}

function IntegrationCard({
  integration,
  userInstall,
  mode,
  onClick,
}: {
  integration: Integration
  userInstall?: UserInstall
  mode: 'public' | 'dashboard'
  onClick: () => void
}) {
  const Icon = ICON_MAP[integration.icon]
  const isComing = integration.status === 'coming_soon'

  // Per-user status (dashboard mode only)
  let userStatus: UserInstall['status'] | null = null
  let primaryLabel = 'Install'
  let PrimaryIcon: typeof ArrowRight = ArrowRight
  if (!isComing && mode === 'dashboard') {
    userStatus = userInstall?.status ?? null
    if (userStatus === 'installed') {
      primaryLabel = 'Manage'
    } else if (userStatus === 'in_progress') {
      primaryLabel = `Continue · ${userInstall?.current_step}/${userInstall?.total_steps}`
    } else if (userStatus === 'needs_setup') {
      primaryLabel = 'Finish setup'
    } else if (userStatus === 'error') {
      primaryLabel = 'View error'
    }
  }
  if (isComing) {
    primaryLabel = 'Notify me'
    PrimaryIcon = Bell
  }

  const dotClass =
    userStatus === 'installed'
      ? 'bg-[#7ed957]'
      : userStatus === 'in_progress' || userStatus === 'needs_setup'
        ? 'bg-[#fbbf24]'
        : userStatus === 'error'
          ? 'bg-[#f87171]'
          : isComing
            ? 'bg-[#fbbf24]'
            : 'bg-[#7ed957]'

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative text-left bg-white/[0.02] border border-white/[0.08] rounded-xl p-5 backdrop-blur hover:border-white/[0.18] hover:bg-white/[0.04] hover:-translate-y-px hover:shadow-lg hover:shadow-black/20 transition-all duration-200 flex flex-col gap-4"
    >
      <span className={`absolute top-3 right-3 w-2 h-2 rounded-full ${dotClass}`} aria-hidden />
      <div className="flex items-center justify-between">
        <Icon className="w-8 h-8 text-[#7ed957]" />
      </div>
      <div className="space-y-1">
        <div
          className={`text-[10px] font-medium uppercase tracking-wider ${CATEGORY_BADGE_CLASS[integration.category]} inline-flex items-center px-2 py-0.5 rounded`}
        >
          {CATEGORY_LABELS[integration.category]}
        </div>
        <div className="text-base font-medium text-white">{integration.name}</div>
      </div>
      <p className="text-sm text-white/75 leading-relaxed line-clamp-2">
        {integration.description}
      </p>
      <div className="mt-auto pt-2 flex items-center gap-2 text-sm font-medium">
        <span
          className={`inline-flex items-center gap-1.5 ${
            isComing
              ? 'text-[#fbbf24]'
              : userStatus === 'installed'
                ? 'text-[#7ed957]'
                : userStatus === 'error'
                  ? 'text-[#f87171]'
                  : 'text-[#7ed957]'
          }`}
        >
          {primaryLabel}
          <PrimaryIcon className="w-4 h-4" />
        </span>
      </div>
    </button>
  )
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-12 text-center space-y-3 backdrop-blur">
      <SearchX className="w-8 h-8 text-white/45 mx-auto" />
      <div className="text-base font-medium text-white">No integrations match</div>
      <button
        type="button"
        onClick={onClear}
        className="text-sm font-medium text-[#7ed957] hover:text-[#7ed957]/80 transition-colors"
      >
        Clear filters
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Walkthrough drawer
// ─────────────────────────────────────────────────────────────────────

function WalkthroughDrawer({
  integrationId,
  onClose,
  onCompleted,
}: {
  integrationId: string
  onClose: () => void
  onCompleted: (allDone: boolean) => void
}) {
  const integration = INTEGRATIONS.find((i) => i.id === integrationId)
  const walkthrough: Walkthrough =
    getWalkthroughForIntegration(integrationId) ?? {
      ...COMING_SOON_PLACEHOLDER,
      integration_id: integrationId,
    }
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [verifying, setVerifying] = useState<string | null>(null)

  if (!integration) return null
  const Icon = ICON_MAP[integration.icon]
  const total = walkthrough.steps.length
  const done = completed.size

  async function markStep(step: WalkthroughStep) {
    if (completed.has(step.id)) return
    const next = new Set(completed)
    next.add(step.id)
    setCompleted(next)
    try {
      const res = await fetch('/api/installs/step_complete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ integration_id: integrationId, step_id: step.id }),
      })
      const data = await res.json()
      if (data?.ok && data.completed) onCompleted(true)
    } catch {
      // best-effort; UI stays in sync optimistically
    }
  }

  async function runVerify(step: WalkthroughStep) {
    if (!step.verify) return
    setVerifying(step.id)
    try {
      if (step.verify.kind === 'api_check' && step.verify.endpoint) {
        const r = await fetch(step.verify.endpoint, { credentials: 'include' })
        if (r.ok) await markStep(step)
      } else {
        await markStep(step)
      }
    } finally {
      setVerifying(null)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] bg-[#020810]/95 backdrop-blur border-l border-white/10 z-50 flex flex-col"
        aria-label={`${integration.name} walkthrough`}
      >
        <header className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Icon className="w-6 h-6 text-[#7ed957]" />
            <div className="text-base font-medium text-white">{integration.name}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close walkthrough"
            className="text-white/45 hover:text-white hover:bg-white/[0.06] rounded-lg p-2 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {walkthrough.estimated_minutes > 0 && (
            <div className="text-xs text-white/45">
              Estimated: {walkthrough.estimated_minutes} min
            </div>
          )}
          {walkthrough.prerequisites && walkthrough.prerequisites.length > 0 && (
            <div className="text-xs text-white/45">
              Prerequisites: {walkthrough.prerequisites.join(', ')}
            </div>
          )}

          {walkthrough.steps.map((step, i) => (
            <StepCard
              key={step.id}
              step={step}
              index={i}
              completed={completed.has(step.id)}
              verifying={verifying === step.id}
              onMark={() => markStep(step)}
              onVerify={() => runVerify(step)}
            />
          ))}
        </div>

        <footer className="border-t border-white/10 p-4">
          <div className="flex items-center justify-between text-xs text-white/45">
            <span>
              {done} of {total}
            </span>
            {done >= total && total > 0 ? (
              <span className="text-[#7ed957] inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Installed
              </span>
            ) : null}
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-[#7ed957] rounded-full transition-all duration-300"
              style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }}
            />
          </div>
        </footer>
      </aside>
    </>
  )
}

function StepCard({
  step,
  index,
  completed,
  verifying,
  onMark,
  onVerify,
}: {
  step: WalkthroughStep
  index: number
  completed: boolean
  verifying: boolean
  onMark: () => void
  onVerify: () => void
}) {
  return (
    <div
      className={
        completed
          ? 'border border-[#7ed957]/40 bg-[#7ed957]/5 rounded-xl p-4 backdrop-blur'
          : 'border border-white/[0.08] bg-white/[0.02] rounded-xl p-4 backdrop-blur'
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            completed
              ? 'flex-shrink-0 w-6 h-6 rounded-full bg-[#7ed957] text-[#020810] inline-flex items-center justify-center text-xs font-semibold'
              : 'flex-shrink-0 w-6 h-6 rounded-full border border-white/10 text-white/45 inline-flex items-center justify-center text-xs font-semibold'
          }
        >
          {completed ? <Check className="w-3 h-3" /> : index + 1}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="text-sm font-medium text-white">{step.title}</div>
          <p className="text-sm text-white/75 leading-relaxed whitespace-pre-line">
            {step.body_md}
          </p>

          {step.copy_blocks && step.copy_blocks.length > 0 && (
            <div className="space-y-2">
              {step.copy_blocks.map((b) => (
                <CopyBlock key={b.label} label={b.label} value={b.value} />
              ))}
            </div>
          )}

          {step.external_link && (
            <a
              href={step.external_link.href}
              target={step.external_link.href.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#58a6ff] hover:underline"
            >
              {step.external_link.label}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <div className="flex items-center gap-2 pt-1">
            {step.verify ? (
              <button
                type="button"
                onClick={onVerify}
                disabled={completed || verifying}
                className="bg-[#7ed957] text-[#020810] font-bold rounded-lg px-3 py-1.5 text-sm shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {completed ? 'Verified' : 'Verify'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onMark}
                disabled={completed}
                className="bg-white/[0.03] text-white/75 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-medium backdrop-blur hover:border-[#7ed957]/40 hover:text-[#7ed957] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {completed ? 'Done' : 'Mark complete'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3 backdrop-blur">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-white/45">{label}</span>
        <button
          type="button"
          aria-label={`Copy ${label}`}
          onClick={() => {
            navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
          className="text-white/45 hover:text-white inline-flex items-center gap-1 text-xs"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#7ed957]" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="font-mono text-xs text-white whitespace-pre-wrap break-all">
        {value}
      </pre>
    </div>
  )
}

function NotifyModal({
  integrationId,
  onClose,
}: {
  integrationId: string
  onClose: () => void
}) {
  const integration = INTEGRATIONS.find((i) => i.id === integrationId)
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/installs/notify_signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, integration_id: integrationId }),
      })
      const data = await res.json()
      if (data?.ok) setSubmitted(true)
      else setError(data?.error?.code ?? 'failed')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (!integration) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 max-w-sm w-full space-y-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-white">
              Notify me when {integration.name} ships
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-white/45 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {submitted ? (
            <div className="text-sm text-[#7ed957] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              You&apos;re on the list for {integration.name}.
            </div>
          ) : (
            <>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#7ed957] focus:ring-1 focus:ring-[#7ed957]/20 focus:outline-none w-full"
              />
              {error && (
                <div className="text-xs text-[#f87171] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {error}
                </div>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={loading || !email.includes('@')}
                className="bg-[#7ed957] text-[#020810] font-bold rounded-xl px-4 py-2 text-sm shadow-[0_0_32px_rgba(126,217,87,0.4)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed w-full inline-flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Notify me
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
