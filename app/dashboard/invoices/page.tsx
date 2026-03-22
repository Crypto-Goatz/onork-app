'use client'

import { useState } from 'react'

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

const statusStyles: Record<InvoiceStatus, { color: string; bg: string }> = {
  paid: { color: 'var(--jp-green)', bg: 'var(--jp-green-glow)' },
  pending: { color: 'var(--jp-amber)', bg: 'rgba(251, 191, 36, 0.12)' },
  overdue: { color: 'var(--jp-red)', bg: 'rgba(248, 113, 113, 0.12)' },
  draft: { color: 'var(--jp-text-muted)', bg: 'rgba(96, 96, 96, 0.12)' },
}

const mockInvoices: Invoice[] = [
  {
    id: '1',
    number: 'INV-0047',
    client: 'Wallwork Hardscape',
    clientInitials: 'WH',
    amount: 2400,
    status: 'paid',
    date: 'Mar 20, 2026',
    dueDate: 'Mar 20, 2026',
    items: [
      { description: 'Website Redesign — Phase 1', amount: 1800 },
      { description: 'SEO Setup + 30 Pages', amount: 600 },
    ],
  },
  {
    id: '2',
    number: 'INV-0046',
    client: 'Spa Ligonier',
    clientInitials: 'SL',
    amount: 1250,
    status: 'pending',
    date: 'Mar 18, 2026',
    dueDate: 'Apr 1, 2026',
    items: [
      { description: 'Monthly CRM Management', amount: 750 },
      { description: 'Social Media Package', amount: 500 },
    ],
  },
  {
    id: '3',
    number: 'INV-0045',
    client: 'SXO Protocol',
    clientInitials: 'SX',
    amount: 4800,
    status: 'pending',
    date: 'Mar 15, 2026',
    dueDate: 'Mar 29, 2026',
    items: [
      { description: 'Full Website Build — Next.js + CRM', amount: 3800 },
      { description: 'API Integration Setup', amount: 1000 },
    ],
  },
  {
    id: '4',
    number: 'INV-0044',
    client: 'Crypto Goatz',
    clientInitials: 'CG',
    amount: 875,
    status: 'overdue',
    date: 'Feb 28, 2026',
    dueDate: 'Mar 14, 2026',
    items: [
      { description: 'Smart Contract Audit Report', amount: 500 },
      { description: 'Dashboard UI Components', amount: 375 },
    ],
  },
  {
    id: '5',
    number: 'INV-0048',
    client: 'NearPittsburgh',
    clientInitials: 'NP',
    amount: 1600,
    status: 'draft',
    date: 'Mar 22, 2026',
    dueDate: 'Apr 5, 2026',
    items: [
      { description: 'Local SEO Campaign — 3 Month', amount: 1200 },
      { description: 'Google Ads Setup', amount: 400 },
    ],
  },
]

export default function InvoicesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [newItems, setNewItems] = useState<InvoiceItem[]>([{ description: '', amount: 0 }])
  const [newClient, setNewClient] = useState('')

  const filtered = mockInvoices
    .filter((inv) => statusFilter === 'all' || inv.status === statusFilter)
    .filter((inv) =>
      !searchQuery ||
      inv.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.client.toLowerCase().includes(searchQuery.toLowerCase())
    )

  const totalRevenue = mockInvoices.reduce((s, i) => s + i.amount, 0)
  const paidTotal = mockInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const pendingTotal = mockInvoices.filter((i) => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
  const overdueTotal = mockInvoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)

  const newSubtotal = newItems.reduce((s, i) => s + i.amount, 0)
  const newTax = Math.round(newSubtotal * 0.07 * 100) / 100
  const newTotal = newSubtotal + newTax

  const addItem = () => setNewItems([...newItems, { description: '', amount: 0 }])

  return (
    <div>
      <div className="jp-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="jp-page-title">Invoices</h1>
          <p className="jp-page-subtitle">Create, send, and track client invoices</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: '10px 22px',
            background: 'var(--jp-green)',
            color: '#000',
            border: 'none',
            borderRadius: 'var(--jp-radius-sm)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="jp-stat-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, accent: 'green', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
          { label: 'Paid', value: `$${paidTotal.toLocaleString()}`, accent: 'green', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
          { label: 'Pending', value: `$${pendingTotal.toLocaleString()}`, accent: 'amber', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> },
          { label: 'Overdue', value: `$${overdueTotal.toLocaleString()}`, accent: 'purple', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /> },
        ].map((stat) => (
          <div key={stat.label} className={`jp-stat-card ${stat.accent}`}>
            <div className="jp-stat-header">
              <span className="jp-stat-label">{stat.label}</span>
              <div className={`jp-stat-icon ${stat.accent}`}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  {stat.icon}
                </svg>
              </div>
            </div>
            <div className="jp-stat-value">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Create Invoice Form */}
      {showCreate && (
        <div className="jp-card" style={{ marginBottom: 24 }}>
          <div className="jp-card-header">
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--jp-text)', margin: 0 }}>New Invoice</h3>
            <button className="jp-header-btn" onClick={() => setShowCreate(false)}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="jp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)', marginBottom: 6, display: 'block' }}>Client Name</label>
              <input
                type="text"
                className="jp-search-input"
                placeholder="Enter client name"
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                style={{ width: '100%', maxWidth: 400, paddingLeft: 14 }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)', marginBottom: 6, display: 'block' }}>Line Items</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {newItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      className="jp-search-input"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => {
                        const copy = [...newItems]
                        copy[i].description = e.target.value
                        setNewItems(copy)
                      }}
                      style={{ flex: 1, paddingLeft: 14 }}
                    />
                    <input
                      type="number"
                      className="jp-search-input"
                      placeholder="Amount"
                      value={item.amount || ''}
                      onChange={(e) => {
                        const copy = [...newItems]
                        copy[i].amount = parseFloat(e.target.value) || 0
                        setNewItems(copy)
                      }}
                      style={{ width: 120, paddingLeft: 14 }}
                    />
                    {newItems.length > 1 && (
                      <button
                        className="jp-header-btn"
                        onClick={() => setNewItems(newItems.filter((_, j) => j !== i))}
                        style={{ width: 32, height: 32, flexShrink: 0 }}
                      >
                        <svg width="14" height="14" fill="none" stroke="var(--jp-red)" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addItem}
                  style={{
                    padding: '7px 14px',
                    background: 'transparent',
                    color: 'var(--jp-cyan)',
                    border: '1px dashed var(--jp-border)',
                    borderRadius: 'var(--jp-radius-sm)',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    width: 'fit-content',
                  }}
                >
                  + Add Item
                </button>
              </div>
            </div>

            {/* Totals */}
            <div style={{
              background: 'var(--jp-bg)',
              borderRadius: 'var(--jp-radius-sm)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              maxWidth: 300,
              marginLeft: 'auto',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--jp-text-secondary)' }}>
                <span>Subtotal</span>
                <span>${newSubtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--jp-text-secondary)' }}>
                <span>Tax (7%)</span>
                <span>${newTax.toFixed(2)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--jp-border)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, color: 'var(--jp-text)' }}>
                <span>Total</span>
                <span>${newTotal.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  padding: '9px 20px',
                  background: 'transparent',
                  color: 'var(--jp-text-secondary)',
                  border: '1px solid var(--jp-border)',
                  borderRadius: 'var(--jp-radius-sm)',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                Save Draft
              </button>
              <button style={{
                padding: '9px 24px',
                background: 'var(--jp-green)',
                color: '#000',
                border: 'none',
                borderRadius: 'var(--jp-radius-sm)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}>
                Send Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="jp-search" style={{ flex: 1, minWidth: 200, maxWidth: 360 }}>
          <span className="jp-search-icon">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            className="jp-search-input"
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'paid', 'pending', 'overdue', 'draft'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '7px 14px',
                background: statusFilter === s ? 'var(--jp-green-glow)' : 'transparent',
                color: statusFilter === s ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
                border: `1px solid ${statusFilter === s ? 'var(--jp-green-dim)' : 'var(--jp-border)'}`,
                borderRadius: 'var(--jp-radius-sm)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Table */}
      <div className="jp-card">
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '100px 1fr 100px 90px 120px 120px',
          gap: 12,
          padding: '12px 20px',
          borderBottom: '1px solid var(--jp-border)',
          fontSize: '0.6875rem',
          fontWeight: 600,
          color: 'var(--jp-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          <span>Invoice #</span>
          <span>Client</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Date</span>
          <span>Actions</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--jp-text-muted)', fontSize: '0.875rem' }}>
            No invoices found
          </div>
        ) : (
          filtered.map((inv) => (
            <div
              key={inv.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '100px 1fr 100px 90px 120px 120px',
                gap: 12,
                padding: '14px 20px',
                borderBottom: '1px solid var(--jp-border)',
                alignItems: 'center',
                transition: 'background var(--jp-transition)',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'var(--jp-bg-card-hover)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--jp-cyan)' }}>
                {inv.number}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--jp-border-hi)',
                  color: 'var(--jp-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {inv.clientInitials}
                </div>
                <span style={{ fontSize: '0.875rem', color: 'var(--jp-text)' }}>{inv.client}</span>
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--jp-text)' }}>
                ${inv.amount.toLocaleString()}
              </span>
              <span style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 6,
                background: statusStyles[inv.status].bg,
                color: statusStyles[inv.status].color,
                textTransform: 'capitalize',
                display: 'inline-block',
                width: 'fit-content',
              }}>
                {inv.status}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--jp-text-muted)' }}>{inv.date}</span>
              <div style={{ display: 'flex', gap: 2 }}>
                <button className="jp-header-btn" title="View" style={{ width: 30, height: 30 }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button className="jp-header-btn" title="Send" style={{ width: 30, height: 30 }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
                <button className="jp-header-btn" title="Download" style={{ width: 30, height: 30 }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
