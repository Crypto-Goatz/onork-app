'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, DollarSign, Download, Package, TrendingUp, Loader2, ExternalLink } from 'lucide-react'

interface VendorData {
  summary: {
    total_revenue_cents: number
    total_payouts_cents: number
    pending_payouts_cents: number
    total_sales: number
    total_installs: number
    app_count: number
  }
  apps: {
    id: string
    slug: string
    name: string
    status: string
    review_status: string
    installs: number
    active_installs: number
    avg_rating: number | null
    review_count: number
    price_cents: number
    created_at: string
  }[]
  recent_orders: {
    id: string
    amount_cents: number
    status: string
    created_at: string
    fulfilled_at: string | null
  }[]
  payouts: {
    id: string
    amount_cents: number
    stripe_transfer_id: string | null
    status: string
    created_at: string
  }[]
}

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function VendorDashboardPage() {
  const [data, setData] = useState<VendorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/whoami').then(r => r.json()).then(d => {
      const id = d.user_id || d.id || d.user?.id
      if (id) setUserId(id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!userId) return
    fetch(`/api/marketplace/vendor?user_id=${userId}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [userId])

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    )
  }

  const summary = data.summary

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/dashboard/marketplace" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-6 transition">
          <ArrowLeft className="h-4 w-4" /> Marketplace
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Vendor Dashboard</h1>
            <p className="text-white/60">Sales, payouts, and app performance.</p>
          </div>
          <Link
            href="/dashboard/marketplace/publish"
            className="bg-[#7ed957] hover:bg-[#6bc847] text-black font-semibold rounded-lg px-4 py-2.5 text-sm transition"
          >
            Publish New App
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <DollarSign className="h-5 w-5 text-[#7ed957] mb-3" />
            <div className="text-2xl font-bold">{dollars(summary.total_revenue_cents)}</div>
            <div className="text-xs text-white/50 mt-1">Total Revenue</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <DollarSign className="h-5 w-5 text-yellow-400 mb-3" />
            <div className="text-2xl font-bold">{dollars(summary.pending_payouts_cents)}</div>
            <div className="text-xs text-white/50 mt-1">Pending Payout</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <Download className="h-5 w-5 text-blue-400 mb-3" />
            <div className="text-2xl font-bold">{summary.total_installs}</div>
            <div className="text-xs text-white/50 mt-1">Total Installs</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <Package className="h-5 w-5 text-purple-400 mb-3" />
            <div className="text-2xl font-bold">{summary.app_count}</div>
            <div className="text-xs text-white/50 mt-1">Published Apps</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Your Apps
              </h3>
              {data.apps.length === 0 ? (
                <p className="text-sm text-white/50">No apps published yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.apps.map(app => (
                    <div key={app.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{app.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            app.status === 'active'
                              ? 'bg-[#7ed957]/20 text-[#7ed957]'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {app.status}
                          </span>
                          {app.review_status === 'pending' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">in review</span>
                          )}
                        </div>
                        <div className="text-xs text-white/50">
                          {app.installs} installs · {dollars(app.price_cents)} · {app.review_count} reviews
                        </div>
                      </div>
                      <Link href={`/dashboard/marketplace/${app.slug}`} className="text-xs text-[#7ed957] hover:underline flex items-center gap-1">
                        View <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <h3 className="font-semibold mb-4">Recent Sales</h3>
              {data.recent_orders.length === 0 ? (
                <p className="text-sm text-white/50">No sales yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.recent_orders.slice(0, 10).map(order => (
                    <div key={order.id} className="flex items-center justify-between text-sm py-2 border-b border-white/[0.04] last:border-0">
                      <div>
                        <div className="text-white/80">Order {order.id.slice(0, 8)}</div>
                        <div className="text-xs text-white/50">{new Date(order.created_at).toLocaleString()}</div>
                      </div>
                      <div className="text-[#7ed957] font-semibold">{dollars(order.amount_cents)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <h3 className="font-semibold mb-4">Payouts</h3>
              {data.payouts.length === 0 ? (
                <div className="text-sm text-white/50">
                  <p className="mb-3">No payouts yet.</p>
                  <p className="text-xs">Connect Stripe to receive payouts.</p>
                  <button className="mt-3 w-full bg-[#7ed957] hover:bg-[#6bc847] text-black font-semibold rounded-lg py-2 text-sm transition">
                    Connect Stripe
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.payouts.map(p => (
                    <div key={p.id} className="text-sm py-2 border-b border-white/[0.04] last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="text-white/80">{dollars(p.amount_cents)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          p.status === 'paid' ? 'bg-[#7ed957]/20 text-[#7ed957]' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="text-xs text-white/50 mt-1">{new Date(p.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#7ed957]/10 border border-[#7ed957]/30 rounded-xl p-5">
              <h3 className="font-semibold mb-2 text-[#7ed957]">Revenue Share</h3>
              <p className="text-sm text-white/80">You keep 70% of every sale. 0nCore takes 30% to cover hosting, support, and marketplace operations.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
