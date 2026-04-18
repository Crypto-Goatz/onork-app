'use client'

import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type NodeProps,
  Handle,
  Position,
  useReactFlow,
  NodeResizer,
  useOnSelectionChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

/* ────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────── */

const PASTEL_COLORS = [
  '#fef3c7', '#d1fae5', '#dbeafe', '#fce7f3', '#ede9fe', '#ffedd5',
  '#fee2e2', '#e0e7ff', '#ccfbf1', '#fef9c3', '#f3e8ff', '#e2e8f0',
]

const EDGE_COLOR = 'rgba(110, 224, 90, 0.4)'
const STORAGE_KEY = '0ncore-board'
const SAVED_NOTES_KEY = '0ncore-saved-notes'

type ToolMode = 'select' | 'note' | 'text' | 'shape' | 'connect'
type ShapeType = 'rectangle' | 'rounded' | 'circle' | 'diamond' | 'triangle' | 'parallelogram'
type SidebarPanel = 'none' | 'shapes' | 'connectors' | 'color' | 'saved'

interface SavedNote {
  id: string
  nodeId: string
  text: string
  color: string
  date: string
}

/* ────────────────────────────────────────────
   Shared handle style
   ──────────────────────────────────────────── */

const handleStyle: React.CSSProperties = {
  width: 8, height: 8, borderRadius: 4,
  background: '#6EE05A', border: '2px solid #0d1117',
  opacity: 0,
  transition: 'opacity 0.15s',
}

/* ────────────────────────────────────────────
   Shape style helpers
   ──────────────────────────────────────────── */

function getShapeStyle(shapeType: ShapeType, borderColor: string, selected: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    width: '100%',
    height: '100%',
    border: `2px solid ${borderColor}`,
    background: `${borderColor}10`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: selected
      ? '0 0 0 2px #6EE05A, 0 2px 12px rgba(0,0,0,0.3)'
      : '0 1px 6px rgba(0,0,0,0.2)',
    transition: 'box-shadow 0.15s',
    overflow: 'hidden',
  }

  switch (shapeType) {
    case 'rectangle':
      return { ...base, borderRadius: 2 }
    case 'rounded':
      return { ...base, borderRadius: 12 }
    case 'circle':
      return { ...base, borderRadius: '50%' }
    case 'diamond':
      return {
        ...base,
        borderRadius: 4,
        transform: 'rotate(45deg)',
      }
    case 'triangle':
      return {
        ...base,
        border: 'none',
        background: 'transparent',
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        backgroundColor: `${borderColor}20`,
        outline: `2px solid ${borderColor}`,
      }
    case 'parallelogram':
      return {
        ...base,
        borderRadius: 4,
        clipPath: 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)',
        backgroundColor: `${borderColor}20`,
      }
    default:
      return { ...base, borderRadius: 12 }
  }
}

/* ────────────────────────────────────────────
   Shared resize handle style (10x10 green)
   ──────────────────────────────────────────── */

const resizerHandleStyle: React.CSSProperties = {
  width: 10, height: 10, borderRadius: 2, background: '#6EE05A', border: '2px solid #0d1117',
}

const resizerLineStyle: React.CSSProperties = {
  borderColor: '#6EE05A', borderWidth: 1,
}

/* ────────────────────────────────────────────
   Auto-size helper: measure text in a hidden div
   ──────────────────────────────────────────── */

function measureText(
  text: string,
  fontSize: number,
  fontWeight: number,
  lineHeight: number,
  maxWidth?: number,
  whiteSpace: string = 'pre-wrap',
): { width: number; height: number } {
  if (typeof document === 'undefined') return { width: 120, height: 40 }
  const el = document.createElement('div')
  el.style.position = 'absolute'
  el.style.visibility = 'hidden'
  el.style.whiteSpace = whiteSpace
  el.style.fontSize = `${fontSize}px`
  el.style.fontWeight = String(fontWeight)
  el.style.lineHeight = String(lineHeight)
  el.style.fontFamily = 'inherit'
  el.style.wordBreak = 'break-word'
  if (maxWidth) el.style.maxWidth = `${maxWidth}px`
  el.textContent = text || (whiteSpace === 'nowrap' ? 'Text' : 'Double-click to edit')
  document.body.appendChild(el)
  const rect = el.getBoundingClientRect()
  document.body.removeChild(el)
  return { width: Math.ceil(rect.width), height: Math.ceil(rect.height) }
}

/* ────────────────────────────────────────────
   Custom Node: StickyNote (resizable + auto-size)
   ──────────────────────────────────────────── */

const STICKY_PAD_H = 16
const STICKY_PAD_V = 12
const STICKY_TOP_BAR = 28

const StickyNoteNode = memo(({ id, data, selected }: NodeProps) => {
  const [editing, setEditing] = useState(false)
  const [hovered, setHovered] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { setNodes } = useReactFlow()

  const bgColor = (data.color as string) || '#fef3c7'

  function updateText(value: string) {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, text: value } } : n))
  }

  function autoResize() {
    const text = (data.text as string) || ''
    // Measure with a max-width to allow wrapping (use current width or 300 as default)
    const measured = measureText(text, 13, 500, 1.5, 300, 'pre-wrap')
    const newWidth = Math.max(120, measured.width + STICKY_PAD_H * 2)
    const newHeight = Math.max(80, measured.height + STICKY_TOP_BAR + STICKY_PAD_V * 2)
    setNodes(nds => nds.map(n =>
      n.id === id ? { ...n, style: { ...n.style, width: newWidth, height: newHeight } } : n
    ))
  }

  function handleBlur() {
    setEditing(false)
    autoResize()
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setNodes(nds => nds.filter(n => n.id !== id))
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={() => setEditing(true)}
      onContextMenu={(e) => { e.preventDefault(); handleDelete(e) }}
      style={{
        width: '100%',
        height: '100%',
        minWidth: 120,
        minHeight: 80,
        background: bgColor,
        borderRadius: 12,
        padding: `${STICKY_TOP_BAR}px ${STICKY_PAD_H}px ${STICKY_PAD_V}px`,
        position: 'relative',
        boxShadow: selected
          ? '0 0 0 2px #6EE05A, 0 4px 20px rgba(0,0,0,0.4)'
          : '0 2px 12px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.15s',
        cursor: editing ? 'text' : 'grab',
      }}
    >
      <NodeResizer
        color="#6EE05A"
        isVisible={!!selected}
        minWidth={120}
        minHeight={80}
        lineStyle={resizerLineStyle}
        handleStyle={resizerHandleStyle}
      />

      {/* Grab handle */}
      <div style={{
        position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
        width: 40, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)',
      }} />

      {/* Delete button */}
      {hovered && (
        <button
          onClick={handleDelete}
          style={{
            position: 'absolute', top: 6, right: 8,
            width: 20, height: 20, borderRadius: 4,
            background: 'rgba(0,0,0,0.12)', border: 'none',
            color: 'rgba(0,0,0,0.5)', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, lineHeight: 1,
          }}
        >
          x
        </button>
      )}

      {editing ? (
        <textarea
          ref={textareaRef}
          autoFocus
          value={(data.text as string) || ''}
          onChange={e => updateText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={e => { if (e.key === 'Escape') handleBlur() }}
          style={{
            width: '100%', height: `calc(100% - ${STICKY_TOP_BAR}px)`, background: 'transparent',
            border: 'none', outline: 'none', resize: 'none',
            color: '#1a1a1a', fontSize: 13, fontFamily: 'inherit',
            lineHeight: 1.5, fontWeight: 500,
          }}
        />
      ) : (
        <div style={{
          color: '#1a1a1a', fontSize: 13, lineHeight: 1.5,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          fontWeight: 500, minHeight: 40,
          userSelect: 'none', overflow: 'hidden',
          width: '100%',
        }}>
          {(data.text as string) || 'Double-click to edit'}
        </div>
      )}

      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
      <Handle type="target" position={Position.Left} style={{ ...handleStyle, top: '50%' }} id="left-t" />
      <Handle type="source" position={Position.Right} style={{ ...handleStyle, top: '50%' }} id="right-s" />
    </div>
  )
})
StickyNoteNode.displayName = 'StickyNoteNode'

/* ────────────────────────────────────────────
   Custom Node: TextNode
   ──────────────────────────────────────────── */

const TEXT_PAD_H = 16
const TEXT_PAD_V = 12

const TextNode = memo(({ id, data, selected }: NodeProps) => {
  const [editing, setEditing] = useState(false)
  const { setNodes } = useReactFlow()

  const sizeMap: Record<string, number> = { small: 14, medium: 20, large: 28 }
  const fontSize = sizeMap[(data.fontSize as string) || 'medium'] || 20

  function updateText(value: string) {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, text: value } } : n))
  }

  function cycleSize() {
    const sizes = ['small', 'medium', 'large']
    const current = (data.fontSize as string) || 'medium'
    const next = sizes[(sizes.indexOf(current) + 1) % sizes.length]
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, fontSize: next } } : n))
  }

  function autoResize() {
    const text = (data.text as string) || ''
    const currentNode = document.querySelector(`[data-id="${id}"]`)
    const currentWidth = currentNode ? currentNode.getBoundingClientRect().width : 200
    const measured = measureText(text, fontSize, 700, 1.4, Math.max(60, currentWidth - TEXT_PAD_H * 2), 'pre-wrap')
    const newWidth = Math.max(60, Math.min(measured.width + TEXT_PAD_H * 2, currentWidth || 400))
    const newHeight = Math.max(32, measured.height + TEXT_PAD_V * 2)
    setNodes(nds => nds.map(n =>
      n.id === id ? { ...n, style: { ...n.style, width: newWidth, height: newHeight } } : n
    ))
  }

  function handleBlur() {
    setEditing(false)
    autoResize()
  }

  return (
    <div
      onDoubleClick={() => setEditing(true)}
      onContextMenu={(e) => {
        e.preventDefault()
        setNodes(nds => nds.filter(n => n.id !== id))
      }}
      style={{
        width: '100%', height: '100%',
        padding: `${TEXT_PAD_V}px ${TEXT_PAD_H}px`,
        cursor: editing ? 'text' : 'grab',
        borderRadius: 4, minWidth: 60, minHeight: 32,
        display: 'flex', alignItems: 'center',
      }}
    >
      <NodeResizer
        color="#6EE05A"
        isVisible={!!selected}
        minWidth={60}
        minHeight={32}
        lineStyle={resizerLineStyle}
        handleStyle={resizerHandleStyle}
      />

      {editing ? (
        <textarea
          autoFocus
          value={(data.text as string) || ''}
          onChange={e => updateText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={e => {
            if (e.key === 'Escape') handleBlur()
            if (e.key === 'Tab') { e.preventDefault(); cycleSize() }
          }}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: '#f0f4f8', fontSize, fontWeight: 700,
            fontFamily: 'inherit', width: '100%', height: '100%',
            resize: 'none', lineHeight: 1.4,
            wordBreak: 'break-word',
          }}
        />
      ) : (
        <div
          onClick={cycleSize}
          style={{
            color: '#f0f4f8', fontSize, fontWeight: 700,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            userSelect: 'none', width: '100%',
            lineHeight: 1.4, overflow: 'hidden',
          }}
        >
          {(data.text as string) || 'Text'}
        </div>
      )}

      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
      <Handle type="target" position={Position.Left} style={{ ...handleStyle, top: '50%' }} id="left-t" />
      <Handle type="source" position={Position.Right} style={{ ...handleStyle, top: '50%' }} id="right-s" />
    </div>
  )
})
TextNode.displayName = 'TextNode'

/* ────────────────────────────────────────────
   Custom Node: ShapeNode (resizable + shape types)
   ──────────────────────────────────────────── */

const SHAPE_PAD_H = 16
const SHAPE_PAD_V = 12

const shapeMinSizes: Record<ShapeType, { width: number; height: number }> = {
  rectangle: { width: 80, height: 40 },
  rounded: { width: 80, height: 40 },
  circle: { width: 60, height: 60 },
  diamond: { width: 80, height: 80 },
  triangle: { width: 80, height: 60 },
  parallelogram: { width: 100, height: 40 },
}

const ShapeNode = memo(({ id, data, selected }: NodeProps) => {
  const [editing, setEditing] = useState(false)
  const { setNodes } = useReactFlow()

  const borderColor = (data.color as string) || '#dbeafe'
  const shapeType = (data.shapeType as ShapeType) || 'rounded'
  const mins = shapeMinSizes[shapeType] || { width: 80, height: 40 }

  function updateText(value: string) {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, text: value } } : n))
  }

  function autoResize() {
    const text = (data.text as string) || ''
    const measured = measureText(text, 13, 600, 1.4, undefined, 'nowrap')
    // For diamond/circle, keep aspect ratio roughly square
    const isSquarish = shapeType === 'circle' || shapeType === 'diamond'
    let newWidth = Math.max(mins.width, measured.width + SHAPE_PAD_H * 2)
    let newHeight = Math.max(mins.height, measured.height + SHAPE_PAD_V * 2)
    if (isSquarish) {
      const side = Math.max(newWidth, newHeight)
      newWidth = side
      newHeight = side
    }
    setNodes(nds => nds.map(n =>
      n.id === id ? { ...n, style: { ...n.style, width: newWidth, height: newHeight } } : n
    ))
  }

  function handleBlur() {
    setEditing(false)
    autoResize()
  }

  const shapeStyle = getShapeStyle(shapeType, borderColor, !!selected)
  const isDiamond = shapeType === 'diamond'

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative', minWidth: mins.width, minHeight: mins.height }}
      onContextMenu={(e) => {
        e.preventDefault()
        setNodes(nds => nds.filter(n => n.id !== id))
      }}
    >
      <NodeResizer
        color="#6EE05A"
        isVisible={!!selected}
        minWidth={mins.width}
        minHeight={mins.height}
        lineStyle={resizerLineStyle}
        handleStyle={resizerHandleStyle}
      />

      <div
        onDoubleClick={() => setEditing(true)}
        style={{
          ...shapeStyle,
          cursor: editing ? 'text' : 'grab',
        }}
      >
        <div style={isDiamond ? { transform: 'rotate(-45deg)', width: '70%', textAlign: 'center' as const } : { width: '90%', textAlign: 'center' as const }}>
          {editing ? (
            <input
              autoFocus
              value={(data.text as string) || ''}
              onChange={e => updateText(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={e => { if (e.key === 'Escape' || e.key === 'Enter') handleBlur() }}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: '#f0f4f8', fontSize: 13, fontWeight: 600,
                textAlign: 'center', width: '100%', fontFamily: 'inherit',
              }}
            />
          ) : (
            <div style={{
              color: '#f0f4f8', fontSize: 13, fontWeight: 600,
              textAlign: 'center', userSelect: 'none', padding: '0 8px',
              overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              width: '100%', lineHeight: 1.4,
            }}>
              {(data.text as string) || 'Label'}
            </div>
          )}
        </div>
      </div>

      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
      <Handle type="target" position={Position.Left} style={{ ...handleStyle, top: '50%' }} id="left-t" />
      <Handle type="source" position={Position.Right} style={{ ...handleStyle, top: '50%' }} id="right-s" />
    </div>
  )
})
ShapeNode.displayName = 'ShapeNode'

/* ────────────────────────────────────────────
   Node type registry
   ──────────────────────────────────────────── */

const nodeTypes: NodeTypes = {
  stickyNote: StickyNoteNode,
  textNode: TextNode,
  shapeNode: ShapeNode,
}

/* ────────────────────────────────────────────
   Toolbar Icons (inline SVG)
   ──────────────────────────────────────────── */

function IconCursor() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
    </svg>
  )
}

function IconStickyNote() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
      <path d="M14 3v6h6" />
    </svg>
  )
}

function IconText() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  )
}

function IconShape() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
    </svg>
  )
}

function IconConnect() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function IconPalette() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="10.5" r="2.5" />
      <circle cx="8.5" cy="7.5" r="2.5" />
      <circle cx="6.5" cy="12.5" r="2.5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  )
}

function IconStar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

/* ────────────────────────────────────────────
   Shape preview SVGs for sidebar
   ──────────────────────────────────────────── */

function ShapePreview({ shape, size = 32 }: { shape: string; size?: number }) {
  const s = size
  const c = '#9ca3af'
  const sw = 1.5

  switch (shape) {
    case 'rectangle':
      return <svg width={s} height={s} viewBox="0 0 32 32"><rect x="3" y="7" width="26" height="18" rx="1" fill="none" stroke={c} strokeWidth={sw}/></svg>
    case 'rounded':
      return <svg width={s} height={s} viewBox="0 0 32 32"><rect x="3" y="7" width="26" height="18" rx="6" fill="none" stroke={c} strokeWidth={sw}/></svg>
    case 'circle':
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="none" stroke={c} strokeWidth={sw}/></svg>
    case 'diamond':
      return <svg width={s} height={s} viewBox="0 0 32 32"><polygon points="16,2 30,16 16,30 2,16" fill="none" stroke={c} strokeWidth={sw}/></svg>
    case 'triangle':
      return <svg width={s} height={s} viewBox="0 0 32 32"><polygon points="16,3 29,28 3,28" fill="none" stroke={c} strokeWidth={sw}/></svg>
    case 'parallelogram':
      return <svg width={s} height={s} viewBox="0 0 32 32"><polygon points="8,6 30,6 24,26 2,26" fill="none" stroke={c} strokeWidth={sw}/></svg>
    case 'process':
      return <svg width={s} height={s} viewBox="0 0 32 32"><rect x="3" y="8" width="26" height="16" rx="1" fill="none" stroke={c} strokeWidth={sw}/></svg>
    case 'decision':
      return <svg width={s} height={s} viewBox="0 0 32 32"><polygon points="16,2 30,16 16,30 2,16" fill="none" stroke={c} strokeWidth={sw}/></svg>
    case 'terminal':
      return <svg width={s} height={s} viewBox="0 0 32 32"><rect x="3" y="8" width="26" height="16" rx="8" fill="none" stroke={c} strokeWidth={sw}/></svg>
    case 'data':
      return <svg width={s} height={s} viewBox="0 0 32 32"><polygon points="8,6 30,6 24,26 2,26" fill="none" stroke={c} strokeWidth={sw}/></svg>
    case 'document':
      return <svg width={s} height={s} viewBox="0 0 32 32"><path d="M4,6 L28,6 L28,24 Q22,20 16,24 Q10,28 4,24 Z" fill="none" stroke={c} strokeWidth={sw}/></svg>
    case 'arrow':
      return <svg width={s} height={s} viewBox="0 0 32 32"><line x1="4" y1="16" x2="24" y2="16" stroke={c} strokeWidth={sw}/><polyline points="20,10 26,16 20,22" fill="none" stroke={c} strokeWidth={sw}/></svg>
    case 'dashed':
      return <svg width={s} height={s} viewBox="0 0 32 32"><line x1="4" y1="16" x2="24" y2="16" stroke={c} strokeWidth={sw} strokeDasharray="4 3"/><polyline points="20,10 26,16 20,22" fill="none" stroke={c} strokeWidth={sw}/></svg>
    case 'bidirectional':
      return <svg width={s} height={s} viewBox="0 0 32 32"><line x1="8" y1="16" x2="24" y2="16" stroke={c} strokeWidth={sw}/><polyline points="20,10 26,16 20,22" fill="none" stroke={c} strokeWidth={sw}/><polyline points="12,10 6,16 12,22" fill="none" stroke={c} strokeWidth={sw}/></svg>
    default:
      return <svg width={s} height={s} viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="24" rx="4" fill="none" stroke={c} strokeWidth={sw}/></svg>
  }
}

/* ────────────────────────────────────────────
   Floating Element Toolbar (Whimsical-style)
   ──────────────────────────────────────────── */

const TOOLBAR_COLORS = ['#fef3c7', '#dcfce7', '#dbeafe', '#fce7f3', '#e9d5ff', '#ccfbf1', '#fee2e2', '#f3e8ff', '#fef9c3', '#e0e7ff', '#d1fae5', '#fff1f2']

function FloatingToolbar({
  selectedNodeIds, nodes, setNodes, selectedColor, setSelectedColor, onDelete, onDuplicate, onSave,
}: {
  selectedNodeIds: string[]
  nodes: Node[]
  setNodes: (fn: (nds: Node[]) => Node[]) => void
  selectedColor: string
  setSelectedColor: (c: string) => void
  onDelete: () => void
  onDuplicate: () => void
  onSave: () => void
}) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (selectedNodeIds.length !== 1) { setPos(null); return }
    const el = document.querySelector(`[data-id="${selectedNodeIds[0]}"]`)
    if (!el) { setPos(null); return }
    const rect = el.getBoundingClientRect()
    const container = el.closest('.react-flow')
    const containerRect = container?.getBoundingClientRect() || { left: 0, top: 0 }
    setPos({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 52,
    })
    setShowColorPicker(false)
  }, [selectedNodeIds, nodes])

  if (!pos || selectedNodeIds.length !== 1) return null

  const node = nodes.find(n => n.id === selectedNodeIds[0])
  if (!node) return null

  const isText = node.type === 'textNode'
  const isNote = node.type === 'stickyNote'

  const btnStyle: React.CSSProperties = {
    background: 'none', border: 'none', color: '#d1d5db',
    cursor: 'pointer', padding: '6px 8px', borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, transition: 'background 0.1s, color 0.1s',
  }

  function cycleFontSize() {
    if (!isText) return
    const sizes = ['small', 'medium', 'large']
    setNodes(nds => nds.map(n => {
      if (n.id !== selectedNodeIds[0]) return n
      const cur = (n.data.fontSize as string) || 'medium'
      const next = sizes[(sizes.indexOf(cur) + 1) % sizes.length]
      return { ...n, data: { ...n.data, fontSize: next } }
    }))
  }

  function applyColor(c: string) {
    setSelectedColor(c)
    setNodes(nds => nds.map(n =>
      selectedNodeIds.includes(n.id) ? { ...n, data: { ...n.data, color: c } } : n
    ))
    setShowColorPicker(false)
  }

  return (
    <div style={{
      position: 'absolute',
      left: pos.x, top: pos.y,
      transform: 'translateX(-50%)',
      zIndex: 40,
      display: 'flex', alignItems: 'center', gap: 2,
      background: '#1e2330',
      border: '1px solid #30363d',
      borderRadius: 10,
      padding: '4px 6px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    }}>
      {/* Font size (text nodes only) */}
      {isText && (
        <button onClick={cycleFontSize} style={btnStyle} title="Cycle font size (Tab)"
          onMouseEnter={e => { e.currentTarget.style.background = '#2d3548'; e.currentTarget.style.color = '#f0f4f8' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#d1d5db' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
          </svg>
        </button>
      )}

      {/* Color picker */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setShowColorPicker(p => !p)} style={btnStyle} title="Color"
          onMouseEnter={e => { e.currentTarget.style.background = '#2d3548'; e.currentTarget.style.color = '#f0f4f8' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#d1d5db' }}
        >
          <div style={{ width: 16, height: 16, borderRadius: 4, background: (node.data.color as string) || selectedColor, border: '2px solid #555' }} />
        </button>
        {showColorPicker && (
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            marginTop: 8, background: '#1e2330', border: '1px solid #30363d', borderRadius: 10,
            padding: 10, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)', zIndex: 50,
          }}>
            {TOOLBAR_COLORS.map(c => (
              <button key={c} onClick={() => applyColor(c)} style={{
                width: 24, height: 24, borderRadius: 6, background: c,
                border: c === ((node.data.color as string) || selectedColor) ? '2px solid #6EE05A' : '2px solid transparent',
                cursor: 'pointer',
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 20, background: '#30363d', margin: '0 4px' }} />

      {/* Duplicate */}
      <button onClick={onDuplicate} style={btnStyle} title="Duplicate"
        onMouseEnter={e => { e.currentTarget.style.background = '#2d3548'; e.currentTarget.style.color = '#f0f4f8' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#d1d5db' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>

      {/* Save/Bookmark */}
      {(isNote || isText) && (
        <button onClick={onSave} style={btnStyle} title="Save to bookmarks"
          onMouseEnter={e => { e.currentTarget.style.background = '#2d3548'; e.currentTarget.style.color = '#f0f4f8' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#d1d5db' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Separator */}
      <div style={{ width: 1, height: 20, background: '#30363d', margin: '0 4px' }} />

      {/* Delete */}
      <button onClick={onDelete} style={{ ...btnStyle, color: '#f87171' }} title="Delete"
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.12)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  )
}

/* ────────────────────────────────────────────
   Shape-type to actual ShapeType mapping
   ──────────────────────────────────────────── */

const shapeButtonToShapeType: Record<string, ShapeType> = {
  rectangle: 'rectangle',
  rounded: 'rounded',
  circle: 'circle',
  diamond: 'diamond',
  triangle: 'triangle',
  parallelogram: 'parallelogram',
  process: 'rectangle',
  decision: 'diamond',
  terminal: 'rounded',
  data: 'parallelogram',
  document: 'rectangle',
}

/* ────────────────────────────────────────────
   Sidebar Panel
   ──────────────────────────────────────────── */

interface SidebarProps {
  tool: ToolMode
  setTool: (t: ToolMode) => void
  selectedColor: string
  setSelectedColor: (c: string) => void
  panel: SidebarPanel
  setPanel: (p: SidebarPanel) => void
  selectedShapeType: ShapeType
  setSelectedShapeType: (s: ShapeType) => void
  savedNotes: SavedNote[]
  onDeleteSavedNote: (id: string) => void
  onSaveSelectedNote: () => void
  onJumpToNote: (nodeId: string) => void
  selectedNodeIds: string[]
  onApplyColorToSelected: () => void
  customHex: string
  setCustomHex: (h: string) => void
  connectorType: string
  setConnectorType: (t: string) => void
}

function Sidebar({
  tool, setTool, selectedColor, setSelectedColor, panel, setPanel,
  selectedShapeType, setSelectedShapeType, savedNotes, onDeleteSavedNote,
  onSaveSelectedNote, onJumpToNote, selectedNodeIds, onApplyColorToSelected,
  customHex, setCustomHex, connectorType, setConnectorType,
}: SidebarProps) {
  const expanded = panel !== 'none'
  const panelWidth = expanded ? 240 : 48

  function handleToolClick(mode: ToolMode, associatedPanel?: SidebarPanel) {
    if (associatedPanel) {
      setPanel(panel === associatedPanel ? 'none' : associatedPanel)
    } else {
      setPanel('none')
      setTool(mode)
    }
  }

  function handleShapeSelect(shape: string) {
    const mapped = shapeButtonToShapeType[shape]
    if (mapped) {
      setSelectedShapeType(mapped)
      setTool('shape')
    }
    setPanel('none')
  }

  function handleConnectorSelect(type: string) {
    setConnectorType(type)
    setTool('connect')
    setPanel('none')
  }

  const toolButtons: { mode: ToolMode; icon: React.ReactNode; label: string; panelKey?: SidebarPanel }[] = [
    { mode: 'select', icon: <IconCursor />, label: 'Select (V)' },
    { mode: 'shape', icon: <IconShape />, label: 'Shapes (S)', panelKey: 'shapes' },
    { mode: 'text', icon: <IconText />, label: 'Text (T)' },
    { mode: 'connect', icon: <IconConnect />, label: 'Connectors (C)', panelKey: 'connectors' },
    { mode: 'note', icon: <IconStickyNote />, label: 'Sticky Note (N)' },
  ]

  return (
    <div style={{
      position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
      zIndex: 50, display: 'flex', flexDirection: 'row',
      transition: 'width 0.2s ease',
      width: panelWidth,
      height: 'auto',
      maxHeight: 'calc(100vh - 128px)',
    }}>
      {/* Collapsed icon strip */}
      <div style={{
        width: 48, display: 'flex', flexDirection: 'column', gap: 2,
        background: 'rgba(15,17,23,0.95)', borderRadius: expanded ? '14px 0 0 14px' : 14,
        padding: '6px 6px', border: '1px solid #30363d',
        borderRight: expanded ? '1px solid #30363d' : undefined,
        boxShadow: expanded ? 'none' : '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        flexShrink: 0,
      }}>
        {toolButtons.map(t => (
          <button
            key={t.mode}
            onClick={() => handleToolClick(t.mode, t.panelKey)}
            title={t.label}
            style={{
              width: 36, height: 36, borderRadius: 8, border: 'none',
              background: (tool === t.mode && !t.panelKey) || (t.panelKey && panel === t.panelKey)
                ? 'rgba(110,224,90,0.15)' : 'transparent',
              color: (tool === t.mode && !t.panelKey) || (t.panelKey && panel === t.panelKey)
                ? '#6EE05A' : '#6b7280',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {t.icon}
          </button>
        ))}

        {/* Separator */}
        <div style={{ width: 24, height: 1, background: '#30363d', margin: '4px auto' }} />

        {/* Color button */}
        <button
          onClick={() => setPanel(panel === 'color' ? 'none' : 'color')}
          title="Color (K)"
          style={{
            width: 36, height: 36, borderRadius: 8, border: 'none',
            background: panel === 'color' ? 'rgba(110,224,90,0.15)' : 'transparent',
            color: panel === 'color' ? '#6EE05A' : '#6b7280',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', position: 'relative', transition: 'all 0.15s',
          }}
        >
          <div style={{
            width: 16, height: 16, borderRadius: '50%',
            background: selectedColor, border: '2px solid #30363d',
          }} />
        </button>

        {/* Saved notes button */}
        <button
          onClick={() => setPanel(panel === 'saved' ? 'none' : 'saved')}
          title="Saved Notes"
          style={{
            width: 36, height: 36, borderRadius: 8, border: 'none',
            background: panel === 'saved' ? 'rgba(110,224,90,0.15)' : 'transparent',
            color: panel === 'saved' ? '#6EE05A' : '#6b7280',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          <IconStar />
        </button>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div style={{
          width: 192, background: 'rgba(15,17,23,0.95)', borderRadius: '0 14px 14px 0',
          border: '1px solid #30363d', borderLeft: 'none',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          overflow: 'auto',
          maxHeight: 'calc(100vh - 128px)',
          padding: '12px 10px',
        }}>
          {/* Shapes panel */}
          {panel === 'shapes' && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Basic</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 16 }}>
                {[
                  { id: 'rectangle', label: 'Rect' },
                  { id: 'rounded', label: 'Rounded' },
                  { id: 'circle', label: 'Circle' },
                  { id: 'diamond', label: 'Diamond' },
                  { id: 'triangle', label: 'Triangle' },
                  { id: 'parallelogram', label: 'Para' },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleShapeSelect(s.id)}
                    title={s.label}
                    style={{
                      width: '100%', aspectRatio: '1', borderRadius: 6, border: '1px solid #30363d',
                      background: selectedShapeType === (shapeButtonToShapeType[s.id] || s.id) ? 'rgba(110,224,90,0.1)' : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.1s',
                    }}
                  >
                    <ShapePreview shape={s.id} />
                  </button>
                ))}
              </div>

              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Flowchart</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                {[
                  { id: 'process', label: 'Process' },
                  { id: 'decision', label: 'Decision' },
                  { id: 'terminal', label: 'Terminal' },
                  { id: 'data', label: 'Data' },
                  { id: 'document', label: 'Document' },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleShapeSelect(s.id)}
                    title={s.label}
                    style={{
                      width: '100%', aspectRatio: '1', borderRadius: 6, border: '1px solid #30363d',
                      background: 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.1s',
                    }}
                  >
                    <ShapePreview shape={s.id} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Connectors panel */}
          {panel === 'connectors' && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Connectors</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { id: 'arrow', label: 'Arrow' },
                  { id: 'dashed', label: 'Dashed' },
                  { id: 'bidirectional', label: 'Bidirectional' },
                ].map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleConnectorSelect(c.id)}
                    title={c.label}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '8px 8px', borderRadius: 6,
                      border: `1px solid ${connectorType === c.id ? '#6EE05A' : '#30363d'}`,
                      background: connectorType === c.id ? 'rgba(110,224,90,0.1)' : 'transparent',
                      cursor: 'pointer', color: '#d1d5db', fontSize: 12,
                      transition: 'all 0.1s',
                    }}
                  >
                    <ShapePreview shape={c.id} size={28} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color panel */}
          {panel === 'color' && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Colors</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
                {PASTEL_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    style={{
                      width: '100%', aspectRatio: '1', borderRadius: 6,
                      background: c,
                      border: selectedColor === c ? '2px solid #6EE05A' : '2px solid transparent',
                      cursor: 'pointer', transition: 'all 0.1s',
                    }}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                <input
                  type="text"
                  value={customHex}
                  onChange={e => setCustomHex(e.target.value)}
                  placeholder="#hex"
                  style={{
                    flex: 1, padding: '6px 8px', borderRadius: 6,
                    background: '#161b22', border: '1px solid #30363d',
                    color: '#f0f4f8', fontSize: 12, fontFamily: 'monospace',
                    outline: 'none',
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && /^#[0-9a-fA-F]{3,8}$/.test(customHex)) {
                      setSelectedColor(customHex)
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (/^#[0-9a-fA-F]{3,8}$/.test(customHex)) setSelectedColor(customHex)
                  }}
                  style={{
                    padding: '6px 8px', borderRadius: 6,
                    background: '#161b22', border: '1px solid #30363d',
                    color: '#6EE05A', fontSize: 11, cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Set
                </button>
              </div>

              {selectedNodeIds.length > 0 && (
                <button
                  onClick={onApplyColorToSelected}
                  style={{
                    width: '100%', padding: '8px', borderRadius: 6,
                    background: 'rgba(110,224,90,0.1)', border: '1px solid #6EE05A',
                    color: '#6EE05A', fontSize: 12, cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Apply to selected ({selectedNodeIds.length})
                </button>
              )}
            </div>
          )}

          {/* Saved notes panel */}
          {panel === 'saved' && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Saved Notes</div>

              {selectedNodeIds.length > 0 && (
                <button
                  onClick={onSaveSelectedNote}
                  style={{
                    width: '100%', padding: '8px', borderRadius: 6, marginBottom: 8,
                    background: 'rgba(110,224,90,0.1)', border: '1px solid #6EE05A',
                    color: '#6EE05A', fontSize: 12, cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Save Selected
                </button>
              )}

              {savedNotes.length === 0 ? (
                <div style={{ color: '#6b7280', fontSize: 12, textAlign: 'center', padding: 16 }}>
                  No saved notes yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {savedNotes.map(note => (
                    <div
                      key={note.id}
                      onClick={() => onJumpToNote(note.nodeId)}
                      style={{
                        padding: '8px', borderRadius: 6,
                        background: '#161b22', border: '1px solid #30363d',
                        cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 8,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1c2333')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#161b22')}
                    >
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', background: note.color,
                        marginTop: 4, flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#d1d5db', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {note.text.slice(0, 30) || 'Empty note'}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: 10, marginTop: 2 }}>
                          {new Date(note.date).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteSavedNote(note.id) }}
                        style={{
                          width: 18, height: 18, borderRadius: 4,
                          background: 'transparent', border: 'none',
                          color: '#6b7280', fontSize: 11, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────
   Main Board (inner, needs ReactFlowProvider)
   ──────────────────────────────────────────── */

function BoardInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [tool, setTool] = useState<ToolMode>('select')
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0])
  const [loaded, setLoaded] = useState(false)
  const [panel, setPanel] = useState<SidebarPanel>('none')
  const [selectedShapeType, setSelectedShapeType] = useState<ShapeType>('rounded')
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([])
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])
  const [customHex, setCustomHex] = useState('#')
  const [connectorType, setConnectorType] = useState('arrow')
  const { screenToFlowPosition, fitView, setCenter, getNode } = useReactFlow()

  // Track selection
  useOnSelectionChange({
    onChange: ({ nodes: selNodes, edges: selEdges }) => {
      setSelectedNodeIds(selNodes.map(n => n.id))
      setSelectedEdgeIds(selEdges.map(e => e.id))
    },
  })

  // Load saved notes from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_NOTES_KEY)
      if (saved) setSavedNotes(JSON.parse(saved))
    } catch {}
  }, [])

  // Persist saved notes
  useEffect(() => {
    localStorage.setItem(SAVED_NOTES_KEY, JSON.stringify(savedNotes))
  }, [savedNotes])

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.nodes) setNodes(parsed.nodes)
        if (parsed.edges) setEdges(parsed.edges)
      }
    } catch {}
    setLoaded(true)
    setTimeout(() => fitView({ padding: 0.2 }), 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save to localStorage on changes (debounced)
  useEffect(() => {
    if (!loaded) return
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }))
    }, 300)
    return () => clearTimeout(timer)
  }, [nodes, edges, loaded])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      switch (e.key.toLowerCase()) {
        case 'v': setTool('select'); setPanel('none'); break
        case 'n': setTool('note'); setPanel('none'); break
        case 't': setTool('text'); setPanel('none'); break
        case 's':
          if (!e.metaKey && !e.ctrlKey) { setTool('shape'); setPanel('none') }
          break
        case 'c':
          if (!e.metaKey && !e.ctrlKey) { setTool('connect'); setPanel('none') }
          break
        case 'k': cycleColor(); break
        case 'escape': setTool('select'); setPanel('none'); break
      }

      // Delete/Backspace to remove selected nodes and edges
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.length > 0 || selectedEdgeIds.length > 0) {
          e.preventDefault()
          if (selectedNodeIds.length > 0) {
            setNodes(nds => nds.filter(n => !selectedNodeIds.includes(n.id)))
          }
          if (selectedEdgeIds.length > 0) {
            setEdges(eds => eds.filter(e => !selectedEdgeIds.includes(e.id)))
          }
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColor, selectedNodeIds, selectedEdgeIds])

  const cycleColor = useCallback(() => {
    setSelectedColor(prev => {
      const idx = PASTEL_COLORS.indexOf(prev)
      return PASTEL_COLORS[(idx + 1) % PASTEL_COLORS.length]
    })
  }, [])

  const onConnect = useCallback((params: Connection) => {
    const edgeStyle: Record<string, unknown> = {
      stroke: EDGE_COLOR,
      strokeWidth: 2,
    }
    if (connectorType === 'dashed') {
      edgeStyle.strokeDasharray = '6 3'
    }

    setEdges(eds => addEdge({
      ...params,
      type: 'smoothstep',
      animated: connectorType === 'arrow',
      style: edgeStyle as React.CSSProperties,
      markerEnd: connectorType !== 'bidirectional' ? { type: 'arrowclosed' as never, color: EDGE_COLOR } : undefined,
      markerStart: connectorType === 'bidirectional' ? { type: 'arrowclosed' as never, color: EDGE_COLOR } : undefined,
    }, eds))
  }, [setEdges, connectorType])

  const onPaneClick = useCallback((event: React.MouseEvent) => {
    if (tool === 'select' || tool === 'connect') return

    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

    let newNode: Node
    switch (tool) {
      case 'note':
        newNode = {
          id,
          type: 'stickyNote',
          position,
          data: { text: '', color: selectedColor },
          style: { width: 200, height: 140 },
        }
        break
      case 'text':
        newNode = {
          id,
          type: 'textNode',
          position,
          data: { text: 'Text', fontSize: 'medium' },
        }
        break
      case 'shape':
        newNode = {
          id,
          type: 'shapeNode',
          position,
          data: { text: '', color: selectedColor, shapeType: selectedShapeType },
          style: { width: 150, height: 80 },
        }
        break
      default:
        return
    }

    setNodes(nds => [...nds, newNode])
    // Single drop: switch back to select after placing one item
    setTool('select')
  }, [tool, selectedColor, selectedShapeType, screenToFlowPosition, setNodes])

  // Edge click to delete
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setEdges(eds => eds.filter(e => e.id !== edge.id))
  }, [setEdges])

  // Save selected note
  const onSaveSelectedNote = useCallback(() => {
    if (selectedNodeIds.length === 0) return
    const nodeId = selectedNodeIds[0]
    const node = getNode(nodeId)
    if (!node) return

    const newSaved: SavedNote = {
      id: `sn_${Date.now()}`,
      nodeId: node.id,
      text: (node.data.text as string) || '',
      color: (node.data.color as string) || '#fef3c7',
      date: new Date().toISOString(),
    }
    setSavedNotes(prev => [newSaved, ...prev])
  }, [selectedNodeIds, getNode])

  // Delete saved note
  const onDeleteSavedNote = useCallback((id: string) => {
    setSavedNotes(prev => prev.filter(n => n.id !== id))
  }, [])

  // Jump to saved note
  const onJumpToNote = useCallback((nodeId: string) => {
    const node = getNode(nodeId)
    if (!node) return
    const x = node.position.x + ((node.measured?.width ?? 100) / 2)
    const y = node.position.y + ((node.measured?.height ?? 70) / 2)
    setCenter(x, y, { zoom: 1.2, duration: 400 })
  }, [getNode, setCenter])

  // Apply color to selected nodes
  const onApplyColorToSelected = useCallback(() => {
    if (selectedNodeIds.length === 0) return
    setNodes(nds => nds.map(n => {
      if (selectedNodeIds.includes(n.id)) {
        return { ...n, data: { ...n.data, color: selectedColor } }
      }
      return n
    }))
  }, [selectedNodeIds, selectedColor, setNodes])

  const cursorStyle = useMemo(() => {
    if (tool === 'select') return 'grab'
    if (tool === 'connect') return 'crosshair'
    return 'cell'
  }, [tool])

  if (!loaded) {
    return (
      <div style={{
        height: 'calc(100vh - 64px)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted, #6b7280)', background: 'var(--bg-primary, #0d1117)',
      }}>
        Loading board...
      </div>
    )
  }

  return (
    <div style={{ height: 'calc(100vh - 64px)', position: 'relative' }}>
      <style>{`
        .react-flow__handle { opacity: 0; transition: opacity 0.15s; }
        .react-flow__node:hover .react-flow__handle { opacity: 1; }
        .react-flow__node.selected .react-flow__handle { opacity: 1; }
        .react-flow__edge:hover { cursor: pointer; }
        .react-flow__edge:hover .react-flow__edge-path { stroke: #6EE05A !important; stroke-opacity: 0.8 !important; }
        .react-flow__minimap { background: #161b22 !important; border: 1px solid #30363d !important; border-radius: 8px !important; }
        .react-flow__controls { background: #161b22 !important; border: 1px solid #30363d !important; border-radius: 10px !important; overflow: hidden; }
        .react-flow__controls button { background: #161b22 !important; color: #9ca3af !important; border: none !important; border-bottom: 1px solid #30363d !important; width: 32px !important; height: 32px !important; }
        .react-flow__controls button:hover { background: #1c2333 !important; color: #f0f4f8 !important; }
        .react-flow__controls button svg { fill: currentColor !important; }
        .react-flow__attribution { display: none !important; }
        .react-flow__pane { cursor: ${cursorStyle} !important; }
        .react-flow__resize-control.handle { background: #6EE05A !important; border: 2px solid #0d1117 !important; border-radius: 2px !important; width: 10px !important; height: 10px !important; }
        .react-flow__resize-control.line { border-color: rgba(110,224,90,0.4) !important; }
      `}</style>

      <Sidebar
        tool={tool}
        setTool={setTool}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        panel={panel}
        setPanel={setPanel}
        selectedShapeType={selectedShapeType}
        setSelectedShapeType={setSelectedShapeType}
        savedNotes={savedNotes}
        onDeleteSavedNote={onDeleteSavedNote}
        onSaveSelectedNote={onSaveSelectedNote}
        onJumpToNote={onJumpToNote}
        selectedNodeIds={selectedNodeIds}
        onApplyColorToSelected={onApplyColorToSelected}
        customHex={customHex}
        setCustomHex={setCustomHex}
        connectorType={connectorType}
        setConnectorType={setConnectorType}
      />

      {/* ═══ Floating Element Toolbar (Whimsical-style) ═══ */}
      <FloatingToolbar
        selectedNodeIds={selectedNodeIds}
        nodes={nodes}
        setNodes={setNodes}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        onDelete={() => setNodes(nds => nds.filter(n => !selectedNodeIds.includes(n.id)))}
        onDuplicate={() => {
          const dupes = nodes.filter(n => selectedNodeIds.includes(n.id)).map(n => ({
            ...n,
            id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            position: { x: n.position.x + 20, y: n.position.y + 20 },
            selected: false,
          }))
          setNodes(nds => [...nds, ...dupes])
        }}
        onSave={onSaveSelectedNote}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: EDGE_COLOR, strokeWidth: 2 },
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        connectOnClick={tool === 'connect'}
        panOnDrag={tool === 'select' || tool === 'connect'}
        selectionOnDrag={false}
        deleteKeyCode={null}
        style={{ background: 'var(--bg-primary, #0d1117)' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#30363d"
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'stickyNote') return (node.data.color as string) || '#fef3c7'
            if (node.type === 'shapeNode') return (node.data.color as string) || '#dbeafe'
            return '#6EE05A'
          }}
          maskColor="rgba(13, 17, 23, 0.7)"
          style={{ width: 140, height: 90 }}
          position="bottom-right"
        />
        <Controls
          showInteractive={false}
          position="bottom-center"
        />
      </ReactFlow>
    </div>
  )
}

/* ────────────────────────────────────────────
   Page Export (wrapped in Provider)
   ──────────────────────────────────────────── */

/* ────────────────────────────────────────────
   Quick Note Overlay
   ──────────────────────────────────────────── */

interface QuickNote {
  id: string
  text: string
  summary: string
  date: string
  done: boolean
}

function QuickNotePanel() {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState<QuickNote[]>([])
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    try { const s = localStorage.getItem('0n_quick_notes'); if (s) setNotes(JSON.parse(s)) } catch {}
  }, [])

  function persist(n: QuickNote[]) { setNotes(n); localStorage.setItem('0n_quick_notes', JSON.stringify(n)) }

  async function save() {
    if (!input.trim()) return
    setSaving(true)
    const summary = input.length > 80 ? input.slice(0, 77) + '...' : input
    const note: QuickNote = {
      id: Date.now().toString(),
      text: input.trim(),
      summary,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      done: false,
    }
    persist([note, ...notes])
    setInput('')
    setSaving(false)
    setOpen(false)
  }

  function toggle(id: string) { persist(notes.map(n => n.id === id ? { ...n, done: !n.done } : n)) }
  function remove(id: string) { persist(notes.filter(n => n.id !== id)); if (expanded === id) setExpanded(null) }
  function expand(n: QuickNote) { setExpanded(n.id); setEditText(n.text) }
  function saveEdit() { if (expanded) { persist(notes.map(n => n.id === expanded ? { ...n, text: editText, summary: editText.length > 80 ? editText.slice(0, 77) + '...' : editText } : n)); setExpanded(null) } }
  function copyNote(text: string) { navigator.clipboard.writeText(text) }
  async function paste() { try { const t = await navigator.clipboard.readText(); setInput(t) } catch {} }

  return (
    <>
      {/* Quick Note button */}
      <button onClick={() => setOpen(true)} style={{ position: 'fixed', top: 14, right: 20, zIndex: 60, background: '#000', color: '#7ed957', border: '1px solid #1e293b', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>+</span> Quick Note
      </button>

      {/* Input modal */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div style={{ background: '#000', border: '1px solid #1e293b', borderRadius: 16, width: 400, padding: 24, animation: 'yhl-modalIn 0.3s ease' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#7ed957', marginBottom: 12 }}>Quick Note</div>
            <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Paste or type anything..." style={{ width: '100%', minHeight: 120, background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: 8, padding: 12, color: '#7ed957', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} autoFocus />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={paste} style={{ flex: 1, padding: '8px 0', background: '#000', border: '1px solid #1e293b', borderRadius: 6, color: '#7ed957', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Paste</button>
              <button onClick={() => setInput('')} style={{ flex: 1, padding: '8px 0', background: '#000', border: '1px solid #1e293b', borderRadius: 6, color: '#7ed957', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Clear</button>
              <button onClick={save} disabled={saving || !input.trim()} style={{ flex: 1, padding: '8px 0', background: '#000', border: '1px solid #7ed957', borderRadius: 6, color: '#7ed957', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: input.trim() ? 1 : 0.3 }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Notes sidebar */}
      {notes.length > 0 && (
        <div style={{ position: 'fixed', top: 56, right: 12, bottom: 12, width: 212, zIndex: 50, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
          {notes.map(n => (
            <div key={n.id} style={{ position: 'relative', width: 200, aspectRatio: '3/2', background: '#0a0a0a', border: `1px solid ${n.done ? '#1e293b' : '#1e293b'}`, borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s', opacity: n.done ? 0.5 : 1 }} className="qn-card" onClick={() => expand(n)}>
              <div style={{ fontSize: 9, color: '#7ed957', fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em' }}>{n.date}</div>
              <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.4, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as const }}>{n.summary}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                <button onClick={e => { e.stopPropagation(); toggle(n.id) }} style={{ flex: 1, padding: '4px 0', background: 'transparent', border: '1px solid #1e293b', borderRadius: 4, color: n.done ? '#7ed957' : '#4b5563', fontSize: 12, cursor: 'pointer' }}>✓</button>
                <button onClick={e => { e.stopPropagation(); remove(n.id) }} style={{ flex: 1, padding: '4px 0', background: 'transparent', border: '1px solid #1e293b', borderRadius: 4, color: '#4b5563', fontSize: 12, cursor: 'pointer' }}>✕</button>
              </div>
              {/* Hover overlay */}
              <div className="qn-hover" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', borderRadius: 10, display: 'none', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7ed957" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expanded edit modal */}
      {expanded && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setExpanded(null) }}>
          <div style={{ background: '#000', border: '1px solid #1e293b', borderRadius: 16, width: 440, padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#7ed957', marginBottom: 4 }}>Edit Note</div>
            <div style={{ fontSize: 10, color: '#4b5563', marginBottom: 12 }}>{notes.find(n => n.id === expanded)?.date}</div>
            <textarea value={editText} onChange={e => setEditText(e.target.value)} style={{ width: '100%', minHeight: 160, background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: 8, padding: 12, color: '#7ed957', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => copyNote(editText)} style={{ flex: 1, padding: '8px 0', background: '#000', border: '1px solid #1e293b', borderRadius: 6, color: '#7ed957', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Copy</button>
              <button onClick={() => setExpanded(null)} style={{ flex: 1, padding: '8px 0', background: '#000', border: '1px solid #1e293b', borderRadius: 6, color: '#7ed957', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveEdit} style={{ flex: 1, padding: '8px 0', background: '#000', border: '1px solid #7ed957', borderRadius: 6, color: '#7ed957', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .qn-card:hover .qn-hover { display: flex !important; }
        .qn-card:hover { border-color: #7ed957 !important; }
        @keyframes yhl-modalIn { from { opacity:0; transform:scale(0.95) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
      `}</style>
    </>
  )
}

export default function NotesBoard() {
  return (
    <ReactFlowProvider>
      <BoardInner />
      <QuickNotePanel />
    </ReactFlowProvider>
  )
}
