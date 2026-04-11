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
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-3 border-core-border border-t-core-cyan rounded-full animate-spin" />
      </div>
    )
  }

  const currentTier = data?.tier.level ?? 0

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-core-text">Billing</h1>
        <p className="text-sm text-core-text-dim mt-1">Manage your subscription, credits, and payment.</p>
      </div>

      {/* Current Plan */}
      <div className="bg-core-card border border-core-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-core-text">Current Plan</h2>
          <span className="text-xs bg-core-green/10 text-core-green px-3 py-1 rounded-full font-medium">
            {TIER_NAMES[currentTier]}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-core-bg border border-core-border rounded-lg p-4">
            <div className="text-sm text-core-text-dim mb-1">Tier</div>
            <div className="text-2xl font-bold text-core-cyan">{currentTier}</div>
            <div className="text-xs text-core-text-muted mt-1">{TIER_NAMES[currentTier]}</div>
          </div>
          <div className="bg-core-bg border border-core-border rounded-lg p-4">
            <div className="text-sm text-core-text-dim mb-1">Price</div>
            <div className="text-2xl font-bold text-core-text">{TIER_PRICES[currentTier]}</div>
          </div>
          <div className="bg-core-bg border border-core-border rounded-lg p-4">
            <div className="text-sm text-core-text-dim mb-1">Status</div>
            <div className={`text-2xl font-bold ${data?.subscription?.status === 'active' ? 'text-core-green' : 'text-core-text-muted'}`}>
              {data?.subscription?.status === 'active' ? 'Active' : 'Free'}
            </div>
          </div>
          <div className="bg-core-bg border border-core-border rounded-lg p-4">
            <div className="text-sm text-core-text-dim mb-1">K-Layers</div>
            <div className="text-2xl font-bold text-core-cyan">{data?.kLayers || 0}/7</div>
          </div>
        </div>
        {data?.subscription?.current_period_end && (
          <p className="text-xs text-core-text-muted mt-3">
            Renews: {new Date(data.subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Subscription Tiers */}
      <div className="bg-core-card border border-core-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-core-text mb-4">Subscription Tiers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5].map(tier => {
            const isActive = currentTier >= tier
            return (
              <div key={tier} className={`bg-core-bg border rounded-lg p-4 ${isActive ? 'border-core-green/30' : 'border-core-border'}`}>
                <div className={`text-sm font-semibold mb-1 ${isActive ? 'text-core-green' : 'text-core-text'}`}>
                  {TIER_NAMES[tier]}
                </div>
                <div className="text-xl font-bold text-core-text mb-3">{TIER_PRICES[tier]}</div>
                {isActive ? (
                  <span className="text-xs text-core-green font-medium">Current</span>
                ) : (
                  <button
                    onClick={() => handleUpgrade(tier)}
                    disabled={upgrading === tier}
                    className="w-full py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: upgrading === tier ? '#374151' : 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
                      color: '#0c1220',
                      border: 'none',
                      cursor: upgrading === tier ? 'not-allowed' : 'pointer',
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

      {/* Spark Credits */}
      <div className="bg-core-card border border-core-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-core-text">Spark Credits</h2>
            <p className="text-xs text-core-text-muted mt-1">$0.01 per MCP tool call · Buy packs for bulk savings</p>
          </div>
          <div className="bg-core-green/10 border border-core-green/20 rounded-lg px-4 py-2 text-center">
            <div className="text-xs text-core-green font-semibold">Balance</div>
            <div className="text-xl font-bold text-core-green font-mono">
              {data?.balance?.balance?.toLocaleString() || '0'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {SPARK_PACKS.map(pack => (
            <div key={pack.id} className="bg-core-bg border border-core-border rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-core-amber font-mono">{pack.sparks}</div>
              <div className="text-xs text-core-text-muted mb-3">sparks</div>
              <button
                onClick={() => handleBuyPack(pack.id)}
                disabled={buyingPack === pack.id}
                className="w-full py-1.5 rounded-md text-xs font-semibold border transition-all"
                style={{
                  background: buyingPack === pack.id ? '#374151' : 'rgba(217,119,6,0.1)',
                  borderColor: 'rgba(217,119,6,0.2)',
                  color: '#d97706',
                  cursor: buyingPack === pack.id ? 'not-allowed' : 'pointer',
                }}
              >
                {buyingPack === pack.id ? '...' : pack.price}
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-6 pt-3 border-t border-core-border">
          <div>
            <div className="text-xs text-core-text-muted mb-0.5">Lifetime Earned</div>
            <div className="text-sm font-bold text-core-text font-mono">{data?.balance?.lifetime_earned?.toLocaleString() || '0'}</div>
          </div>
          <div>
            <div className="text-xs text-core-text-muted mb-0.5">Lifetime Spent</div>
            <div className="text-sm font-bold text-core-text font-mono">{data?.balance?.lifetime_spent?.toLocaleString() || '0'}</div>
          </div>
          <div>
            <div className="text-xs text-core-text-muted mb-0.5">Stripe Customer</div>
            <div className="text-sm font-bold text-core-text font-mono">
              {data?.balance?.stripe_customer_id ? `${data.balance.stripe_customer_id.slice(0, 12)}...` : 'NA'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
