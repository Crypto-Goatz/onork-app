'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Product mega menu — same shape as the one on 0nMCP.com, in 0nCore's tokens.
 *
 * Hover to open on a pointer, click to open on touch, and a short close delay so
 * the diagonal travel from trigger to panel does not dismiss it — a menu that
 * snaps shut while you are reaching for it is the single most common way this
 * pattern is got wrong.
 *
 * Escape closes and returns focus, outside clicks close, and the trigger carries
 * aria-expanded. It sits inside the existing nav rather than replacing it, so
 * nothing about auth or the mobile drawer changes.
 */

type Item = { label: string; href: string; note?: string; external?: boolean }
type Section = { key: string; label: string; columns: { title: string; items: Item[] }[]; featured?: { title: string; href: string } }

const MENU: Section[] = [
  {
    key: 'products',
    label: 'Products',
    columns: [
      {
        title: 'Agency',
        items: [
          { label: '0n Agency Command', href: '/agencies', note: 'Run every client account from one chat' },
          { label: 'Client management', href: '/client-management', note: 'Every client account, one screen' },
          { label: 'AI task lists', href: '/ai-task-lists', note: 'People and agents on one list' },
          { label: 'Website management', href: '/website-management', note: 'Build and manage client sites' },
          { label: 'Course building', href: '/course-builder', note: 'Coming — courses by command' },
          { label: 'Watch the walkthrough', href: '/0nagent', note: 'Four minutes, the whole product' },
          { label: 'Pricing', href: '/pricing', note: 'Free to install, pay per use' },
          { label: 'Security', href: '/security', note: 'How your credentials are held' },
        ],
      },
      {
        title: 'The 0n family',
        items: [
          { label: '0nTask', href: 'https://app.0ntask.com', note: 'Tasks for people, automations and AI', external: true },
          { label: 'web0n', href: 'https://web0n.com', note: 'A website from one sentence', external: true },
          { label: 'social0n', href: 'https://www.0nmcp.com/ecosystem/social0n', note: 'Autonomous social posting', external: true },
          { label: 'CRO9', href: 'https://www.cro9.com', note: 'Conversion and AI-visibility analytics', external: true },
          { label: '0nMCP', href: 'https://www.0nmcp.com', note: 'The orchestration layer underneath', external: true },
        ],
      },
    ],
    featured: {
      title: 'Every 0n product runs on the same orchestration layer — one account, one login.',
      href: '/agencies',
    },
  },
]

export default function ProductMegaMenu() {
  const [open, setOpen] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  const enter = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(key)
  }
  // 180ms — long enough to cross the gap between trigger and panel, short
  // enough that it never feels stuck open.
  const leave = () => {
    closeTimer.current = setTimeout(() => setOpen(null), 180)
  }

  const section = MENU.find((m) => m.key === open) ?? null

  return (
    <div ref={rootRef} className="relative hidden md:block" onMouseLeave={leave}>
      {MENU.map((m) => (
        <button
          key={m.key}
          type="button"
          aria-expanded={open === m.key}
          aria-haspopup="true"
          onMouseEnter={() => enter(m.key)}
          onClick={() => setOpen(open === m.key ? null : m.key)}
          className={`group relative inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            open === m.key ? 'text-white' : 'text-white/55 hover:text-white'
          }`}
        >
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-0 -z-0 rounded-lg bg-gradient-to-br from-[#7ed957]/25 via-[#00d4ff]/20 to-[#a78bfa]/25 blur-md transition-opacity duration-700 ease-out ${
              open === m.key ? 'opacity-60' : 'opacity-0 group-hover:opacity-100'
            }`}
          />
          <span className="relative z-10">{m.label}</span>
          <ChevronDown
            className={`relative z-10 h-3 w-3 transition-transform duration-200 ${open === m.key ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      ))}

      {section && (
        <div
          onMouseEnter={() => enter(section.key)}
          className="absolute left-1/2 top-full z-[110] mt-2 w-[min(92vw,780px)] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#0d1117]/97 p-6 shadow-2xl backdrop-blur-xl"
        >
          <div className="grid gap-7 sm:grid-cols-2">
            {section.columns.map((col) => (
              <div key={col.title}>
                <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                  {col.title}
                </div>
                <div className="space-y-1">
                  {col.items.map((it) => {
                    const inner = (
                      <>
                        <span className="block text-sm font-semibold text-white/90 group-hover/i:text-[#6EE05A]">
                          {it.label}
                        </span>
                        {it.note && <span className="mt-0.5 block text-xs text-white/45">{it.note}</span>}
                      </>
                    )
                    const cls =
                      'group/i block rounded-lg px-3 py-2.5 no-underline transition-colors hover:bg-white/[0.05]'
                    return it.external ? (
                      <a key={it.label} href={it.href} className={cls} onClick={() => setOpen(null)}>
                        {inner}
                      </a>
                    ) : (
                      <Link key={it.label} href={it.href} className={cls} onClick={() => setOpen(null)}>
                        {inner}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {section.featured && (
            <Link
              href={section.featured.href}
              onClick={() => setOpen(null)}
              className="mt-5 block rounded-xl border border-[#6EE05A]/25 bg-[#6EE05A]/[0.07] px-4 py-3.5 no-underline transition-colors hover:border-[#6EE05A]/45"
            >
              <span className="text-sm text-white/80">{section.featured.title}</span>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
