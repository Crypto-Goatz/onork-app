'use client'

import { useState, useEffect } from 'react'

interface Funnel {
  id: string
  name: string
  status?: string
  steps?: number
  url?: string
  createdAt?: string
  updatedAt?: string
  pages?: { id: string; name: string; url?: string }[]
}

export default function FunnelsPage() {
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { fetchFunnels() }, [])

  async function fetchFunnels() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/crm/funnels')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setFunnels(data.funnels || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const filtered = funnels.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: 0, display: 'flex', alignItems: 'center' }}>
            Funnel Builder
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,217,87,0.12)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)', marginLeft: 8 }}>UNLIMITED</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>
            {funnels.length > 0 ? `${funnels.length} funnels` : 'Manage your sales funnels and landing pages'}
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#7ed957' }}>Activated</span>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input type="text" placeholder="Search funnels..." value={search} onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px 12px 40px',
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 10, color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23556880' stroke-width='2' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: '14px center',
          }} />
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
          <button onClick={fetchFunnels} style={{ color: 'var(--color-cyan, #14b8a6)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Try again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>&#127993;</div>
          <p style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: 14, marginBottom: 8 }}>
            {search ? 'No funnels match your search.' : 'No funnels yet.'}
          </p>
          <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13 }}>Funnels created in your CRM will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(f => (
            <div key={f.id} style={{
              background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
              borderRadius: 12, overflow: 'hidden',
            }}>
              {/* Funnel header bar */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #1c2b42' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>{f.name}</div>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                    background: f.status === 'published' ? 'rgba(126,217,87,0.1)' : 'rgba(96,96,96,0.12)',
                    color: f.status === 'published' ? '#7ed957' : 'var(--text-muted, #6b7280)',
                  }}>{f.status || 'draft'}</span>
                </div>
              </div>
              {/* Funnel details */}
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{f.steps || f.pages?.length || 0} steps</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>
                    {f.updatedAt ? `Updated ${new Date(f.updatedAt).toLocaleDateString()}` : ''}
                  </span>
                </div>
                {f.pages && f.pages.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {f.pages.slice(0, 3).map((p, i) => (
                      <div key={p.id || i} style={{ fontSize: 12, color: 'var(--text-secondary, #9ca3af)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--color-cyan, #14b8a6)', flexShrink: 0 }} />
                        {p.name}
                      </div>
                    ))}
                    {f.pages.length > 3 && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>+{f.pages.length - 3} more</span>
                    )}
                  </div>
                )}
                {f.url && (
                  <a href={f.url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'inline-block', marginTop: 12, fontSize: 12, color: 'var(--color-cyan, #14b8a6)',
                    fontWeight: 600, textDecoration: 'none',
                  }}>View Live &rarr;</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
