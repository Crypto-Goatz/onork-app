'use client'

import { useState } from 'react'

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

const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; label: string }> = {
  done:    { bg: '#dcfce7', text: '#166534', label: 'DONE' },
  active:  { bg: '#fef9c3', text: '#854d0e', label: 'ACTIVE' },
  todo:    { bg: '#f1f5f9', text: '#475569', label: 'TODO' },
  blocked: { bg: '#fee2e2', text: '#991b1b', label: 'BLOCKED' },
}

const TYPE_COLORS: Record<TaskType, { bg: string; text: string }> = {
  backend:   { bg: '#dbeafe', text: '#1e40af' },
  frontend:  { bg: '#f3e8ff', text: '#6b21a8' },
  'zero-code': { bg: '#fef3c7', text: '#92400e' },
}

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
    <div style={{ padding: '24px', maxWidth: 960, margin: '0 auto', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: 0 }}>Command Center</h1>
          <span style={{ fontSize: 12, color: '#6b7280' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, borderRadius: 3, background: '#e5e7eb', overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: '#7ed957', borderRadius: 3, transition: 'width 0.5s ease' }} />
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'DONE', value: doneTasks, color: '#166534', bg: '#dcfce7' },
            { label: 'ACTIVE', value: activeTasks, color: '#854d0e', bg: '#fef9c3' },
            { label: 'BLOCKED', value: blockedTasks, color: '#991b1b', bg: '#fee2e2' },
            { label: 'TOTAL', value: totalTasks, color: '#1f2937', bg: '#f1f5f9' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', color: s.color, opacity: 0.7 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Active task banner */}
      {TASKS.filter(t => getStatus(t) === 'active').map(t => (
        <div key={t.id} style={{ background: '#fefce8', border: '1px solid #fde68a', borderLeft: '4px solid #eab308', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#854d0e' }}>CURRENT PRIORITY</div>
            <div style={{ fontSize: 14, color: '#1f2937' }}>{t.title}</div>
            <div style={{ fontSize: 11, color: '#92400e', marginTop: 2 }}>Assigned: {t.assigned} · {t.type}</div>
          </div>
        </div>
      ))}

      {/* Task sections */}
      {sections.map(section => {
        const sectionTasks = TASKS.filter(t => t.section === section)
        const sectionDone = sectionTasks.filter(t => getStatus(t) === 'done').length

        return (
          <div key={section} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#6b7280', margin: 0, textTransform: 'uppercase' }}>{section}</h2>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>{sectionDone}/{sectionTasks.length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sectionTasks.map(task => {
                const status = getStatus(task)
                const sc = STATUS_COLORS[status]
                const tc = TYPE_COLORS[task.type]
                const isExpanded = expanded === task.id
                const isDone = status === 'done'

                return (
                  <div key={task.id} style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : task.id)}
                      style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', display: 'flex', alignItems: 'flex-start', gap: 12 }}
                    >
                      {/* Status dot */}
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc.text, marginTop: 5, flexShrink: 0 }} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.6 : 1 }}>
                          {task.title}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{task.sub}</div>

                        {/* Badges */}
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: sc.bg, color: sc.text, letterSpacing: '0.05em' }}>{sc.label}</span>
                          <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: tc.bg, color: tc.text }}>{task.type}</span>
                          <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', color: '#64748b' }}>{task.assigned}</span>
                        </div>
                      </div>

                      {/* Expand arrow */}
                      <span style={{ fontSize: 14, color: '#9ca3af', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}>▶</span>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f1f5f9' }}>
                        {/* Proof required */}
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#ef4444', marginBottom: 6 }}>PROOF REQUIRED</div>
                          {task.proof.map((p, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isDone ? '#7ed957' : '#d1d5db', marginTop: 4, flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: '#4b5563' }}>{p}</span>
                            </div>
                          ))}
                        </div>

                        {/* URL */}
                        {task.url && (
                          <a href={task.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: '#7ed957', textDecoration: 'none' }}>
                            ↗ {task.urlLabel || task.url}
                          </a>
                        )}

                        {/* Status buttons */}
                        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                          {(['done', 'active', 'todo', 'blocked'] as TaskStatus[]).map(s => (
                            <button
                              key={s}
                              onClick={() => setStatus(task.id, s)}
                              style={{
                                padding: '4px 12px', borderRadius: 4, border: '1px solid #e5e7eb',
                                background: status === s ? STATUS_COLORS[s].bg : '#ffffff',
                                color: status === s ? STATUS_COLORS[s].text : '#9ca3af',
                                fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                textTransform: 'uppercase', letterSpacing: '0.05em',
                              }}
                            >
                              {s === 'done' ? '✓ Done' : s === 'active' ? '● Active' : s === 'blocked' ? '✕ Blocked' : '○ Todo'}
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
      <div style={{ textAlign: 'center', padding: '24px 0', borderTop: '1px solid #e5e7eb', marginTop: 24 }}>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>
          0nCore Command Center · Week 1 · {doneTasks}/{totalTasks} complete ({progressPct}%)
        </div>
      </div>
    </div>
  )
}
