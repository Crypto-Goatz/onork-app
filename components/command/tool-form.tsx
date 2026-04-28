'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ParamDef {
  type: string
  description: string
  required: boolean
  in: 'path' | 'query' | 'body'
}

interface ToolFormProps {
  toolName: string
  params: Record<string, ParamDef>
  method: string
  onExecute: (params: Record<string, unknown>) => void
  loading?: boolean
}

const METHOD_TINT: Record<string, string> = {
  GET: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  POST: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  PUT: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  PATCH: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  DELETE: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

const LOC_TINT: Record<string, string> = {
  path: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  query: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  body: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
}

const LOC_LABEL: Record<string, string> = {
  path: 'PATH',
  query: 'QUERY',
  body: 'BODY',
}

function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider', className)}>
      {children}
    </span>
  )
}

export function ToolForm({ toolName, params, method, onExecute, loading }: ToolFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})

  const paramEntries = Object.entries(params)
  const pathParams = paramEntries.filter(([, p]) => p.in === 'path')
  const queryParams = paramEntries.filter(([, p]) => p.in === 'query')
  const bodyParams = paramEntries.filter(([, p]) => p.in === 'body')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsed: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(values)) {
      if (!val) continue
      const paramDef = params[key]
      if (paramDef?.type === 'number') {
        parsed[key] = Number(val)
      } else if (paramDef?.type === 'boolean') {
        parsed[key] = val === 'true'
      } else if (paramDef?.type === 'object' || paramDef?.type === 'array') {
        try {
          parsed[key] = JSON.parse(val)
        } catch {
          parsed[key] = val
        }
      } else {
        parsed[key] = val
      }
    }

    onExecute(parsed)
  }

  function renderParamGroup(label: string, entries: [string, ParamDef][]) {
    if (entries.length === 0) return null
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/55">{label}</p>
        {entries.map(([key, paramDef]) => (
          <div key={key}>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-white/85">{key}</span>
              {paramDef.required && <span className="text-[10px] font-semibold text-red-400">*</span>}
              <Pill className={LOC_TINT[paramDef.in] ?? 'bg-white/10 text-white/60 border-white/20'}>
                {LOC_LABEL[paramDef.in] ?? paramDef.in}
              </Pill>
              <span className="text-[10px] text-white/45">{paramDef.type}</span>
            </div>
            {paramDef.type === 'boolean' ? (
              <select
                value={values[key] || ''}
                onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                className="h-9 w-full rounded-md border border-white/10 bg-white/[0.02] px-3 text-sm focus:border-white/30 focus:outline-none"
              >
                <option value="">-- select --</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : paramDef.type === 'object' || paramDef.type === 'array' ? (
              <textarea
                value={values[key] || ''}
                onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                placeholder={paramDef.description}
                rows={4}
                className="w-full rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 font-mono text-xs text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
              />
            ) : (
              <Input
                type={paramDef.type === 'number' ? 'number' : 'text'}
                value={values[key] || ''}
                onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                placeholder={paramDef.description}
              />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {renderParamGroup('Path Parameters', pathParams)}
      {renderParamGroup('Query Parameters', queryParams)}
      {renderParamGroup('Body Parameters', bodyParams)}

      {paramEntries.length === 0 && (
        <p className="text-sm text-white/55">This tool has no parameters.</p>
      )}

      <Button type="submit" disabled={loading} size="lg" className="w-full">
        <Pill className={cn('mr-2', METHOD_TINT[method] ?? 'bg-white/10 text-white border-white/20')}>{method}</Pill>
        {loading ? 'Executing…' : <>Execute <span className="font-mono ml-1">{toolName}</span></>}
      </Button>
    </form>
  )
}
