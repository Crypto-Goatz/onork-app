'use client'

/**
 * /dashboard/locations — full-page sub-location switcher.
 *
 * Lists every CRM sub-location the user has access to. Clicking one
 * resets the dashboard scope: persists to profile + /api/console/locations,
 * then hard-reloads back to /dashboard so every page re-reads the scope.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, MapPin, Loader2, ArrowLeft, Search, Sparkles } from 'lucide-react'

interface Location {
  id: string
  name: string
  email?: string
  phone?: string
  website?: string
}

export default function LocationsPage() {
  const router = useRouter()
  const [locations, setLocations] = useState<Location[]>([])
  const [activeId, setActiveId] = useState('')
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch('/api/console/locations')
      .then((r) => r.json())
      .then((d) => {
        setLocations(d.locations || [])
        if (d.activeLocationId) setActiveId(d.activeLocationId)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function selectLocation(id: string) {
    if (id === activeId) {
      router.push('/dashboard')
      return
    }
    setSwitching(id)
    try {
      await fetch('/api/console/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: id }),
      })
      // Hard-reload to /dashboard so every page re-reads the new scope fresh.
      window.location.href = '/dashboard'
    } catch {
      setSwitching(null)
    }
  }

  const filtered = locations.filter((l) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      l.name.toLowerCase().includes(q) ||
      l.id.toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.website || '').toLowerCase().includes(q)
    )
  })

  const active = locations.find((l) => l.id === activeId)

  return (
    <div className="min-h-screen bg-core-bg">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Back */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[12px] text-core-text-muted hover:text-core-text transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-core-green/30 bg-core-green/5 text-core-green text-[10px] font-bold uppercase tracking-[0.22em] mb-3">
            <MapPin className="w-3 h-3" /> Locations
          </div>
          <h1 className="text-4xl font-black tracking-tight text-core-text">
            Switch location.
          </h1>
          <p className="text-sm text-core-text-muted mt-2 max-w-xl">
            Pick a sub-location to scope this entire dashboard to. Every contact, calendar,
            pipeline, and automation re-reads from the location you select here.
          </p>
        </div>

        {/* Current indicator */}
        {active && (
          <div className="mb-6 rounded-xl border border-core-green/25 bg-core-green/[0.03] px-5 py-3 flex items-center gap-3 flex-wrap">
            <div className="w-2 h-2 rounded-full bg-core-green animate-pulse shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-core-green">
                Currently active
              </div>
              <div className="text-sm font-semibold text-core-text mt-0.5 truncate">
                {active.name}
              </div>
            </div>
            <div className="text-[11px] font-mono text-core-text-muted shrink-0">
              {active.id}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-core-text-muted/60 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or ID…"
            className="w-full pl-10 pr-4 h-11 rounded-lg border border-core-border bg-core-card text-sm text-core-text placeholder:text-core-text-muted/60 focus:outline-none focus:border-core-green/50 focus:ring-2 focus:ring-core-green/10"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-core-green animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-core-border bg-core-card px-6 py-16 text-center">
            <MapPin className="w-10 h-10 text-core-text-muted/40 mx-auto mb-3" />
            <div className="text-sm font-medium text-core-text mb-1">
              {query ? 'No locations match your search' : 'No locations linked yet'}
            </div>
            <p className="text-xs text-core-text-muted">
              {query ? 'Try a different search term.' : 'Install the marketplace app to connect a location.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((loc) => {
              const isActive = loc.id === activeId
              const isSwitching = switching === loc.id
              return (
                <button
                  key={loc.id}
                  onClick={() => selectLocation(loc.id)}
                  disabled={isSwitching}
                  className={`relative text-left rounded-xl border p-5 transition-all ${
                    isActive
                      ? 'border-core-green/60 bg-core-green/[0.04] shadow-[0_0_20px_rgba(110,224,90,0.12)]'
                      : 'border-core-border bg-core-card hover:border-core-green/40 hover:bg-white/[0.02]'
                  } ${isSwitching ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                >
                  {isActive && (
                    <div className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-core-green">
                      <Check className="w-3 h-3" /> Active
                    </div>
                  )}

                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-gradient-to-br from-core-green to-core-cyan shadow-[0_0_14px_rgba(110,224,90,0.35)]'
                          : 'bg-white/[0.04] border border-core-border'
                      }`}
                    >
                      <MapPin className={`w-5 h-5 ${isActive ? 'text-black' : 'text-core-text-muted'}`} strokeWidth={2.4} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-core-text text-sm leading-tight truncate">
                        {loc.name || 'Unnamed'}
                      </div>
                      <div className="text-[10px] font-mono text-core-text-muted mt-0.5 truncate">
                        {loc.id}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-core-text-muted">
                    {loc.email && (
                      <div className="truncate">
                        <span className="text-core-text-muted/60">Email: </span>
                        {loc.email}
                      </div>
                    )}
                    {loc.website && (
                      <div className="truncate">
                        <span className="text-core-text-muted/60">Website: </span>
                        {loc.website}
                      </div>
                    )}
                  </div>

                  {!isActive && (
                    <div className="mt-4 pt-3 border-t border-core-border flex items-center justify-between text-[11px]">
                      <span className="text-core-text-muted">
                        {isSwitching ? 'Switching…' : 'Click to switch'}
                      </span>
                      {isSwitching ? (
                        <Loader2 className="w-3 h-3 animate-spin text-core-green" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-core-text-muted/40" />
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        <div className="mt-10 text-[11px] text-core-text-muted/60 text-center">
          {filtered.length} of {locations.length} location{locations.length === 1 ? '' : 's'} shown
        </div>
      </div>
    </div>
  )
}
