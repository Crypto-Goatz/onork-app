'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import {
  Activity, ArrowRightLeft, Banknote, BarChart3, Bell, BookOpen, Bot, Brain,
  Calendar, CalendarClock, CheckCircle, Clock, CreditCard, DollarSign, Eye,
  FileOutput, FilePlus, FileSpreadsheet, FileText, Flame, Globe, GraduationCap,
  HelpCircle, Layers, Lightbulb, Mail, MailOpen, MessageCircle, MessageSquare,
  PenLine, Puzzle, Receipt, RefreshCw, Repeat, Scan, Search, ShoppingCart,
  Smartphone, Snowflake, Star, Sun, Tag, Target, TrendingUp, Upload, UserPen,
  UserPlus, Users, Webhook, Zap, type LucideIcon
} from 'lucide-react'

// Map icon name strings to Lucide components
const LUCIDE_ICONS: Record<string, LucideIcon> = {
  Activity, ArrowRightLeft, Banknote, BarChart3, Bell, BookOpen, Bot, Brain,
  Calendar, CalendarClock, CheckCircle, Clock, CreditCard, DollarSign, Eye,
  FileOutput, FilePlus, FileSpreadsheet, FileText, Flame, Globe, GraduationCap,
  HelpCircle, Layers, Lightbulb, Mail, MailOpen, MessageCircle, MessageSquare,
  PenLine, Puzzle, Receipt, RefreshCw, Repeat, Scan, Search, ShoppingCart,
  Smartphone, Snowflake, Star, Sun, Tag, Target, TrendingUp, Upload, UserPen,
  UserPlus, Users, Webhook, Zap,
}

export interface CapabilityNodeData {
  capabilityId: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  configured: boolean;
  steps: string[];
  config: Record<string, string>;
  // App-node fields (set when kind === 'app')
  kind?: 'capability' | 'app' | 'switch' | 'mcp_tool';
  appId?: string;
  appSlug?: string;
  installationId?: string | null;
  // Switch-node fields (set when kind === 'switch')
  switchId?: string;
  toolName?: string | null;
  toolMethod?: string | null;
  toolService?: string | null;
  isMulti?: boolean;
  // MCP-tool-node fields (set when kind === 'mcp_tool')
  mcpServerId?: string;
  mcpServerName?: string;
  mcpToolName?: string;
  [key: string]: unknown;
}

export type CapabilityNodeType = Node<CapabilityNodeData, 'capability'>

const METHOD_TINT: Record<string, string> = {
  GET: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  POST: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  PUT: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  PATCH: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  DELETE: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

function CapabilityNodeComponent({ data, selected }: NodeProps<CapabilityNodeType>) {
  const isConfigured = data.configured
  const isTrigger = data.category === 'triggers'
  const isApp = data.kind === 'app'
  const isSwitch = data.kind === 'switch'
  const isMcp = data.kind === 'mcp_tool'
  const IconComponent = LUCIDE_ICONS[data.icon]

  return (
    <div
      className="rounded-2xl w-[240px] cursor-grab overflow-hidden transition-all duration-200"
      style={{
        background: '#161b22',
        border: `2px solid ${selected ? data.color : '#30363d'}`,
        boxShadow: selected ? `0 0 24px ${data.color}20` : '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      {!isTrigger && (
        <Handle type="target" position={Position.Top}
          style={{ width: 12, height: 12, background: '#0d1117', border: `2px solid ${data.color}`, top: -6 }} />
      )}

      {/* Header */}
      <div className="px-4 py-2.5 flex items-center gap-2.5 border-b"
        style={{ background: `${data.color}15`, borderBottomColor: `${data.color}20` }}>
        {isApp ? (
          <div className="w-5 h-5 rounded-md bg-[#7ed957]/15 border border-[#7ed957]/40 flex items-center justify-center text-[10px] font-bold text-[#7ed957] shrink-0">
            {data.icon || data.name.charAt(0)}
          </div>
        ) : IconComponent ? (
          <IconComponent className="w-5 h-5 shrink-0" style={{ color: data.color }} />
        ) : (
          <span className="text-xl shrink-0">{data.icon}</span>
        )}
        <span className="text-[13px] font-bold uppercase tracking-[0.05em]" style={{ color: data.color }}>
          {isMcp ? 'MCP TOOL' : isSwitch ? 'SWITCH' : isApp ? '0N APP' : isTrigger ? 'TRIGGER' : data.category === 'ai' ? 'AI' : data.category.toUpperCase()}
        </span>
        <div className="ml-auto">
          <span className={`inline-block w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3.5">
        <div className="text-[15px] font-bold text-core-text mb-1.5 leading-tight">{data.name}</div>
        {isSwitch && data.toolName && (
          <div className="mb-1.5 flex items-center gap-1.5 flex-wrap">
            {data.toolMethod && (
              <span className={`text-[9px] px-1.5 py-px rounded border font-mono ${METHOD_TINT[data.toolMethod] ?? 'bg-white/10 text-white/70 border-white/20'}`}>
                {data.toolMethod}
              </span>
            )}
            <span className="font-mono text-[10px] text-core-text-muted truncate">{data.toolName}</span>
            {data.isMulti && (
              <span className="text-[9px] px-1 py-px rounded bg-amber-500/15 text-amber-300">multi-step</span>
            )}
          </div>
        )}
        {isMcp && (
          <div className="mb-1.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] px-1.5 py-px rounded border bg-cyan-500/15 text-cyan-300 border-cyan-500/30 font-mono">
              MCP
            </span>
            {data.mcpServerName && (
              <span className="text-[10px] text-core-text-muted truncate">{data.mcpServerName}</span>
            )}
          </div>
        )}
        <div className="text-xs text-core-text-muted leading-relaxed">{data.description}</div>
      </div>

      {/* Steps indicator */}
      <div className="px-4 pb-3 flex gap-1">
        {data.steps.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] rounded-sm"
            style={{ background: `${data.color}${isConfigured ? '60' : '25'}` }} />
        ))}
      </div>

      <Handle type="source" position={Position.Bottom}
        style={{ width: 12, height: 12, background: '#0d1117', border: `2px solid ${data.color}`, bottom: -6 }} />
    </div>
  )
}

export default memo(CapabilityNodeComponent)

// Export the icon map for use by other components
export { LUCIDE_ICONS }
