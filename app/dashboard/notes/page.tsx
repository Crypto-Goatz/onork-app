'use client'

import { useState, useEffect, useCallback, useRef, memo } from 'react'
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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

/* ────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────── */

const PASTEL_COLORS = [
  '#fef3c7', // yellow
  '#d1fae5', // green
  '#dbeafe', // blue
  '#fce7f3', // pink
  '#ede9fe', // purple
  '#ffedd5', // orange
]

const EDGE_COLOR = 'rgba(110, 224, 90, 0.4)'
const STORAGE_KEY = '0ncore-board'

type ToolMode = 'select' | 'note' | 'text' | 'shape' | 'connect'

/* ────────────────────────────────────────────
   Custom Node: StickyNote
   ──────────────────────────────────────────── */

const StickyNoteNode = memo(({ id, data, selected }: NodeProps) => {
  const [editing, setEditing] = useState(false)
  const [hovered, setHovered] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { setNodes } = useReactFlow()

  const bgColor = (data.color as string) || '#fef3c7'

  function updateText(value: string) {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, text: value } } : n))
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
        width: 200,
        minHeight: 140,
        background: bgColor,
        borderRadius: 12,
        padding: '28px 14px 14px',
        position: 'relative',
        boxShadow: selected
          ? '0 0 0 2px #6EE05A, 0 4px 20px rgba(0,0,0,0.4)'
          : '0 2px 12px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.15s',
        cursor: editing ? 'text' : 'grab',
      }}
    >
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
          onBlur={() => setEditing(false)}
          onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
          style={{
            width: '100%', minHeight: 90, background: 'transparent',
            border: 'none', outline: 'none', resize: 'none',
            color: '#1a1a1a', fontSize: 13, fontFamily: 'inherit',
            lineHeight: 1.5, fontWeight: 500,
          }}
        />
      ) : (
        <div style={{
          color: '#1a1a1a', fontSize: 13, lineHeight: 1.5,
          whiteSpace: 'pre-wrap', fontWeight: 500, minHeight: 40,
          userSelect: 'none',
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

  return (
    <div
      onDoubleClick={() => setEditing(true)}
      onContextMenu={(e) => {
        e.preventDefault()
        setNodes(nds => nds.filter(n => n.id !== id))
      }}
      style={{
        padding: '4px 8px', cursor: editing ? 'text' : 'grab',
        outline: selected ? '2px solid #6EE05A' : 'none',
        outlineOffset: 4, borderRadius: 4, minWidth: 40,
      }}
    >
      {editing ? (
        <input
          autoFocus
          value={(data.text as string) || ''}
          onChange={e => updateText(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={e => {
            if (e.key === 'Escape' || e.key === 'Enter') setEditing(false)
            if (e.key === 'Tab') { e.preventDefault(); cycleSize() }
          }}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: '#f0f4f8', fontSize, fontWeight: 700,
            fontFamily: 'inherit', minWidth: 80,
          }}
        />
      ) : (
        <div
          onClick={cycleSize}
          style={{
            color: '#f0f4f8', fontSize, fontWeight: 700,
            whiteSpace: 'nowrap', userSelect: 'none',
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
   Custom Node: ShapeNode
   ──────────────────────────────────────────── */

const ShapeNode = memo(({ id, data, selected }: NodeProps) => {
  const [editing, setEditing] = useState(false)
  const { setNodes } = useReactFlow()

  const borderColor = (data.color as string) || '#dbeafe'

  function updateText(value: string) {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, text: value } } : n))
  }

  return (
    <div
      onDoubleClick={() => setEditing(true)}
      onContextMenu={(e) => {
        e.preventDefault()
        setNodes(nds => nds.filter(n => n.id !== id))
      }}
      style={{
        width: 150, height: 80, borderRadius: 12,
        border: `2px solid ${borderColor}`,
        background: `${borderColor}10`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: editing ? 'text' : 'grab',
        boxShadow: selected
          ? '0 0 0 2px #6EE05A, 0 2px 12px rgba(0,0,0,0.3)'
          : '0 1px 6px rgba(0,0,0,0.2)',
        transition: 'box-shadow 0.15s',
      }}
    >
      {editing ? (
        <input
          autoFocus
          value={(data.text as string) || ''}
          onChange={e => updateText(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={e => { if (e.key === 'Escape' || e.key === 'Enter') setEditing(false) }}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: '#f0f4f8', fontSize: 13, fontWeight: 600,
            textAlign: 'center', width: '90%', fontFamily: 'inherit',
          }}
        />
      ) : (
        <div style={{
          color: '#f0f4f8', fontSize: 13, fontWeight: 600,
          textAlign: 'center', userSelect: 'none', padding: '0 8px',
        }}>
          {(data.text as string) || 'Label'}
        </div>
      )}

      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
      <Handle type="target" position={Position.Left} style={{ ...handleStyle, top: '50%' }} id="left-t" />
      <Handle type="source" position={Position.Right} style={{ ...handleStyle, top: '50%' }} id="right-s" />
    </div>
  )
})
ShapeNode.displayName = 'ShapeNode'

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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
    </svg>
  )
}

function IconStickyNote() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
      <path d="M14 3v6h6" />
    </svg>
  )
}

function IconText() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  )
}

function IconShape() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
    </svg>
  )
}

function IconConnect() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function IconPalette() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="10.5" r="2.5" />
      <circle cx="8.5" cy="7.5" r="2.5" />
      <circle cx="6.5" cy="12.5" r="2.5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  )
}

/* ────────────────────────────────────────────
   Floating Toolbar
   ──────────────────────────────────────────── */

interface ToolbarProps {
  tool: ToolMode
  setTool: (t: ToolMode) => void
  selectedColor: string
  onCycleColor: () => void
}

function FloatingToolbar({ tool, setTool, selectedColor, onCycleColor }: ToolbarProps) {
  const tools: { mode: ToolMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'select', icon: <IconCursor />, label: 'Select (V)' },
    { mode: 'note', icon: <IconStickyNote />, label: 'Sticky Note (N)' },
    { mode: 'text', icon: <IconText />, label: 'Text (T)' },
    { mode: 'shape', icon: <IconShape />, label: 'Shape (S)' },
    { mode: 'connect', icon: <IconConnect />, label: 'Connector (C)' },
  ]

  return (
    <div style={{
      position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
      zIndex: 50, display: 'flex', flexDirection: 'column', gap: 4,
      background: '#161b22', borderRadius: 14, padding: 6,
      border: '1px solid #30363d',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {tools.map(t => (
        <button
          key={t.mode}
          onClick={() => setTool(t.mode)}
          title={t.label}
          style={{
            width: 36, height: 36, borderRadius: 8, border: 'none',
            background: tool === t.mode ? 'rgba(110,224,90,0.15)' : 'transparent',
            color: tool === t.mode ? '#6EE05A' : '#6b7280',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {t.icon}
        </button>
      ))}

      {/* Separator */}
      <div style={{ width: 24, height: 1, background: '#30363d', margin: '2px auto' }} />

      {/* Color cycle button */}
      <button
        onClick={onCycleColor}
        title={`Color (K) - cycle`}
        style={{
          width: 36, height: 36, borderRadius: 8, border: 'none',
          background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', position: 'relative',
        }}
      >
        <IconPalette />
        <div style={{
          position: 'absolute', bottom: 4, right: 4,
          width: 8, height: 8, borderRadius: '50%',
          background: selectedColor, border: '1px solid #30363d',
        }} />
      </button>
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
  const { screenToFlowPosition, fitView } = useReactFlow()

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
    // Fit after load
    setTimeout(() => fitView({ padding: 0.2 }), 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save to localStorage on changes
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
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
      switch (e.key.toLowerCase()) {
        case 'v': setTool('select'); break
        case 'n': setTool('note'); break
        case 't': setTool('text'); break
        case 's': if (!e.metaKey && !e.ctrlKey) setTool('shape'); break
        case 'c': if (!e.metaKey && !e.ctrlKey) setTool('connect'); break
        case 'k': cycleColor(); break
        case 'escape': setTool('select'); break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColor])

  const cycleColor = useCallback(() => {
    setSelectedColor(prev => {
      const idx = PASTEL_COLORS.indexOf(prev)
      return PASTEL_COLORS[(idx + 1) % PASTEL_COLORS.length]
    })
  }, [])

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({
      ...params,
      type: 'smoothstep',
      animated: true,
      style: { stroke: EDGE_COLOR, strokeWidth: 2, strokeDasharray: '6 3' },
    }, eds))
  }, [setEdges])

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
          data: { text: '', color: selectedColor },
        }
        break
      default:
        return
    }

    setNodes(nds => [...nds, newNode])
  }, [tool, selectedColor, screenToFlowPosition, setNodes])

  // Edge click to delete
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setEdges(eds => eds.filter(e => e.id !== edge.id))
  }, [setEdges])

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
        .react-flow__edge:hover { cursor: pointer; }
        .react-flow__edge:hover .react-flow__edge-path { stroke: #6EE05A !important; stroke-opacity: 0.8 !important; }
        .react-flow__minimap { background: #161b22 !important; border: 1px solid #30363d !important; border-radius: 8px !important; }
        .react-flow__controls { background: #161b22 !important; border: 1px solid #30363d !important; border-radius: 10px !important; overflow: hidden; }
        .react-flow__controls button { background: #161b22 !important; color: #9ca3af !important; border: none !important; border-bottom: 1px solid #30363d !important; width: 32px !important; height: 32px !important; }
        .react-flow__controls button:hover { background: #1c2333 !important; color: #f0f4f8 !important; }
        .react-flow__controls button svg { fill: currentColor !important; }
        .react-flow__attribution { display: none !important; }
        .react-flow__pane { cursor: ${tool === 'select' ? 'grab' : tool === 'connect' ? 'crosshair' : 'cell'} !important; }
      `}</style>

      <FloatingToolbar
        tool={tool}
        setTool={setTool}
        selectedColor={selectedColor}
        onCycleColor={cycleColor}
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
          style: { stroke: EDGE_COLOR, strokeWidth: 2, strokeDasharray: '6 3' },
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        connectOnClick={tool === 'connect'}
        panOnDrag={tool === 'select' || tool === 'connect'}
        selectionOnDrag={false}
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

export default function NotesBoard() {
  return (
    <ReactFlowProvider>
      <BoardInner />
    </ReactFlowProvider>
  )
}
