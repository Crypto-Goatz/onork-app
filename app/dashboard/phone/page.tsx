'use client'

import { useState, useEffect } from 'react'

interface PhoneNumber {
  id: string
  phoneNumber: string
  friendlyName?: string
  status?: string
  forwardTo?: string
  type?: string
  capabilities?: string[]
}

interface SearchResult {
  phoneNumber: string
  friendlyName?: string
  locality?: string
  region?: string
  price?: number
}

export default function PhonePage() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [areaCode, setAreaCode] = useState('412')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [purchasing, setPurchasing] = useState('')

  useEffect(() => { fetchNumbers() }, [])

  async function fetchNumbers() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/crm/phone')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setNumbers(data.numbers || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function searchNumbers() {
    if (!areaCode) return
    setSearching(true)
    try {
      const res = await fetch(`/api/crm/phone?action=search&areaCode=${areaCode}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      setSearchResults(data.numbers || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  async function purchaseNumber(phoneNumber: string) {
    setPurchasing(phoneNumber)
    try {
      const res = await fetch('/api/crm/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Purchase failed')
      setShowSearch(false)
      setSearchResults([])
      await fetchNumbers()
    } catch {
      // handled silently
    } finally {
      setPurchasing('')
    }
  }

  const filtered = numbers.filter((n) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (n.phoneNumber || '').includes(q) || (n.friendlyName || '').toLowerCase().includes(q)
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>
      {/* Search Numbers Modal */}
      {showSearch && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => !purchasing && setShowSearch(false)}>
          <div style={{
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 16, padding: 28, maxWidth: 520, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)', maxHeight: '80vh', overflow: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 20px' }}>
              Search Phone Numbers
            </h2>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <input
                type="text" value={areaCode}
                onChange={e => setAreaCode(e.target.value)}
                placeholder="Area code (e.g. 412)"
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 8,
                  border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)',
                  color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none',
                }}
              />
              <button onClick={searchNumbers} disabled={searching} style={{
                padding: '10px 20px', background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
                color: '#0c1220', fontWeight: 700, fontSize: 13, borderRadius: 10,
                border: 'none', cursor: searching ? 'not-allowed' : 'pointer',
              }}>
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
            {searchResults.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {searchResults.map((r) => (
                  <div key={r.phoneNumber} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderRadius: 10, border: '1px solid #1c2b42',
                    background: 'var(--bg-primary, #0f172a)',
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>{r.phoneNumber}</div>
                      {r.locality && <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{r.locality}, {r.region}</div>}
                    </div>
                    <button onClick={() => purchaseNumber(r.phoneNumber)} disabled={!!purchasing} style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: purchasing === r.phoneNumber ? '#374151' : '#7ed957',
                      color: '#0c1220', border: 'none', cursor: purchasing ? 'not-allowed' : 'pointer',
                    }}>
                      {purchasing === r.phoneNumber ? 'Purchasing...' : 'Purchase'}
                    </button>
                  </div>
                ))}
              </div>
            ) : !searching ? (
              <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, textAlign: 'center', padding: 20 }}>
                Enter an area code and click Search to find available numbers.
              </p>
            ) : null}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: 0, display: 'flex', alignItems: 'center' }}>
            Phone System
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,217,87,0.12)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)', marginLeft: 8 }}>UNLIMITED</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>
            {numbers.length > 0 ? `${numbers.length} phone numbers` : 'Manage phone numbers and forwarding'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#7ed957' }}>Activated</span>
          <button onClick={() => setShowSearch(true)} style={{
            padding: '10px 20px', background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
            color: '#0c1220', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
          }}>
            + Get Number
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input type="text" placeholder="Search numbers..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px 12px 40px',
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 10, color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23556880' stroke-width='2' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: '14px center',
          }}
        />
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
          <button onClick={fetchNumbers} style={{ color: 'var(--color-cyan, #14b8a6)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Try again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>&#9742;</div>
          <p style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: 14, marginBottom: 16 }}>
            {search ? 'No numbers match your search.' : 'No phone numbers yet. Purchase your first one.'}
          </p>
          {!search && (
            <button onClick={() => setShowSearch(true)} style={{
              padding: '10px 20px', background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
              color: '#0c1220', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
            }}>+ Get Number</button>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1c2b42' }}>
                {['Number', 'Name', 'Type', 'Status', 'Forward To'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => (
                <tr key={n.id || n.phoneNumber} style={{ borderBottom: '1px solid rgba(28,43,66,0.5)' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1a2740'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>{n.phoneNumber}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary, #9ca3af)' }}>{n.friendlyName || '—'}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'rgba(45,212,191,0.1)', color: 'var(--color-cyan, #14b8a6)' }}>
                      {n.type || 'local'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: n.status === 'active' ? '#7ed957' : 'var(--text-muted, #6b7280)' }}>
                      {n.status || 'active'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary, #9ca3af)' }}>{n.forwardTo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
