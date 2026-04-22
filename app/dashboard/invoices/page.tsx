'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  Send,
  Download,
  X,
} from 'lucide-react'

type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'draft'

interface InvoiceItem {
  description: string
  amount: number
}

interface Invoice {
  id: string
  number: string
  client: string
  clientInitials: string
  amount: number
  status: InvoiceStatus
  date: string
  dueDate: string
  items: InvoiceItem[]
}

const statusClasses: Record<InvoiceStatus, string> = {
  paid: 'bg-core-green/10 text-core-green',
  pending: 'bg-core-amber/10 text-core-amber',
  overdue: 'bg-core-red/10 text-core-red',
  draft: 'bg-core-text-muted/10 text-core-text-muted',
}

const mockInvoices: Invoice[] = []

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
}

function normalizeStatus(s: string): InvoiceStatus {
  const lower = s.toLowerCase()
  if (lower === 'paid' || lower === 'collected') return 'paid'
  if (lower === 'sent' || lower === 'pending' || lower === 'viewed') return 'pending'
  if (lower === 'overdue' || lower === 'past_due') return 'overdue'
  return 'draft'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCrmInvoices(crmInvoices: any[]): Invoice[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return crmInvoices.map((inv: any) => {
    const contactName = inv.contactName || inv.contact?.name || inv.businessDetails?.name || 'Unknown'
    const items = (inv.items || inv.lineItems || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item: any) => ({
        description: item.name || item.description || 'Item',
        amount: item.amount || item.price || 0,
      })
    )
    const total = inv.total || inv.amountDue || items.reduce((s: number, i: InvoiceItem) => s + i.amount, 0)

    return {
      id: inv.id || inv._id,
      number: inv.invoiceNumber || inv.number || `INV-${inv.id?.substring(0, 4)}`,
      client: contactName,
      clientInitials: getInitials(contactName),
      amount: total,
      status: normalizeStatus(inv.status || 'draft'),
      date: inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
      dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
      items,
    }
  })
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [newItems, setNewItems] = useState<InvoiceItem[]>([{ description: '', amount: 0 }])
  const [newClient, setNewClient] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchInvoices()
  }, [])

  async function fetchInvoices() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/crm/invoices')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch invoices')
      const mapped = mapCrmInvoices(data.invoices || [])
      if (mapped.length > 0) {
        setInvoices(mapped)
      }
      // Keep empty state if API returns empty
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateInvoice() {
    if (!newClient.trim() || newItems.every(i => !i.description.trim())) return
    setCreating(true)
    try {
      const res = await fetch('/api/crm/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Invoice for ${newClient}`,
          items: newItems.filter(i => i.description.trim()),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create invoice')
      }
      setShowCreate(false)
      setNewClient('')
      setNewItems([{ description: '', amount: 0 }])
      fetchInvoices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice')
    } finally {
      setCreating(false)
    }
  }

  const filtered = invoices
    .filter((inv) => statusFilter === 'all' || inv.status === statusFilter)
    .filter((inv) =>
      !searchQuery ||
      inv.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.client.toLowerCase().includes(searchQuery.toLowerCase())
    )

  const totalRevenue = invoices.reduce((s, i) => s + i.amount, 0)
  const paidTotal = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const pendingTotal = invoices.filter((i) => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
  const overdueTotal = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)

  const newSubtotal = newItems.reduce((s, i) => s + i.amount, 0)
  const newTax = Math.round(newSubtotal * 0.07 * 100) / 100
  const newTotal = newSubtotal + newTax

  const addItem = () => setNewItems([...newItems, { description: '', amount: 0 }])

  const stats = [
    { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, accent: 'green', Icon: DollarSign },
    { label: 'Paid', value: `$${paidTotal.toLocaleString()}`, accent: 'green', Icon: CheckCircle },
    { label: 'Pending', value: `$${pendingTotal.toLocaleString()}`, accent: 'amber', Icon: Clock },
    { label: 'Overdue', value: `$${overdueTotal.toLocaleString()}`, accent: 'purple', Icon: AlertTriangle },
  ]

  return (
    <div>
      {/* Page Header */}
      <div className="jp-page-header flex items-start justify-between">
        <div>
          <h1 className="jp-page-title">Invoices</h1>
          <p className="jp-page-subtitle">
            {loading ? 'Loading invoices...' : error ? 'No invoices yet' : 'Create, send, and track client invoices'}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-[22px] py-2.5 bg-core-green text-black rounded-[var(--jp-radius-sm)] text-[0.8125rem] font-bold cursor-pointer border-none"
        >
          <Plus size={14} strokeWidth={2.5} />
          Create Invoice
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between mb-4 px-3.5 py-2 rounded-lg bg-core-red/[0.08] border border-core-red/20 text-[0.8125rem] text-core-red">
          <span>{error}</span>
          <button
            onClick={fetchInvoices}
            className="bg-transparent border-none text-core-cyan text-[0.8125rem] font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="jp-stat-grid mb-6">
        {stats.map(({ label, value, accent, Icon }) => (
          <div key={label} className={`jp-stat-card ${accent}`}>
            <div className="jp-stat-header">
              <span className="jp-stat-label">{label}</span>
              <div className={`jp-stat-icon ${accent}`}>
                <Icon size={18} strokeWidth={1.75} />
              </div>
            </div>
            <div className="jp-stat-value">{value}</div>
          </div>
        ))}
      </div>

      {/* Create Invoice Form */}
      {showCreate && (
        <div className="jp-card mb-6">
          <div className="jp-card-header">
            <h3 className="text-[0.875rem] font-semibold text-core-text m-0">New Invoice</h3>
            <button className="jp-header-btn" onClick={() => setShowCreate(false)}>
              <X size={16} strokeWidth={2} />
            </button>
          </div>
          <div className="jp-card-body flex flex-col gap-4">
            {/* Client Name */}
            <div>
              <label className="block text-[0.8125rem] font-semibold text-core-text mb-1.5">
                Client Name
              </label>
              <input
                type="text"
                className="jp-search-input w-full max-w-[400px] pl-3.5"
                placeholder="Enter client name"
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
              />
            </div>

            {/* Line Items */}
            <div>
              <label className="block text-[0.8125rem] font-semibold text-core-text mb-1.5">
                Line Items
              </label>
              <div className="flex flex-col gap-2">
                {newItems.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      className="jp-search-input flex-1 pl-3.5"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => {
                        const copy = [...newItems]
                        copy[i].description = e.target.value
                        setNewItems(copy)
                      }}
                    />
                    <input
                      type="number"
                      className="jp-search-input w-[120px] pl-3.5"
                      placeholder="Amount"
                      value={item.amount || ''}
                      onChange={(e) => {
                        const copy = [...newItems]
                        copy[i].amount = parseFloat(e.target.value) || 0
                        setNewItems(copy)
                      }}
                    />
                    {newItems.length > 1 && (
                      <button
                        className="jp-header-btn w-8 h-8 shrink-0"
                        onClick={() => setNewItems(newItems.filter((_, j) => j !== i))}
                      >
                        <X size={14} strokeWidth={2} className="text-core-red" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addItem}
                  className="px-3.5 py-[7px] bg-transparent text-core-cyan border border-dashed border-core-border rounded-[var(--jp-radius-sm)] text-[0.8125rem] cursor-pointer w-fit"
                >
                  + Add Item
                </button>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-core-bg rounded-[var(--jp-radius-sm)] p-4 flex flex-col gap-1.5 max-w-[300px] ml-auto">
              <div className="flex justify-between text-[0.8125rem] text-core-text-dim">
                <span>Subtotal</span>
                <span>${newSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[0.8125rem] text-core-text-dim">
                <span>Tax (7%)</span>
                <span>${newTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-core-text pt-1.5 border-t border-core-border">
                <span>Total</span>
                <span>${newTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-5 py-[9px] bg-transparent text-core-text-dim border border-core-border rounded-[var(--jp-radius-sm)] text-[0.8125rem] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={creating}
                className="px-6 py-[9px] bg-core-green text-black border-none rounded-[var(--jp-radius-sm)] text-[0.8125rem] font-bold cursor-pointer disabled:opacity-70 disabled:cursor-wait"
              >
                {creating ? 'Creating...' : 'Send Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="jp-search flex-1 min-w-[200px] max-w-[360px]">
          <span className="jp-search-icon">
            <Search size={16} strokeWidth={1.75} />
          </span>
          <input
            type="text"
            className="jp-search-input w-full"
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'paid', 'pending', 'overdue', 'draft'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={[
                'px-3.5 py-[7px] rounded-[var(--jp-radius-sm)] text-[0.8125rem] font-medium cursor-pointer capitalize border transition-colors',
                statusFilter === s
                  ? 'bg-core-green/10 text-core-green border-core-green/30'
                  : 'bg-transparent text-core-text-dim border-core-border',
              ].join(' ')}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Spinner */}
      {loading && (
        <div className="flex justify-center p-10">
          <div className="w-8 h-8 border-2 border-core-green border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Invoice Table */}
      {!loading && (
        <div className="jp-card">
          {/* Table Header */}
          <div className="grid gap-3 px-5 py-3 border-b border-core-border text-[0.6875rem] font-semibold text-core-text-muted uppercase tracking-[0.05em]"
            style={{ gridTemplateColumns: '100px 1fr 100px 90px 120px 120px' }}
          >
            <span>Invoice #</span>
            <span>Client</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Date</span>
            <span>Actions</span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center text-core-text-muted text-[0.875rem]">
              No invoices found
            </div>
          ) : (
            filtered.map((inv) => (
              <div
                key={inv.id}
                className="grid gap-3 px-5 py-3.5 border-b border-core-border items-center transition-colors hover:bg-core-card-hover"
                style={{ gridTemplateColumns: '100px 1fr 100px 90px 120px 120px' }}
              >
                <span className="text-[0.875rem] font-semibold text-core-cyan">
                  {inv.number}
                </span>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-core-border flex items-center justify-center text-[0.6875rem] font-bold text-core-text-dim shrink-0">
                    {inv.clientInitials}
                  </div>
                  <span className="text-[0.875rem] text-core-text">{inv.client}</span>
                </div>
                <span className="text-[0.875rem] font-semibold text-core-text">
                  ${inv.amount.toLocaleString()}
                </span>
                <span className={`text-[0.6875rem] font-semibold px-2.5 py-[3px] rounded-[6px] capitalize inline-block w-fit ${statusClasses[inv.status]}`}>
                  {inv.status}
                </span>
                <span className="text-[0.8125rem] text-core-text-muted">{inv.date}</span>
                <div className="flex gap-0.5">
                  <button className="jp-header-btn w-[30px] h-[30px]" title="View">
                    <Eye size={14} strokeWidth={1.75} />
                  </button>
                  <button className="jp-header-btn w-[30px] h-[30px]" title="Send">
                    <Send size={14} strokeWidth={1.75} />
                  </button>
                  <button className="jp-header-btn w-[30px] h-[30px]" title="Download">
                    <Download size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
