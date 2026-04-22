'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'

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
  [key: string]: unknown;
}

export type CapabilityNodeType = Node<CapabilityNodeData, 'capability'>

function CapabilityNodeComponent({ data, selected }: NodeProps<CapabilityNodeType>) {
  const isConfigured = data.configured
  const isTrigger = data.category === 'triggers'

  return (
    <div
      className="rounded-2xl w-[240px] cursor-grab overflow-hidden transition-all duration-200"
      style={{
        background: '#161b22',
        border: `2px solid ${selected ? data.color : '#30363d'}`,
        boxShadow: selected ? `0 0 24px ${data.color}20` : '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      {/* Input handle (not on triggers) */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          style={{
            width: 12,
            height: 12,
            background: '#0d1117',
            border: `2px solid ${data.color}`,
            top: -6,
          }}
        />
      )}

      {/* Header bar */}
      <div
        className="px-4 py-2.5 flex items-center gap-2.5 border-b"
        style={{
          background: `${data.color}15`,
          borderBottomColor: `${data.color}20`,
        }}
      >
        <span className="text-xl shrink-0">{data.icon}</span>
        <span
          className="text-[13px] font-bold uppercase tracking-[0.05em]"
          style={{ color: data.color }}
        >
          {isTrigger ? 'TRIGGER' : data.category === 'ai' ? 'AI' : data.category.toUpperCase()}
        </span>
        <div className="ml-auto">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: isConfigured ? '#34d399' : '#fbbf24' }}
          />
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-[14px]">
        <div className="text-[15px] font-bold text-core-text mb-1.5 leading-[1.3]">
          {data.name}
        </div>
        <div className="text-xs text-core-text-muted leading-relaxed">
          {data.description}
        </div>
      </div>

      {/* Steps indicator */}
      <div className="px-4 pb-3 flex gap-1">
        {data.steps.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-[3px] rounded-sm"
            style={{ background: `${data.color}${isConfigured ? '60' : '25'}` }}
          />
        ))}
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 12,
          height: 12,
          background: '#0d1117',
          border: `2px solid ${data.color}`,
          bottom: -6,
        }}
      />
    </div>
  )
}

export default memo(CapabilityNodeComponent)
