'use client'

import { useState, useEffect } from 'react'
import { Megaphone } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  status: string
  type?: string
  contactCount?: number
  sentCount?: number
  openRate?: number
  clickRate?: number
  createdAt?: string
  updatedAt?: string
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchCampaigns() }, [])

  async function fetchCampaigns() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/crm/campaigns')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setCampaigns(data.campaigns || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const filtered = campaigns.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filter !== 'all' && c.status !== filter) return false
    return true
  })

  const statusClass = (s: string) => {
    if (s === 'active' || s === 'running' || s === 'completed') return 'text-core-green'
    if (s === 'paused' || s === 'scheduled') return 'text-core-amber'
    if (s === 'draft') return 'text-core-text-muted'
    return 'text-core-red'
  }

  const totalSent = campaigns.reduce((a, c) => a + (c.sentCount || 0), 0)
  const activeCampaigns = campaigns.filter(c => c.status === 'active' || c.status === 'running').length

  return (
    <div className="max-w-[1100px] mx-auto px-2">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-core-text flex items-center gap-2 m-0">
            Campaign Manager
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-core-green/10 text-core-green border border-core-green/20">
              UNLIMITED
            </span>
          </h1>
          <p className="text-[13px] text-core-text-muted mt-1">
            {campaigns.length > 0 ? `${campaigns.length} campaigns` : 'Manage email and SMS campaigns'}
          </p>
        </div>
        <span className="text-[11px] font-semibold text-core-green">Activated</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 mb-6">
        {[
          { label: 'Total Campaigns', value: campaigns.length },
          { label: 'Active', value: activeCampaigns },
          { label: 'Total Sent', value: totalSent },
          { label: 'Contacts Reached', value: campaigns.reduce((a, c) => a + (c.contactCount || 0), 0) },
        ].map(s => (
          <div key={s.label} className="bg-core-card border border-core-border rounded-xl p-5">
            <div className="text-[11px] text-core-text-muted uppercase tracking-[0.06em] mb-2">{s.label}</div>
            <div className="text-[28px] font-bold text-core-text">{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-core-text-muted pointer-events-none"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-core-card border border-core-border rounded-[10px] text-core-text text-[14px] outline-none placeholder:text-core-text-muted"
          />
        </div>
        {['all', 'active', 'draft', 'completed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border-none cursor-pointer transition-colors ${
              filter === f
                ? 'bg-core-cyan/15 text-core-cyan'
                : 'bg-core-card text-core-text-muted hover:text-core-text-dim'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-[3px] border-core-border border-t-core-cyan animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-core-card border border-core-border rounded-2xl p-10 text-center">
          <p className="text-core-red text-[14px] mb-3">{error}</p>
          <button
            onClick={fetchCampaigns}
            className="text-core-cyan bg-transparent border-none cursor-pointer text-[13px] font-semibold"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-core-card border border-core-border rounded-2xl px-10 py-16 text-center">
          <div className="flex justify-center mb-4 opacity-30">
            <Megaphone size={40} className="text-core-text-muted" />
          </div>
          <p className="text-core-text-dim text-[14px] mb-2">
            {search || filter !== 'all' ? 'No campaigns match your filters.' : 'No campaigns yet.'}
          </p>
          <p className="text-core-text-muted text-[13px]">Campaigns created in your CRM will appear here.</p>
        </div>
      ) : (
        <div className="bg-core-card border border-core-border rounded-2xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-core-border">
                {['Campaign', 'Status', 'Type', 'Contacts', 'Sent', 'Updated'].map(h => (
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
              {filtered.map(c => (
                <tr
                  key={c.id}
                  className="border-b border-core-border/50 hover:bg-core-card-hover transition-colors"
                >
                  <td className="px-5 py-3.5 text-[14px] font-semibold text-core-text">{c.name}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${statusClass(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-core-text-dim">{c.type || 'email'}</td>
                  <td className="px-5 py-3.5 text-[13px] text-core-text-dim">{(c.contactCount || 0).toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-[13px] text-core-text-dim">{(c.sentCount || 0).toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-[12px] text-core-text-muted">
                    {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : '—'}
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
