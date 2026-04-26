'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  FileText, Loader2, AlertTriangle, RefreshCw, Send, Ban,
  DollarSign, Clock, CheckCircle, Filter,
} from 'lucide-react'
import * as crm from '@/lib/crm/sdk'

type StatusFilter = 'all' | 'draft' | 'sent' | 'paid' | 'void' | 'overdue'

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [invoiceList, setInvoiceList] = useState<crm.Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: { limit: number; status?: string } = { limit: 50 }
      if (statusFilter !== 'all') params.status = statusFilter
      const data = await crm.invoices.list(params)
      setInvoiceList(data.invoices || [])
      setTotal(data.total || data.invoices?.length || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices')
    }
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { loadInvoices() }, [loadInvoices])

  const handleSend = async (id: string) => {
    setActionLoading(id)
    try {
      await crm.invoices.send(id)
      toast.success('Invoice sent')
      loadInvoices()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send')
    }
    setActionLoading(null)
  }

  const handleVoid = async (id: string) => {
    setActionLoading(id)
    try {
      await crm.invoices.void(id)
      toast.success('Invoice voided')
      loadInvoices()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to void')
    }
    setActionLoading(null)
  }

  const statusBadge = (status: string) => {
    const s = status?.toLowerCase()
    if (s === 'paid') return 'bg-[#7ed957]/10 text-[#7ed957]'
    if (s === 'sent' || s === 'pending') return 'bg-yellow-500/10 text-yellow-400'
    if (s === 'overdue') return 'bg-red-500/10 text-red-400'
    if (s === 'void' || s === 'voided') return 'bg-white/[0.06] text-white/30'
    if (s === 'draft') return 'bg-[#00d4ff]/10 text-[#00d4ff]'
    return 'bg-white/[0.06] text-white/40'
  }

  const formatCurrency = (amount: number, currency?: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount / 100)
  }

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'sent', label: 'Sent' },
    { key: 'paid', label: 'Paid' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'void', label: 'Void' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#7ed957]" />
            Invoices
          </h1>
          <p className="text-xs text-white/40 mt-1">
            {total} invoice{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <button
          onClick={() => loadInvoices()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-transparent text-white/50 text-xs font-medium cursor-pointer hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 mb-5 p-1 bg-white/[0.02] border border-white/[0.06] rounded-xl">
        <Filter className="w-3.5 h-3.5 text-white/30 ml-2 mr-1 shrink-0" />
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border-none transition-colors ${
              statusFilter === f.key
                ? 'bg-[#7ed957]/10 text-[#7ed957] font-semibold'
                : 'bg-transparent text-white/40 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {f.label}
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

      {/* Invoice Table */}
      {!loading && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          {invoiceList.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-10 h-10 mx-auto text-white/10 mb-3" />
              <p className="text-white/40 text-sm">No invoices found</p>
              <p className="text-white/20 text-xs mt-1">
                {statusFilter !== 'all' ? 'Try a different filter' : 'Invoices will appear once created in your CRM'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Invoice</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Due</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Due Date</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoiceList.map(inv => (
                  <tr key={inv._id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-white">{inv.name || 'Untitled'}</div>
                      <div className="text-[10px] text-white/30 mt-0.5 font-mono">{inv._id.slice(0, 12)}...</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-bold text-white font-mono">
                        {formatCurrency(inv.total, inv.currency)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white/60 font-mono">
                        {formatCurrency(inv.amountDue, inv.currency)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusBadge(inv.status)}`}>
                        {inv.status === 'paid' && <CheckCircle className="w-3 h-3" />}
                        {(inv.status === 'sent' || inv.status === 'pending') && <Clock className="w-3 h-3" />}
                        {inv.status === 'overdue' && <AlertTriangle className="w-3 h-3" />}
                        {inv.status?.charAt(0).toUpperCase() + inv.status?.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '--'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {inv.status !== 'paid' && inv.status !== 'void' && inv.status !== 'voided' && (
                          <>
                            <button
                              onClick={() => handleSend(inv._id)}
                              disabled={actionLoading === inv._id}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-[#00d4ff] bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border-none cursor-pointer transition-colors disabled:opacity-50"
                            >
                              {actionLoading === inv._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                              Send
                            </button>
                            <button
                              onClick={() => handleVoid(inv._id)}
                              disabled={actionLoading === inv._id}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border-none cursor-pointer transition-colors disabled:opacity-50"
                            >
                              <Ban className="w-3 h-3" />
                              Void
                            </button>
                          </>
                        )}
                      </div>
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
