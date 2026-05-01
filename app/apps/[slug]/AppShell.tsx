'use client'
/**
 * Spawned-app interactive shell. Hosts the capability tiles + Jaxx chat
 * + chain output passing. Server page hands it the row, this owns the
 * runtime UX.
 */
import { useState, useEffect, useRef } from 'react'
import { Sparkles, Send, Loader2 } from 'lucide-react'
import { CapabilityTile } from '@/components/apps/capability-tile'

interface Props {
  slug: string
  name: string
  brief: string | null
  capabilities: string[]
  mode: 'composer' | 'chain'
}

interface Msg { who: 'jaxx' | 'me'; text: string }

export function AppShell({ slug, name, brief, capabilities, mode }: Props) {
  // Chain mode: pass each tile's output to the next
  const [chainOutputs, setChainOutputs] = useState<Record<number, string>>({})

  // Jaxx orchestration chat
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      who: 'jaxx',
      text: `Hey, I'm Jaxx. This app is "${name}" — ${capabilities.length} capabilities wired in ${mode} mode. Run any tile yourself, or tell me what you're trying to do and I'll guide you.`,
    },
  ])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  async function ask() {
    const q = draft.trim()
    if (!q || busy) return
    setMsgs((m) => [...m, { who: 'me', text: q }])
    setDraft('')
    setBusy(true)
    try {
      const r = await fetch('/api/chat/public', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are Jaxx, an AI guide inside a custom 0nCore sub-app called "${name}". This app composes these capabilities: ${capabilities.join(', ')}. Layout mode: ${mode}. Help the user use the right tile for their goal. Be concise.`,
            },
            ...msgs.map((m) => ({ role: m.who === 'me' ? 'user' : 'assistant', content: m.text })),
            { role: 'user', content: q },
          ],
        }),
      })
      const data = await r.json()
      setMsgs((m) => [...m, { who: 'jaxx', text: data.reply || "I'm here." }])
    } catch (e) {
      setMsgs((m) => [...m, { who: 'jaxx', text: `Connection issue — ${(e as Error).message}` }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {mode === 'chain' ? (
        <ChainView
          capabilities={capabilities}
          chainOutputs={chainOutputs}
          setChainOutputs={setChainOutputs}
        />
      ) : (
        <ComposerView capabilities={capabilities} />
      )}

      {/* Jaxx orchestration chat */}
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur overflow-hidden">
        <header className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </span>
          <div>
            <div className="text-sm font-semibold text-white">Ask Jaxx</div>
            <div className="text-[10px] text-white/40">
              Orchestrating across {capabilities.length} {capabilities.length === 1 ? 'tool' : 'tools'}
            </div>
          </div>
        </header>
        <div ref={scrollRef} className="max-h-[280px] overflow-y-auto px-4 py-3 space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.who === 'me' ? 'justify-end' : ''}`}>
              {m.who === 'jaxx' && (
                <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 shrink-0 mt-0.5">
                  <Sparkles className="h-3 w-3 text-emerald-400" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[12px] leading-relaxed ${
                  m.who === 'me'
                    ? 'bg-emerald-500/15 border border-emerald-500/20 text-white rounded-br-sm'
                    : 'bg-white/[0.04] border border-white/[0.06] text-white/80 rounded-bl-sm'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-2">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 shrink-0">
                <Loader2 className="h-3 w-3 text-emerald-400 animate-spin" />
              </div>
              <div className="rounded-2xl px-3.5 py-2 text-[11px] bg-white/[0.04] border border-white/[0.06] text-white/40">
                thinking…
              </div>
            </div>
          )}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); ask() }}
          className="flex items-center gap-2 border-t border-white/[0.06] px-3 py-3"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask Jaxx anything about this app…"
            className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/40"
          />
          <button
            type="submit"
            disabled={!draft.trim() || busy}
            className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500 text-[#020810] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-transform active:scale-95"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </section>
    </div>
  )
}

function ComposerView({ capabilities }: { capabilities: string[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {capabilities.map((c, i) => (
        <CapabilityTile key={`${c}-${i}`} capability={c} />
      ))}
    </div>
  )
}

function ChainView({
  capabilities,
  chainOutputs,
  setChainOutputs,
}: {
  capabilities: string[]
  chainOutputs: Record<number, string>
  setChainOutputs: React.Dispatch<React.SetStateAction<Record<number, string>>>
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {capabilities.map((c, i) => (
        <div key={`${c}-${i}`} className="flex w-full max-w-2xl flex-col items-center">
          <CapabilityTile
            capability={c}
            contextInput={i > 0 ? chainOutputs[i - 1] : undefined}
            onOutput={(out) => setChainOutputs((prev) => ({ ...prev, [i]: out }))}
            className="w-full"
          />
          {i < capabilities.length - 1 && (
            <div className="my-2 flex flex-col items-center text-emerald-400">
              <div className="h-6 w-px bg-emerald-500/40" />
              <div className="text-[9px] uppercase tracking-wider text-emerald-400/70">
                output flows down
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
