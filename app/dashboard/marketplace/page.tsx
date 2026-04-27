'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Star, Download, Package, Filter, Loader2 } from 'lucide-react'

interface MarketplaceApp {
  id: string
  slug: string
  name: string
  description: string
  category: string
  tags: string[]
  version: string
  vendor_name: string
  vendor_verified: boolean
  icon: string | null
  price_cents: number
  price_type: 'one_time' | 'recurring'
  installs: number
  avg_rating: number | null
  review_count: number
}

const CATEGORIES = [
  { slug: 'all', name: 'All' },
  { slug: 'crm-automation', name: 'CRM' },
  { slug: 'content-generation', name: 'Content' },
  { slug: 'lead-qualification', name: 'Leads' },
  { slug: 'reporting', name: 'Reports' },
  { slug: 'social-media', name: 'Social' },
  { slug: 'finance', name: 'Finance' },
]

const SORTS = [
  { value: 'installs', label: 'Most Installed' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
]

function formatPrice(cents: number, type: string) {
  if (cents === 0) return 'Free'
  const dollars = (cents / 100).toFixed(2).replace(/\.00$/, '')
  return type === 'recurring' ? `$${dollars}/mo` : `$${dollars}`
}

export default function MarketplacePage() {
  const [apps, setApps] = useState<MarketplaceApp[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('installs')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (category !== 'all') params.set('category', category)
    if (search.trim()) params.set('q', search.trim())
    params.set('sort', sort)
    params.set('limit', '60')

    fetch(`/api/marketplace/apps?${params}`)
      .then(r => r.json())
      .then(data => setApps(data.apps || []))
      .catch(() => setApps([]))
      .finally(() => setLoading(false))
  }, [category, sort, search])

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
          <p className="text-white/60">AI apps, automations, and done-for-you services. Install in one click.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search apps..."
              className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#7ed957]/50"
            />
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7ed957]/50"
          >
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <Link
            href="/dashboard/marketplace/my-apps"
            className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm transition"
          >
            <Package className="h-4 w-4" /> My Apps
          </Link>
          <Link
            href="/dashboard/marketplace/publish"
            className="flex items-center gap-2 bg-[#7ed957] hover:bg-[#6bc847] text-black font-semibold rounded-lg px-4 py-2.5 text-sm transition"
          >
            Publish App
          </Link>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.slug}
              onClick={() => setCategory(cat.slug)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition border ${
                category === cat.slug
                  ? 'bg-[#7ed957] text-black border-[#7ed957] font-semibold'
                  : 'bg-white/[0.02] border-white/[0.06] text-white/70 hover:bg-white/[0.06]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-20 text-white/50">
            <Filter className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No apps found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map(app => (
              <Link
                key={app.id}
                href={`/dashboard/marketplace/${app.slug}`}
                className="group bg-white/[0.02] border border-white/[0.06] hover:border-[#7ed957]/40 rounded-xl p-5 transition"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-lg font-semibold">
                    {app.icon || app.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate group-hover:text-[#7ed957] transition">{app.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-white/50">
                      <span>{app.vendor_name}</span>
                      {app.vendor_verified && <span className="text-[#7ed957]">✓</span>}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-white/60 mb-4 line-clamp-2 min-h-[2.5rem]">{app.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-white/50">
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />{app.installs}
                    </span>
                    {app.avg_rating != null && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-400" />{Number(app.avg_rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-[#7ed957]">
                    {formatPrice(app.price_cents, app.price_type)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
