'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, Loader2, ExternalLink } from 'lucide-react'

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

// Tailwind-safe color classes mapped per tier
const TIER_COLOR_CLASS: Record<number, { text: string; border: string; bg: string; bar: string; badge: string; badgeBorder: string }> = {
  0: { text: 'text-core-text-muted', border: 'border-core-border', bg: 'bg-transparent', bar: 'bg-core-text-muted', badge: 'bg-core-text-muted/10', badgeBorder: 'border-core-text-muted/30' },
  1: { text: 'text-blue-400', border: 'border-blue-400/30', bg: 'bg-blue-400/5', bar: 'bg-blue-400', badge: 'bg-blue-400/10', badgeBorder: 'border-blue-400/30' },
  2: { text: 'text-violet-400', border: 'border-violet-400/30', bg: 'bg-violet-400/5', bar: 'bg-violet-400', badge: 'bg-violet-400/10', badgeBorder: 'border-violet-400/30' },
  3: { text: 'text-amber-400', border: 'border-amber-400/30', bg: 'bg-amber-400/5', bar: 'bg-amber-400', badge: 'bg-amber-400/10', badgeBorder: 'border-amber-400/30' },
  4: { text: 'text-orange-400', border: 'border-orange-400/30', bg: 'bg-orange-400/5', bar: 'bg-orange-400', badge: 'bg-orange-400/10', badgeBorder: 'border-orange-400/30' },
  5: { text: 'text-core-green', border: 'border-core-green/30', bg: 'bg-core-green/5', bar: 'bg-core-green', badge: 'bg-core-green/10', badgeBorder: 'border-core-green/30' },
}

const TIER_FEATURES: Record<number, string[]> = {
  1: ['AI Chat', '500 contacts', '1 pipeline', '1 K-Layer'],
  2: ['Everything in T1', '2,500 contacts', '3 pipelines', '3 K-Layers', 'Automations'],
  3: ['Everything in T2', '10K contacts', 'Unlimited pipelines', '5 K-Layers', 'Voice AI', 'Analytics'],
  4: ['Everything in T3', '50K contacts', 'All K-Layers', 'White label', 'API access', 'Priority support'],
  5: ['Everything in T4', 'Unlimited', 'Custom branding', 'Dedicated success manager', 'Enterprise SLA'],
}

const SPARK_PACKS = [
  { id: 'starter', name: 'Starter', sparks: 50, price: '$5', colorText: 'text-blue-400', colorBg: 'bg-blue-400/10', colorBorder: 'border-blue-400/30', colorBar: 'bg-blue-400', popular: false },
  { id: 'builder', name: 'Builder', sparks: 250, price: '$20', colorText: 'text-violet-400', colorBg: 'bg-violet-400/10', colorBorder: 'border-violet-400/30', colorBar: 'bg-violet-400', popular: true },
  { id: 'pro', name: 'Pro', sparks: 750, price: '$50', colorText: 'text-amber-400', colorBg: 'bg-amber-400/10', colorBorder: 'border-amber-400/30', colorBar: 'bg-amber-400', popular: false },
  { id: 'unlimited', name: 'Unlimited', sparks: 2000, price: '$100', colorText: 'text-core-green', colorBg: 'bg-core-green/10', colorBorder: 'border-core-green/30', colorBar: 'bg-core-green', popular: false },
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
  const tierColors = TIER_COLOR_CLASS[currentTier]

  if (loading) {
    return (
      <div className="flex justify-center pt-16">
        <Loader2 className="w-8 h-8 animate-spin text-core-green" />
      </div>
    )
  }

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-[22px] font-bold text-core-text mb-1">Billing</h1>
        <p className="text-[13px] text-core-text-muted">Manage your subscription, credits, and payment.</p>
      </div>

      {/* Current Plan */}
      <div className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 mb-5">
        {/* Top accent bar */}
        <div className={`absolute top-0 left-0 right-0 h-0.5 ${tierColors.bar}`} />

        <div className="flex justify-between items-center mb-5">
          <h2 className="text-base font-bold text-core-text">Current Plan</h2>
          <span className={`font-mono text-[11px] px-3.5 py-1 rounded-full font-semibold ${tierColors.badge} border ${tierColors.badgeBorder} ${tierColors.text}`}>
            {TIER_NAMES[currentTier]}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Tier', value: String(currentTier), sub: TIER_NAMES[currentTier], colorClass: 'text-core-cyan' },
            { label: 'Price', value: TIER_PRICES[currentTier], sub: '', colorClass: 'text-core-text' },
            { label: 'Status', value: data?.subscription?.status === 'active' ? 'Active' : 'Free', sub: '', colorClass: data?.subscription?.status === 'active' ? 'text-core-green' : 'text-core-text-muted' },
            { label: 'K-Layers', value: `${data?.kLayers || 0}/7`, sub: '', colorClass: 'text-core-cyan' },
          ].map(s => (
            <div key={s.label} className="bg-black/20 border border-white/[0.04] rounded-xl px-3.5 py-4">
              <div className="text-[11px] text-core-text-muted mb-1.5">{s.label}</div>
              <div className={`text-2xl font-extrabold font-mono ${s.colorClass}`}>{s.value}</div>
              {s.sub && <div className="text-[11px] text-core-text-muted mt-1">{s.sub}</div>}
            </div>
          ))}
        </div>

        {data?.subscription?.current_period_end && (
          <p className="text-[11px] text-core-text-muted mt-3">
            Renews: {new Date(data.subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Subscription Tiers */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 mb-5">
        <h2 className="text-base font-bold text-core-text mb-4">Subscription Tiers</h2>
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(tier => {
            const isActive = currentTier >= tier
            const tc = TIER_COLOR_CLASS[tier]
            return (
              <div
                key={tier}
                className={[
                  'relative overflow-hidden rounded-[14px] p-[18px] transition-all duration-200',
                  isActive
                    ? `${tc.bg} border ${tc.border}`
                    : 'bg-black/20 border border-white/[0.04] hover:-translate-y-0.5',
                ].join(' ')}
              >
                {/* Top accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${tc.bar} ${isActive ? 'opacity-100' : 'opacity-30'}`} />

                <div className={`text-[13px] font-bold mb-1 ${isActive ? tc.text : 'text-core-text'}`}>
                  {TIER_NAMES[tier]}
                </div>
                <div className="text-[22px] font-extrabold text-core-text font-mono mb-3">
                  {TIER_PRICES[tier]}
                </div>

                <div className="mb-3.5">
                  {(TIER_FEATURES[tier] || []).map(f => (
                    <div key={f} className="flex items-center gap-1.5 text-[10px] text-core-text-muted leading-[1.8]">
                      <span className={`text-[8px] ${tc.text}`}>●</span> {f}
                    </div>
                  ))}
                </div>

                {isActive ? (
                  <div className={`w-full py-2 text-center font-mono text-[10px] font-semibold tracking-[0.06em] flex items-center justify-center gap-1.5 ${tc.text}`}>
                    <Check className="w-3 h-3" />
                    ACTIVE
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(tier)}
                    disabled={upgrading === tier}
                    className={[
                      'w-full py-[9px] rounded-lg text-[12px] font-bold font-mono tracking-[0.04em] transition-all duration-150',
                      upgrading === tier
                        ? 'bg-core-surface text-core-text-muted cursor-wait'
                        : `${tc.bg} border ${tc.border} ${tc.text} hover:brightness-125 cursor-pointer`,
                    ].join(' ')}
                  >
                    {upgrading === tier ? 'REDIRECTING...' : 'UPGRADE'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Spark Credits */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 mb-5">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-base font-bold text-core-text mb-1">Spark Credits</h2>
            <p className="text-[11px] text-core-text-muted">$0.01 per MCP tool call · Buy packs for bulk savings</p>
          </div>
          <div className="bg-core-green/[0.08] border border-core-green/20 rounded-xl px-5 py-2.5 text-center">
            <div className="font-mono text-[9px] text-core-green tracking-[0.08em] mb-0.5">BALANCE</div>
            <div className="text-[26px] font-extrabold text-core-green font-mono">
              {data?.balance?.balance?.toLocaleString() || '0'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {SPARK_PACKS.map(pack => (
            <div
              key={pack.id}
              className={[
                'relative overflow-hidden rounded-[14px] px-4 py-5 text-center transition-all duration-200 bg-black/20 border hover:-translate-y-0.5',
                pack.popular ? pack.colorBorder : 'border-white/[0.04]',
              ].join(' ')}
            >
              {pack.popular && (
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${pack.colorBar}`} />
              )}
              {pack.popular && (
                <span className={`absolute top-1.5 right-1.5 font-mono text-[7px] px-1.5 py-0.5 rounded font-bold tracking-[0.06em] ${pack.colorBg} ${pack.colorText}`}>
                  BEST
                </span>
              )}
              <div className={`text-[10px] font-mono mb-1 tracking-[0.04em] text-core-text-muted`}>{pack.name}</div>
              <div className={`text-[28px] font-extrabold font-mono mb-0.5 ${pack.colorText}`}>{pack.sparks.toLocaleString()}</div>
              <div className="text-[10px] text-core-text-muted mb-3.5">sparks</div>
              <button
                onClick={() => handleBuyPack(pack.id)}
                disabled={buyingPack === pack.id}
                className={[
                  'w-full py-2 rounded-lg font-mono font-bold text-[13px] transition-all duration-150 border',
                  buyingPack === pack.id
                    ? 'bg-core-surface text-core-text-muted border-core-border cursor-wait'
                    : `${pack.colorBg} ${pack.colorBorder} ${pack.colorText} hover:brightness-125 cursor-pointer`,
                ].join(' ')}
              >
                {buyingPack === pack.id ? '...' : pack.price}
              </button>
            </div>
          ))}
        </div>

        {/* Lifetime stats */}
        <div className="flex gap-8 pt-4 border-t border-white/[0.04]">
          {[
            { label: 'Lifetime Earned', value: data?.balance?.lifetime_earned?.toLocaleString() || '0' },
            { label: 'Lifetime Spent', value: data?.balance?.lifetime_spent?.toLocaleString() || '0' },
            { label: 'Stripe Customer', value: data?.balance?.stripe_customer_id ? data.balance.stripe_customer_id.slice(0, 14) + '...' : 'Not set' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-[10px] text-core-text-muted mb-1">{s.label}</div>
              <div className="text-[13px] font-bold text-core-text font-mono">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Manage Billing */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
        <h2 className="text-base font-bold text-core-text mb-3">Manage Billing</h2>
        <p className="text-[13px] text-core-text-muted mb-4">
          Update payment methods, view invoices, or cancel your subscription through Stripe.
        </p>
        <button
          onClick={async () => {
            const res = await fetch('/api/billing/portal', { method: 'POST' })
            const { url } = await res.json()
            if (url) window.location.href = url
          }}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border border-white/10 bg-white/[0.04] text-core-text text-[13px] font-semibold cursor-pointer transition-all duration-150 hover:bg-white/[0.08] hover:border-white/20"
        >
          Open Billing Portal
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
