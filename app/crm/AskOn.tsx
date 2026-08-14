'use client'

/**
 * Ask 0n — the command box, reachable from anywhere.
 *
 * The command bar is the product, and it lives on one screen. Everywhere else
 * the operator has to navigate back to it, which is enough friction that people
 * stop using the thing the product is for. This puts it one keystroke away on
 * every surface.
 *
 * ⌘K IS THE POINT, the floating pill is the discovery mechanism. Nobody guesses
 * a shortcut, so the pill teaches it and then gets out of the way.
 *
 * IT PLANS, IT DOES NOT RUN. The overlay hands the sentence to the planner and
 * shows what would happen; approving still happens on the command surface where
 * the full plan and its costs are visible. A shortcut that could execute from a
 * half-remembered keystroke is a shortcut to an accident.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Mic, Send, Sparkles, X } from 'lucide-react'
import ConnectionHealth from './ConnectionHealth'

export default function AskOn({ scopeLabel = 'All clients' }: { scopeLabel?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Cmd on mac, Ctrl elsewhere — the same muscle memory either way.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Autofocus AFTER paint. Focusing during the same tick loses the caret in
  // Safari, which makes the overlay feel broken on the first press.
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open])

  const send = useCallback(() => {
    const q = text.trim()
    if (!q || busy) return
    setBusy(true)
    // Hand off to the command surface rather than planning here: one planner,
    // one approval path, one place the costs are shown.
    router.push(`/crm?do=${encodeURIComponent(q)}`)
    setOpen(false)
    setBusy(false)
    setText('')
  }, [text, busy, router])

  return (
    <>
      {/* The health chip sits beside the pill: both are always-present, and a
          broken connection is the single most useful thing to see before you
          type a command that depends on it. */}
      {!open && (
        <div className="oncore-app fixed bottom-[74px] right-[76px] z-40">
          <ConnectionHealth />
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ask 0n — command palette"
          className="oncore-app fixed bottom-6 right-[76px] z-40 inline-flex items-center gap-2 rounded-full bg-[color:var(--oc-ink)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg transition hover:opacity-90 active:scale-[0.98]"
        >
          <Sparkles className="h-4 w-4" strokeWidth={2} />
          Ask 0n
          <kbd className="ml-1 rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10.5px] font-bold">⌘K</kbd>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-4 pt-[14vh] backdrop-blur-sm"
          // Click-outside closes. The handler is on the backdrop only, so a
          // click inside the panel never bubbles up and dismisses the typing.
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
          role="dialog"
          aria-modal="true"
          aria-label="Ask 0n"
        >
          <div className="w-full max-w-[620px] overflow-hidden rounded-2xl bg-[#141414] shadow-2xl ring-1 ring-white/10">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#7ED957]">
                Scope · {scopeLabel}
              </span>
              <button onClick={() => setOpen(false)} aria-label="Close"
                className="rounded p-1 text-white/45 transition hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              rows={3}
              placeholder="Say what you want done — name the clients and the outcome."
              className="w-full resize-none bg-transparent px-4 py-4 text-[15px] leading-relaxed text-white outline-none placeholder:text-white/35"
            />

            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-2.5">
              <span className="text-[11.5px] text-white/40">
                Enter to plan · Shift+Enter for a new line · Esc to close
              </span>
              <div className="flex items-center gap-1.5">
                <button aria-label="Voice input" disabled title="Voice input is not wired up yet"
                  className="rounded-lg p-2 text-white/30">
                  <Mic className="h-4 w-4" />
                </button>
                <button onClick={send} disabled={busy || !text.trim()} aria-label="Plan this"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#7ED957] px-3.5 py-2 text-[12.5px] font-bold text-[#0d1117] transition hover:opacity-90 disabled:opacity-35">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
