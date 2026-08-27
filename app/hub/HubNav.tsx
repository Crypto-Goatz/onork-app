'use client'

/**
 * The sticky Hub menu.
 *
 * A CLIENT COMPONENT ONLY BECAUSE OF `usePathname`. Marking the current page is
 * the one thing this needs the browser for; the link list itself is decided on
 * the server, so which links exist is never a client-side decision.
 *
 * ACTIVE STATE IS EXACT-OR-PREFIX, AND `/hub` IS THE SPECIAL CASE. A naive
 * `startsWith` marks Home active on every single page, since every path here
 * begins with `/hub` — which makes the highlight meaningless exactly when the
 * reader needs it.
 *
 * STICKY, WHICH MEANS THE PARENT HAS TO GIVE IT ROOM TO TRAVEL. `position:
 * sticky` moves inside its PARENT's box: a rail the same height as its parent
 * has nowhere to go and silently never sticks. This estate lost an afternoon to
 * exactly that — `top` and `position` both correct, container 719px around a
 * 719px aside. Here the parent is the flex row, which is at least the page
 * height, and the rail is `h-screen`, so it holds.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, Radio, Gauge, Map } from 'lucide-react'

export type HubLink = { href: string; label: string; icon: string; owner?: boolean }

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home, grid: LayoutGrid, radio: Radio, gauge: Gauge, map: Map,
}

export default function HubNav({ links }: { links: HubLink[] }) {
  const pathname = usePathname() || ''
  // `/hub` matches only itself; everything else matches itself and its children.
  const isActive = (href: string) =>
    href === '/hub' ? pathname === '/hub' : pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* ── phone: a horizontal rail pinned to the top ──────────────────── */}
      <nav
        aria-label="Hub"
        className="sticky top-0 z-30 flex gap-1 overflow-x-auto border-b border-white/10 bg-[#0d1117]/95 px-3 py-2 backdrop-blur md:hidden"
      >
        {links.map((l) => {
          const Icon = ICONS[l.icon] ?? Home
          const active = isActive(l.href)
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition ${
                active
                  ? 'bg-[#6EE05A]/12 text-[#6EE05A]'
                  : 'text-white/55 hover:bg-white/[0.06] hover:text-white/85'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {l.label}
            </Link>
          )
        })}
      </nav>

      {/* ── md+: the vertical rail ──────────────────────────────────────── */}
      <aside
        aria-label="Hub"
        className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col border-r border-white/10 bg-[#0d1117] px-3 py-5 md:flex"
      >
        <Link href="/hub" className="mb-6 flex items-center gap-2 px-2">
          <span className="text-lg font-semibold tracking-tight">
            0n<span className="text-[#6EE05A]">.</span>
          </span>
          <span className="text-[10px] uppercase tracking-widest text-white/30">Hub</span>
        </Link>

        <ul className="space-y-1">
          {links.map((l) => {
            const Icon = ICONS[l.icon] ?? Home
            const active = isActive(l.href)
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                    active
                      ? 'bg-[#6EE05A]/12 font-medium text-[#6EE05A]'
                      : 'text-white/55 hover:bg-white/[0.06] hover:text-white/90'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {l.label}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="mt-auto px-3 text-[10px] leading-relaxed text-white/25">
          Owner surfaces are gated on the server. A hidden link is not a locked door.
        </div>
      </aside>
    </>
  )
}
