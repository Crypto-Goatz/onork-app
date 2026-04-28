'use client'

/**
 * CRM Marketplace Widget — iframe-mounted UCP catalog.
 *
 * Pulls every active product from /api/widgets/marketplace/catalog (which
 * unions ucp_products + marketplace_apps and de-dupes by slug). Each card has
 * an Install / Buy button:
 *   - Free apps → /api/marketplace/install (registers for the location)
 *   - Paid products → /api/commerce/checkout (Stripe; opens in parent window)
 *
 * URL params:
 *   ?locationId=<crm sublocation id>   (required when embedded)
 *   ?token=<0n_live_xxx>               (optional — used for entitlement check)
 *   ?mode=installed                    (filter to installed-only view)
 */

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Download, ShoppingCart, Check, Loader2, Package, Sparkles } from 'lucide-react'

interface CatalogItem {
  id: string
  slug: string
  name: string
  description: string
  category: string | null
  tags: string[] | null
  price_cents: number
  price_type: string | null
  currency: string | null
  fulfillment_type: string | null
  icon: string | null
  cover_image: string | null
  featured: boolean
  source: 'ucp_products' | 'marketplace_apps'
  installed?: boolean
}

function formatPrice(cents: number, type: string | null): string {
  if (cents === 0) return 'Free'
  const dollars = (cents / 100).toFixed(2).replace(/\.00$/, '')
  return type === 'subscription' || type === 'recurring' ? `$${dollars}/mo` : `$${dollars}`
}

export function MarketplaceWidget() {
  const params = useSearchParams()
  const locationId = params.get('locationId')
  const onToken = params.get('token')
  const filterMode = params.get('mode')

  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams()
      if (locationId) q.set('locationId', locationId)
      if (filterMode) q.set('mode', filterMode)
      const res = await fetch(`/api/widgets/marketplace/catalog?${q}`, { cache: 'no-store' })
      const data = await res.json()
      setItems(data.items ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [locationId, filterMode])

  useEffect(() => {
    load()
  }, [load])

  const categories = Array.from(
    new Set(items.map((i) => i.category).filter(Boolean) as string[])
  ).sort()

  const filtered = items.filter((i) => {
    if (category !== 'all' && i.category !== category) return false
    if (search && !`${i.name} ${i.description}`.toLowerCase().includes(search.toLowerCase()))
      return false
    return true
  })

  async function handleAction(item: CatalogItem) {
    if (item.installed) return
    setBusy(item.slug)
    try {
      if (item.price_cents === 0) {
        // Free install
        const res = await fetch('/api/widgets/marketplace/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: item.slug,
            source: item.source,
            locationId,
            onToken,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setToast({ kind: 'err', msg: data.error || 'Install failed' })
          return
        }
        setToast({ kind: 'ok', msg: `${item.name} installed` })
        load()
      } else {
        // Paid → open Stripe checkout in parent window (break out of iframe)
        const res = await fetch('/api/widgets/marketplace/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: item.slug,
            source: item.source,
            locationId,
            onToken,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.url) {
          setToast({ kind: 'err', msg: data.error || 'Checkout failed' })
          return
        }
        // If embedded, open in parent. Otherwise top-level redirect.
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = data.url
          } else {
            window.location.href = data.url
          }
        } catch {
          window.open(data.url, '_blank')
        }
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Package className="h-5 w-5 text-[#7ed957]" />
        <h1 className="text-lg font-bold">Marketplace</h1>
        <span className="ml-auto text-xs text-white/40">
          {locationId ? `Loc: ${locationId.slice(-6)}` : 'preview'}
        </span>
      </div>

      {/* Search + categories */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-md border border-white/10 bg-white/[0.02] pl-7 pr-2 py-1.5 text-sm focus:border-white/30 focus:outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-white/10 bg-white/[0.02] px-2 py-1.5 text-sm focus:border-white/30 focus:outline-none"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mb-3 rounded-md border px-3 py-2 text-sm ${
            toast.kind === 'ok'
              ? 'border-[#7ed957]/30 bg-[#7ed957]/5 text-[#7ed957]'
              : 'border-red-500/30 bg-red-500/5 text-red-300'
          }`}
        >
          {toast.msg}
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-[10px] uppercase opacity-60 hover:opacity-100"
          >
            dismiss
          </button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-white/40">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/40">
          No products match your filter.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <div
              key={`${item.source}:${item.slug}`}
              className="flex flex-col rounded-lg border border-white/10 bg-white/[0.02] p-3 transition-colors hover:border-white/20"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-base">
                  {item.icon ?? item.name.charAt(0)}
                </div>
                {item.featured && (
                  <span className="flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white/60">
                    <Sparkles className="h-2.5 w-2.5" />
                    Featured
                  </span>
                )}
              </div>

              <h3 className="text-sm font-semibold text-white">{item.name}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-white/55">{item.description}</p>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">
                  {formatPrice(item.price_cents, item.price_type)}
                </span>
                <button
                  type="button"
                  onClick={() => handleAction(item)}
                  disabled={busy === item.slug || item.installed}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === item.slug ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : item.installed ? (
                    <>
                      <Check className="h-3 w-3" /> Installed
                    </>
                  ) : item.price_cents === 0 ? (
                    <>
                      <Download className="h-3 w-3" /> Install
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-3 w-3" /> Buy
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
