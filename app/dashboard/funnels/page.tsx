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

interface Redirect {
  id: string
  source: string
  target: string
  type: string
  status?: string
}

export default function FunnelsPage() {
  const [tab, setTab] = useState<'funnels' | 'redirects'>('funnels')
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [redirects, setRedirects] = useState<Redirect[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [expandedFunnel, setExpandedFunnel] = useState<string | null>(null)

  // Redirect modal state
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editId, setEditId] = useState('')
  const [modalSource, setModalSource] = useState('')
  const [modalTarget, setModalTarget] = useState('')
  const [modalType, setModalType] = useState('301')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchFunnels(); fetchRedirects() }, [])

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

  async function fetchRedirects() {
    try {
      const res = await fetch('/api/crm/redirects')
      const data = await res.json()
      if (res.ok) setRedirects(data.redirects || [])
    } catch {}
  }

  function openCreateModal() {
    setModalMode('create')
    setEditId('')
    setModalSource('')
    setModalTarget('')
    setModalType('301')
    setShowModal(true)
  }

  function openEditModal(r: Redirect) {
    setModalMode('edit')
    setEditId(r.id)
    setModalSource(r.source)
    setModalTarget(r.target)
    setModalType(r.type || '301')
    setShowModal(true)
  }

  async function saveRedirect() {
    if (!modalSource || !modalTarget) return
    setSaving(true)
    try {
      if (modalMode === 'create') {
        const res = await fetch('/api/crm/redirects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: modalSource, target: modalTarget, type: modalType }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      } else {
        const res = await fetch('/api/crm/redirects', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editId, source: modalSource, target: modalTarget, type: modalType }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      }
      setShowModal(false)
      fetchRedirects()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function deleteRedirect(id: string) {
    if (!confirm('Delete this redirect?')) return
    try {
      const res = await fetch(`/api/crm/redirects?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setRedirects(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const filteredFunnels = funnels.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()))
  const filteredRedirects = redirects.filter(r => !search || r.source.toLowerCase().includes(search.toLowerCase()) || r.target.toLowerCase().includes(search.toLowerCase()))

  const tabStyle = (active: boolean) => ({
    padding: '10px 24px',
    fontSize: 13,
    fontWeight: 600 as const,
    color: active ? '#7ed957' : '#6b7280',
    background: active ? 'rgba(126,217,87,0.08)' : 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid #7ed957' : '2px solid transparent',
    cursor: 'pointer' as const,
    transition: 'all 0.15s',
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f0f4f8', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            Funnels & Redirects
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,217,87,0.12)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)' }}>UNLIMITED</span>
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {tab === 'funnels' ? `${funnels.length} funnels` : `${redirects.length} redirects`}
          </p>
        </div>
        {tab === 'redirects' && (
          <button onClick={openCreateModal} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #7ed957, #5cb83a)', color: '#000',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>+ Add Redirect</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1e293b', marginBottom: 20 }}>
        <button onClick={() => setTab('funnels')} style={tabStyle(tab === 'funnels')}>Funnels</button>
        <button onClick={() => setTab('redirects')} style={tabStyle(tab === 'redirects')}>Redirects</button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder={tab === 'funnels' ? 'Search funnels...' : 'Search redirects...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '10px 16px 10px 40px', boxSizing: 'border-box',
            background: '#161b22', border: '1px solid #1e293b',
            borderRadius: 10, color: '#f0f4f8', fontSize: 14, outline: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23556880' stroke-width='2' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: '14px center',
          }}
        />
      </div>

      {/* Funnels Tab */}
      {tab === 'funnels' && (
        <>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #1e293b', borderTopColor: '#7ed957', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : error ? (
            <div style={{ background: '#161b22', border: '1px solid #1e293b', borderRadius: 14, padding: 40, textAlign: 'center' }}>
              <p style={{ color: '#f87171', fontSize: 14, marginBottom: 12 }}>{error}</p>
              <button onClick={fetchFunnels} style={{ color: '#7ed957', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Try again</button>
            </div>
          ) : filteredFunnels.length === 0 ? (
            <div style={{ background: '#161b22', border: '1px solid #1e293b', borderRadius: 14, padding: '60px 40px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>&#127993;</div>
              <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>
                {search ? 'No funnels match your search.' : 'No funnels yet.'}
              </p>
              <p style={{ color: '#6b7280', fontSize: 13 }}>Funnels created in your CRM will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {filteredFunnels.map(f => (
                <div
                  key={f.id}
                  onClick={() => setExpandedFunnel(expandedFunnel === f.id ? null : f.id)}
                  style={{
                    background: '#161b22', border: '1px solid #1e293b',
                    borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                    transition: 'border-color 0.15s',
                    borderColor: expandedFunnel === f.id ? '#7ed957' : '#1e293b',
                  }}
                >
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f4f8' }}>{f.name}</div>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                        background: f.status === 'published' ? 'rgba(126,217,87,0.1)' : 'rgba(96,96,96,0.12)',
                        color: f.status === 'published' ? '#7ed957' : '#6b7280',
                      }}>{f.status || 'draft'}</span>
                    </div>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{f.steps || f.pages?.length || 0} steps</span>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>
                        {f.updatedAt ? `Updated ${new Date(f.updatedAt).toLocaleDateString()}` : ''}
                      </span>
                    </div>
                    {/* Expanded pages view */}
                    {expandedFunnel === f.id && f.pages && f.pages.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, padding: '12px 0', borderTop: '1px solid #1e293b' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Pages</div>
                        {f.pages.map((p, i) => (
                          <div key={p.id || i} style={{ fontSize: 12, color: '#d1d5db', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                            <span style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(126,217,87,0.1)', color: '#7ed957', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                            <span style={{ flex: 1 }}>{p.name}</span>
                            {p.url && (
                              <a href={p.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: '#00d4ff', textDecoration: 'none' }}>View</a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {expandedFunnel !== f.id && f.pages && f.pages.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {f.pages.slice(0, 3).map((p, i) => (
                          <div key={p.id || i} style={{ fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#7ed957', flexShrink: 0 }} />
                            {p.name}
                          </div>
                        ))}
                        {f.pages.length > 3 && (
                          <span style={{ fontSize: 11, color: '#6b7280' }}>+{f.pages.length - 3} more</span>
                        )}
                      </div>
                    )}
                    {f.url && (
                      <a href={f.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{
                        display: 'inline-block', marginTop: 12, fontSize: 12, color: '#7ed957',
                        fontWeight: 600, textDecoration: 'none',
                      }}>View Live &rarr;</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Redirects Tab */}
      {tab === 'redirects' && (
        <>
          {filteredRedirects.length === 0 ? (
            <div style={{ background: '#161b22', border: '1px solid #1e293b', borderRadius: 14, padding: '60px 40px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>&#8644;</div>
              <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>
                {search ? 'No redirects match your search.' : 'No redirects yet.'}
              </p>
              <p style={{ color: '#6b7280', fontSize: 13 }}>Click "Add Redirect" to create a URL redirect.</p>
            </div>
          ) : (
            <div style={{ background: '#161b22', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px 100px', gap: 12, padding: '12px 20px', borderBottom: '1px solid #1e293b', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Source</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Target</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Type</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Actions</div>
              </div>
              {/* Table rows */}
              {filteredRedirects.map(r => (
                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px 100px', gap: 12, padding: '12px 20px', borderBottom: '1px solid rgba(30,41,59,0.5)', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#d1d5db', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.source}</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.target}</div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: r.type === '301' ? 'rgba(126,217,87,0.1)' : 'rgba(0,212,255,0.1)', color: r.type === '301' ? '#7ed957' : '#00d4ff' }}>{r.type}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: r.status === 'active' ? 'rgba(126,217,87,0.1)' : 'rgba(96,96,96,0.12)', color: r.status === 'active' ? '#7ed957' : '#6b7280' }}>{r.status || 'active'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openEditModal(r)} style={{ background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}>Edit</button>
                    <button onClick={() => deleteRedirect(r.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#0d1117', border: '1px solid #1e293b', borderRadius: 16, padding: 28, width: 440, maxWidth: '90vw' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f0f4f8', margin: '0 0 20px' }}>
              {modalMode === 'create' ? 'Add Redirect' : 'Edit Redirect'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>Source Path</label>
                <input
                  value={modalSource}
                  onChange={e => setModalSource(e.target.value)}
                  placeholder="/old-page"
                  style={{ width: '100%', padding: '10px 14px', boxSizing: 'border-box', background: '#161b22', border: '1px solid #1e293b', borderRadius: 8, color: '#f0f4f8', fontSize: 13, outline: 'none', fontFamily: 'monospace' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>Target URL</label>
                <input
                  value={modalTarget}
                  onChange={e => setModalTarget(e.target.value)}
                  placeholder="https://example.com/new-page"
                  style={{ width: '100%', padding: '10px 14px', boxSizing: 'border-box', background: '#161b22', border: '1px solid #1e293b', borderRadius: 8, color: '#f0f4f8', fontSize: 13, outline: 'none', fontFamily: 'monospace' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>Redirect Type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['301', '302'].map(t => (
                    <button
                      key={t}
                      onClick={() => setModalType(t)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 8, border: '1px solid',
                        borderColor: modalType === t ? '#7ed957' : '#1e293b',
                        background: modalType === t ? 'rgba(126,217,87,0.08)' : '#161b22',
                        color: modalType === t ? '#7ed957' : '#9ca3af',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {t} {t === '301' ? '(Permanent)' : '(Temporary)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #1e293b', background: 'transparent', color: '#9ca3af', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveRedirect} disabled={saving || !modalSource || !modalTarget} style={{
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: modalSource && modalTarget ? 'linear-gradient(135deg, #7ed957, #5cb83a)' : '#1e293b',
                color: modalSource && modalTarget ? '#000' : '#6b7280',
                fontSize: 13, fontWeight: 700, cursor: modalSource && modalTarget ? 'pointer' : 'default',
                opacity: saving ? 0.6 : 1,
              }}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
