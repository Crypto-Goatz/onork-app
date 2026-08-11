'use client'

/**
 * Which edge the navigation rail sits on.
 *
 * Stored in a COOKIE, not localStorage, so the server can read it and render
 * the rail on the right edge from the first paint. localStorage would mean
 * painting it left, then snapping — on every navigation.
 *
 * Applying it is a one-line attribute flip on <html>; the actual movement is a
 * CSS `order` rule. Nothing re-renders, so switching is instant and there is no
 * state that can disagree with what you are looking at.
 *
 * Deliberately NOT a server round-trip: this is a personal display preference,
 * not something another device needs to agree about. It is also why losing it
 * (new browser, cleared cookies) costs the user one click, not a support ticket.
 */
import { useEffect, useState } from 'react'
import { PanelLeft, PanelRight } from 'lucide-react'

type Side = 'left' | 'right'
const COOKIE = 'oc_sidebar_side'
const ONE_YEAR = 60 * 60 * 24 * 365

function readSide(): Side {
  if (typeof document === 'undefined') return 'left'
  const fromDom = document.documentElement.getAttribute('data-sidebar-side')
  return fromDom === 'right' ? 'right' : 'left'
}

export default function SidebarSideToggle() {
  const [side, setSide] = useState<Side>('left')

  // Sync from the DOM the server already stamped, so this control shows the
  // truth rather than a default that happens to be wrong.
  useEffect(() => { setSide(readSide()) }, [])

  function choose(next: Side) {
    setSide(next)
    document.documentElement.setAttribute('data-sidebar-side', next)
    document.cookie = `${COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`
  }

  const options: { value: Side; label: string; icon: typeof PanelLeft }[] = [
    { value: 'left', label: 'Left', icon: PanelLeft },
    { value: 'right', label: 'Right', icon: PanelRight },
  ]

  return (
    <div className="rounded-xl border border-[color:var(--console-border)] bg-[color:var(--console-card)] p-4">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="text-[14px] font-medium text-[color:var(--console-text-1)]">
            Navigation side
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[color:var(--console-text-3)]">
            Which edge the menu sits on. Applies immediately and is remembered on this browser.
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Navigation side"
          className="flex shrink-0 gap-1 rounded-[10px] border border-[color:var(--console-border)] bg-[color:var(--console-page)] p-1"
        >
          {options.map((o) => {
            const Icon = o.icon
            const on = side === o.value
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choose(o.value)}
                className={[
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all duration-150 active:scale-[0.98]',
                  on
                    ? 'bg-[color:var(--console-hover)] text-[color:var(--console-text-1)]'
                    : 'text-[color:var(--console-text-3)] hover:text-[color:var(--console-text-1)]',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {o.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
