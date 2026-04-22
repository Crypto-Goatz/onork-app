'use client'

import { useState, useEffect } from 'react'
import { Phone, Search, Plus, X, Loader2 } from 'lucide-react'

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
    <div className="max-w-[1100px] mx-auto px-2">

      {/* Search Numbers Modal */}
      {showSearch && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => !purchasing && setShowSearch(false)}
        >
          <div
            className="bg-core-card border border-core-border rounded-2xl p-7 w-full max-w-[520px] shadow-2xl max-h-[80vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-core-text">Search Phone Numbers</h2>
              <button
                onClick={() => !purchasing && setShowSearch(false)}
                className="text-core-text-muted hover:text-core-text transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Area code input row */}
            <div className="flex gap-2.5 mb-5">
              <input
                type="text"
                value={areaCode}
                onChange={e => setAreaCode(e.target.value)}
                placeholder="Area code (e.g. 412)"
                className="flex-1 px-3 py-2.5 rounded-lg border border-core-border bg-core-bg text-core-text text-sm outline-none placeholder:text-core-text-muted focus:border-core-cyan transition-colors"
              />
              <button
                onClick={searchNumbers}
                disabled={searching}
                className="px-5 py-2.5 bg-core-cyan text-[#0c1220] font-bold text-sm rounded-xl border-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 hover:opacity-90 transition-opacity"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Results */}
            {searchResults.length > 0 ? (
              <div className="flex flex-col gap-2">
                {searchResults.map((r) => (
                  <div
                    key={r.phoneNumber}
                    className="flex justify-between items-center px-4 py-3 rounded-xl border border-core-border bg-core-bg"
                  >
                    <div>
                      <div className="text-sm font-semibold text-core-text">{r.phoneNumber}</div>
                      {r.locality && (
                        <div className="text-xs text-core-text-muted mt-0.5">{r.locality}, {r.region}</div>
                      )}
                    </div>
                    <button
                      onClick={() => purchaseNumber(r.phoneNumber)}
                      disabled={!!purchasing}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-core-green text-[#0c1220] border-none cursor-pointer disabled:cursor-not-allowed disabled:bg-core-surface disabled:text-core-text-muted hover:opacity-90 transition-opacity"
                    >
                      {purchasing === r.phoneNumber ? 'Purchasing...' : 'Purchase'}
                    </button>
                  </div>
                ))}
              </div>
            ) : !searching ? (
              <p className="text-core-text-muted text-sm text-center py-5">
                Enter an area code and click Search to find available numbers.
              </p>
            ) : null}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-core-text m-0 flex items-center gap-2">
            Phone System
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-core-green/10 text-core-green border border-core-green/20">
              UNLIMITED
            </span>
          </h1>
          <p className="text-sm text-core-text-muted mt-1">
            {numbers.length > 0 ? `${numbers.length} phone numbers` : 'Manage phone numbers and forwarding'}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs font-semibold text-core-green">Activated</span>
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-core-cyan text-[#0c1220] font-bold text-sm rounded-xl border-none cursor-pointer hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            Get Number
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-core-text-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Search numbers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-core-card border border-core-border rounded-xl text-core-text text-sm outline-none placeholder:text-core-text-muted focus:border-core-cyan transition-colors"
        />
      </div>

      {/* Content states */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="text-core-cyan animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-core-card border border-core-border rounded-2xl p-10 text-center">
          <p className="text-core-red text-sm mb-3">{error}</p>
          <button
            onClick={fetchNumbers}
            className="text-core-cyan bg-transparent border-none cursor-pointer text-sm font-semibold hover:opacity-80 transition-opacity"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-core-card border border-core-border rounded-2xl px-10 py-16 text-center">
          <div className="flex justify-center mb-4 opacity-30">
            <Phone size={40} className="text-core-text-dim" />
          </div>
          <p className="text-core-text-dim text-sm mb-4">
            {search ? 'No numbers match your search.' : 'No phone numbers yet. Purchase your first one.'}
          </p>
          {!search && (
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-1.5 mx-auto px-5 py-2.5 bg-core-cyan text-[#0c1220] font-bold text-sm rounded-xl border-none cursor-pointer hover:opacity-90 transition-opacity"
            >
              <Plus size={14} />
              Get Number
            </button>
          )}
        </div>
      ) : (
        <div className="bg-core-card border border-core-border rounded-2xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-core-border">
                {['Number', 'Name', 'Type', 'Status', 'Forward To'].map(h => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-[11px] font-semibold text-core-text-muted uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => (
                <tr
                  key={n.id || n.phoneNumber}
                  className="border-b border-core-border/50 hover:bg-core-card-hover transition-colors"
                >
                  <td className="px-5 py-3.5 text-sm font-semibold text-core-text">{n.phoneNumber}</td>
                  <td className="px-5 py-3.5 text-sm text-core-text-dim">{n.friendlyName || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-core-cyan/10 text-core-cyan">
                      {n.type || 'local'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[11px] font-semibold ${n.status === 'active' ? 'text-core-green' : 'text-core-text-muted'}`}>
                      {n.status || 'active'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-core-text-dim">{n.forwardTo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
