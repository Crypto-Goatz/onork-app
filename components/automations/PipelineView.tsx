'use client'

import {
  Zap,
  Mail,
  Calendar,
  DollarSign,
  Bot,
  BarChart3,
  Flame,
  Search,
  Star,
  MessageSquare,
  RefreshCw,
  CheckCircle,
  Bell,
  RotateCcw,
  Receipt,
  CreditCard,
  TrendingUp,
  Pen,
  Brain,
  Target,
  Smartphone,
  Eye,
  Sun,
  ClipboardList,
  Tag,
  Clock,
  FileText,
  Banknote,
  type LucideProps,
} from 'lucide-react'
import type { Edge } from '@xyflow/react'
import type { CapabilityNodeType } from './CapabilityNode'

// ── Icon map: capability icon strings → Lucide components ──
const LUCIDE_ICONS: Record<string, React.ComponentType<LucideProps>> = {
  Zap,
  Mail,
  Calendar,
  DollarSign,
  Bot,
  BarChart3,
  Flame,
  Search,
  Star,
  MessageSquare,
  RefreshCw,
  CheckCircle,
  Bell,
  RotateCcw,
  Receipt,
  CreditCard,
  TrendingUp,
  Pen,
  Brain,
  Target,
  Smartphone,
  Eye,
  Sun,
  ClipboardList,
  Tag,
  Clock,
  FileText,
  Banknote,
  // emoji-named fallbacks → closest Lucide equivalent
  '⚡': Zap,
  '📝': FileText,
  '📅': Calendar,
  '💳': CreditCard,
  '🏷️': Tag,
  '⏰': Clock,
  '🔥': Flame,
  '💵': Banknote,
  '🧊': Search,
  '🔍': Search,
  '✅': CheckCircle,
  '📧': Mail,
  '💬': MessageSquare,
  '📊': BarChart3,
  '🔄': RefreshCw,
  '⭐': Star,
  '🔔': Bell,
  '🔁': RotateCcw,
  '🧾': Receipt,
  '📈': TrendingUp,
  '✍️': Pen,
  '🧠': Brain,
  '🎯': Target,
  '📱': Smartphone,
  '👁️': Eye,
  '☀️': Sun,
}

// ── Pipeline column definitions ──
const PIPELINE_COLUMNS: { id: string; label: string; color: string }[] = [
  { id: 'triggers',    label: 'Triggers',         color: '#ef4444' },
  { id: 'leads',       label: 'Lead Intelligence', color: '#f97316' },
  { id: 'communicate', label: 'Communication',     color: '#3b82f6' },
  { id: 'schedule',    label: 'Scheduling',        color: '#8b5cf6' },
  { id: 'revenue',     label: 'Revenue',           color: '#10b981' },
  { id: 'ai',          label: 'AI Actions',        color: '#2dd4bf' },
  { id: 'social',      label: 'Social',            color: '#ec4899' },
  { id: 'reports',     label: 'Reports',           color: '#eab308' },
]

// ── Resolve an icon string to a Lucide component ──
function resolveIcon(icon: string): React.ComponentType<LucideProps> {
  return LUCIDE_ICONS[icon] ?? Zap
}

// ── Check whether two nodes are connected via any edge ──
function areConnected(edges: Edge[], sourceId: string, targetId: string): boolean {
  return edges.some(
    (e) => (e.source === sourceId && e.target === targetId) ||
           (e.source === targetId && e.target === sourceId)
  )
}

export interface PipelineViewProps {
  nodes: CapabilityNodeType[]
  edges: Edge[]
  onNodeSelect: (nodeId: string | null) => void
  selectedNodeId: string | null
}

export default function PipelineView({
  nodes,
  edges,
  onNodeSelect,
  selectedNodeId,
}: PipelineViewProps) {
  // Group nodes by category, respecting column order
  const grouped = PIPELINE_COLUMNS.map((col) => ({
    ...col,
    items: nodes.filter((n) => n.data.category === col.id),
  })).filter((col) => col.items.length > 0)

  // Build a simple set of connected node-pairs for flow arrows
  const connectedPairs = new Set<string>()
  edges.forEach((e) => connectedPairs.add(`${e.source}:${e.target}`))

  if (nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-core-text-muted text-sm">
        No nodes yet — drag capabilities onto the canvas first.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex gap-4 p-6 h-full min-w-max items-start">
        {grouped.map((col, colIdx) => (
          <div key={col.id} className="flex items-start gap-2">
            {/* Column */}
            <div className="flex flex-col gap-3 w-56">
              {/* Column header */}
              <div className="flex items-center gap-2 px-1">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: col.color }}
                />
                <span className="text-xs font-semibold uppercase tracking-wider text-core-text-dim truncate">
                  {col.label}
                </span>
                <span className="ml-auto text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-core-surface border border-core-border text-core-text-muted">
                  {col.items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2">
                {col.items.map((node) => {
                  const isSelected = node.id === selectedNodeId
                  const Icon = resolveIcon(node.data.icon)
                  const isConfigured = node.data.configured

                  // Which nodes does this one connect to?
                  const outgoingTargetIds = edges
                    .filter((e) => e.source === node.id)
                    .map((e) => e.target)

                  return (
                    <button
                      key={node.id}
                      onClick={() => onNodeSelect(isSelected ? null : node.id)}
                      className={[
                        'group relative text-left w-full rounded-xl border transition-all duration-200 cursor-pointer',
                        'bg-core-card hover:bg-core-card-hover',
                        isSelected
                          ? 'border-core-cyan shadow-[0_0_0_1px_var(--color-core-cyan)]'
                          : 'border-core-border hover:border-core-border-hi',
                      ].join(' ')}
                    >
                      {/* Top accent line */}
                      <div
                        className="h-0.5 w-full rounded-t-xl"
                        style={{ background: isSelected ? '#14b8a6' : node.data.color }}
                      />

                      <div className="p-3">
                        {/* Header row */}
                        <div className="flex items-start gap-2 mb-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${node.data.color}20` }}
                          >
                            <Icon
                              size={16}
                              style={{ color: node.data.color }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-core-text leading-tight truncate">
                              {node.data.name}
                            </div>
                          </div>
                          {/* Configured status dot */}
                          <span
                            className="w-2 h-2 rounded-full shrink-0 mt-1"
                            style={{ background: isConfigured ? '#34d399' : '#fbbf24' }}
                            title={isConfigured ? 'Configured' : 'Needs configuration'}
                          />
                        </div>

                        {/* Description */}
                        <p className="text-[11px] text-core-text-muted leading-relaxed line-clamp-2">
                          {node.data.description}
                        </p>

                        {/* Steps bar */}
                        {node.data.steps.length > 0 && (
                          <div className="flex gap-0.5 mt-2.5">
                            {node.data.steps.map((_, i) => (
                              <div
                                key={i}
                                className="flex-1 h-[2px] rounded-sm"
                                style={{
                                  background: `${node.data.color}${isConfigured ? '70' : '30'}`,
                                }}
                              />
                            ))}
                          </div>
                        )}

                        {/* Connected-to indicators */}
                        {outgoingTargetIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {outgoingTargetIds.map((tid) => {
                              const targetNode = nodes.find((n) => n.id === tid)
                              if (!targetNode) return null
                              return (
                                <span
                                  key={tid}
                                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-core-surface border border-core-border text-core-text-muted truncate max-w-[100px]"
                                >
                                  {targetNode.data.name}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Arrow between columns */}
            {colIdx < grouped.length - 1 && (
              <div className="flex items-center self-stretch pt-8">
                <div className="flex items-center gap-0.5 text-core-border">
                  <div className="w-6 h-px bg-core-border" />
                  <svg width="8" height="10" viewBox="0 0 8 10" fill="none">
                    <path d="M1 1l6 4-6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
