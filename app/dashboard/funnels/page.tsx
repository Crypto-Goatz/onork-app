'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, CornerRightDown } from 'lucide-react'

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
  const filteredRedirects = redirects.filter(r =>
    !search ||
    r.source.toLowerCase().includes(search.toLowerCase()) ||
    r.target.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-[1100px] mx-auto px-2">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-core-text m-0 flex items-center gap-2">
            Funnels &amp; Redirects
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-[10px] bg-core-green/10 text-core-green border border-core-green/20">
              UNLIMITED
            </span>
          </h1>
          <p className="text-[13px] text-core-text-muted mt-1">
            {tab === 'funnels' ? `${funnels.length} funnels` : `${redirects.length} redirects`}
          </p>
        </div>
        {tab === 'redirects' && (
          <button
            onClick={openCreateModal}
            className="px-[18px] py-2 rounded-lg bg-gradient-to-br from-core-green to-[#5cb83a] text-black text-[13px] font-bold cursor-pointer border-0"
          >
            + Add Redirect
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-core-border mb-5">
        <button
          onClick={() => setTab('funnels')}
          className={[
            'px-6 py-2.5 text-[13px] font-semibold border-0 cursor-pointer transition-all duration-150',
            tab === 'funnels'
              ? 'text-core-green bg-core-green/[0.08] border-b-2 border-core-green'
              : 'text-core-text-muted bg-transparent border-b-2 border-transparent',
          ].join(' ')}
        >
          Funnels
        </button>
        <button
          onClick={() => setTab('redirects')}
          className={[
            'px-6 py-2.5 text-[13px] font-semibold border-0 cursor-pointer transition-all duration-150',
            tab === 'redirects'
              ? 'text-core-green bg-core-green/[0.08] border-b-2 border-core-green'
              : 'text-core-text-muted bg-transparent border-b-2 border-transparent',
          ].join(' ')}
        >
          Redirects
        </button>
      </div>

      {/* Search */}
      <div className="mb-5 relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-core-text-muted pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder={tab === 'funnels' ? 'Search funnels...' : 'Search redirects...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-core-card border border-core-border rounded-[10px] text-core-text text-sm outline-none"
        />
      </div>

      {/* Funnels Tab */}
      {tab === 'funnels' && (
        <>
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-[3px] border-core-border border-t-core-green rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-core-card border border-core-border rounded-2xl p-10 text-center">
              <p className="text-core-red text-sm mb-3">{error}</p>
              <button
                onClick={fetchFunnels}
                className="text-core-green bg-transparent border-0 cursor-pointer text-[13px] font-semibold"
              >
                Try again
              </button>
            </div>
          ) : filteredFunnels.length === 0 ? (
            <div className="bg-core-card border border-core-border rounded-2xl px-10 py-16 text-center">
              <CornerRightDown className="mx-auto mb-4 opacity-30 text-core-text-muted" size={40} />
              <p className="text-core-text-dim text-sm mb-2">
                {search ? 'No funnels match your search.' : 'No funnels yet.'}
              </p>
              <p className="text-core-text-muted text-[13px]">Funnels created in your CRM will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
              {filteredFunnels.map(f => (
                <div
                  key={f.id}
                  onClick={() => setExpandedFunnel(expandedFunnel === f.id ? null : f.id)}
                  className={[
                    'bg-core-card border rounded-xl overflow-hidden cursor-pointer transition-colors duration-150',
                    expandedFunnel === f.id ? 'border-core-green' : 'border-core-border',
                  ].join(' ')}
                >
                  <div className="px-5 py-4 border-b border-core-border">
                    <div className="flex justify-between items-center">
                      <div className="text-[15px] font-semibold text-core-text">{f.name}</div>
                      <span
                        className={[
                          'px-2 py-0.5 rounded text-[10px] font-semibold',
                          f.status === 'published'
                            ? 'bg-core-green/10 text-core-green'
                            : 'bg-white/5 text-core-text-muted',
                        ].join(' ')}
                      >
                        {f.status || 'draft'}
                      </span>
                    </div>
                  </div>
                  <div className="px-5 py-4">
                    <div className="flex justify-between mb-3">
                      <span className="text-xs text-core-text-muted">{f.steps || f.pages?.length || 0} steps</span>
                      <span className="text-xs text-core-text-muted">
                        {f.updatedAt ? `Updated ${new Date(f.updatedAt).toLocaleDateString()}` : ''}
                      </span>
                    </div>

                    {/* Expanded pages view */}
                    {expandedFunnel === f.id && f.pages && f.pages.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-2 pt-3 border-t border-core-border">
                        <div className="text-[11px] font-semibold text-core-text-dim uppercase tracking-wide mb-1">
                          Pages
                        </div>
                        {f.pages.map((p, i) => (
                          <div
                            key={p.id || i}
                            className="text-xs text-core-text-dim flex items-center gap-2 py-1"
                          >
                            <span className="w-[18px] h-[18px] rounded shrink-0 bg-core-green/10 text-core-green text-[9px] font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="flex-1">{p.name}</span>
                            {p.url && (
                              <a
                                href={p.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-[11px] text-core-cyan no-underline"
                              >
                                View
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Collapsed pages preview */}
                    {expandedFunnel !== f.id && f.pages && f.pages.length > 0 && (
                      <div className="flex flex-col gap-1">
                        {f.pages.slice(0, 3).map((p, i) => (
                          <div key={p.id || i} className="text-xs text-core-text-dim flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-core-green shrink-0" />
                            {p.name}
                          </div>
                        ))}
                        {f.pages.length > 3 && (
                          <span className="text-[11px] text-core-text-muted">
                            +{f.pages.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {f.url && (
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 mt-3 text-xs text-core-green font-semibold no-underline"
                      >
                        View Live <ArrowRight size={12} />
                      </a>
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
            <div className="bg-core-card border border-core-border rounded-2xl px-10 py-16 text-center">
              <ArrowRight className="mx-auto mb-4 opacity-30 text-core-text-muted" size={40} />
              <p className="text-core-text-dim text-sm mb-2">
                {search ? 'No redirects match your search.' : 'No redirects yet.'}
              </p>
              <p className="text-core-text-muted text-[13px]">Click "Add Redirect" to create a URL redirect.</p>
            </div>
          ) : (
            <div className="bg-core-card border border-core-border rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="grid gap-3 px-5 py-3 border-b border-core-border bg-white/[0.02]"
                style={{ gridTemplateColumns: '1fr 1fr 80px 80px 100px' }}>
                {['Source', 'Target', 'Type', 'Status', 'Actions'].map(col => (
                  <div key={col} className="text-[11px] font-semibold text-core-text-muted uppercase tracking-wide">
                    {col}
                  </div>
                ))}
              </div>

              {/* Table rows */}
              {filteredRedirects.map(r => (
                <div
                  key={r.id}
                  className="grid gap-3 px-5 py-3 border-b border-core-border/50 items-center"
                  style={{ gridTemplateColumns: '1fr 1fr 80px 80px 100px' }}
                >
                  <div className="text-[13px] text-core-text-dim font-mono truncate">{r.source}</div>
                  <div className="text-[13px] text-core-text-muted font-mono truncate">{r.target}</div>
                  <div>
                    <span
                      className={[
                        'text-[11px] font-semibold px-1.5 py-0.5 rounded',
                        r.type === '301'
                          ? 'bg-core-green/10 text-core-green'
                          : 'bg-core-cyan/10 text-core-cyan',
                      ].join(' ')}
                    >
                      {r.type}
                    </span>
                  </div>
                  <div>
                    <span
                      className={[
                        'text-[11px] font-semibold px-1.5 py-0.5 rounded',
                        r.status === 'active'
                          ? 'bg-core-green/10 text-core-green'
                          : 'bg-white/5 text-core-text-muted',
                      ].join(' ')}
                    >
                      {r.status || 'active'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(r)}
                      className="bg-transparent border-0 text-core-cyan cursor-pointer text-xs font-semibold p-0"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteRedirect(r.id)}
                      className="bg-transparent border-0 text-core-red cursor-pointer text-xs font-semibold p-0"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-core-bg border border-core-border rounded-2xl p-7 w-[440px] max-w-[90vw]">
            <h3 className="text-base font-bold text-core-text mt-0 mb-5">
              {modalMode === 'create' ? 'Add Redirect' : 'Edit Redirect'}
            </h3>

            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-core-text-dim mb-1.5">Source Path</label>
                <input
                  value={modalSource}
                  onChange={e => setModalSource(e.target.value)}
                  placeholder="/old-page"
                  className="w-full px-3.5 py-2.5 bg-core-card border border-core-border rounded-lg text-core-text text-[13px] outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-core-text-dim mb-1.5">Target URL</label>
                <input
                  value={modalTarget}
                  onChange={e => setModalTarget(e.target.value)}
                  placeholder="https://example.com/new-page"
                  className="w-full px-3.5 py-2.5 bg-core-card border border-core-border rounded-lg text-core-text text-[13px] outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-core-text-dim mb-1.5">Redirect Type</label>
                <div className="flex gap-2">
                  {(['301', '302'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setModalType(t)}
                      className={[
                        'flex-1 py-2.5 rounded-lg border text-[13px] font-semibold cursor-pointer transition-colors duration-150',
                        modalType === t
                          ? 'border-core-green bg-core-green/[0.08] text-core-green'
                          : 'border-core-border bg-core-card text-core-text-dim',
                      ].join(' ')}
                    >
                      {t} {t === '301' ? '(Permanent)' : '(Temporary)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 mt-6 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-[18px] py-2 rounded-lg border border-core-border bg-transparent text-core-text-dim text-[13px] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveRedirect}
                disabled={saving || !modalSource || !modalTarget}
                className={[
                  'px-[18px] py-2 rounded-lg border-0 text-[13px] font-bold transition-opacity duration-150',
                  modalSource && modalTarget
                    ? 'bg-gradient-to-br from-core-green to-[#5cb83a] text-black cursor-pointer'
                    : 'bg-core-border text-core-text-muted cursor-default',
                  saving ? 'opacity-60' : 'opacity-100',
                ].join(' ')}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
