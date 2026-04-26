'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  CreditCard, Loader2, AlertTriangle, RefreshCw, ArrowRightLeft,
  Repeat, CheckCircle, Clock, XCircle,
} from 'lucide-react'
import * as crm from '@/lib/crm/sdk'

type Tab = 'transactions' | 'subscriptions'

interface Transaction {
  id: string
  amount: number
  status: string
  createdAt: string
}

interface Subscription {
  id: string
  name: string
  status: string
  amount: number
}

export default function PaymentsPage() {
  const [tab, setTab] = useState<Tab>('transactions')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await crm.payments.list({ limit: 50 })
      setTransactions(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    }
    setLoading(false)
  }, [])

  const loadSubscriptions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await crm.payments.subscriptions({ limit: 50 })
      setSubscriptions(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'transactions') loadTransactions()
    else loadSubscriptions()
  }, [tab, loadTransactions, loadSubscriptions])

  const handleRefresh = async () => {
    if (tab === 'transactions') await loadTransactions()
    else await loadSubscriptions()
    toast.success('Payments refreshed')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount / 100)
  }

  const statusBadge = (status: string) => {
    const s = status?.toLowerCase()
    if (s === 'succeeded' || s === 'paid' || s === 'active' || s === 'completed') return 'bg-[#7ed957]/10 text-[#7ed957]'
    if (s === 'pending' || s === 'processing') return 'bg-yellow-500/10 text-yellow-400'
    if (s === 'failed' || s === 'cancelled' || s === 'canceled') return 'bg-red-500/10 text-red-400'
    return 'bg-white/[0.06] text-white/40'
  }

  const statusIcon = (status: string) => {
    const s = status?.toLowerCase()
    if (s === 'succeeded' || s === 'paid' || s === 'active' || s === 'completed') return <CheckCircle className="w-3 h-3" />
    if (s === 'pending' || s === 'processing') return <Clock className="w-3 h-3" />
    if (s === 'failed' || s === 'cancelled' || s === 'canceled') return <XCircle className="w-3 h-3" />
    return null
  }

  const TABS: { key: Tab; label: string; Icon: typeof ArrowRightLeft }[] = [
    { key: 'transactions', label: 'Transactions', Icon: ArrowRightLeft },
    { key: 'subscriptions', label: 'Subscriptions', Icon: Repeat },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#7ed957]" />
            Payments
          </h1>
          <p className="text-xs text-white/40 mt-1">
            Transaction history and active subscriptions
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-transparent text-white/50 text-xs font-medium cursor-pointer hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-white/[0.02] border border-white/[0.06] rounded-xl">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer border-none transition-colors ${
              tab === t.key
                ? 'bg-[#7ed957]/10 text-[#7ed957] font-semibold'
                : 'bg-transparent text-white/40 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <t.Icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#7ed957]" />
        </div>
      )}

      {/* Transactions Table */}
      {!loading && tab === 'transactions' && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          {transactions.length === 0 ? (
            <div className="text-center py-16">
              <ArrowRightLeft className="w-10 h-10 mx-auto text-white/10 mb-3" />
              <p className="text-white/40 text-sm">No transactions found</p>
              <p className="text-white/20 text-xs mt-1">Payments will appear here as they are processed</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Transaction ID</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-white/60">{tx.id.slice(0, 16)}...</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-white font-mono">{formatCurrency(tx.amount)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusBadge(tx.status)}`}>
                        {statusIcon(tx.status)}
                        {tx.status?.charAt(0).toUpperCase() + tx.status?.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Subscriptions Table */}
      {!loading && tab === 'subscriptions' && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          {subscriptions.length === 0 ? (
            <div className="text-center py-16">
              <Repeat className="w-10 h-10 mx-auto text-white/10 mb-3" />
              <p className="text-white/40 text-sm">No active subscriptions</p>
              <p className="text-white/20 text-xs mt-1">Recurring billing will appear here</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Subscription</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">ID</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(sub => (
                  <tr key={sub.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-white">{sub.name || 'Unnamed'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-white font-mono">{formatCurrency(sub.amount)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusBadge(sub.status)}`}>
                        {statusIcon(sub.status)}
                        {sub.status?.charAt(0).toUpperCase() + sub.status?.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-white/30">{sub.id.slice(0, 16)}...</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
