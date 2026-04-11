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
  0: 'Free', 1: '$29.00/mo', 2: '$79.00/mo',
  3: '$149.00/mo', 4: '$299.00/mo', 5: '$499.00/mo',
}

const TIER_COLORS: Record<number, string> = {
  0: '#9ca3af', 1: '#14b8a6', 2: '#3b82f6',
  3: '#8b5cf6', 4: '#f59e0b', 5: '#6EE05A',
}

const SPARK_PACKS = [
  { id: 'starter', name: 'Starter', sparks: 50, price: '$5.00' },
  { id: 'builder', name: 'Builder', sparks: 250, price: '$20.00' },
  { id: 'pro', name: 'Pro', sparks: 750, price: '$50.00' },
  { id: 'unlimited', name: 'Unlimited', sparks: 2000, price: '$100.00' },
]

export default function BillingPage() {
  const supabase = createClient()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<number | null>(null)
  const [buyingPack, setBuyingPack] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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
    if (error) { alert(error); setUpgrading(null); return }
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
    if (error) { alert(error); setBuyingPack(null); return }
    if (url) window.location.href = url
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #1c2b42', borderTopColor: '#14b8a6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const currentTier = data?.tier.level ?? 0
  const tierColor = TIER_COLORS[currentTier]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 8px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: 0 }}>Billing</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>Manage your subscription, credits, and payment.</p>
      </div>

      {/* ═══ CURRENT PLAN ═══ */}
      <div style={{
        background: 'var(--bg-card, #1f2937)',
        border: `1px solid ${tierColor}30`,
        borderRadius: 14,
        padding: '24px',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: 0 }}>Current Plan</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {data?.subscription?.status === 'active' ? 'Active subscription' : 'No active subscription'}
            </p>
          </div>
          <span style={{
            padding: '6px 16px',
            borderRadius: 20,
            background: `${tierColor}15`,
            border: `1px solid ${tierColor}30`,
            color: tierColor,
            fontSize: 13,
            fontWeight: 700,
          }}>
            {TIER_NAMES[currentTier]}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div style={{ background: 'var(--bg-primary, #0d1117)', border: '1px solid #1c2b42', borderRadius: 10, padding: '16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Tier</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: tierColor }}>{currentTier}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{TIER_NAMES[currentTier]}</div>
          </div>
          <div style={{ background: 'var(--bg-primary, #0d1117)', border: '1px solid #1c2b42', borderRadius: 10, padding: '16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Price</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary, #f0f4f8)' }}>{TIER_PRICES[currentTier]}</div>
          </div>
          <div style={{ background: 'var(--bg-primary, #0d1117)', border: '1px solid #1c2b42', borderRadius: 10, padding: '16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Status</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: data?.subscription?.status === 'active' ? '#6EE05A' : '#9ca3af' }}>
              {data?.subscription?.status === 'active' ? 'Active' : 'Free'}
            </div>
          </div>
          <div style={{ background: 'var(--bg-primary, #0d1117)', border: '1px solid #1c2b42', borderRadius: 10, padding: '16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>K-Layers</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#14b8a6' }}>{data?.kLayers || 0}/7</div>
          </div>
        </div>

        {data?.subscription?.current_period_end && (
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            Renews: {new Date(data.subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        )}
      </div>

      {/* ═══ UPGRADE TIERS ═══ */}
      <div style={{
        background: 'var(--bg-card, #1f2937)',
        border: '1px solid #1c2b42',
        borderRadius: 14,
        padding: '24px',
        marginBottom: 20,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 16px' }}>Subscription Tiers</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[1, 2, 3, 4, 5].map(tier => {
            const isActive = currentTier >= tier
            const color = TIER_COLORS[tier]
            return (
              <div key={tier} style={{
                border: `1px solid ${isActive ? `${color}30` : '#1c2b42'}`,
                borderRadius: 10,
                padding: '16px',
                background: isActive ? `${color}08` : 'var(--bg-primary, #0d1117)',
                transition: 'all 0.2s',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? color : 'var(--text-primary)', marginBottom: 4 }}>
                  {TIER_NAMES[tier]}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: isActive ? color : 'var(--text-primary)', marginBottom: 8 }}>
                  {TIER_PRICES[tier]}
                </div>
                {isActive ? (
                  <span style={{ fontSize: 11, color, fontWeight: 600 }}>Current</span>
                ) : (
                  <button
                    onClick={() => handleUpgrade(tier)}
                    disabled={upgrading === tier}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 8,
                      background: upgrading === tier ? '#374151' : 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
                      color: '#0c1220',
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: upgrading === tier ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {upgrading === tier ? 'Redirecting...' : 'Upgrade'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══ SPARK CREDITS ═══ */}
      <div style={{
        background: 'var(--bg-card, #1f2937)',
        border: '1px solid #1c2b42',
        borderRadius: 14,
        padding: '24px',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: 0 }}>Spark Credits</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>$0.01 per MCP tool call · Buy packs for bulk savings</p>
          </div>
          <div style={{
            padding: '8px 20px',
            borderRadius: 10,
            background: 'rgba(110,224,90,0.08)',
            border: '1px solid rgba(110,224,90,0.2)',
          }}>
            <div style={{ fontSize: 11, color: '#6EE05A', fontWeight: 600, textAlign: 'center' }}>Balance</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#6EE05A', fontFamily: "'JetBrains Mono', monospace" }}>
              {data?.balance?.balance?.toLocaleString() || '0'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          {SPARK_PACKS.map(pack => (
            <div key={pack.id} style={{
              border: '1px solid #1c2b42',
              borderRadius: 10,
              padding: '14px',
              background: 'var(--bg-primary, #0d1117)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b', fontFamily: "'JetBrains Mono', monospace" }}>{pack.sparks}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>sparks</div>
              <button
                onClick={() => handleBuyPack(pack.id)}
                disabled={buyingPack === pack.id}
                style={{
                  width: '100%',
                  padding: '6px',
                  borderRadius: 6,
                  background: buyingPack === pack.id ? '#374151' : 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  color: '#f59e0b',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: buyingPack === pack.id ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {buyingPack === pack.id ? '...' : pack.price}
              </button>
            </div>
          ))}
        </div>

        {/* Usage stats */}
        <div style={{ display: 'flex', gap: 20, paddingTop: 12, borderTop: '1px solid #1c2b42' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Lifetime Earned</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
              {data?.balance?.lifetime_earned?.toLocaleString() || '0'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Lifetime Spent</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
              {data?.balance?.lifetime_spent?.toLocaleString() || '0'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Stripe Customer</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
              {data?.balance?.stripe_customer_id ? `${data.balance.stripe_customer_id.slice(0, 12)}...` : 'NA'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
