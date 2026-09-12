'use client'

/**
 * EXPLORE BY CATEGORY — the dark app catalogue.
 *
 * Mike, 2026-09-12, holding up the Microsoft 365 admin app list: "this dark and
 * simple format for listing apps in card style is exactly what I want to see…
 * on hover just make the background all black — swap out our green brand colour
 * where necessary."
 *
 * So: category pills across the top, a quiet grid of cards under them, each card
 * an icon tile + name on one line and the one-line description under it. Resting
 * state is the page's card grey; hovering drops the card to true black and lifts
 * the border to 0n green, which is the whole interaction — no scale, no shadow,
 * no colour wash. At this density anything more reads as noise.
 *
 * Reads `visibleAddons()`, never `ADDONS`, so an owner-only listing is absent
 * from the grid AND from every pill count rather than merely unlabelled.
 *
 * House rules kept: Lucide icons only, Tailwind only (no inline styles), brand
 * accent #6EE05A. Category colours come from the data, so a new category needs
 * no change here.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Database, Megaphone, Brain, BarChart3, Phone, DollarSign, Pencil, Settings,
  LayoutGrid, ChevronDown, ArrowRight,
} from 'lucide-react'
import { CATEGORIES, visibleAddons, type MarketplaceAddon } from '@/lib/marketplace-data'

/** The data carries an icon NAME; this is the only place it becomes a component. */
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  database: Database,
  megaphone: Megaphone,
  brain: Brain,
  chart: BarChart3,
  phone: Phone,
  dollar: DollarSign,
  pencil: Pencil,
  settings: Settings,
}

/** Tailwind cannot build a class from a runtime hex, so colour lives in a class map. */
const TONE: Record<string, { tile: string; icon: string }> = {
  '0n-crm': { tile: 'bg-[#a78bfa]/10', icon: 'text-[#a78bfa]' },
  marketing: { tile: 'bg-[#00d4ff]/10', icon: 'text-[#00d4ff]' },
  'ai-automation': { tile: 'bg-[#6EE05A]/10', icon: 'text-[#6EE05A]' },
  analytics: { tile: 'bg-[#fbbf24]/10', icon: 'text-[#fbbf24]' },
  communication: { tile: 'bg-[#14b8a6]/10', icon: 'text-[#14b8a6]' },
  sales: { tile: 'bg-[#f97316]/10', icon: 'text-[#f97316]' },
  content: { tile: 'bg-[#ec4899]/10', icon: 'text-[#ec4899]' },
  admin: { tile: 'bg-[#6b7280]/20', icon: 'text-[#9ca3af]' },
}
const FALLBACK_TONE = { tile: 'bg-[#6EE05A]/10', icon: 'text-[#6EE05A]' }

/** An add-on sits in several categories; the first one owns its colour and icon. */
function faceOf(a: MarketplaceAddon) {
  const slug = a.categories.find((c) => CATEGORIES.some((k) => k.slug === c)) || 'admin'
  const cat = CATEGORIES.find((c) => c.slug === slug)
  return { tone: TONE[slug] ?? FALLBACK_TONE, Icon: ICONS[cat?.icon || 'settings'] ?? Settings }
}

const VISIBLE_PILLS = 6

export default function AppCatalog({
  isOwner = false,
  title = 'Explore by category',
  limit,
}: {
  isOwner?: boolean
  title?: string
  /** Cap the grid (a landing page wants a taste, /marketplace wants all of it). */
  limit?: number
}) {
  const addons = useMemo(() => visibleAddons({ isOwner }), [isOwner])
  const [active, setActive] = useState('all')
  const [pillsOpen, setPillsOpen] = useState(false)

  // Counts are derived from what this viewer can actually see, so a pill can
  // never advertise a listing the grid then refuses to show.
  const cats = useMemo(
    () =>
      CATEGORIES.map((c) => ({ ...c, n: addons.filter((a) => a.categories.includes(c.slug)).length }))
        .filter((c) => c.n > 0),
    [addons],
  )
  const shown = useMemo(() => {
    const list = active === 'all' ? addons : addons.filter((a) => a.categories.includes(active))
    return limit ? list.slice(0, limit) : list
  }, [addons, active, limit])

  const pills = [{ slug: 'all', name: 'All', n: addons.length }, ...cats]
  const visiblePills = pillsOpen ? pills : pills.slice(0, VISIBLE_PILLS + 1)
  const hidden = pills.length - visiblePills.length

  return (
    <section className="w-full">
      <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">{title}</h2>

      {/* Category pills */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {visiblePills.map((p) => {
          const on = p.slug === active
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => setActive(p.slug)}
              aria-pressed={on}
              className={
                'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ' +
                (on
                  ? 'border-[#6EE05A]/50 bg-[#6EE05A]/10 font-medium text-[#6EE05A]'
                  : 'border-white/12 text-white/70 hover:border-white/25 hover:bg-white/[0.04] hover:text-white')
              }
            >
              {p.slug === 'all' && <LayoutGrid className="h-3.5 w-3.5" />}
              {p.name}
              <span className={on ? 'text-[#6EE05A]/70' : 'text-white/35'}>{p.n}</span>
            </button>
          )
        })}
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setPillsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-sm text-white/70 transition-colors hover:border-white/25 hover:bg-white/[0.04] hover:text-white"
          >
            {hidden} more <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((a) => {
          const { tone, Icon } = faceOf(a)
          return (
            <Link
              key={a.slug}
              href={`/marketplace/addon/${a.slug}`}
              className="group flex flex-col rounded-xl border border-white/[0.09] bg-white/[0.025] p-5 transition-colors duration-150 hover:border-[#6EE05A]/40 hover:bg-black focus-visible:border-[#6EE05A]/60 focus-visible:bg-black focus-visible:outline-none"
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-lg ${tone.tile}`}>
                  <Icon className={`h-5 w-5 ${tone.icon}`} />
                </span>
                <span className="min-w-0 text-[15px] font-semibold leading-tight text-white transition-colors group-hover:text-[#6EE05A]">
                  {a.name.split('—')[0].trim()}
                </span>
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-white/55 transition-colors group-hover:text-white/75">
                {a.shortDesc}
              </p>
            </Link>
          )
        })}
      </div>

      {limit && shown.length < (active === 'all' ? addons.length : addons.filter((a) => a.categories.includes(active)).length) && (
        <div className="mt-8">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#6EE05A] transition-opacity hover:opacity-80"
          >
            See all {addons.length} add-ons <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  )
}
