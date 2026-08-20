'use client'
/**
 * THE PUBLISH PICKER — "which client does this go into?"
 *
 * A shared control, deliberately, for the same reason `/api/hub/workspaces` is
 * a shared endpoint: the Hub list, the add-on switcher and this picker are the
 * same question, and three surfaces rendering it three ways is how they end up
 * disagreeing about what a customer owns.
 *
 * WHY IT IS NOT A `<select>`. It was one, and that was fine at the size it was
 * tested: one workspace, then a handful. Measured 2026-08-20 against a real
 * agency it renders 47 rows containing SIX groups that share a display name —
 * Crypto Goatz ×2, RocketOpp LLC ×2, Mike Mento — 0n ×3, 0nMCP ×2, and two
 * Sean McIntyre pairs. A native dropdown shows one line per option, so those
 * become literally identical choices, in a control with no search, for an
 * action that writes into a customer's CRM and cannot be undone.
 *
 * So: type to filter, and every row carries a second line. The disambiguator is
 * the platform's own address or install date where one exists, and the location
 * id — always unique, never pretty — is shown for rows the resolver flagged
 * `ambiguous`. The id is the fallback because it is the only field that CANNOT
 * collide; showing it on every row would be noise, showing it on none is how
 * someone publishes into the wrong Crypto Goatz.
 *
 * It renders nothing at all for a single workspace. One option is not a choice,
 * and asking someone to pick from a list of one trains them to click through.
 */
import { useId, useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'

export interface PickerWorkspace {
  locationId: string
  name: string | null
  hint?: string | null
  ambiguous?: boolean
}

/** Above this many rows, scanning beats scrolling — so the filter appears. */
const SEARCH_AT = 7

export function WorkspacePicker({
  spaces,
  chosen,
  onChoose,
  label = 'Publish to',
}: {
  spaces: PickerWorkspace[]
  chosen: string
  onChoose: (locationId: string) => void
  label?: string
}) {
  const [q, setQ] = useState('')
  // useId, not a random string — this component is server-rendered too, and a
  // fresh id on the client would mismatch the label/input pair at hydration.
  const listId = useId()

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return spaces
    // The id is searchable too — it is how someone resolves a duplicate pair
    // when they arrived here from a CRM URL that carries the id.
    return spaces.filter((w) =>
      `${w.name ?? ''} ${w.hint ?? ''} ${w.locationId}`.toLowerCase().includes(needle),
    )
  }, [spaces, q])

  const showSearch = spaces.length >= SEARCH_AT

  return (
    <div className="mt-4">
      <label htmlFor={listId} className="block text-[12px] uppercase tracking-wider text-[#9fb0cc]">
        {label}
        <span className="ml-2 normal-case tracking-normal text-[#6b7d99]">
          {spaces.length} available
        </span>
      </label>

      {showSearch && (
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7d99]" />
          <input
            id={listId}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clients by name or id…"
            className="w-full rounded-lg border border-white/15 bg-[#0b0f14] py-2 pl-9 pr-3 text-[14px] text-white placeholder:text-[#6b7d99] focus:border-[#7ED957] focus:outline-none"
          />
        </div>
      )}

      <div
        role="listbox"
        aria-label={label}
        className="mt-2 max-h-[280px] overflow-y-auto rounded-lg border border-white/15 bg-[#0b0f14]"
      >
        {filtered.length === 0 && (
          <p className="px-3 py-4 text-[13px] text-[#9fb0cc]">
            No client matches “{q}”.
          </p>
        )}

        {filtered.map((w) => {
          const selected = w.locationId === chosen
          // A row we cannot name is shown BY ID rather than hidden or given a
          // stand-in. An invented label on a publish target is unforgivable.
          const title = w.name?.trim() || w.locationId
          // Second line: what the platform knows, plus the id when the name
          // alone cannot identify the row.
          const parts = [w.hint?.trim(), w.ambiguous || !w.name?.trim() ? w.locationId : null]
          const sub = parts.filter(Boolean).join(' · ')

          return (
            <button
              key={w.locationId}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onChoose(w.locationId)}
              className={`flex w-full items-center gap-3 border-b border-white/5 px-3 py-2.5 text-left transition last:border-b-0 ${
                selected ? 'bg-[#7ED957]/10' : 'hover:bg-white/5'
              }`}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                {selected && <Check className="h-4 w-4 text-[#7ED957]" />}
              </span>
              <span className="min-w-0">
                <span className={`block truncate text-[14px] ${selected ? 'text-white' : 'text-[#e6edf7]'}`}>
                  {title}
                </span>
                {sub && (
                  <span className="block truncate text-[12px] text-[#6b7d99]">{sub}</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
