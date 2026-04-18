'use client'

import { useState, useEffect } from 'react'

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

  const statusColor = (s: string) => {
    if (s === 'active' || s === 'running' || s === 'completed') return '#7ed957'
    if (s === 'paused' || s === 'scheduled') return '#fbbf24'
    if (s === 'draft') return 'var(--text-muted, #6b7280)'
    return '#f87171'
  }

  const totalSent = campaigns.reduce((a, c) => a + (c.sentCount || 0), 0)
  const activeCampaigns = campaigns.filter(c => c.status === 'active' || c.status === 'running').length

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: 0, display: 'flex', alignItems: 'center' }}>
            Campaign Manager
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,217,87,0.12)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)', marginLeft: 8 }}>UNLIMITED</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>
            {campaigns.length > 0 ? `${campaigns.length} campaigns` : 'Manage email and SMS campaigns'}
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#7ed957' }}>Activated</span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Campaigns', value: campaigns.length },
          { label: 'Active', value: activeCampaigns },
          { label: 'Total Sent', value: totalSent },
          { label: 'Contacts Reached', value: campaigns.reduce((a, c) => a + (c.contactCount || 0), 0) },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 12, padding: 20,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)' }}>{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200, padding: '12px 16px 12px 40px',
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 10, color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23556880' stroke-width='2' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: '14px center',
          }} />
        {['all', 'active', 'draft', 'completed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: filter === f ? 'rgba(45,212,191,0.15)' : 'var(--bg-card, #1f2937)',
            color: filter === f ? 'var(--color-cyan, #14b8a6)' : 'var(--text-muted, #6b7280)',
          }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #1c2b42', borderTopColor: 'var(--color-cyan, #14b8a6)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#f87171', fontSize: 14, marginBottom: 12 }}>{error}</p>
          <button onClick={fetchCampaigns} style={{ color: 'var(--color-cyan, #14b8a6)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Try again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>&#128227;</div>
          <p style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: 14, marginBottom: 8 }}>
            {search || filter !== 'all' ? 'No campaigns match your filters.' : 'No campaigns yet.'}
          </p>
          <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13 }}>Campaigns created in your CRM will appear here.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1c2b42' }}>
                {['Campaign', 'Status', 'Type', 'Contacts', 'Sent', 'Updated'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(28,43,66,0.5)' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1a2740'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>{c.name}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: statusColor(c.status) }}>{c.status}</span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary, #9ca3af)' }}>{c.type || 'email'}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary, #9ca3af)' }}>{(c.contactCount || 0).toLocaleString()}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary, #9ca3af)' }}>{(c.sentCount || 0).toLocaleString()}</td>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
