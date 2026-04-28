'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const METHOD_TINT: Record<string, string> = {
  GET: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  POST: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  PUT: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  PATCH: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  DELETE: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider', className)}>
      {children}
    </span>
  )
}

export interface ToolCardProps {
  name: string
  service: string
  serviceName: string
  description: string
  method: string
}

export function ToolCard({ name, service, serviceName, description, method }: ToolCardProps) {
  return (
    <Link
      href={`/dashboard/execute/${name}`}
      className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/30 hover:bg-white/[0.04]"
    >
      <div className="mb-2 flex items-center gap-2">
        <Pill className={METHOD_TINT[method] ?? 'bg-white/10 text-white/70 border-white/20'}>{method}</Pill>
        <span className="text-[10px] text-white/40 uppercase tracking-wider">{serviceName || service}</span>
      </div>
      <h3 className="font-mono text-sm font-semibold text-white">{name}</h3>
      {description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-white/55">{description}</p>
      )}
      <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-white/55 transition-colors group-hover:text-white">
        Run <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  )
}

export interface ServiceCardProps {
  serviceKey: string
  name: string
  category: string
  description?: string
  toolCount: number
}

export function ServiceCard({ serviceKey, name, category, description, toolCount }: ServiceCardProps) {
  return (
    <Link
      href={`/dashboard/tools/${serviceKey}`}
      className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/30 hover:bg-white/[0.04]"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] text-white/40 uppercase tracking-wider">{category}</span>
        <span className="ml-auto text-[10px] font-mono text-white/55">{toolCount} tools</span>
      </div>
      <h3 className="text-base font-bold text-white">{name}</h3>
      {description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-white/55">{description}</p>
      )}
      <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-white/55 transition-colors group-hover:text-white">
        Browse tools <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  )
}
