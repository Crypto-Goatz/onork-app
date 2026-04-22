'use client'

import { useState } from 'react'
import {
  ChevronRight,
  CheckCircle2,
  Circle,
  XCircle,
  Zap,
  ExternalLink,
  CheckCheck,
} from 'lucide-react'

type TaskStatus = 'done' | 'active' | 'todo' | 'blocked'
type TaskType = 'backend' | 'frontend' | 'zero-code'

interface Task {
  id: string
  section: string
  title: string
  sub: string
  status: TaskStatus
  assigned: 'mike' | 'claude' | 'both'
  type: TaskType
  url: string
  urlLabel: string
  proof: string[]
}

const TASKS: Task[] = [
  // DATABASE — DONE
  {
    id: 'db-tables',
    section: 'DATABASE',
    title: 'Create 8 blueprint tables + trigger + seeds',
    sub: 'user_tiers, user_unlocks, feature_catalog, user_kb_registry, kb_content_queue, run_packs, run_balances, product_subscriptions',
    status: 'done',
    assigned: 'claude',
    type: 'backend',
    url: 'https://supabase.com/dashboard/project/pwujhhmlrtxjmjzyttwn/editor',
    urlLabel: 'Supabase editor',
    proof: ['8 tables created', '18 features seeded', '4 run_packs with Stripe price IDs', '2 triggers (INSERT + UPDATE)', 'All existing users seeded at tier 0']
  },
  {
    id: 'stripe-prices',
    section: 'DATABASE',
    title: 'Create Stripe prices — Tier 4, Tier 5, 4 credit packs',
    sub: 'Vault $299/mo, Penthouse $499/mo, Starter 50/$5, Builder 250/$20, Pro 750/$50, Unlimited 2000/$100',
    status: 'done',
    assigned: 'claude',
    type: 'backend',
    url: 'https://dashboard.stripe.com/products',
    urlLabel: 'Stripe products',
    proof: ['price_1TKV9bHThmAuKVQMgmX9MV1n (Vault)', 'price_1TKV9cHThmAuKVQMcEqMY3hY (Penthouse)', '4 credit pack prices created', '6 STRIPE_PRICE_* env vars set on Vercel']
  },

  // PART 1 — BILLING
  {
    id: 'stripe-webhook',
    section: 'PART 1 — BILLING',
    title: 'Register Stripe webhook → Supabase Edge Function',
    sub: 'stripe.com → Developers → Webhooks → Add endpoint → paste Edge Function URL',
    status: 'active',
    assigned: 'mike',
    type: 'zero-code',
    url: 'https://dashboard.stripe.com/webhooks',
    urlLabel: 'Stripe webhooks',
    proof: ['Webhook pointing to pwujhhmlrtxjmjzyttwn.supabase.co/functions/v1/stripe-webhook', 'Signing secret saved to Supabase Edge Function secrets']
  },
  {
    id: 'stripe-setup-fn',
    section: 'PART 1 — BILLING',
    title: 'Run stripe-setup Edge Function → verify run_packs stripe_price_ids',
    sub: 'POST to stripe-setup function — already done via CLI, verify IDs match',
    status: 'done',
    assigned: 'claude',
    type: 'backend',
    url: 'https://pwujhhmlrtxjmjzyttwn.supabase.co/functions/v1/stripe-setup',
    urlLabel: 'stripe-setup function',
    proof: ['All 4 run_packs have non-null stripe_price_id', 'SELECT id, stripe_price_id FROM run_packs — all populated']
  },
  {
    id: 'checkout-endpoint',
    section: 'PART 1 — BILLING',
    title: 'Build /api/billing/checkout route',
    sub: 'POST with { tier_level } or { pack_id } → creates Stripe Checkout session → returns URL',
    status: 'todo',
    assigned: 'claude',
    type: 'backend',
    url: '',
    urlLabel: '',
    proof: ['POST /api/billing/checkout with { tier_level: 1 } returns valid Stripe Checkout URL', 'URL loads in browser without error']
  },
  {
    id: 'webhook-handler',
    section: 'PART 1 — BILLING',
    title: 'Verify or build /api/webhooks/stripe route',
    sub: 'Handles checkout.session.completed, subscription events, invoice events',
    status: 'todo',
    assigned: 'claude',
    type: 'backend',
    url: '',
    urlLabel: '',
    proof: ['Stripe test event → product_subscriptions row upserted', 'DB trigger fires → user_tiers.tier_level updated automatically']
  },
  {
    id: 'upgrade-button',
    section: 'PART 1 — BILLING',
    title: 'UpgradeButton component on dashboard locked room cards',
    sub: 'Click → POST /api/billing/checkout → redirect to Stripe Checkout with correct USD price',
    status: 'todo',
    assigned: 'claude',
    type: 'frontend',
    url: '',
    urlLabel: '',
    proof: ['Click "Unlock Front Office — $29.00/mo" → Stripe Checkout loads with $29.00', 'Successful payment → user_tiers.tier_level = 1']
  },

  // PART 2 — WEEK 1 CORE
  {
    id: 'env-vars',
    section: 'PART 2 — WEEK 1 CORE',
    title: 'Point onork-app at shared database (pwujhhmlrtxjmjzyttwn)',
    sub: 'Update NEXT_PUBLIC_SUPABASE_URL + keys on Vercel — redeploy',
    status: 'todo',
    assigned: 'claude',
    type: 'backend',
    url: 'https://vercel.com/dashboard',
    urlLabel: 'Vercel dashboard',
    proof: ['vercel env ls shows all required vars', 'Deploy succeeds without env var errors']
  },
  {
    id: 'signup-provision',
    section: 'PART 2 — WEEK 1 CORE',
    title: 'Fix signup → CRM sub-location auto-provision',
    sub: 'auth/callback: if crm_location_id null → create CRM location → seed user_tiers at 0 → seed K1',
    status: 'todo',
    assigned: 'claude',
    type: 'backend',
    url: '',
    urlLabel: '',
    proof: ['New signup → profiles.crm_location_id populated', 'Sub-location visible in CRM dashboard', 'user_tiers row exists with tier_level = 0']
  },
  {
    id: 'welcome-page',
    section: 'PART 2 — WEEK 1 CORE',
    title: 'Build /dashboard/welcome onboarding page',
    sub: '3 fields: business_name, what_we_do, brand_tone → updates profiles + K1 → redirect /dashboard',
    status: 'todo',
    assigned: 'claude',
    type: 'frontend',
    url: '',
    urlLabel: '',
    proof: ['Form submits → profiles.business_name updated', 'kb_content_queue K1 row created', 'Redirect to /dashboard after submit']
  },
  {
    id: 'contacts-api',
    section: 'PART 2 — WEEK 1 CORE',
    title: 'Contacts API — GET + POST (tag) wired to CRM via OAuth token',
    sub: 'GET /api/console/contacts?locationId=X → CRM contacts. POST → add tag.',
    status: 'todo',
    assigned: 'claude',
    type: 'backend',
    url: '',
    urlLabel: '',
    proof: ['Contacts display with name, email, phone, tags', 'Add tag → appears in CRM within 5 seconds']
  },
  {
    id: 'contacts-page',
    section: 'PART 2 — WEEK 1 CORE',
    title: 'Contacts page — light mode, search, tag management',
    sub: 'Search bar, contact list, click → side panel, add tag. Light theme.',
    status: 'todo',
    assigned: 'claude',
    type: 'frontend',
    url: '',
    urlLabel: '',
    proof: ['Contacts load from CRM for active sub-location', 'crm_location_id null → shows "Setting up..." spinner']
  },
  {
    id: 'dashboard-rooms',
    section: 'PART 2 — WEEK 1 CORE',
    title: 'Dashboard locked/unlocked rooms from DB',
    sub: 'feature_catalog + user_tiers → unlocked = green + Open, locked = grey + USD price',
    status: 'todo',
    assigned: 'claude',
    type: 'frontend',
    url: '',
    urlLabel: '',
    proof: ['Lobby user sees rooms locked with upgrade prices in USD', 'Tier 1 user sees Front Office unlocked']
  },
  {
    id: 'ai-chat-klayer',
    section: 'PART 2 — WEEK 1 CORE',
    title: 'AI chat injects K-Layer context into Anthropic API call',
    sub: 'K1 business_name + brand_tone → system prompt. Claude API responds in context.',
    status: 'todo',
    assigned: 'claude',
    type: 'backend',
    url: '',
    urlLabel: '',
    proof: ['AI chat responds using business name from K1', 'Never says GHL — always CRM']
  },
]

const STATUS_CONFIG: Record<TaskStatus, { dotClass: string; badgeClass: string; label: string }> = {
  done:    { dotClass: 'bg-core-green',   badgeClass: 'bg-core-green/15 text-core-green',   label: 'DONE' },
  active:  { dotClass: 'bg-core-amber',   badgeClass: 'bg-core-amber/15 text-core-amber',   label: 'ACTIVE' },
  todo:    { dotClass: 'bg-core-border',  badgeClass: 'bg-core-surface text-core-text-muted', label: 'TODO' },
  blocked: { dotClass: 'bg-core-red',     badgeClass: 'bg-core-red/15 text-core-red',       label: 'BLOCKED' },
}

const TYPE_CONFIG: Record<TaskType, { badgeClass: string }> = {
  backend:    { badgeClass: 'bg-core-cyan/15 text-core-cyan' },
  frontend:   { badgeClass: 'bg-core-purple/15 text-core-purple' },
  'zero-code': { badgeClass: 'bg-core-amber/15 text-core-amber' },
}

const STATUS_BUTTONS: { status: TaskStatus; icon: React.ReactNode; label: string }[] = [
  { status: 'done',    icon: <CheckCheck className="w-3 h-3" />,  label: 'Done' },
  { status: 'active',  icon: <Zap className="w-3 h-3" />,         label: 'Active' },
  { status: 'blocked', icon: <XCircle className="w-3 h-3" />,     label: 'Blocked' },
  { status: 'todo',    icon: <Circle className="w-3 h-3" />,      label: 'Todo' },
]

export default function CommandCenterPage() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [taskStates, setTaskStates] = useState<Record<string, TaskStatus>>({})

  const getStatus = (task: Task): TaskStatus => taskStates[task.id] || task.status

  const sections = Array.from(new Set(TASKS.map(t => t.section)))
  const totalTasks = TASKS.length
  const doneTasks = TASKS.filter(t => getStatus(t) === 'done').length
  const activeTasks = TASKS.filter(t => getStatus(t) === 'active').length
  const blockedTasks = TASKS.filter(t => getStatus(t) === 'blocked').length
  const progressPct = Math.round((doneTasks / totalTasks) * 100)

  function setStatus(taskId: string, status: TaskStatus) {
    setTaskStates(prev => ({ ...prev, [taskId]: status }))
  }

  return (
    <div className="px-6 py-6 max-w-[960px] mx-auto">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-core-text m-0">Command Center</h1>
          <span className="text-xs text-core-text-muted">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-core-border overflow-hidden mb-4">
          <div
            className="h-full bg-core-green rounded-full transition-[width] duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'DONE',    value: doneTasks,    className: 'bg-core-green/10 text-core-green' },
            { label: 'ACTIVE',  value: activeTasks,  className: 'bg-core-amber/10 text-core-amber' },
            { label: 'BLOCKED', value: blockedTasks, className: 'bg-core-red/10 text-core-red' },
            { label: 'TOTAL',   value: totalTasks,   className: 'bg-core-surface text-core-text' },
          ].map(s => (
            <div key={s.label} className={`${s.className} rounded-lg px-4 py-3 text-center`}>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-[10px] font-semibold tracking-wide opacity-70 uppercase">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Active task banner */}
      {TASKS.filter(t => getStatus(t) === 'active').map(t => (
        <div
          key={t.id}
          className="bg-core-amber/10 border border-core-amber/30 border-l-4 border-l-core-amber rounded-lg px-4 py-3 mb-5 flex items-center gap-3"
        >
          <Zap className="w-5 h-5 text-core-amber shrink-0" />
          <div>
            <div className="text-xs font-semibold text-core-amber uppercase tracking-wide">Current Priority</div>
            <div className="text-sm text-core-text">{t.title}</div>
            <div className="text-[11px] text-core-text-muted mt-0.5">Assigned: {t.assigned} · {t.type}</div>
          </div>
        </div>
      ))}

      {/* Task sections */}
      {sections.map(section => {
        const sectionTasks = TASKS.filter(t => t.section === section)
        const sectionDone = sectionTasks.filter(t => getStatus(t) === 'done').length

        return (
          <div key={section} className="mb-6">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-core-border">
              <h2 className="text-[11px] font-bold tracking-widest text-core-text-muted uppercase m-0">{section}</h2>
              <span className="text-[11px] text-core-text-muted">{sectionDone}/{sectionTasks.length}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {sectionTasks.map(task => {
                const status = getStatus(task)
                const sc = STATUS_CONFIG[status]
                const tc = TYPE_CONFIG[task.type]
                const isExpanded = expanded === task.id
                const isDone = status === 'done'

                return (
                  <div key={task.id} className="bg-core-card border border-core-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : task.id)}
                      className="w-full px-4 py-3 bg-transparent border-none cursor-pointer text-left font-[inherit] flex items-start gap-3 hover:bg-core-card-hover transition-colors"
                    >
                      {/* Status dot */}
                      <span className={`w-2 h-2 rounded-full ${sc.dotClass} mt-[5px] shrink-0`} />

                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold text-core-text ${isDone ? 'line-through opacity-50' : ''}`}>
                          {task.title}
                        </div>
                        <div className="text-[11px] text-core-text-muted mt-0.5">{task.sub}</div>

                        {/* Badges */}
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-wide uppercase ${sc.badgeClass}`}>
                            {sc.label}
                          </span>
                          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded ${tc.badgeClass}`}>
                            {task.type}
                          </span>
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-core-surface text-core-text-muted">
                            {task.assigned}
                          </span>
                        </div>
                      </div>

                      {/* Expand arrow */}
                      <ChevronRight
                        className={`w-4 h-4 text-core-text-muted shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-core-border/50">
                        {/* Proof required */}
                        <div className="mt-3">
                          <div className="text-[10px] font-bold tracking-widest text-core-red mb-1.5 uppercase">
                            Proof Required
                          </div>
                          {task.proof.map((p, i) => (
                            <div key={i} className="flex items-start gap-2 mb-1">
                              {isDone
                                ? <CheckCircle2 className="w-3 h-3 text-core-green mt-0.5 shrink-0" />
                                : <Circle className="w-3 h-3 text-core-border mt-0.5 shrink-0" />
                              }
                              <span className="text-xs text-core-text-dim">{p}</span>
                            </div>
                          ))}
                        </div>

                        {/* URL */}
                        {task.url && (
                          <a
                            href={task.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-[11px] text-core-green no-underline hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {task.urlLabel || task.url}
                          </a>
                        )}

                        {/* Status buttons */}
                        <div className="flex gap-1.5 mt-3">
                          {STATUS_BUTTONS.map(({ status: s, icon, label }) => (
                            <button
                              key={s}
                              onClick={() => setStatus(task.id, s)}
                              className={`
                                inline-flex items-center gap-1 px-3 py-1 rounded border text-[10px] font-semibold
                                uppercase tracking-wide cursor-pointer font-[inherit] transition-colors
                                ${status === s
                                  ? STATUS_CONFIG[s].badgeClass + ' border-transparent'
                                  : 'bg-core-bg border-core-border text-core-text-muted hover:bg-core-surface'
                                }
                              `}
                            >
                              {icon}
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Footer */}
      <div className="text-center py-6 border-t border-core-border mt-6">
        <div className="text-[11px] text-core-text-muted">
          0nCore Command Center · Week 1 · {doneTasks}/{totalTasks} complete ({progressPct}%)
        </div>
      </div>
    </div>
  )
}
