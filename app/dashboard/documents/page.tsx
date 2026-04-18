'use client'

import { useState } from 'react'

interface Document {
  id: string
  name: string
  type: string
  status: string
  recipient?: string
  createdAt: string
  signedAt?: string
}

export default function DocumentsPage() {
  const [documents] = useState<Document[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'contract', recipient: '' })

  const filtered = documents.filter(d => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filter !== 'all' && d.status !== filter) return false
    return true
  })

  const statusColor = (s: string) => {
    if (s === 'signed' || s === 'completed') return '#7ed957'
    if (s === 'pending' || s === 'sent') return '#fbbf24'
    if (s === 'draft') return 'var(--text-muted, #6b7280)'
    return '#f87171'
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>
      {/* Create Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => setShowCreate(false)}>
          <div style={{
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 16, padding: 28, maxWidth: 460, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 20px' }}>
              New Document
            </h2>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Document Name</span>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Service Agreement"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</span>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
                <option value="contract">Contract</option>
                <option value="proposal">Proposal</option>
                <option value="invoice">Invoice</option>
                <option value="agreement">Agreement</option>
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recipient Email</span>
              <input type="email" value={form.recipient} onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))} placeholder="client@company.com"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{
                flex: 1, padding: 12, background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
                color: '#0c1220', fontWeight: 700, fontSize: 14, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}>Create Document</button>
              <button onClick={() => setShowCreate(false)} style={{
                padding: '12px 20px', borderRadius: 10, border: '1px solid #1c2b42',
                background: 'transparent', color: 'var(--text-muted, #6b7280)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: 0, display: 'flex', alignItems: 'center' }}>
            Documents & Contracts
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,217,87,0.12)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)', marginLeft: 8 }}>UNLIMITED</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>Create, send, and track documents</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#7ed957' }}>Activated</span>
          <button onClick={() => setShowCreate(true)} style={{
            padding: '10px 20px', background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
            color: '#0c1220', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
          }}>+ New Document</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200, padding: '12px 16px 12px 40px',
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 10, color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23556880' stroke-width='2' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: '14px center',
          }} />
        {['all', 'draft', 'sent', 'signed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: filter === f ? 'rgba(45,212,191,0.15)' : 'var(--bg-card, #1f2937)',
            color: filter === f ? 'var(--color-cyan, #14b8a6)' : 'var(--text-muted, #6b7280)',
          }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total', value: documents.length },
          { label: 'Pending', value: documents.filter(d => d.status === 'sent' || d.status === 'pending').length },
          { label: 'Signed', value: documents.filter(d => d.status === 'signed' || d.status === 'completed').length },
          { label: 'Drafts', value: documents.filter(d => d.status === 'draft').length },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 12, padding: 20,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>&#128196;</div>
          <p style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: 14, marginBottom: 8 }}>No documents yet.</p>
          <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, marginBottom: 16 }}>
            Create contracts, proposals, and agreements to send for e-signature.
          </p>
          <button onClick={() => setShowCreate(true)} style={{
            padding: '10px 20px', background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
            color: '#0c1220', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
          }}>+ New Document</button>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1c2b42' }}>
                {['Document', 'Type', 'Recipient', 'Status', 'Created'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid rgba(28,43,66,0.5)' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1a2740'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>{d.name}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'rgba(45,212,191,0.1)', color: 'var(--color-cyan, #14b8a6)' }}>{d.type}</span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary, #9ca3af)' }}>{d.recipient || '—'}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: statusColor(d.status) }}>{d.status}</span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{new Date(d.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
