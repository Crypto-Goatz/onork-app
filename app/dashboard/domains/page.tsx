'use client'

import { useState } from 'react'

interface DomainResult {
  domain: string
  available: boolean
  price: number | null
  premium: boolean
}

interface Suggestion {
  domain: string
  price: number | null
}

export default function DomainsPage() {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<DomainResult[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [registering, setRegistering] = useState<string | null>(null)
  const [registered, setRegistered] = useState<string[]>([])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!search.trim()) return

    setLoading(true)
    setResults([])
    setSuggestions([])

    let domain = search.trim().toLowerCase()
    if (!domain.includes('.')) domain += '.com'

    try {
      const res = await fetch(`/api/domains?domain=${encodeURIComponent(domain)}`)
      const data = await res.json()
      setResults(data.results || [])
      setSuggestions(data.suggestions || [])
    } catch {}

    setLoading(false)
  }

  async function handleRegister(domain: string) {
    setRegistering(domain)
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
      const data = await res.json()
      if (data.success) {
        setRegistered(prev => [...prev, domain])
      }
    } catch {}
    setRegistering(null)
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 4px' }}>Domains</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)' }}>Find and register a domain for your business.</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search for a domain name..."
          style={{
            flex: 1, padding: '14px 16px',
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 10, color: 'var(--text-primary, #f0f4f8)', fontSize: 15, outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--color-cyan, #14b8a6)'}
          onBlur={e => e.target.style.borderColor = 'var(--border, #30363d)'}
        />
        <button type="submit" disabled={loading} style={{
          padding: '14px 24px',
          background: loading ? 'var(--border, #30363d)' : 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
          color: loading ? 'var(--text-muted, #6b7280)' : '#0c1220',
          fontWeight: 700, fontSize: 14, borderRadius: 10,
          border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
        }}>{loading ? 'Searching...' : 'Search'}</button>
      </form>

      {/* Results */}
      {results.map(r => (
        <div key={r.domain} style={{
          background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
          borderRadius: 14, padding: '20px 24px', marginBottom: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)' }}>{r.domain}</div>
            <div style={{
              fontSize: 12, fontWeight: 600, marginTop: 4,
              color: r.available ? '#34d399' : '#f87171',
            }}>
              {r.available ? '✓ Available' : '✗ Taken'}
              {r.premium && <span style={{ color: '#fbbf24', marginLeft: 8 }}>Premium</span>}
            </div>
          </div>
          {r.available && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {r.price && <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-cyan, #14b8a6)' }}>${r.price}</span>}
              {registered.includes(r.domain) ? (
                <span style={{ color: '#34d399', fontWeight: 600, fontSize: 13 }}>✓ Registered</span>
              ) : (
                <button
                  onClick={() => handleRegister(r.domain)}
                  disabled={registering === r.domain}
                  style={{
                    padding: '10px 20px',
                    background: registering === r.domain ? 'var(--border, #30363d)' : 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
                    color: '#0c1220', fontWeight: 700, fontSize: 13,
                    borderRadius: 8, border: 'none', cursor: 'pointer',
                  }}
                >{registering === r.domain ? 'Registering...' : 'Register'}</button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary, #9ca3af)', marginBottom: 12 }}>Also available</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {suggestions.map(s => (
              <div key={s.domain} style={{
                background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
                borderRadius: 10, padding: '14px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#2dd4bf40'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border, #30363d)'}
                onClick={() => { setSearch(s.domain); handleSearch(new Event('submit') as any) }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>{s.domain}</span>
                {s.price && <span style={{ fontSize: 13, color: 'var(--color-cyan, #14b8a6)', fontWeight: 600 }}>${s.price}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && (
        <div style={{
          background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
          borderRadius: 14, padding: '48px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>🌐</div>
          <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 14 }}>
            Search for your perfect domain name above.
          </p>
          <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 12, marginTop: 8 }}>
            Auto-configures DNS, enables privacy, and connects to your site.
          </p>
        </div>
      )}
    </div>
  )
}
