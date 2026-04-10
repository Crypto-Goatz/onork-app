'use client'

import { useState } from 'react'

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

const STATUS_COLORS: Record<TaskStatus, string> = {
  done: '#6EE05A',
  active: '#F59E0B',
  blocked: '#EF4444',
  todo: 'transparent',
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

const TYPE_COLORS: Record<string, string> = {
  backend: '#6EE05A',
  frontend: '#F59E0B',
  'zero-code': '#6B6B6B',
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
    <div style={{
      minHeight: '100vh',
      background: '#000000',
      color: '#D4D4D4',
      fontFamily: "'JetBrains Mono', monospace",
      padding: '24px',
    }}>
      {/* Google Font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{
            color: '#FFFFFF',
            fontSize: '20px',
            fontWeight: 700,
            margin: 0,
            letterSpacing: '-0.5px',
          }}>
            COMMAND<span style={{ color: '#6EE05A' }}>.0NCORE</span>.COM
          </h1>
          <span style={{
            background: activeCount > 0 ? '#F59E0B' : blockedCount > 0 ? '#EF4444' : '#6EE05A',
            color: '#000000',
            padding: '2px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
          }}>
            {activeCount > 0 ? 'IN PROGRESS' : blockedCount > 0 ? 'BLOCKED' : 'ALL CLEAR'}
          </span>
        </div>
        <span style={{ color: '#6B6B6B', fontSize: '13px' }}>
          April 10, 2026
        </span>
      </header>

      {/* Progress bar */}
      <div style={{
        height: '4px',
        background: '#1A1A1A',
        borderRadius: '2px',
        marginBottom: '24px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progressPct}%`,
          background: '#6EE05A',
          borderRadius: '2px',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '24px',
      }}>
        {[
          { label: 'DONE', value: doneCount, color: '#6EE05A' },
          { label: 'ACTIVE', value: activeCount, color: '#F59E0B' },
          { label: 'BLOCKED', value: blockedCount, color: '#EF4444' },
          { label: 'TOTAL', value: totalCount, color: '#FFFFFF' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#111111',
            border: '1px solid #2A2A2A',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
          }}>
            <div style={{ color: stat.color, fontSize: '28px', fontWeight: 700 }}>
              {stat.value}
            </div>
            <div style={{ color: '#6B6B6B', fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Priority banner */}
      {getActivePriority() && (
        <div style={{
          background: '#1A1A1A',
          border: '1px solid #F59E0B',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ color: '#F59E0B', fontSize: '11px', fontWeight: 700 }}>CURRENT PRIORITY</span>
          <span style={{ color: '#FFFFFF', fontSize: '13px' }}>{getActivePriority()}</span>
        </div>
      )}

      {/* Sections */}
      {SECTIONS.map(section => {
        const sectionTasks = tasks.filter(t => t.section === section)
        const sectionDone = sectionTasks.filter(t => t.status === 'done').length
        const collapsed = collapsedSections.has(section)

        return (
          <div key={section} style={{ marginBottom: '20px' }}>
            {/* Section header */}
            <button
              onClick={() => toggleSection(section)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#111111',
                border: '1px solid #2A2A2A',
                borderRadius: '8px 8px' + (collapsed ? ' 8px 8px' : ' 0 0'),
                padding: '12px 16px',
                cursor: 'pointer',
                color: '#FFFFFF',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700 }}>
                {collapsed ? '▸' : '▾'} {section}
              </span>
              <span style={{
                fontSize: '12px',
                color: sectionDone === sectionTasks.length ? '#6EE05A' : '#6B6B6B',
              }}>
                {sectionDone}/{sectionTasks.length}
              </span>
            </button>

            {/* Task rows */}
            {!collapsed && sectionTasks.map((task, i) => {
              const isExpanded = expandedId === task.id
              const isLast = i === sectionTasks.length - 1

              return (
                <div key={task.id} style={{
                  background: '#111111',
                  borderLeft: '1px solid #2A2A2A',
                  borderRight: '1px solid #2A2A2A',
                  borderBottom: '1px solid #2A2A2A',
                  borderRadius: isLast ? '0 0 8px 8px' : '0',
                }}>
                  {/* Task row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : task.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 16px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {/* Status indicator */}
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: STATUS_COLORS[task.status],
                      border: task.status === 'todo' ? '2px solid #2A2A2A' : 'none',
                      flexShrink: 0,
                      marginTop: '4px',
                    }} />

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 600,
                        textDecoration: task.status === 'done' ? 'line-through' : 'none',
                        opacity: task.status === 'done' ? 0.6 : 1,
                      }}>
                        {task.title}
                      </div>
                      <div style={{
                        color: '#6B6B6B',
                        fontSize: '11px',
                        marginTop: '4px',
                        lineHeight: '1.4',
                      }}>
                        {task.sub}
                      </div>

                      {/* Badge row */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '8px',
                        flexWrap: 'wrap',
                      }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: `${STATUS_COLORS[task.status]}20`,
                          color: STATUS_COLORS[task.status] === 'transparent' ? '#6B6B6B' : STATUS_COLORS[task.status],
                          border: task.status === 'todo' ? '1px solid #2A2A2A' : 'none',
                        }}>
                          {STATUS_LABELS[task.status]}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: '#1A1A1A',
                          color: '#D4D4D4',
                        }}>
                          {ASSIGNED_LABELS[task.assigned] || task.assigned.toUpperCase()}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: `${TYPE_COLORS[task.type] || '#6B6B6B'}15`,
                          color: TYPE_COLORS[task.type] || '#6B6B6B',
                        }}>
                          {task.type.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Expand indicator */}
                    <span style={{
                      color: '#6B6B6B',
                      fontSize: '12px',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}>
                      {isExpanded ? '▾' : '▸'}
                    </span>
                  </button>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div style={{
                      padding: '0 16px 16px 38px',
                    }}>
                      {/* URL */}
                      {task.url && (
                        <div style={{ marginBottom: '12px' }}>
                          <a
                            href={task.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#6EE05A',
                              fontSize: '12px',
                              textDecoration: 'none',
                            }}
                          >
                            {task.urlLabel || task.url} ↗
                          </a>
                        </div>
                      )}

                      {/* Proof required */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{
                          color: '#F59E0B',
                          fontSize: '10px',
                          fontWeight: 700,
                          marginBottom: '8px',
                          letterSpacing: '0.5px',
                        }}>
                          PROOF REQUIRED
                        </div>
                        {task.proof.map((p, pi) => (
                          <div key={pi} style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            marginBottom: '6px',
                          }}>
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: task.status === 'done' ? '#6EE05A' : '#2A2A2A',
                              border: task.status !== 'done' ? '1px solid #6B6B6B' : 'none',
                              flexShrink: 0,
                              marginTop: '5px',
                            }} />
                            <span style={{
                              color: '#D4D4D4',
                              fontSize: '11px',
                              lineHeight: '1.5',
                            }}>
                              {p}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Status buttons */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}>
                        {task.status !== 'done' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setStatus(task.id, 'done') }}
                            style={{
                              background: '#6EE05A',
                              color: '#000000',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '6px 12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            Mark Done
                          </button>
                        )}
                        {task.status !== 'active' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setStatus(task.id, 'active') }}
                            style={{
                              background: 'transparent',
                              color: '#F59E0B',
                              border: '1px solid #F59E0B',
                              borderRadius: '4px',
                              padding: '6px 12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            Set Active
                          </button>
                        )}
                        {task.status !== 'blocked' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setStatus(task.id, 'blocked') }}
                            style={{
                              background: 'transparent',
                              color: '#EF4444',
                              border: '1px solid #EF4444',
                              borderRadius: '4px',
                              padding: '6px 12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            Blocked
                          </button>
                        )}
                        {task.status !== 'todo' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setStatus(task.id, 'todo') }}
                            style={{
                              background: 'transparent',
                              color: '#6B6B6B',
                              border: '1px solid #2A2A2A',
                              borderRadius: '4px',
                              padding: '6px 12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
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
      <div style={{
        marginTop: '32px',
        padding: '16px 0',
        borderTop: '1px solid #2A2A2A',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ color: '#6B6B6B', fontSize: '11px' }}>
          0nCore Command Center — {progressPct}% complete
        </span>
        <span style={{ color: '#6B6B6B', fontSize: '11px' }}>
          {doneCount} done · {activeCount} active · {blockedCount} blocked · {totalCount - doneCount - activeCount - blockedCount} todo
        </span>
      </div>
    </div>
  )
}
