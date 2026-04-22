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
import {
  MousePointer2,
  StickyNote,
  Type,
  Square,
  ArrowUpRight,
  Palette,
  Star,
  Copy,
  Bookmark,
  Trash2,
  X,
} from 'lucide-react'

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
   Shared handle style (must stay inline — ReactFlow API)
   ──────────────────────────────────────────── */

const handleStyle: React.CSSProperties = {
  width: 8, height: 8, borderRadius: 4,
  background: '#6EE05A', border: '2px solid #0d1117',
  opacity: 0,
  transition: 'opacity 0.15s',
}

/* ────────────────────────────────────────────
   Shape style helpers (must stay inline — dynamic SVG clip-paths)
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
      return { ...base, borderRadius: 4, transform: 'rotate(45deg)' }
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
   Shared resize handle style (ReactFlow API — must stay inline)
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
      className="relative min-w-[120px] min-h-[80px] w-full h-full rounded-xl transition-shadow duration-150"
      style={{
        background: bgColor,
        padding: `${STICKY_TOP_BAR}px ${STICKY_PAD_H}px ${STICKY_PAD_V}px`,
        boxShadow: selected
          ? '0 0 0 2px #6EE05A, 0 4px 20px rgba(0,0,0,0.4)'
          : '0 2px 12px rgba(0,0,0,0.3)',
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
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-black/15" />

      {/* Delete button */}
      {hovered && (
        <button
          onClick={handleDelete}
          className="absolute top-1.5 right-2 w-5 h-5 rounded flex items-center justify-center bg-black/12 border-none text-black/50 cursor-pointer hover:bg-black/20 transition-colors"
        >
          <X size={10} />
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
          className="w-full bg-transparent border-none outline-none resize-none text-[#1a1a1a] text-[13px] leading-[1.5] font-medium"
          style={{ height: `calc(100% - ${STICKY_TOP_BAR}px)` }}
        />
      ) : (
        <div className="text-[#1a1a1a] text-[13px] leading-[1.5] whitespace-pre-wrap break-words font-medium min-h-[40px] select-none overflow-hidden w-full">
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
      className="w-full h-full flex items-center rounded min-w-[60px] min-h-[32px]"
      style={{
        padding: `${TEXT_PAD_V}px ${TEXT_PAD_H}px`,
        cursor: editing ? 'text' : 'grab',
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
          className="bg-transparent border-none outline-none resize-none w-full h-full break-words leading-[1.4] font-bold"
          style={{ color: '#f0f4f8', fontSize, fontFamily: 'inherit' }}
        />
      ) : (
        <div
          onClick={cycleSize}
          className="whitespace-pre-wrap break-words select-none w-full overflow-hidden leading-[1.4] font-bold"
          style={{ color: '#f0f4f8', fontSize }}
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
      className="relative w-full h-full"
      style={{ minWidth: mins.width, minHeight: mins.height }}
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
              className="bg-transparent border-none outline-none text-center w-full text-[13px] font-semibold"
              style={{ color: '#f0f4f8', fontFamily: 'inherit' }}
            />
          ) : (
            <div className="text-center select-none px-2 overflow-hidden whitespace-pre-wrap break-words w-full leading-[1.4] text-[13px] font-semibold"
              style={{ color: '#f0f4f8' }}>
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
    <div
      className="absolute z-40 flex items-center gap-0.5 bg-[#1e2330] border border-[#30363d] rounded-[10px] px-1.5 py-1 shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
      style={{ left: pos.x, top: pos.y, transform: 'translateX(-50%)' }}
    >
      {/* Font size (text nodes only) */}
      {isText && (
        <button
          onClick={cycleFontSize}
          title="Cycle font size (Tab)"
          className="flex items-center justify-center p-1.5 rounded-md text-[#d1d5db] hover:bg-[#2d3548] hover:text-[#f0f4f8] transition-colors border-none bg-transparent cursor-pointer"
        >
          <Type size={16} />
        </button>
      )}

      {/* Color picker */}
      <div className="relative">
        <button
          onClick={() => setShowColorPicker(p => !p)}
          title="Color"
          className="flex items-center justify-center p-1.5 rounded-md text-[#d1d5db] hover:bg-[#2d3548] hover:text-[#f0f4f8] transition-colors border-none bg-transparent cursor-pointer"
        >
          <div
            className="w-4 h-4 rounded border-2 border-[#555]"
            style={{ background: (node.data.color as string) || selectedColor }}
          />
        </button>
        {showColorPicker && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-[#1e2330] border border-[#30363d] rounded-[10px] p-2.5 grid grid-cols-4 gap-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.5)] z-50">
            {TOOLBAR_COLORS.map(c => (
              <button
                key={c}
                onClick={() => applyColor(c)}
                className="w-6 h-6 rounded-md cursor-pointer transition-colors"
                style={{
                  background: c,
                  border: c === ((node.data.color as string) || selectedColor) ? '2px solid #6EE05A' : '2px solid transparent',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-[#30363d] mx-1" />

      {/* Duplicate */}
      <button
        onClick={onDuplicate}
        title="Duplicate"
        className="flex items-center justify-center p-1.5 rounded-md text-[#d1d5db] hover:bg-[#2d3548] hover:text-[#f0f4f8] transition-colors border-none bg-transparent cursor-pointer"
      >
        <Copy size={16} />
      </button>

      {/* Save/Bookmark */}
      {(isNote || isText) && (
        <button
          onClick={onSave}
          title="Save to bookmarks"
          className="flex items-center justify-center p-1.5 rounded-md text-[#d1d5db] hover:bg-[#2d3548] hover:text-[#f0f4f8] transition-colors border-none bg-transparent cursor-pointer"
        >
          <Bookmark size={16} />
        </button>
      )}

      {/* Separator */}
      <div className="w-px h-5 bg-[#30363d] mx-1" />

      {/* Delete */}
      <button
        onClick={onDelete}
        title="Delete"
        className="flex items-center justify-center p-1.5 rounded-md text-[#f87171] hover:bg-[#f87171]/10 transition-colors border-none bg-transparent cursor-pointer"
      >
        <Trash2 size={16} />
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
    { mode: 'select', icon: <MousePointer2 size={18} />, label: 'Select (V)' },
    { mode: 'shape', icon: <Square size={18} />, label: 'Shapes (S)', panelKey: 'shapes' },
    { mode: 'text', icon: <Type size={18} />, label: 'Text (T)' },
    { mode: 'connect', icon: <ArrowUpRight size={18} />, label: 'Connectors (C)', panelKey: 'connectors' },
    { mode: 'note', icon: <StickyNote size={18} />, label: 'Sticky Note (N)' },
  ]

  const isToolActive = (t: typeof toolButtons[0]) =>
    (t.mode === tool && !t.panelKey) || (t.panelKey && panel === t.panelKey)

  return (
    <div
      className="absolute left-3 top-1/2 -translate-y-1/2 z-50 flex flex-row transition-all duration-200"
      style={{ maxHeight: 'calc(100vh - 128px)' }}
    >
      {/* Collapsed icon strip */}
      <div
        className={`w-12 flex flex-col gap-0.5 bg-[rgba(15,17,23,0.95)] border border-[#30363d] py-1.5 px-1.5 flex-shrink-0 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.5)] ${
          expanded ? 'rounded-l-[14px] border-r-[#30363d]' : 'rounded-[14px]'
        }`}
      >
        {toolButtons.map(t => (
          <button
            key={t.mode}
            onClick={() => handleToolClick(t.mode, t.panelKey)}
            title={t.label}
            className={`w-9 h-9 rounded-lg border-none flex items-center justify-center cursor-pointer transition-all duration-150 ${
              isToolActive(t)
                ? 'bg-[rgba(110,224,90,0.15)] text-[#6EE05A]'
                : 'bg-transparent text-[#6b7280] hover:text-[#d1d5db] hover:bg-[rgba(255,255,255,0.05)]'
            }`}
          >
            {t.icon}
          </button>
        ))}

        {/* Separator */}
        <div className="w-6 h-px bg-[#30363d] mx-auto my-1" />

        {/* Color button */}
        <button
          onClick={() => setPanel(panel === 'color' ? 'none' : 'color')}
          title="Color (K)"
          className={`w-9 h-9 rounded-lg border-none flex items-center justify-center cursor-pointer relative transition-all duration-150 ${
            panel === 'color'
              ? 'bg-[rgba(110,224,90,0.15)] text-[#6EE05A]'
              : 'bg-transparent text-[#6b7280] hover:text-[#d1d5db] hover:bg-[rgba(255,255,255,0.05)]'
          }`}
        >
          <div
            className="w-4 h-4 rounded-full border-2 border-[#30363d]"
            style={{ background: selectedColor }}
          />
        </button>

        {/* Saved notes button */}
        <button
          onClick={() => setPanel(panel === 'saved' ? 'none' : 'saved')}
          title="Saved Notes"
          className={`w-9 h-9 rounded-lg border-none flex items-center justify-center cursor-pointer transition-all duration-150 ${
            panel === 'saved'
              ? 'bg-[rgba(110,224,90,0.15)] text-[#6EE05A]'
              : 'bg-transparent text-[#6b7280] hover:text-[#d1d5db] hover:bg-[rgba(255,255,255,0.05)]'
          }`}
        >
          <Star size={18} />
        </button>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div
          className="w-48 bg-[rgba(15,17,23,0.95)] rounded-r-[14px] border border-[#30363d] border-l-0 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md overflow-auto p-3"
          style={{ maxHeight: 'calc(100vh - 128px)' }}
        >
          {/* Shapes panel */}
          {panel === 'shapes' && (
            <div>
              <div className="text-[10px] font-bold text-[#6b7280] mb-2 tracking-[0.08em] uppercase">Basic</div>
              <div className="grid grid-cols-3 gap-1 mb-4">
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
                    className={`w-full aspect-square rounded-md border cursor-pointer flex items-center justify-center transition-all duration-100 ${
                      selectedShapeType === (shapeButtonToShapeType[s.id] || s.id)
                        ? 'bg-[rgba(110,224,90,0.1)] border-[#6EE05A]'
                        : 'bg-transparent border-[#30363d] hover:border-[#6b7280]'
                    }`}
                  >
                    <ShapePreview shape={s.id} />
                  </button>
                ))}
              </div>

              <div className="text-[10px] font-bold text-[#6b7280] mb-2 tracking-[0.08em] uppercase">Flowchart</div>
              <div className="grid grid-cols-3 gap-1">
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
                    className="w-full aspect-square rounded-md border border-[#30363d] bg-transparent cursor-pointer flex items-center justify-center transition-all duration-100 hover:border-[#6b7280]"
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
              <div className="text-[10px] font-bold text-[#6b7280] mb-2 tracking-[0.08em] uppercase">Connectors</div>
              <div className="flex flex-col gap-1">
                {[
                  { id: 'arrow', label: 'Arrow' },
                  { id: 'dashed', label: 'Dashed' },
                  { id: 'bidirectional', label: 'Bidirectional' },
                ].map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleConnectorSelect(c.id)}
                    title={c.label}
                    className={`flex items-center gap-2.5 w-full px-2 py-2 rounded-md border cursor-pointer text-[#d1d5db] text-xs transition-all duration-100 ${
                      connectorType === c.id
                        ? 'border-[#6EE05A] bg-[rgba(110,224,90,0.1)]'
                        : 'border-[#30363d] bg-transparent hover:border-[#6b7280]'
                    }`}
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
              <div className="text-[10px] font-bold text-[#6b7280] mb-2 tracking-[0.08em] uppercase">Colors</div>
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {PASTEL_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className="w-full aspect-square rounded-md cursor-pointer transition-all duration-100"
                    style={{
                      background: c,
                      border: selectedColor === c ? '2px solid #6EE05A' : '2px solid transparent',
                    }}
                  />
                ))}
              </div>

              <div className="flex gap-1 mb-2">
                <input
                  type="text"
                  value={customHex}
                  onChange={e => setCustomHex(e.target.value)}
                  placeholder="#hex"
                  className="flex-1 px-2 py-1.5 rounded-md bg-[#161b22] border border-[#30363d] text-[#f0f4f8] text-xs font-mono outline-none focus:border-[#6b7280]"
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
                  className="px-2 py-1.5 rounded-md bg-[#161b22] border border-[#30363d] text-[#6EE05A] text-[11px] font-semibold cursor-pointer hover:border-[#6EE05A] transition-colors"
                >
                  Set
                </button>
              </div>

              {selectedNodeIds.length > 0 && (
                <button
                  onClick={onApplyColorToSelected}
                  className="w-full py-2 rounded-md bg-[rgba(110,224,90,0.1)] border border-[#6EE05A] text-[#6EE05A] text-xs font-semibold cursor-pointer hover:bg-[rgba(110,224,90,0.2)] transition-colors"
                >
                  Apply to selected ({selectedNodeIds.length})
                </button>
              )}
            </div>
          )}

          {/* Saved notes panel */}
          {panel === 'saved' && (
            <div>
              <div className="text-[10px] font-bold text-[#6b7280] mb-2 tracking-[0.08em] uppercase">Saved Notes</div>

              {selectedNodeIds.length > 0 && (
                <button
                  onClick={onSaveSelectedNote}
                  className="w-full py-2 rounded-md mb-2 bg-[rgba(110,224,90,0.1)] border border-[#6EE05A] text-[#6EE05A] text-xs font-semibold cursor-pointer hover:bg-[rgba(110,224,90,0.2)] transition-colors"
                >
                  Save Selected
                </button>
              )}

              {savedNotes.length === 0 ? (
                <div className="text-[#6b7280] text-xs text-center py-4">
                  No saved notes yet
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {savedNotes.map(note => (
                    <div
                      key={note.id}
                      onClick={() => onJumpToNote(note.nodeId)}
                      className="p-2 rounded-md bg-[#161b22] border border-[#30363d] cursor-pointer flex items-start gap-2 hover:bg-[#1c2333] transition-colors"
                    >
                      <div
                        className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                        style={{ background: note.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[#d1d5db] text-xs font-semibold overflow-hidden text-ellipsis whitespace-nowrap">
                          {note.text.slice(0, 30) || 'Empty note'}
                        </div>
                        <div className="text-[#6b7280] text-[10px] mt-0.5">
                          {new Date(note.date).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteSavedNote(note.id) }}
                        className="w-4 h-4 rounded flex-shrink-0 bg-transparent border-none text-[#6b7280] cursor-pointer flex items-center justify-center hover:text-[#d1d5db] transition-colors"
                      >
                        <X size={10} />
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
      <div className="flex items-center justify-center text-[var(--core-text-muted,#6b7280)] bg-[var(--core-bg,#0d1117)]" style={{ height: 'calc(100vh - 64px)' }}>
        Loading board...
      </div>
    )
  }

  return (
    <div className="relative" style={{ height: 'calc(100vh - 64px)' }}>
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

      {/* Floating Element Toolbar (Whimsical-style) */}
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
        style={{ background: 'var(--core-bg, #0d1117)' }}
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

/* Strike Menu moved to components/global-strike-menu.tsx */

export default function NotesBoard() {
  return (
    <ReactFlowProvider>
      <BoardInner />
    </ReactFlowProvider>
  )
}
