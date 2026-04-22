'use client'

import { useState } from 'react'
import { Link2, Zap, BarChart2, ArrowRightLeft, Search, Plus, X } from 'lucide-react'

interface TriggerLink {
  id: string
  name: string
  url: string
  type: string
  clicks?: number
  status: string
  createdAt: string
}

const LINK_TYPES = [
  {
    title: 'Trigger Links',
    desc: 'Click triggers automations for contacts',
    Icon: Zap,
  },
  {
    title: 'Tracking Links',
    desc: 'Track clicks with UTM parameters',
    Icon: BarChart2,
  },
  {
    title: 'Redirects',
    desc: 'Smart redirects with contact attribution',
    Icon: ArrowRightLeft,
  },
]

const TABLE_HEADERS = ['Name', 'Type', 'Clicks', 'Status', 'Created']

export default function LinksPage() {
  const [links] = useState<TriggerLink[]>([])
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', redirectUrl: '', type: 'trigger' })

  const filtered = links.filter(
    l => !search || l.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-[1100px] mx-auto px-2">
      {/* Create Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-core-card border border-core-border rounded-2xl p-7 max-w-[460px] w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-bold text-core-text">Create Trigger Link</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-core-text-muted hover:text-core-text transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <label className="block mb-3">
              <span className="block text-[11px] font-semibold text-core-text-muted uppercase tracking-[0.05em] mb-1">
                Link Name
              </span>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Onboarding Trigger"
                className="w-full px-3 py-[10px] rounded-lg border border-core-border bg-core-bg text-core-text text-sm outline-none focus:border-core-cyan transition-colors"
              />
            </label>

            <label className="block mb-3">
              <span className="block text-[11px] font-semibold text-core-text-muted uppercase tracking-[0.05em] mb-1">
                Redirect URL
              </span>
              <input
                type="url"
                value={form.redirectUrl}
                onChange={e => setForm(f => ({ ...f, redirectUrl: e.target.value }))}
                placeholder="https://mysite.com/thank-you"
                className="w-full px-3 py-[10px] rounded-lg border border-core-border bg-core-bg text-core-text text-sm outline-none focus:border-core-cyan transition-colors"
              />
            </label>

            <label className="block mb-5">
              <span className="block text-[11px] font-semibold text-core-text-muted uppercase tracking-[0.05em] mb-1">
                Type
              </span>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-[10px] rounded-lg border border-core-border bg-core-bg text-core-text text-sm outline-none focus:border-core-cyan transition-colors"
              >
                <option value="trigger">Trigger Link</option>
                <option value="tracking">Tracking Link</option>
                <option value="redirect">Redirect</option>
              </select>
            </label>

            <div className="flex gap-2.5">
              <button className="flex-1 py-3 bg-core-cyan text-core-bg font-bold text-sm rounded-[10px] border-none cursor-pointer hover:opacity-90 transition-opacity">
                Create Link
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-5 py-3 rounded-[10px] border border-core-border bg-transparent text-core-text-muted text-sm cursor-pointer hover:text-core-text transition-colors"
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
          <h1 className="text-[22px] font-bold text-core-text m-0 flex items-center gap-2">
            Link Triggers
            <span className="text-[10px] font-bold px-2 py-[2px] rounded-[10px] bg-core-green/10 text-core-green border border-core-green/20">
              UNLIMITED
            </span>
          </h1>
          <p className="text-[13px] text-core-text-muted mt-1">
            Create and manage trigger links for automations
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-[11px] font-semibold text-core-green">Activated</span>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-5 py-[10px] bg-core-cyan text-core-bg font-bold text-[13px] rounded-[10px] border-none cursor-pointer hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            Create Link
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-core-text-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Search links..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full py-3 pl-10 pr-4 bg-core-card border border-core-border rounded-[10px] text-core-text text-sm outline-none focus:border-core-cyan transition-colors"
        />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 mb-6">
        {LINK_TYPES.map(({ title, desc, Icon }) => (
          <div
            key={title}
            className="bg-core-card border border-core-border rounded-xl p-5"
          >
            <Icon size={24} className="mb-3 text-core-text-muted opacity-50" />
            <div className="text-sm font-semibold text-core-text mb-1">{title}</div>
            <div className="text-xs text-core-text-muted">{desc}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-core-card border border-core-border rounded-[14px] px-10 py-[60px] text-center">
          <Link2 size={40} className="mx-auto mb-4 text-core-text-muted opacity-30" />
          <p className="text-core-text-dim text-sm mb-2">No trigger links yet.</p>
          <p className="text-core-text-muted text-[13px] mb-4">
            Trigger links fire automations when a contact clicks them.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-5 py-[10px] bg-core-cyan text-core-bg font-bold text-[13px] rounded-[10px] border-none cursor-pointer hover:opacity-90 transition-opacity mx-auto"
          >
            <Plus size={14} />
            Create Link
          </button>
        </div>
      ) : (
        <div className="bg-core-card border border-core-border rounded-[14px] overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-core-border">
                {TABLE_HEADERS.map(h => (
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
              {filtered.map(l => (
                <tr
                  key={l.id}
                  className="border-b border-core-border/50 hover:bg-core-card-hover transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="text-sm font-semibold text-core-text">{l.name}</div>
                    <div className="text-[11px] text-core-text-muted mt-0.5">{l.url}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-[2px] rounded text-[11px] font-semibold bg-core-cyan/10 text-core-cyan">
                      {l.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-core-text-dim">
                    {(l.clicks || 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-[11px] font-semibold ${
                        l.status === 'active' ? 'text-core-green' : 'text-core-text-muted'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-core-text-muted">
                    {new Date(l.createdAt).toLocaleDateString()}
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
