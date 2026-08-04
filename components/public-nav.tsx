'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X, ArrowRight } from 'lucide-react'
import ProductMegaMenu from './ProductMegaMenu'

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: '/agencies', label: 'Agency Command' },
  { href: '/platform', label: 'Platform' },
  { href: '/possibilities', label: 'Possibilities' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/contact', label: 'Contact' },
]

export function PublicNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href)

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] border-b border-white/[0.06] bg-[#0d1117]/85 backdrop-blur-xl">
      <nav className="flex h-16 w-full items-center justify-between px-4 sm:px-8 lg:px-16 xl:px-24">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5 no-underline" aria-label="0nCore home">
          <img src="/brand/0ncore-logo-dark.png" alt="0nCore" className="h-8 object-contain" />
        </Link>

        {/* Center nav — desktop */}
        <div className="hidden items-center gap-1 md:flex">
          <ProductMegaMenu />
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group relative rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  active ? 'text-white' : 'text-white/55 hover:text-white'
                }`}
              >
                {/* Slow-fade gradient glow on hover (and active) */}
                <span
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 -z-0 rounded-lg bg-gradient-to-br from-[#7ed957]/25 via-[#00d4ff]/20 to-[#a78bfa]/25 blur-md transition-opacity duration-700 ease-out ${
                    active ? 'opacity-60' : 'opacity-0 group-hover:opacity-100'
                  }`}
                />
                <span
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 -z-0 rounded-lg bg-gradient-to-br from-[#7ed957]/10 via-[#00d4ff]/8 to-[#a78bfa]/10 transition-opacity duration-700 ease-out ${
                    active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                />
                <span className="relative z-10">{link.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Right side — desktop */}
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-white/65 transition-colors hover:bg-white/[0.04] hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#7ed957] px-4 py-2 text-[13px] font-bold text-[#020810] shadow-[0_0_20px_rgba(126,217,87,0.25)] transition-all hover:bg-[#7ed957]/90 hover:scale-[1.02]"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-white/[0.06] bg-[#0d1117]/95 backdrop-blur-xl md:hidden">
          <div className="w-full px-4 py-3 sm:px-8">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const active = isActive(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-white/[0.06] text-white'
                        : 'text-white/65 hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg px-3.5 py-2.5 text-center text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#7ed957] px-4 py-2.5 text-sm font-bold text-[#020810] shadow-[0_0_20px_rgba(126,217,87,0.25)] transition-all hover:bg-[#7ed957]/90"
              >
                Get started
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
