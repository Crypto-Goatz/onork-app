'use client'

import { useEffect, useState } from 'react'

interface ShowcaseEntry {
  id: string
  display_order: number
  name: string
  title: string | null
  company: string | null
  bio: string | null
  avatar_url: string | null
  category: string | null
  is_featured: boolean
}

function avatarFallback(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1f2937&color=fff&size=320`
}

export function ShowcaseGrid() {
  const [items, setItems] = useState<ShowcaseEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/lead-magnet/builtwith', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setItems(d.all ?? [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded) return <div className="text-zinc-500">Loading showcase…</div>
  if (items.length === 0) {
    return <div className="text-zinc-500">No showcase entries yet.</div>
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.id}
          className={`rounded-2xl p-6 transition-all hover:-translate-y-0.5 ${
            item.is_featured
              ? 'border border-emerald-500/25 bg-emerald-500/[0.04]'
              : 'border border-white/[0.08] bg-white/[0.04] hover:border-emerald-500/30'
          }`}
        >
          <div className="mb-4 flex items-center gap-3">
            <img
              src={item.avatar_url || avatarFallback(item.name)}
              alt={item.name}
              className="h-12 w-12 shrink-0 rounded-full object-cover"
            />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold">{item.name}</div>
              <div className="truncate text-[13px] text-zinc-500">
                {[item.title, item.company].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
          {item.bio && (
            <p className="line-clamp-3 text-sm leading-relaxed text-zinc-400">{item.bio}</p>
          )}
          {item.category && (
            <span className="mt-3 inline-block rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              {item.category}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

export function Ticker() {
  const [items, setItems] = useState<ShowcaseEntry[]>([])

  useEffect(() => {
    fetch('/api/lead-magnet/builtwith', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setItems(d.all ?? []))
      .catch(() => {})
  }, [])

  if (items.length === 0) return null

  // Duplicate for seamless loop
  const tickerItems = [...items, ...items]

  return (
    <div className="overflow-hidden border-y border-white/[0.08] py-8">
      <div className="flex gap-12 animate-builtwith-ticker w-max">
        {tickerItems.map((item, i) => (
          <div key={`${item.id}-${i}`} className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-sm text-zinc-400">
            <img
              src={item.avatar_url || avatarFallback(item.name)}
              alt={item.name}
              className="h-6 w-6 rounded-full object-cover"
            />
            <span>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
