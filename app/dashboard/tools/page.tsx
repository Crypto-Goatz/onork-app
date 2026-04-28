'use client'

import { useEffect, useState } from 'react'
import { Search, Wrench, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ServiceCard, ToolCard } from '@/components/command/tool-card'

interface ServiceInfo {
  key: string
  name: string
  category: string
  description: string
  toolCount: number
}

interface ToolInfo {
  name: string
  service: string
  serviceName: string
  category: string
  description: string
  method: string
}

interface Stats {
  totalTools: number
  totalServices: number
  totalCategories: number
}

export default function ToolsPage() {
  const [services, setServices] = useState<ServiceInfo[]>([])
  const [searchResults, setSearchResults] = useState<ToolInfo[] | null>(null)
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/tools/catalog?view=services').then((r) => r.json()),
      fetch('/api/tools/catalog?view=stats').then((r) => r.json()),
    ])
      .then(([svc, st]) => {
        setServices(svc.services ?? [])
        setStats(st)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults(null)
      return
    }
    const t = setTimeout(() => {
      fetch(`/api/tools/catalog?search=${encodeURIComponent(search)}`)
        .then((r) => r.json())
        .then((d) => setSearchResults(d.tools ?? []))
    }, 200)
    return () => clearTimeout(t)
  }, [search])

  // Group services by category
  const grouped = services.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {} as Record<string, ServiceInfo[]>)

  const sortedCategories = Object.keys(grouped).sort()

  return (
    <div className="px-6 py-5 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="h-6 w-6 text-[#7ed957]" />
          Tools
        </h1>
        <p className="text-sm text-white/55 mt-1">
          {stats
            ? `${stats.totalTools.toLocaleString()} tools across ${stats.totalServices} services in ${stats.totalCategories} categories`
            : 'Loading catalog…'}
          . Click any tool to run it. Save the result as a Switch for one-click rerun.
        </p>
      </div>

      <div className="relative mb-6 max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tools by name, service, or description…"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-white/40">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : searchResults ? (
        <>
          <p className="mb-3 text-xs uppercase tracking-wider text-white/55">
            {searchResults.length} match{searchResults.length === 1 ? '' : 'es'}
          </p>
          {searchResults.length === 0 ? (
            <p className="text-white/40 text-sm">No tools matched. Try a different query.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((t) => (
                <ToolCard key={t.name} {...t} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-8">
          {sortedCategories.map((cat) => (
            <section key={cat}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/55">
                {cat}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {grouped[cat].map((s) => (
                  <ServiceCard
                    key={s.key}
                    serviceKey={s.key}
                    name={s.name}
                    category={s.category}
                    description={s.description}
                    toolCount={s.toolCount}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
