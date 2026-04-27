'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  CreditCard,
  DollarSign,
  Package,
  Tag,
  Zap,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ShieldCheck,
  Loader2,
  ExternalLink,
} from 'lucide-react'

interface StripeData {
  balance: {
    available: { amount: number; currency: string }[]
    pending: { amount: number; currency: string }[]
  }
  products: { id: string; name: string; active: boolean }[]
  prices: {
    id: string
    product: string
    unit_amount: number | null
    currency: string
    recurring: { interval: string } | null
    nickname: string | null
  }[]
  recent_events: { id: string; type: string; created: number }[]
  webhook_logs: {
    id: string
    event_id: string
    event_type: string
    customer_id: string
    status: string
    amount: number
    processed: boolean
    created_at: string
  }[]
}

const TIERS = [
  { name: 'Starter', price: '$19/mo', priceId: 'price_1T1rY5HThmAuKVQMEvWdsvcy' },
  { name: 'Pro', price: '$49/mo', priceId: 'price_1T1rYYHThmAuKVQMZIOi4kdq' },
  { name: 'Unlimited', price: '$99/mo', priceId: 'price_1T1rYiHThmAuKVQMsUKlhrSq' },
]

export default function StripeTestPage() {
  const [data, setData] = useState<StripeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  // Plan override state
  const [overrideEmail, setOverrideEmail] = useState('')
  const [overridePlan, setOverridePlan] = useState('starter')
  const [overrideResult, setOverrideResult] = useState('')
  const [overrideLoading, setOverrideLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/stripe-status')
      if (res.status === 401 || res.status === 403) {
        setError('Admin access required')
        setIsAdmin(false)
        return
      }
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      setData(json)
      setIsAdmin(true)
    } catch (err) {
      setError('Failed to load Stripe data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleOverride = async () => {
    if (!overrideEmail) return
    setOverrideLoading(true)
    setOverrideResult('')
    try {
      const res = await fetch('/api/admin/stripe-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: overrideEmail, plan: overridePlan, tier_level: overridePlan === 'starter' ? 1 : overridePlan === 'pro' ? 2 : 3 }),
      })
      const json = await res.json()
      if (json.success) {
        setOverrideResult(`Updated ${json.profile.email} to ${json.profile.plan}`)
      } else {
        setOverrideResult(`Error: ${json.error}`)
      }
    } catch {
      setOverrideResult('Failed to update')
    } finally {
      setOverrideLoading(false)
    }
  }

  const handleTestCheckout = async (priceId: string) => {
    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const json = await res.json()
      if (json.url) window.open(json.url, '_blank')
      else alert(json.error || 'Could not create checkout session')
    } catch {
      alert('Checkout failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#7ed957] animate-spin" />
      </div>
    )
  }

  if (error || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ShieldCheck className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-white font-bold text-lg mb-1">Access Denied</p>
          <p className="text-zinc-400 text-sm">{error || 'Admin access required'}</p>
        </div>
      </div>
    )
  }

  const availableBalance = data?.balance.available[0]?.amount ?? 0
  const pendingBalance = data?.balance.pending[0]?.amount ?? 0

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-[#7ed957]" />
            Stripe Admin Test
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Connection status, products, and webhook logs</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.06] text-zinc-300 text-sm hover:bg-white/[0.1] transition-colors">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-5 h-5 text-[#7ed957]" />
            <span className="text-sm text-zinc-400">Available Balance</span>
          </div>
          <p className="text-3xl font-bold text-white">${(availableBalance / 100).toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-zinc-400">Pending Balance</span>
          </div>
          <p className="text-3xl font-bold text-white">${(pendingBalance / 100).toFixed(2)}</p>
        </div>
      </div>

      {/* Products & Prices */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-[#7ed957]" />
          Products ({data?.products.length})
        </h2>
        <div className="space-y-2">
          {data?.products.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-sm text-white">{p.name}</span>
              <span className="text-xs text-zinc-500 font-mono">{p.id}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Test Checkout */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-[#7ed957]" />
          Test Checkout
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TIERS.map((tier) => (
            <button
              key={tier.priceId}
              onClick={() => handleTestCheckout(tier.priceId)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-[#7ed957]/40 hover:bg-[#7ed957]/5 transition-all cursor-pointer"
            >
              <Tag className="w-5 h-5 text-[#7ed957]" />
              <span className="text-white font-bold">{tier.name}</span>
              <span className="text-zinc-400 text-sm">{tier.price}</span>
              <span className="text-xs text-zinc-600 font-mono">{tier.priceId}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Manual Plan Override */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-[#7ed957]" />
          Manual Plan Override
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="email"
              placeholder="User email"
              value={overrideEmail}
              onChange={(e) => setOverrideEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-[#7ed957]/40"
            />
          </div>
          <select
            value={overridePlan}
            onChange={(e) => setOverridePlan(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm focus:outline-none focus:border-[#7ed957]/40"
          >
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="unlimited">Unlimited</option>
          </select>
          <button
            onClick={handleOverride}
            disabled={overrideLoading || !overrideEmail}
            className="px-5 py-2.5 rounded-xl bg-[#7ed957] text-black text-sm font-bold hover:bg-[#7ed957]/90 transition-colors disabled:opacity-50"
          >
            {overrideLoading ? 'Updating...' : 'Set Plan'}
          </button>
        </div>
        {overrideResult && (
          <p className={`mt-3 text-sm ${overrideResult.startsWith('Error') ? 'text-red-400' : 'text-[#7ed957]'}`}>
            {overrideResult}
          </p>
        )}
      </div>

      {/* Webhook Logs */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <ExternalLink className="w-5 h-5 text-[#7ed957]" />
          Webhook Logs ({data?.webhook_logs.length ?? 0})
        </h2>
        {data?.webhook_logs.length === 0 ? (
          <p className="text-zinc-500 text-sm">No webhook logs yet. Events will appear after Stripe sends webhooks.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500 border-b border-white/[0.06]">
                  <th className="pb-2 pr-4">Event Type</th>
                  <th className="pb-2 pr-4">Customer</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {data?.webhook_logs.map((log) => (
                  <tr key={log.id} className="border-b border-white/[0.04]">
                    <td className="py-2 pr-4 text-white font-mono text-xs">{log.event_type}</td>
                    <td className="py-2 pr-4 text-zinc-400 font-mono text-xs">{log.customer_id || '-'}</td>
                    <td className="py-2 pr-4 text-zinc-300">{log.amount ? `$${(log.amount / 100).toFixed(2)}` : '-'}</td>
                    <td className="py-2 pr-4">
                      {log.processed ? (
                        <span className="inline-flex items-center gap-1 text-[#7ed957] text-xs">
                          <CheckCircle className="w-3 h-3" /> Processed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-yellow-400 text-xs">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-zinc-500 text-xs">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Stripe Events */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-[#7ed957]" />
          Recent Stripe Events ({data?.recent_events.length ?? 0})
        </h2>
        <div className="space-y-1">
          {data?.recent_events.map((e) => (
            <div key={e.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/[0.02]">
              <span className="text-xs text-white font-mono">{e.type}</span>
              <span className="text-xs text-zinc-500">{new Date(e.created * 1000).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
