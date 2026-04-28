'use client'

/**
 * AI Environment Variables — masked-by-default display + edit list for env
 * vars. Reveal toggle, copy, required badges. Use for setup guides, API
 * key displays, or per-workflow secret bindings inside the automation
 * builder.
 *
 * Two modes:
 *   - readOnly: display only (with reveal/copy)
 *   - editable: add/edit/delete rows
 */

import * as React from 'react'
import { Eye, EyeOff, Copy, Check, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface EnvVar {
  key: string
  value: string
  required?: boolean
  description?: string
  // Free-form: 'secret' | 'plain' | 'url' — displayed as a small badge
  kind?: string
}

export interface EnvVarsProps {
  vars: EnvVar[]
  onChange?: (next: EnvVar[]) => void
  readOnly?: boolean
  className?: string
  title?: string
}

function maskValue(v: string): string {
  if (!v) return ''
  if (v.length <= 8) return '•'.repeat(v.length)
  return `${v.slice(0, 4)}${'•'.repeat(Math.max(0, v.length - 8))}${v.slice(-4)}`
}

function VarRow({
  v,
  i,
  readOnly,
  onPatch,
  onRemove,
}: {
  v: EnvVar
  i: number
  readOnly: boolean
  onPatch: (i: number, patch: Partial<EnvVar>) => void
  onRemove: (i: number) => void
}) {
  const [revealed, setRevealed] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(v.value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // ignore
    }
  }

  return (
    <div className="grid grid-cols-[1fr_2fr_auto] items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1.5">
      {/* Key */}
      <div className="flex items-center gap-1.5">
        {readOnly ? (
          <span className="font-mono text-xs">{v.key}</span>
        ) : (
          <Input
            value={v.key}
            onChange={(e) => onPatch(i, { key: e.target.value })}
            placeholder="VAR_NAME"
            className="h-7 font-mono text-xs"
          />
        )}
        {v.required && (
          <span className="rounded bg-yellow-500/20 px-1 py-0.5 text-[9px] font-semibold uppercase text-yellow-300">
            required
          </span>
        )}
        {v.kind && (
          <span className="rounded bg-white/10 px-1 py-0.5 text-[9px] font-semibold uppercase text-white/60">
            {v.kind}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-center gap-1.5">
        {readOnly ? (
          <span className="flex-1 truncate font-mono text-xs">
            {revealed ? v.value : maskValue(v.value)}
          </span>
        ) : (
          <Input
            value={v.value}
            onChange={(e) => onPatch(i, { value: e.target.value })}
            type={revealed ? 'text' : 'password'}
            placeholder="value"
            className="h-7 font-mono text-xs"
          />
        )}
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          aria-label={revealed ? 'Hide value' : 'Show value'}
          className="rounded p-1 text-white/50 hover:bg-white/5 hover:text-white"
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy value"
          className="rounded p-1 text-white/50 hover:bg-white/5 hover:text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-[#7ed957]" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Actions */}
      {!readOnly && (
        <button
          type="button"
          onClick={() => onRemove(i)}
          aria-label="Remove variable"
          className="rounded p-1 text-white/40 hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export function EnvVars({ vars, onChange, readOnly = false, className, title }: EnvVarsProps) {
  const ro = readOnly || !onChange

  function patch(i: number, p: Partial<EnvVar>) {
    if (!onChange) return
    onChange(vars.map((v, idx) => (idx === i ? { ...v, ...p } : v)))
  }

  function remove(i: number) {
    if (!onChange) return
    onChange(vars.filter((_, idx) => idx !== i))
  }

  function add() {
    if (!onChange) return
    onChange([...vars, { key: '', value: '' }])
  }

  return (
    <div className={cn('space-y-2', className)}>
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{title}</h3>
          {!ro && (
            <Button size="sm" variant="outline" onClick={add}>
              <Plus className="mr-1 h-3 w-3" /> Add
            </Button>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        {vars.length === 0 && (
          <div className="rounded-md border border-dashed border-white/10 px-3 py-4 text-center text-xs text-white/40">
            No environment variables.{' '}
            {!ro && (
              <button onClick={add} className="text-[#7ed957] hover:underline">
                Add one
              </button>
            )}
          </div>
        )}
        {vars.map((v, i) => (
          <VarRow key={i} v={v} i={i} readOnly={ro} onPatch={patch} onRemove={remove} />
        ))}
      </div>
    </div>
  )
}
