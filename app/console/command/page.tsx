'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, ExternalLink } from 'lucide-react'

type TaskStatus = 'done' | 'active' | 'blocked' | 'todo'

interface Task {
  id: string
  section: string
  title: string
  sub: string
  status: TaskStatus
  assigned: string
  type: string
  url: string
  urlLabel: string
  proof: string[]
}

const TASKS: Task[] = [
  {
    id: 'db-done',
    section: 'DATABASE',
    title: 'DB schema + triggers deployed',
    sub: 'user_tiers, user_unlocks, feature_catalog, run_packs, profiles, kb_content_queue — all live',
    status: 'done',
    assigned: 'claude',
    type: 'backend',
    url: 'https://supabase.com/dashboard/project/pwujhhmlrtxjmjzyttwn/editor',
    urlLabel: 'Supabase dashboard',
    proof: [
      'trg_sync_subscription_to_tier returns 2 rows',
      'run_packs seeded with correct price_cents'
    ]
  },
  {
    id: 'pricing-confirmed',
    section: 'DATABASE',
    title: 'Pricing confirmed in USD',
    sub: 'Tier 1 $29 / Tier 2 $79 / Tier 3 $149 / Tier 4 $299 / Tier 5 $499 — Sparks $5/$20/$50/$100',
    status: 'done',
    assigned: 'mike',
    type: 'zero-code',
    url: '',
    urlLabel: '',
    proof: ['run_packs price_cents match USD values']
  },
  {
    id: 'stripe-tier4-5',
    section: 'PART 1 — BILLING',
    title: 'Create Stripe price IDs for Tier 4 (The Vault $299) + Tier 5 (The Penthouse $499)',
    sub: 'stripe prices create CLI commands — copy returned price_ids to Vercel env vars',
    status: 'done',
    assigned: 'mike',
    type: 'zero-code',
    url: 'https://dashboard.stripe.com/prices',
    urlLabel: 'Stripe prices dashboard',
    proof: [
      'STRIPE_PRICE_TIER_4 env var set on Vercel prj_OJ0gi5HItdtUmQYclXirYk1BSJnt',
      'STRIPE_PRICE_TIER_5 env var set on Vercel prj_OJ0gi5HItdtUmQYclXirYk1BSJnt'
    ]
  },
  {
    id: 'stripe-setup-fn',
    section: 'PART 1 — BILLING',
    title: 'Run stripe-setup Edge Function → populate run_packs stripe_price_ids',
    sub: 'POST to stripe-setup function OR manual stripe CLI for 4 credit packs',
    status: 'done',
    assigned: 'claude',
    type: 'backend',
    url: 'https://pwujhhmlrtxjmjzyttwn.supabase.co/functions/v1/stripe-setup',
    urlLabel: 'stripe-setup function',
    proof: [
      'All 4 run_packs rows have non-null stripe_price_id',
      'SELECT id, stripe_price_id FROM run_packs — zero nulls'
    ]
  },
  {
    id: 'stripe-webhook-reg',
    section: 'PART 1 — BILLING',
    title: 'Register Stripe webhook — Mike does this manually in Stripe dashboard',
    sub: 'Endpoint: stripe-webhook Edge Function URL. Events: checkout, subscription, invoice.',
    status: 'done',
    assigned: 'mike',
    type: 'zero-code',
    url: 'https://dashboard.stripe.com/webhooks',
    urlLabel: 'Stripe webhooks dashboard',
    proof: [
      'Webhook endpoint shows in Stripe dashboard',
      'STRIPE_WEBHOOK_SECRET set in Supabase secrets',
      'STRIPE_SECRET_KEY set in Supabase secrets'
    ]
  },
  {
    id: 'checkout-route',
    section: 'PART 1 — BILLING',
    title: 'Build /api/billing/checkout route',
    sub: 'POST {tier_level} or {pack_id} → Stripe Checkout Session → returns {url}',
    status: 'done',
    assigned: 'claude',
    type: 'backend',
    url: '',
    urlLabel: '',
    proof: [
      'POST /api/billing/checkout with { tier_level: 1 } returns valid Stripe Checkout URL',
      'URL loads in browser without error'
    ]
  },
  {
    id: 'webhook-handler',
    section: 'PART 1 — BILLING',
    title: 'Verify or build /api/webhooks/stripe route',
    sub: 'Handles checkout.session.completed, subscription events, invoice events',
    status: 'done',
    assigned: 'claude',
    type: 'backend',
    url: '',
    urlLabel: '',
    proof: [
      'Stripe test event → product_subscriptions row upserted',
      'DB trigger fires → user_tiers.tier_level updated automatically'
    ]
  },
  {
    id: 'upgrade-button',
    section: 'PART 1 — BILLING',
    title: 'UpgradeButton component on dashboard locked room cards',
    sub: 'Click → POST /api/billing/checkout → redirect to Stripe Checkout with correct USD price',
    status: 'done',
    assigned: 'claude',
    type: 'frontend',
    url: '',
    urlLabel: '',
    proof: [
      'Click "Unlock Front Office — $29.00/mo" → Stripe Checkout loads',
      'Test card 4242 4242 4242 4242 completes payment successfully'
    ]
  },
  {
    id: 'billing-e2e',
    section: 'PART 1 — BILLING',
    title: 'End-to-end billing verified with test payment',
    sub: 'Non-Mike user: signup → lobby → click upgrade → pay → tier unlocks → dashboard updates',
    status: 'active',
    assigned: 'both',
    type: 'zero-code',
    url: '',
    urlLabel: '',
    proof: [
      'product_subscriptions has a row with status = active',
      'user_tiers.tier_level updated to 1 automatically (DB trigger fired)',
      'user_unlocks has rows for all tier 1 features',
      'Dashboard refreshes — Front Office unlocked, green border on card'
    ]
  },
  {
    id: 'env-vars',
    section: 'PART 2 — WEEK 1 CORE',
    title: 'Set all env vars on onork-app Vercel project',
    sub: 'Supabase URL/keys, CRM_PIT_TOKEN, CRM_COMPANY_ID, all Stripe keys, NEXT_PUBLIC_APP_URL',
    status: 'done',
    assigned: 'mike',
    type: 'zero-code',
    url: 'https://vercel.com/dashboard',
    urlLabel: 'Vercel dashboard',
    proof: [
      'vercel env ls shows all required vars',
      'Deploy succeeds without env var errors after redeploy'
    ]
  },
  {
    id: 'signup-provision',
    section: 'PART 2 — WEEK 1 CORE',
    title: 'Fix signup → CRM sub-location auto-provision',
    sub: 'auth/callback: if crm_location_id null → create CRM location → seed user_tiers at 0 → seed K1',
    status: 'done',
    assigned: 'claude',
    type: 'backend',
    url: '',
    urlLabel: '',
    proof: [
      'New signup → profiles.crm_location_id populated',
      'Sub-location visible in CRM dashboard',
      'kb_content_queue K1 row created with status pending',
      'user_tiers row exists with tier_level = 0 and tier_name = lobby'
    ]
  },
  {
    id: 'welcome-page',
    section: 'PART 2 — WEEK 1 CORE',
    title: 'Build /console/welcome onboarding page',
    sub: '3 fields: business_name, what_we_do, brand_tone → updates profiles + K1 → redirect /console',
    status: 'done',
    assigned: 'claude',
    type: 'frontend',
    url: '',
    urlLabel: '',
    proof: [
      'Submit populates profiles.business_name and onboarding_complete = true',
      'K1 status = active in kb_content_queue',
      'user_kb_registry K1 row exists with status = ready'
    ]
  },
  {
    id: 'contacts-api',
    section: 'PART 2 — WEEK 1 CORE',
    title: 'Build /api/console/contacts GET + /[id]/tags POST',
    sub: 'Reads crm_location_id from profiles → fetches from CRM API — never hardcode location ID',
    status: 'done',
    assigned: 'claude',
    type: 'backend',
    url: '',
    urlLabel: '',
    proof: [
      'GET /api/console/contacts returns real contacts array (not mock data)',
      'POST contacts/:id/tags updates CRM within 5 seconds'
    ]
  },
  {
    id: 'contacts-ui',
    section: 'PART 2 — WEEK 1 CORE',
    title: 'Build /console/contacts page',
    sub: 'Search, list, side panel with tag add. Light mode. White background. No Wowdash dark.',
    status: 'done',
    assigned: 'claude',
    type: 'frontend',
    url: '',
    urlLabel: '',
    proof: [
      'Contacts display with name, email, phone, tags as color pills',
      'Add tag → appears in CRM within 5 seconds',
      'crm_location_id null → shows "Setting up your account..." with spinner'
    ]
  },
  {
    id: 'dashboard-rooms',
    section: 'PART 2 — WEEK 1 CORE',
    title: 'Dashboard locked/unlocked rooms sourced from DB',
    sub: 'feature_catalog + user_tiers → unlocked = green border + Open, locked = grey + USD price',
    status: 'done',
    assigned: 'claude',
    type: 'frontend',
    url: '',
    urlLabel: '',
    proof: [
      'Lobby user (tier 0) sees correct rooms locked with upgrade prices in USD',
      'Tier 1 user sees Front Office unlocked with green left border'
    ]
  },
  {
    id: 'ai-chat-klayer',
    section: 'PART 2 — WEEK 1 CORE',
    title: 'AI chat injects K-Layer context into every Anthropic API call',
    sub: 'K1 business_name + what_we_do + brand_tone prepended to system prompt. K6 connected tools listed.',
    status: 'done',
    assigned: 'claude',
    type: 'backend',
    url: '',
    urlLabel: '',
    proof: [
      'Chat responds using business name from K1 (not generic placeholder)',
      'Response tone matches brand_tone set during onboarding'
    ]
  }
]

const SECTIONS = ['DATABASE', 'PART 1 — BILLING', 'PART 2 — WEEK 1 CORE']

const STATUS_DOT: Record<TaskStatus, string> = {
  done: 'bg-[#6EE05A]',
  active: 'bg-[#f59e0b]',
  blocked: 'bg-[#ef4444]',
  todo: 'bg-transparent border-2 border-[#30363d]',
}

const STATUS_BADGE: Record<TaskStatus, string> = {
  done: 'bg-[#6EE05A]/10 text-[#6EE05A]',
  active: 'bg-[#f59e0b]/10 text-[#f59e0b]',
  blocked: 'bg-[#ef4444]/10 text-[#ef4444]',
  todo: 'bg-transparent text-[#6b7280] border border-[#30363d]',
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  done: 'DONE',
  active: 'ACTIVE',
  blocked: 'BLOCKED',
  todo: 'TODO',
}

const ASSIGNED_LABELS: Record<string, string> = {
  claude: 'CLAUDE',
  mike: 'MIKE',
  both: 'BOTH',
}

const TYPE_BADGE: Record<string, string> = {
  backend: 'bg-[#6EE05A]/10 text-[#6EE05A]',
  frontend: 'bg-[#f59e0b]/10 text-[#f59e0b]',
  'zero-code': 'bg-[#6b7280]/10 text-[#6b7280]',
}

export default function CommandCenterPage() {
  const [tasks, setTasks] = useState<Task[]>(TASKS)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const doneCount = tasks.filter(t => t.status === 'done').length
  const activeCount = tasks.filter(t => t.status === 'active').length
  const blockedCount = tasks.filter(t => t.status === 'blocked').length
  const totalCount = tasks.length
  const progressPct = Math.round((doneCount / totalCount) * 100)

  function setStatus(id: string, status: TaskStatus) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  function toggleSection(section: string) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  function getActivePriority(): string | null {
    const active = tasks.find(t => t.status === 'active')
    return active ? active.title : null
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#9ca3af] font-mono p-6">

      {/* Header */}
      <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-[#f0f4f8] text-xl font-bold m-0 tracking-tight">
            COMMAND<span className="text-[#6EE05A]">.0NCORE</span>.COM
          </h1>
          <span
            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold text-[#0d1117] ${
              activeCount > 0 ? 'bg-[#f59e0b]' : blockedCount > 0 ? 'bg-[#ef4444]' : 'bg-[#6EE05A]'
            }`}
          >
            {activeCount > 0 ? 'IN PROGRESS' : blockedCount > 0 ? 'BLOCKED' : 'ALL CLEAR'}
          </span>
        </div>
        <span className="text-[#6b7280] text-[13px]">
          April 10, 2026
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-[#161b22] rounded overflow-hidden mb-6">
        <div
          className="h-full bg-[#6EE05A] rounded transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'DONE', value: doneCount, color: 'text-[#6EE05A]' },
          { label: 'ACTIVE', value: activeCount, color: 'text-[#f59e0b]' },
          { label: 'BLOCKED', value: blockedCount, color: 'text-[#ef4444]' },
          { label: 'TOTAL', value: totalCount, color: 'text-[#f0f4f8]' },
        ].map(stat => (
          <div
            key={stat.label}
            className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 text-center"
          >
            <div className={`text-[28px] font-bold ${stat.color}`}>
              {stat.value}
            </div>
            <div className="text-[#6b7280] text-[11px] font-semibold mt-1">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Priority banner */}
      {getActivePriority() && (
        <div className="bg-[#161b22] border border-[#f59e0b]/50 rounded-lg px-4 py-3 mb-6 flex items-center gap-3">
          <span className="text-[#f59e0b] text-[11px] font-bold shrink-0">CURRENT PRIORITY</span>
          <span className="text-[#f0f4f8] text-[13px]">{getActivePriority()}</span>
        </div>
      )}

      {/* Sections */}
      {SECTIONS.map(section => {
        const sectionTasks = tasks.filter(t => t.section === section)
        const sectionDone = sectionTasks.filter(t => t.status === 'done').length
        const collapsed = collapsedSections.has(section)

        return (
          <div key={section} className="mb-5">
            {/* Section header */}
            <button
              onClick={() => toggleSection(section)}
              className={`w-full flex items-center justify-between bg-[#161b22] border border-[#30363d] px-4 py-3 cursor-pointer text-[#f0f4f8] font-mono ${
                collapsed ? 'rounded-lg' : 'rounded-t-lg rounded-b-none'
              }`}
            >
              <span className="text-[13px] font-bold flex items-center gap-1.5">
                {collapsed
                  ? <ChevronRight size={14} className="text-[#6b7280]" />
                  : <ChevronDown size={14} className="text-[#6b7280]" />
                }
                {section}
              </span>
              <span className={`text-[12px] ${sectionDone === sectionTasks.length ? 'text-[#6EE05A]' : 'text-[#6b7280]'}`}>
                {sectionDone}/{sectionTasks.length}
              </span>
            </button>

            {/* Task rows */}
            {!collapsed && sectionTasks.map((task, i) => {
              const isExpanded = expandedId === task.id
              const isLast = i === sectionTasks.length - 1

              return (
                <div
                  key={task.id}
                  className={`bg-[#161b22] border-l border-r border-b border-[#30363d] ${isLast ? 'rounded-b-lg' : ''}`}
                >
                  {/* Task row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : task.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 bg-transparent border-none cursor-pointer text-left font-mono hover:bg-[#1c2333] transition-colors"
                  >
                    {/* Status dot */}
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${STATUS_DOT[task.status]}`}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-[#f0f4f8] text-[13px] font-semibold ${
                          task.status === 'done' ? 'line-through opacity-60' : ''
                        }`}
                      >
                        {task.title}
                      </div>
                      <div className="text-[#6b7280] text-[11px] mt-1 leading-snug">
                        {task.sub}
                      </div>

                      {/* Badge row */}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${STATUS_BADGE[task.status]}`}>
                          {STATUS_LABELS[task.status]}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#30363d]/50 text-[#9ca3af]">
                          {ASSIGNED_LABELS[task.assigned] || task.assigned.toUpperCase()}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${TYPE_BADGE[task.type] || 'bg-[#6b7280]/10 text-[#6b7280]'}`}>
                          {task.type.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Expand indicator */}
                    {isExpanded
                      ? <ChevronDown size={14} className="text-[#6b7280] shrink-0 mt-0.5" />
                      : <ChevronRight size={14} className="text-[#6b7280] shrink-0 mt-0.5" />
                    }
                  </button>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pl-9">
                      {/* URL */}
                      {task.url && (
                        <div className="mb-3">
                          <a
                            href={task.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#6EE05A] text-[12px] no-underline hover:underline flex items-center gap-1"
                          >
                            {task.urlLabel || task.url}
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      )}

                      {/* Proof required */}
                      <div className="mb-4">
                        <div className="text-[#f59e0b] text-[10px] font-bold mb-2 tracking-wider">
                          PROOF REQUIRED
                        </div>
                        {task.proof.map((p, pi) => (
                          <div key={pi} className="flex items-start gap-2 mb-1.5">
                            <div
                              className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${
                                task.status === 'done' ? 'bg-[#6EE05A]' : 'bg-transparent border border-[#6b7280]'
                              }`}
                            />
                            <span className="text-[#9ca3af] text-[11px] leading-relaxed">
                              {p}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Status buttons */}
                      <div className="flex gap-2 flex-wrap">
                        {task.status !== 'done' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setStatus(task.id, 'done') }}
                            className="bg-[#6EE05A] text-[#0d1117] border-none rounded px-3 py-1.5 text-[11px] font-semibold cursor-pointer font-mono hover:bg-[#6EE05A]/90 transition-colors"
                          >
                            Mark Done
                          </button>
                        )}
                        {task.status !== 'active' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setStatus(task.id, 'active') }}
                            className="bg-transparent text-[#f59e0b] border border-[#f59e0b] rounded px-3 py-1.5 text-[11px] font-semibold cursor-pointer font-mono hover:bg-[#f59e0b]/10 transition-colors"
                          >
                            Set Active
                          </button>
                        )}
                        {task.status !== 'blocked' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setStatus(task.id, 'blocked') }}
                            className="bg-transparent text-[#ef4444] border border-[#ef4444] rounded px-3 py-1.5 text-[11px] font-semibold cursor-pointer font-mono hover:bg-[#ef4444]/10 transition-colors"
                          >
                            Blocked
                          </button>
                        )}
                        {task.status !== 'todo' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setStatus(task.id, 'todo') }}
                            className="bg-transparent text-[#6b7280] border border-[#30363d] rounded px-3 py-1.5 text-[11px] font-semibold cursor-pointer font-mono hover:bg-[#1c2333] transition-colors"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-[#30363d] flex justify-between items-center">
        <span className="text-[#6b7280] text-[11px]">
          0nCore Command Center — {progressPct}% complete
        </span>
        <span className="text-[#6b7280] text-[11px]">
          {doneCount} done · {activeCount} active · {blockedCount} blocked · {totalCount - doneCount - activeCount - blockedCount} todo
        </span>
      </div>
    </div>
  )
}
