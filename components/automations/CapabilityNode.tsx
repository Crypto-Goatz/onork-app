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
    <div style={{
      background: 'var(--bg-card, #1f2937)',
      border: `2px solid ${selected ? data.color : 'var(--border, #30363d)'}`,
      borderRadius: 16,
      padding: 0,
      width: 240,
      cursor: 'grab',
      transition: 'all 0.2s',
      boxShadow: selected ? `0 0 24px ${data.color}20` : '0 4px 12px rgba(0,0,0,0.3)',
      overflow: 'hidden',
    }}>
      {/* Input handle (not on triggers) */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          style={{
            width: 12, height: 12,
            background: 'var(--bg-primary, #0d1117)',
            border: `2px solid ${data.color}`,
            top: -6,
          }}
        />
      )}

      {/* Header bar */}
      <div style={{
        background: `${data.color}15`,
        borderBottom: `1px solid ${data.color}20`,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>{data.icon}</span>
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color: data.color,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontFamily: '-apple-system, sans-serif',
        }}>
          {isTrigger ? 'TRIGGER' : data.category === 'ai' ? 'AI' : data.category.toUpperCase()}
        </span>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{
            width: 8, height: 8,
            borderRadius: '50%',
            background: isConfigured ? '#34d399' : '#fbbf24',
            display: 'inline-block',
          }} />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text-primary, #f0f4f8)',
          marginBottom: 6,
          lineHeight: 1.3,
          fontFamily: '-apple-system, sans-serif',
        }}>
          {data.name}
        </div>
        <div style={{
          fontSize: 12,
          color: 'var(--text-muted, #6b7280)',
          lineHeight: 1.5,
          fontFamily: '-apple-system, sans-serif',
        }}>
          {data.description}
        </div>
      </div>

      {/* Steps indicator */}
      <div style={{
        padding: '8px 16px 12px',
        display: 'flex',
        gap: 4,
      }}>
        {data.steps.map((_, i) => (
          <div key={i} style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: `${data.color}${isConfigured ? '60' : '25'}`,
          }} />
        ))}
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 12, height: 12,
          background: 'var(--bg-primary, #0d1117)',
          border: `2px solid ${data.color}`,
          bottom: -6,
        }}
      />
    </div>
  )
}

export default memo(CapabilityNodeComponent)
