'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BillingData {
  tier: { level: number; name: string }
  subscription: { status: string; current_period_end: string; stripe_subscription_id: string } | null
  balance: { balance: number; lifetime_earned: number; lifetime_spent: number; stripe_customer_id: string } | null
  kLayers: number
}

const TIER_NAMES: Record<number, string> = {
  0: 'Lobby', 1: 'Front Office', 2: 'Operations Wing',
  3: 'Intelligence Suite', 4: 'The Vault', 5: 'The Penthouse',
}

const TIER_PRICES: Record<number, string> = {
  0: 'Free', 1: '$29/mo', 2: '$79/mo', 3: '$149/mo', 4: '$299/mo', 5: '$499/mo',
}

const TIER_COLORS: Record<number, string> = {
  0: '#8b95a5', 1: '#60a5fa', 2: '#a78bfa', 3: '#f5c518', 4: '#f97316', 5: '#6EE05A',
}

const TIER_FEATURES: Record<number, string[]> = {
  1: ['AI Chat', '500 contacts', '1 pipeline', '1 K-Layer'],
  2: ['Everything in T1', '2,500 contacts', '3 pipelines', '3 K-Layers', 'Automations'],
  3: ['Everything in T2', '10K contacts', 'Unlimited pipelines', '5 K-Layers', 'Voice AI', 'Analytics'],
  4: ['Everything in T3', '50K contacts', 'All K-Layers', 'White label', 'API access', 'Priority support'],
  5: ['Everything in T4', 'Unlimited', 'Custom branding', 'Dedicated success manager', 'Enterprise SLA'],
}

const SPARK_PACKS = [
  { id: 'starter', name: 'Starter', sparks: 50, price: '$5', color: '#60a5fa' },
  { id: 'builder', name: 'Builder', sparks: 250, price: '$20', color: '#a78bfa', popular: true },
  { id: 'pro', name: 'Pro', sparks: 750, price: '$50', color: '#f5c518' },
  { id: 'unlimited', name: 'Unlimited', sparks: 2000, price: '$100', color: '#6EE05A' },
]

const M = "'JetBrains Mono', monospace"

export default function BillingPage() {
  const supabase = createClient()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<number | null>(null)
  const [buyingPack, setBuyingPack] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [tierRes, subRes, balRes, kRes] = await Promise.all([
        supabase.from('user_tiers').select('tier_level, tier_name').eq('user_id', user.id).single(),
        supabase.from('product_subscriptions').select('status, current_period_end, stripe_subscription_id').eq('user_id', user.id).eq('product_id', '0ncore').single(),
        supabase.from('run_balances').select('balance, lifetime_earned, lifetime_spent, stripe_customer_id').eq('user_id', user.id).single(),
        supabase.from('kb_content_queue').select('layer').eq('user_id', user.id).eq('status', 'active'),
      ])

      setData({
        tier: { level: tierRes.data?.tier_level ?? 0, name: tierRes.data?.tier_name || 'lobby' },
        subscription: subRes.data || null,
        balance: balRes.data || null,
        kLayers: kRes.data?.length || 0,
      })
      setLoading(false)
    }
    load()
  }, [supabase])

  async function handleUpgrade(tierLevel: number) {
    setUpgrading(tierLevel)
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier_level: tierLevel }),
    })
    const { url, error } = await res.json()
    if (error) { setUpgrading(null); return }
    if (url) window.location.href = url
  }

  async function handleBuyPack(packId: string) {
    setBuyingPack(packId)
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack_id: packId }),
    })
    const { url, error } = await res.json()
    if (error) { setBuyingPack(null); return }
    if (url) window.location.href = url
  }

  const currentTier = data?.tier.level ?? 0

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--jp-border, #30363d)', borderTopColor: '#6EE05A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--jp-text, #f0f4f8)', margin: '0 0 4px' }}>Billing</h1>
        <p style={{ fontSize: 13, color: 'var(--jp-text-muted, #8b95a5)', margin: 0 }}>Manage your subscription, credits, and payment.</p>
      </div>

      {/* ── Current Plan ── */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16,
        padding: 24, marginBottom: 20, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${TIER_COLORS[currentTier]}, transparent)` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--jp-text, #f0f4f8)', margin: 0 }}>Current Plan</h2>
          <span style={{
            fontFamily: M, fontSize: 11, padding: '4px 14px', borderRadius: 20,
            background: `${TIER_COLORS[currentTier]}15`, border: `1px solid ${TIER_COLORS[currentTier]}30`,
            color: TIER_COLORS[currentTier], fontWeight: 600,
          }}>
            {TIER_NAMES[currentTier]}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Tier', value: String(currentTier), sub: TIER_NAMES[currentTier], color: '#00d4ff' },
            { label: 'Price', value: TIER_PRICES[currentTier], sub: '', color: 'var(--jp-text, #f0f4f8)' },
            { label: 'Status', value: data?.subscription?.status === 'active' ? 'Active' : 'Free', sub: '', color: data?.subscription?.status === 'active' ? '#6EE05A' : '#8b95a5' },
            { label: 'K-Layers', value: `${data?.kLayers || 0}/7`, sub: '', color: '#00d4ff' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: 12, padding: '16px 14px',
            }}>
              <div style={{ fontSize: 11, color: 'var(--jp-text-muted, #8b95a5)', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: M }}>{s.value}</div>
              {s.sub && <div style={{ fontSize: 11, color: 'var(--jp-text-muted, #8b95a5)', marginTop: 4 }}>{s.sub}</div>}
            </div>
          ))}
        </div>

        {data?.subscription?.current_period_end && (
          <p style={{ fontSize: 11, color: 'var(--jp-text-muted, #8b95a5)', marginTop: 12 }}>
            Renews: {new Date(data.subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* ── Subscription Tiers ── */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16, padding: 24, marginBottom: 20,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--jp-text, #f0f4f8)', margin: '0 0 16px' }}>Subscription Tiers</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[1, 2, 3, 4, 5].map(tier => {
            const isActive = currentTier >= tier
            const color = TIER_COLORS[tier]
            return (
              <div key={tier} style={{
                background: isActive ? `${color}08` : 'rgba(0,0,0,0.2)',
                border: `1px solid ${isActive ? color + '30' : 'rgba(255,255,255,0.04)'}`,
                borderRadius: 14, padding: 18, position: 'relative', overflow: 'hidden',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = color + '40'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'none' } }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, opacity: isActive ? 1 : 0.3 }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? color : 'var(--jp-text, #f0f4f8)', marginBottom: 4 }}>
                  {TIER_NAMES[tier]}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--jp-text, #f0f4f8)', fontFamily: M, marginBottom: 12 }}>
                  {TIER_PRICES[tier]}
                </div>

                <div style={{ marginBottom: 14 }}>
                  {(TIER_FEATURES[tier] || []).map(f => (
                    <div key={f} style={{ fontSize: 10, color: 'var(--jp-text-muted, #8b95a5)', lineHeight: 1.8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: color, fontSize: 8 }}>●</span> {f}
                    </div>
                  ))}
                </div>

                {isActive ? (
                  <div style={{
                    width: '100%', padding: '8px 0', textAlign: 'center',
                    fontFamily: M, fontSize: 10, color: color, fontWeight: 600,
                    letterSpacing: '0.06em',
                  }}>
                    ✓ ACTIVE
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(tier)}
                    disabled={upgrading === tier}
                    style={{
                      width: '100%', padding: '9px 0', borderRadius: 8, border: 'none',
                      background: upgrading === tier ? '#1a2332' : color,
                      color: upgrading === tier ? '#8b95a5' : '#04060d',
                      fontSize: 12, fontWeight: 700, fontFamily: M,
                      cursor: upgrading === tier ? 'wait' : 'pointer',
                      letterSpacing: '0.04em', transition: 'all 0.15s',
                    }}
                  >
                    {upgrading === tier ? 'REDIRECTING...' : 'UPGRADE'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Spark Credits ── */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16, padding: 24, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--jp-text, #f0f4f8)', margin: '0 0 4px' }}>Spark Credits</h2>
            <p style={{ fontSize: 11, color: 'var(--jp-text-muted, #8b95a5)', margin: 0 }}>$0.01 per MCP tool call · Buy packs for bulk savings</p>
          </div>
          <div style={{
            background: 'rgba(110,224,90,0.08)', border: '1px solid rgba(110,224,90,0.2)',
            borderRadius: 12, padding: '10px 20px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: M, fontSize: 9, color: '#6EE05A', letterSpacing: '0.08em', marginBottom: 2 }}>BALANCE</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#6EE05A', fontFamily: M }}>
              {data?.balance?.balance?.toLocaleString() || '0'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {SPARK_PACKS.map(pack => (
            <div key={pack.id} style={{
              background: 'rgba(0,0,0,0.2)', border: `1px solid ${pack.popular ? pack.color + '30' : 'rgba(255,255,255,0.04)'}`,
              borderRadius: 14, padding: '20px 16px', textAlign: 'center',
              position: 'relative', overflow: 'hidden',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = pack.color + '50'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = pack.popular ? pack.color + '30' : 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'none' }}
            >
              {pack.popular && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: pack.color,
                }} />
              )}
              {pack.popular && (
                <span style={{
                  position: 'absolute', top: 6, right: 6,
                  fontFamily: M, fontSize: 7, padding: '2px 6px', borderRadius: 4,
                  background: `${pack.color}20`, color: pack.color, fontWeight: 700,
                  letterSpacing: '0.06em',
                }}>BEST</span>
              )}
              <div style={{ fontSize: 10, color: 'var(--jp-text-muted, #8b95a5)', fontFamily: M, marginBottom: 4, letterSpacing: '0.04em' }}>{pack.name}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: pack.color, fontFamily: M, marginBottom: 2 }}>{pack.sparks.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: 'var(--jp-text-muted, #8b95a5)', marginBottom: 14 }}>sparks</div>
              <button
                onClick={() => handleBuyPack(pack.id)}
                disabled={buyingPack === pack.id}
                style={{
                  width: '100%', padding: '8px 0', borderRadius: 8,
                  border: `1px solid ${pack.color}30`,
                  background: buyingPack === pack.id ? '#1a2332' : `${pack.color}12`,
                  color: buyingPack === pack.id ? '#8b95a5' : pack.color,
                  fontSize: 13, fontWeight: 700, fontFamily: M,
                  cursor: buyingPack === pack.id ? 'wait' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {buyingPack === pack.id ? '...' : pack.price}
              </button>
            </div>
          ))}
        </div>

        {/* Lifetime stats */}
        <div style={{
          display: 'flex', gap: 32, paddingTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          {[
            { label: 'Lifetime Earned', value: data?.balance?.lifetime_earned?.toLocaleString() || '0' },
            { label: 'Lifetime Spent', value: data?.balance?.lifetime_spent?.toLocaleString() || '0' },
            { label: 'Stripe Customer', value: data?.balance?.stripe_customer_id ? data.balance.stripe_customer_id.slice(0, 14) + '...' : 'Not set' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 10, color: 'var(--jp-text-muted, #8b95a5)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--jp-text, #f0f4f8)', fontFamily: M }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Manage Billing ── */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16, padding: 24,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--jp-text, #f0f4f8)', margin: '0 0 12px' }}>Manage Billing</h2>
        <p style={{ fontSize: 13, color: 'var(--jp-text-muted, #8b95a5)', marginBottom: 16 }}>
          Update payment methods, view invoices, or cancel your subscription through Stripe.
        </p>
        <button
          onClick={async () => {
            const res = await fetch('/api/billing/portal', { method: 'POST' })
            const { url } = await res.json()
            if (url) window.location.href = url
          }}
          style={{
            padding: '10px 24px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)', color: 'var(--jp-text, #f0f4f8)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
        >
          Open Billing Portal →
        </button>
      </div>
    </div>
  )
}
