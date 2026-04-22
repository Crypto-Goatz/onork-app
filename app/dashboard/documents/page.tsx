'use client'

import { useState, useEffect } from 'react'
import { FileText, Search, Send, Plus, X } from 'lucide-react'

interface Document {
  id: string
  name: string
  type: string
  status: string
  recipient?: string
  createdAt: string
  signedAt?: string
}

interface Template {
  id: string
  name: string
  type: string
}

function statusClass(s: string): string {
  if (s === 'signed' || s === 'completed') return 'text-core-green'
  if (s === 'pending' || s === 'sent') return 'text-core-amber'
  if (s === 'draft') return 'text-core-text-muted'
  return 'text-core-red'
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [showSend, setShowSend] = useState<{ id: string; name: string; isTemplate: boolean } | null>(null)
  const [sendForm, setSendForm] = useState({ email: '', name: '' })
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'contract', recipient: '' })

  useEffect(() => {
    loadDocuments()
  }, [])

  async function loadDocuments() {
    setLoading(true)
    try {
      const res = await fetch('/api/crm/documents')
      const data = await res.json()
      if (data.documents && Array.isArray(data.documents)) {
        setDocuments(data.documents.map((d: any) => ({
          id: d.id,
          name: d.name || d.title || 'Untitled',
          type: d.type || 'document',
          status: d.status || 'draft',
          recipient: d.recipientEmail || d.recipient || '',
          createdAt: d.createdAt || d.created_at || new Date().toISOString(),
          signedAt: d.signedAt || d.signed_at,
        })))
      }
      if (data.templates && Array.isArray(data.templates)) {
        setTemplates(data.templates.map((t: any) => ({
          id: t.id,
          name: t.name || t.title || 'Untitled Template',
          type: t.type || 'template',
        })))
      }
    } catch {}
    setLoading(false)
  }

  async function sendDocument() {
    if (!showSend) return
    setSending(true)
    try {
      await fetch('/api/crm/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: showSend.isTemplate ? 'sendTemplate' : 'send',
          ...(showSend.isTemplate ? { templateId: showSend.id } : { documentId: showSend.id }),
          email: sendForm.email,
          name: sendForm.name,
        }),
      })
      setShowSend(null)
      setSendForm({ email: '', name: '' })
    } catch {}
    setSending(false)
  }

  const filtered = documents.filter(d => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filter !== 'all' && d.status !== filter) return false
    return true
  })

  const inputClass =
    'w-full px-3 py-2.5 rounded-lg border border-core-border bg-core-bg text-core-text text-sm outline-none focus:border-core-cyan transition-colors'

  const labelSpanClass =
    'block text-[11px] font-semibold uppercase tracking-[0.05em] text-core-text-muted mb-1'

  return (
    <div className="max-w-[1100px] mx-auto px-2">

      {/* Send Modal */}
      {showSend && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowSend(null)}
        >
          <div
            className="bg-core-card border border-core-border rounded-2xl p-7 max-w-[460px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-core-text mb-2">
              Send {showSend.isTemplate ? 'Template' : 'Document'}
            </h2>
            <p className="text-[13px] text-core-text-muted mb-5">{showSend.name}</p>

            <label className="block mb-3">
              <span className={labelSpanClass}>Recipient Email</span>
              <input
                type="email"
                value={sendForm.email}
                onChange={e => setSendForm(f => ({ ...f, email: e.target.value }))}
                placeholder="client@company.com"
                className={inputClass}
              />
            </label>

            <label className="block mb-5">
              <span className={labelSpanClass}>Recipient Name</span>
              <input
                type="text"
                value={sendForm.name}
                onChange={e => setSendForm(f => ({ ...f, name: e.target.value }))}
                placeholder="John Doe"
                className={inputClass}
              />
            </label>

            <div className="flex gap-2.5">
              <button
                onClick={sendDocument}
                disabled={sending || !sendForm.email}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-gradient-to-br from-core-cyan to-teal-600 text-[#0c1220] disabled:opacity-50 disabled:cursor-wait cursor-pointer transition-opacity"
              >
                {sending ? 'Sending...' : 'Send Link'}
              </button>
              <button
                onClick={() => setShowSend(null)}
                className="px-5 py-3 rounded-xl border border-core-border bg-transparent text-core-text-muted text-sm cursor-pointer hover:text-core-text transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-core-card border border-core-border rounded-2xl p-7 max-w-[460px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-core-text mb-5">New Document</h2>

            <label className="block mb-3">
              <span className={labelSpanClass}>Document Name</span>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Service Agreement"
                className={inputClass}
              />
            </label>

            <label className="block mb-3">
              <span className={labelSpanClass}>Type</span>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className={inputClass}
              >
                <option value="contract">Contract</option>
                <option value="proposal">Proposal</option>
                <option value="invoice">Invoice</option>
                <option value="agreement">Agreement</option>
              </select>
            </label>

            <label className="block mb-5">
              <span className={labelSpanClass}>Recipient Email</span>
              <input
                type="email"
                value={form.recipient}
                onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))}
                placeholder="client@company.com"
                className={inputClass}
              />
            </label>

            <div className="flex gap-2.5">
              <button className="flex-1 py-3 rounded-xl font-bold text-sm bg-gradient-to-br from-core-cyan to-teal-600 text-[#0c1220] cursor-pointer">
                Create Document
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-5 py-3 rounded-xl border border-core-border bg-transparent text-core-text-muted text-sm cursor-pointer hover:text-core-text transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-core-text flex items-center gap-2 m-0">
            Documents &amp; Contracts
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-core-green/10 text-core-green border border-core-green/20">
              UNLIMITED
            </span>
          </h1>
          <p className="text-[13px] text-core-text-muted mt-1">Create, send, and track documents</p>
        </div>
        <div className="flex gap-2 items-center">
          {loading && <span className="text-[11px] text-core-text-muted">Loading...</span>}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-br from-core-cyan to-teal-600 text-[#0c1220] font-bold text-[13px] rounded-xl border-none cursor-pointer"
          >
            <Plus size={14} />
            New Document
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-core-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-core-card border border-core-border rounded-xl text-core-text text-sm outline-none focus:border-core-cyan transition-colors"
          />
        </div>
        {['all', 'draft', 'sent', 'signed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border-none cursor-pointer transition-colors ${
              filter === f
                ? 'bg-core-cyan/15 text-core-cyan'
                : 'bg-core-card text-core-text-muted hover:text-core-text'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 mb-6">
        {[
          { label: 'Total', value: documents.length },
          { label: 'Pending', value: documents.filter(d => d.status === 'sent' || d.status === 'pending').length },
          { label: 'Signed', value: documents.filter(d => d.status === 'signed' || d.status === 'completed').length },
          { label: 'Templates', value: templates.length },
        ].map(s => (
          <div key={s.label} className="bg-core-card border border-core-border rounded-xl p-5">
            <div className="text-[11px] text-core-text-muted uppercase tracking-[0.06em] mb-2">{s.label}</div>
            <div className="text-[28px] font-bold text-core-text">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Templates Section */}
      {templates.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[14px] font-bold text-core-text mb-3">Templates</h3>
          <div className="flex gap-2.5 flex-wrap">
            {templates.map(t => (
              <div
                key={t.id}
                className="bg-core-card border border-core-border rounded-xl px-4 py-3 flex items-center gap-2.5"
              >
                <span className="text-[13px] font-semibold text-core-text">{t.name}</span>
                <button
                  onClick={() => setShowSend({ id: t.id, name: t.name, isTemplate: true })}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-core-green/10 text-core-green border border-core-green/20 cursor-pointer hover:bg-core-green/20 transition-colors"
                >
                  <Send size={10} />
                  Send
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents Table / Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-core-card border border-core-border rounded-2xl px-10 py-16 text-center">
          <div className="flex justify-center mb-4 opacity-30">
            <FileText size={48} className="text-core-text" />
          </div>
          <p className="text-core-text-dim text-[14px] mb-2">
            {loading ? 'Loading documents...' : 'No documents yet.'}
          </p>
          <p className="text-core-text-muted text-[13px] mb-4">
            Create contracts, proposals, and agreements to send for e-signature.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-br from-core-cyan to-teal-600 text-[#0c1220] font-bold text-[13px] rounded-xl border-none cursor-pointer"
          >
            <Plus size={14} />
            New Document
          </button>
        </div>
      ) : (
        <div className="bg-core-card border border-core-border rounded-2xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-core-border">
                {['Document', 'Type', 'Recipient', 'Status', 'Created', ''].map(h => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-[11px] font-semibold text-core-text-muted uppercase tracking-[0.06em]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr
                  key={d.id}
                  className="border-b border-core-border/50 hover:bg-[#1a2740] transition-colors"
                >
                  <td className="px-5 py-3.5 text-[14px] font-semibold text-core-text">{d.name}</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-core-cyan/10 text-core-cyan">
                      {d.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-core-text-dim">{d.recipient || '--'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[11px] font-semibold ${statusClass(d.status)}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-core-text-muted">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => setShowSend({ id: d.id, name: d.name, isTemplate: false })}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-core-green/10 text-core-green border border-core-green/20 cursor-pointer hover:bg-core-green/20 transition-colors"
                    >
                      <Send size={10} />
                      Send
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
