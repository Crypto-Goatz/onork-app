'use client'

import { useState } from 'react'
import { Globe, CheckCircle, XCircle, Star, Loader2 } from 'lucide-react'

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
    <div className="max-w-[700px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-core-text m-0 mb-1">Domains</h1>
        <p className="text-[13px] text-core-text-muted">Find and register a domain for your business.</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2.5 mb-8">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search for a domain name..."
          className="
            flex-1 px-4 py-3.5
            bg-core-card border border-core-border
            rounded-[10px] text-core-text text-[15px]
            outline-none transition-colors
            focus:border-core-cyan
            placeholder:text-core-text-muted
          "
        />
        <button
          type="submit"
          disabled={loading}
          className="
            px-6 py-3.5
            bg-core-cyan text-core-bg
            font-bold text-sm rounded-[10px]
            border-none cursor-pointer transition-opacity
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-2
          "
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Searching...
            </>
          ) : (
            'Search'
          )}
        </button>
      </form>

      {/* Results */}
      {results.map(r => (
        <div
          key={r.domain}
          className="
            bg-core-card border border-core-border
            rounded-[14px] px-6 py-5 mb-3
            flex justify-between items-center
          "
        >
          <div>
            <div className="text-lg font-bold text-core-text">{r.domain}</div>
            <div className="flex items-center gap-2 mt-1">
              {r.available ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-core-green">
                  <CheckCircle size={12} />
                  Available
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-core-red">
                  <XCircle size={12} />
                  Taken
                </span>
              )}
              {r.premium && (
                <span className="flex items-center gap-1 text-xs font-semibold text-core-amber">
                  <Star size={11} />
                  Premium
                </span>
              )}
            </div>
          </div>

          {r.available && (
            <div className="flex items-center gap-3">
              {r.price && (
                <span className="text-xl font-bold text-core-cyan">${r.price}</span>
              )}
              {registered.includes(r.domain) ? (
                <span className="flex items-center gap-1 text-core-green font-semibold text-[13px]">
                  <CheckCircle size={14} />
                  Registered
                </span>
              ) : (
                <button
                  onClick={() => handleRegister(r.domain)}
                  disabled={registering === r.domain}
                  className="
                    px-5 py-2.5
                    bg-core-cyan text-core-bg
                    font-bold text-[13px] rounded-lg
                    border-none cursor-pointer transition-opacity
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center gap-1.5
                  "
                >
                  {registering === r.domain ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Registering...
                    </>
                  ) : (
                    'Register'
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-core-text-dim mb-3">Also available</h3>
          <div className="grid grid-cols-2 gap-2">
            {suggestions.map(s => (
              <div
                key={s.domain}
                className="
                  bg-core-card border border-core-border
                  rounded-[10px] px-4 py-3.5
                  flex justify-between items-center
                  cursor-pointer transition-colors
                  hover:border-core-cyan/25
                "
                onClick={() => { setSearch(s.domain); handleSearch(new Event('submit') as any) }}
              >
                <span className="text-sm font-semibold text-core-text">{s.domain}</span>
                {s.price && (
                  <span className="text-[13px] text-core-cyan font-semibold">${s.price}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && (
        <div className="
          bg-core-card border border-core-border
          rounded-[14px] px-6 py-12
          text-center
        ">
          <Globe size={36} className="mx-auto mb-3 text-core-text-muted opacity-30" />
          <p className="text-core-text-muted text-sm">
            Search for your perfect domain name above.
          </p>
          <p className="text-core-text-muted text-xs mt-2">
            Auto-configures DNS, enables privacy, and connects to your site.
          </p>
        </div>
      )}
    </div>
  )
}
