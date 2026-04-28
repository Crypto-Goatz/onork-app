'use client'

/**
 * AI Persona — animated avatar that shows AI state (idle/listening/thinking/
 * speaking/asleep) with 6 variants. CSS-driven (no Rive dependency) so it
 * works everywhere our app renders.
 *
 * Variants map to color/material schemes:
 *   obsidian — dark slate, sharp edges (default for dark UI)
 *   mana     — purple/indigo glow
 *   opal     — iridescent pastels
 *   halo     — bright primary ring
 *   glint    — gold/amber
 *   command  — green core (matches 0nCore brand)
 *
 * Use cases:
 *   1. Dashboard widget — show Jaxx state during a turn
 *   2. /dashboard/conversation-ai — preview while testing
 *   3. CRM widget — give Jaxx a face inside the CRM module
 *   4. Slack / Chrome / wherever — same persona everywhere
 */

import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export type PersonaState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'asleep'
export type PersonaVariant = 'obsidian' | 'mana' | 'opal' | 'halo' | 'glint' | 'command'

const personaShell = cva(
  'relative flex items-center justify-center rounded-full transition-colors',
  {
    variants: {
      size: {
        sm: 'h-8 w-8',
        md: 'h-12 w-12',
        lg: 'h-20 w-20',
        xl: 'h-32 w-32',
      },
      variant: {
        obsidian: 'bg-zinc-900 text-zinc-100 ring-1 ring-zinc-700',
        mana: 'bg-gradient-to-br from-indigo-700 to-purple-700 text-white ring-1 ring-indigo-400/40',
        opal: 'bg-gradient-to-br from-rose-200 via-sky-200 to-emerald-200 text-zinc-800 ring-1 ring-white/40',
        halo: 'bg-zinc-50 text-zinc-900 ring-2 ring-[#7ed957] dark:bg-zinc-900 dark:text-zinc-50',
        glint: 'bg-gradient-to-br from-amber-400 to-yellow-600 text-zinc-900 ring-1 ring-amber-300',
        command: 'bg-[#0d1117] text-[#7ed957] ring-1 ring-[#7ed957]/40',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'command',
    },
  }
)

const personaCore = cva('rounded-full transition-all duration-300', {
  variants: {
    state: {
      idle: 'h-1/2 w-1/2 bg-current opacity-60 animate-jaxx-breathe',
      listening: 'h-2/3 w-2/3 bg-current opacity-90 animate-jaxx-listen',
      thinking: 'h-1/2 w-1/2 bg-current opacity-80 animate-jaxx-think',
      speaking: 'h-2/3 w-2/3 bg-current opacity-100 animate-jaxx-speak',
      asleep: 'h-1/3 w-1/3 bg-current opacity-30',
    },
  },
  defaultVariants: { state: 'idle' },
})

const personaRing = cva(
  'pointer-events-none absolute inset-0 rounded-full',
  {
    variants: {
      state: {
        idle: '',
        listening: 'ring-2 ring-current ring-offset-0 animate-ping opacity-40',
        thinking: '',
        speaking: 'ring-2 ring-current animate-jaxx-pulse opacity-60',
        asleep: '',
      },
    },
    defaultVariants: { state: 'idle' },
  }
)

export interface PersonaProps extends VariantProps<typeof personaShell> {
  state?: PersonaState
  className?: string
  label?: string // optional name shown beneath
  showLabel?: boolean
}

export function Persona({
  size = 'md',
  variant = 'command',
  state = 'idle',
  className,
  label,
  showLabel = false,
}: PersonaProps) {
  return (
    <div className={cn('inline-flex flex-col items-center gap-2', className)}>
      <div
        className={personaShell({ size, variant })}
        aria-label={label ?? 'AI persona'}
        data-state={state}
      >
        <span className={personaCore({ state })} />
        <span className={personaRing({ state })} />
      </div>
      {showLabel && label && (
        <span className="text-xs font-semibold uppercase tracking-wider text-current">
          {label}
        </span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// PersonaConfig — owner-facing UI for renaming + tone
// (the practical bit Mike wants for Jaxx rename)
// ─────────────────────────────────────────────────────────────────────────

export interface PersonaConfigValue {
  name: string
  variant: PersonaVariant
  tone?: 'casual' | 'formal' | 'playful' | 'technical'
}

export interface PersonaConfigProps {
  value: PersonaConfigValue
  onChange: (next: PersonaConfigValue) => void
  className?: string
}

const VARIANT_LABELS: Record<PersonaVariant, string> = {
  obsidian: 'Obsidian',
  mana: 'Mana',
  opal: 'Opal',
  halo: 'Halo',
  glint: 'Glint',
  command: 'Command',
}

export function PersonaConfig({ value, onChange, className }: PersonaConfigProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-4">
        <Persona size="lg" variant={value.variant} state="speaking" label={value.name} />
        <div className="flex-1 space-y-2">
          <label className="block text-xs font-medium text-white/70">Bot name</label>
          <input
            type="text"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="Jaxx"
            className="w-full rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-sm focus:border-[#7ed957]/40 focus:outline-none"
          />
          <p className="text-[11px] text-white/40">
            What your customers call this AI. The default is Jaxx.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-white/70 mb-2">Avatar style</label>
        <div className="grid grid-cols-6 gap-2">
          {(Object.keys(VARIANT_LABELS) as PersonaVariant[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ ...value, variant: v })}
              className={cn(
                'flex flex-col items-center gap-1 rounded-md border p-2 transition-colors',
                value.variant === v
                  ? 'border-white/40 bg-white/[0.04]'
                  : 'border-white/10 hover:border-white/30'
              )}
            >
              <Persona size="sm" variant={v} state="idle" />
              <span className="text-[10px] text-white/60">{VARIANT_LABELS[v]}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-white/70 mb-2">Tone</label>
        <div className="grid grid-cols-4 gap-2">
          {(['casual', 'formal', 'playful', 'technical'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...value, tone: t })}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs capitalize transition-colors',
                value.tone === t
                  ? 'border-white/40 bg-white/[0.06] text-white'
                  : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white/80'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
