'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  UserCheck,
  DollarSign,
  Clock,
  Link2,
  Copy,
  Check,
  Share2,
  Mail,
  BarChart2,
  Video,
} from 'lucide-react'

interface AffiliateStats {
  totalReferrals: number
  activeReferrals: number
  totalEarnings: number
  pendingPayout: number
  conversionRate: number
  referralLink: string
}

export default function AffiliatesPage() {
  const [stats, setStats] = useState<AffiliateStats>({
    totalReferrals: 0,
    activeReferrals: 0,
    totalEarnings: 0,
    pendingPayout: 0,
    conversionRate: 0,
    referralLink: '',
  })
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/affiliates/stats')
      .then(r => r.json())
      .then(d => { if (d.stats) setStats(d.stats) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function copyLink() {
    navigator.clipboard.writeText(
      stats.referralLink ||
        `https://0ncore.com/signup?ref=${btoa(Date.now().toString()).slice(0, 8)}`
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statCards = [
    {
      label: 'Total Referrals',
      value: stats.totalReferrals,
      icon: Users,
      colorClass: 'text-core-cyan',
    },
    {
      label: 'Active Customers',
      value: stats.activeReferrals,
      icon: UserCheck,
      colorClass: 'text-core-green',
    },
    {
      label: 'Total Earned',
      value: `$${stats.totalEarnings.toFixed(2)}`,
      icon: DollarSign,
      colorClass: 'text-core-purple',
    },
    {
      label: 'Pending Payout',
      value: `$${stats.pendingPayout.toFixed(2)}`,
      icon: Clock,
      colorClass: 'text-core-amber',
    },
  ]

  const commissionPlans = [
    { plan: 'Starter', price: '$80/mo', commission: '$24/mo', colorClass: 'text-core-cyan' },
    { plan: 'Pro',     price: '$180/mo', commission: '$54/mo', colorClass: 'text-core-purple' },
    { plan: 'Agency',  price: '$380/mo', commission: '$114/mo', colorClass: 'text-core-amber' },
  ]

  const materials = [
    {
      name: 'Social Media Kit',
      desc: 'Pre-written posts for LinkedIn, Twitter, Facebook',
      icon: Share2,
    },
    {
      name: 'Email Templates',
      desc: '3 email templates for cold outreach',
      icon: Mail,
    },
    {
      name: 'Comparison Sheet',
      desc: '0nCore vs OpenClaw vs competitors',
      icon: BarChart2,
    },
    {
      name: 'Demo Video Script',
      desc: 'Walk-through script for live demos',
      icon: Video,
    },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-core-text mb-1">Affiliate Program</h1>
        <p className="text-[13px] text-core-text-muted">
          Earn 30% recurring commission for every customer you refer to 0nCore.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {statCards.map(({ label, value, icon: Icon, colorClass }) => (
          <div
            key={label}
            className="bg-core-card border border-core-border rounded-xl p-5 text-center"
          >
            <Icon className={`w-5 h-5 mx-auto mb-2 ${colorClass}`} />
            <div className={`text-[28px] font-extrabold ${colorClass}`}>{value}</div>
            <div className="text-[11px] text-core-text-muted mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Referral Link */}
      <div className="bg-core-card border border-core-border rounded-2xl p-6 mb-6">
        <h3 className="text-[15px] font-bold text-core-text mb-3 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-core-cyan" />
          Your Referral Link
        </h3>
        <div className="flex gap-2.5">
          <input
            readOnly
            value={stats.referralLink || 'https://0ncore.com/signup?ref=...'}
            className="flex-1 px-4 py-3 bg-core-surface border border-core-border rounded-xl text-[14px] text-core-text-dim focus:outline-none"
          />
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-5 py-3 bg-core-cyan text-core-bg font-bold text-[13px] rounded-xl hover:opacity-90 transition-opacity"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Link
              </>
            )}
          </button>
        </div>
        <p className="text-[12px] text-core-text-muted mt-2.5">
          Share this link anywhere. When someone signs up and subscribes, you earn 30% of their
          monthly payment — every month they stay.
        </p>
      </div>

      {/* Commission Structure */}
      <div className="bg-core-card border border-core-border rounded-2xl p-6 mb-6">
        <h3 className="text-[15px] font-bold text-core-text mb-4">Commission Structure</h3>
        <div className="grid grid-cols-3 gap-3">
          {commissionPlans.map(({ plan, price, commission, colorClass }) => (
            <div
              key={plan}
              className="bg-core-surface border border-core-border rounded-xl p-4 text-center"
            >
              <div className="text-[13px] font-semibold text-core-text mb-1">{plan}</div>
              <div className="text-[11px] text-core-text-muted mb-2">{price}</div>
              <div className={`text-[20px] font-extrabold ${colorClass}`}>{commission}</div>
              <div className="text-[10px] text-core-text-muted mt-0.5">recurring</div>
            </div>
          ))}
        </div>
        <p className="text-[12px] text-core-text-muted mt-3.5 text-center">
          10 Agency referrals = $1,140/mo passive income
        </p>
      </div>

      {/* Marketing Materials */}
      <div className="bg-core-card border border-core-border rounded-2xl p-6 mb-6">
        <h3 className="text-[15px] font-bold text-core-text mb-4">Marketing Materials</h3>
        <div className="grid grid-cols-2 gap-3">
          {materials.map(({ name, desc, icon: Icon }) => (
            <div
              key={name}
              className="bg-core-surface border border-core-border rounded-xl px-4 py-3.5 flex gap-3 items-center cursor-pointer transition-colors hover:border-core-cyan/30"
            >
              <Icon className="w-5 h-5 text-core-cyan flex-shrink-0" />
              <div>
                <div className="text-[13px] font-semibold text-core-text">{name}</div>
                <div className="text-[11px] text-core-text-muted">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payout Info */}
      <div className="bg-core-cyan/5 border border-core-cyan/20 rounded-2xl p-6 text-center">
        <h3 className="text-[15px] font-bold text-core-cyan mb-2">Payouts</h3>
        <p className="text-[13px] text-core-text-dim leading-relaxed">
          Commissions are paid monthly via Stripe or PayPal. Minimum payout: $50.
          30-day cookie window. Lifetime recurring commission on every referral.
        </p>
      </div>
    </div>
  )
}
