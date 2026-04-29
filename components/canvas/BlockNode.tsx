'use client'

/**
 * BlockNode — the custom React Flow node used for every canvas block.
 *
 * Light theme. Soft layered drop shadows. Source/target handles on left
 * and right so blocks chain L→R cleanly. Icon header + label + optional
 * hint line. The body slot is left empty for now — Phase B2 fills it
 * with live data per block type (Contacts list, AI compose input, etc).
 */

import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import {
  Database, Mail, MessageSquareText, Filter as FilterIcon, BarChart3,
  Sparkles, Type as TypeIcon, Calendar, Receipt, ShoppingBag, Workflow,
  type LucideIcon,
} from 'lucide-react'

export interface BlockData extends Record<string, unknown> {
  type: string
  label: string
  hint?: string
  config?: Record<string, unknown>
}

export type BlockNodeType = Node<BlockData, 'block'>

const ICON_BY_TYPE: Record<string, LucideIcon> = {
  contacts: Database,
  pipeline: Workflow,
  calendar: Calendar,
  invoices: Receipt,
  send_email: Mail,
  post_linkedin: ShoppingBag,
  ai_compose: Sparkles,
  ai_summarize: MessageSquareText,
  filter: FilterIcon,
  stat_card: BarChart3,
  note: TypeIcon,
}

const ACCENT_BY_CATEGORY: Record<string, string> = {
  data:    'bg-sky-50 text-sky-700 ring-sky-200',
  action:  'bg-violet-50 text-violet-700 ring-violet-200',
  ai:      'bg-emerald-50 text-emerald-700 ring-emerald-200',
  logic:   'bg-amber-50 text-amber-700 ring-amber-200',
  display: 'bg-slate-100 text-slate-700 ring-slate-200',
}

const CATEGORY_BY_TYPE: Record<string, keyof typeof ACCENT_BY_CATEGORY> = {
  contacts: 'data', pipeline: 'data', calendar: 'data', invoices: 'data',
  send_email: 'action', post_linkedin: 'action',
  ai_compose: 'ai', ai_summarize: 'ai',
  filter: 'logic',
  stat_card: 'display', note: 'display',
}

function BlockNodeImpl({ data, selected }: NodeProps<BlockNodeType>) {
  const Icon = ICON_BY_TYPE[data.type] ?? TypeIcon
  const accent = ACCENT_BY_CATEGORY[CATEGORY_BY_TYPE[data.type] ?? 'display']

  return (
    <div
      className={`min-w-[220px] max-w-[260px] rounded-xl border bg-white transition-all ${
        selected
          ? 'border-emerald-300 shadow-[0_0_0_3px_rgba(110,224,90,0.15),0_8px_24px_-8px_rgba(110,224,90,0.30)]'
          : 'border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_28px_-12px_rgba(0,0,0,0.10)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.04),0_16px_40px_-16px_rgba(0,0,0,0.18)]'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-slate-300 !bg-white"
      />

      <div className="flex items-center gap-2 px-3 pt-3">
        <span className={`grid h-7 w-7 place-items-center rounded-md ring-1 ${accent}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">{data.label}</div>
          {data.hint && (
            <div className="truncate text-[11px] text-slate-500">{data.hint}</div>
          )}
        </div>
      </div>

      <div className="px-3 pb-3 pt-2">
        <div className="rounded-md border border-dashed border-slate-200 px-2 py-1.5 text-[10px] text-slate-400">
          {emptyHint(data.type)}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-slate-300 !bg-white"
      />
    </div>
  )
}

function emptyHint(type: string): string {
  switch (type) {
    case 'contacts':      return 'Live contacts will load here'
    case 'pipeline':      return 'Pipeline stages render here'
    case 'calendar':      return 'Upcoming appointments'
    case 'invoices':      return 'Recent invoices'
    case 'send_email':    return 'Connect a Contacts block to enable'
    case 'post_linkedin': return 'Connect AI Compose to enable'
    case 'ai_compose':    return 'Type a prompt or feed from upstream'
    case 'ai_summarize':  return 'Connect a data block to summarize'
    case 'filter':        return 'Filter upstream items'
    case 'stat_card':     return 'Number + label'
    case 'note':          return 'Plain text note'
    default:              return 'Empty block'
  }
}

export default memo(BlockNodeImpl)
