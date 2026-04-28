'use client'

/**
 * AI Edge — two ReactFlow edge types matching shadcn AI Canvas aesthetic.
 *
 * 1. AnimatedEdge — bezier curve with a small dot traveling along it. Use
 *    for connections where data is flowing or the workflow is running.
 *
 * 2. TemporaryEdge — dashed bezier. Use for pending/in-progress connections
 *    (during drag, or before activation).
 *
 * Both pick handle positions automatically via getBezierPath().
 *
 * Status variants: 'pending' | 'running' | 'done' | 'error' — set via
 * data.status on the edge to color appropriately.
 *
 * Register in your ReactFlow tree:
 *   const edgeTypes = { animated: AnimatedEdge, temporary: TemporaryEdge }
 *
 * Then:
 *   { id, source, target, type: 'animated', data: { status: 'running' } }
 */

import * as React from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react'

type EdgeStatus = 'pending' | 'running' | 'done' | 'error'

const STATUS_STROKE: Record<EdgeStatus, string> = {
  pending: 'oklch(0.65 0.05 264)', // muted slate
  running: 'var(--primary)',
  done: 'oklch(0.7 0.18 145)', // green
  error: 'oklch(0.65 0.22 25)', // red
}

function statusFromData(data: unknown): EdgeStatus {
  const s = (data as { status?: EdgeStatus } | undefined)?.status
  if (s === 'pending' || s === 'running' || s === 'done' || s === 'error') return s
  return 'running'
}

// ─────────────────────────────────────────────────────────────────────────
// AnimatedEdge — traveling dot
// ─────────────────────────────────────────────────────────────────────────

export function AnimatedEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, style } = props
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const status = statusFromData(data)
  const stroke = STATUS_STROKE[status]
  const showDot = status === 'running'

  // Stable id for SVG def + reuse
  const pathId = `ai-edge-${props.id}`

  return (
    <>
      <BaseEdge
        id={pathId}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ ...style, stroke, strokeWidth: 1.6 }}
      />
      {showDot && (
        <circle r="3" fill={stroke}>
          <animateMotion dur="2s" repeatCount="indefinite" rotate="auto">
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      )}
      {props.label && (
        <EdgeLabelRenderer>
          <div
            className="absolute rounded-md border bg-card px-2 py-0.5 text-[10px] font-medium text-card-foreground shadow-sm"
            style={{
              transform: `translate(-50%, -50%) translate(${(sourceX + targetX) / 2}px, ${(sourceY + targetY) / 2}px)`,
            }}
          >
            {props.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// TemporaryEdge — dashed
// ─────────────────────────────────────────────────────────────────────────

export function TemporaryEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style } = props
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        ...style,
        stroke: 'oklch(0.55 0.04 264)',
        strokeWidth: 1.4,
        strokeDasharray: '6 4',
        opacity: 0.7,
      }}
    />
  )
}

export const aiEdgeTypes = {
  animated: AnimatedEdge,
  temporary: TemporaryEdge,
}
