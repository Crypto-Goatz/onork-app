'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { Project, CanvasNode, CanvasLink } from '../types'

const uid = () => Math.random().toString(36).substr(2, 9)

const NODE_DEFS: Record<string, { label: string; icon: string; color: string }> = {
  task: { label: 'Task', icon: '\u2611', color: '#3b82f6' },
  note: { label: 'Note', icon: '\uD83D\uDCDD', color: '#fbbf24' },
  milestone: { label: 'Milestone', icon: '\u2B50', color: '#a855f7' },
  trigger: { label: 'Trigger', icon: '\u26A1', color: '#f59e0b' },
}

interface ProjectCanvasProps {
  project: Project
  onUpdateProject: (project: Project) => void
  onBack: () => void
}

export default function ProjectCanvas({ project, onUpdateProject, onBack }: ProjectCanvasProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panning, setPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const screenToCanvas = useCallback((sx: number, sy: number) => ({
    x: (sx - offset.x) / zoom,
    y: (sy - offset.y) / zoom,
  }), [offset, zoom])

  const addNode = (type: CanvasNode['type']) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    const center = screenToCanvas((rect?.width || 800) / 2, (rect?.height || 600) / 2)
    const node: CanvasNode = {
      id: uid(), type, x: center.x - 80, y: center.y - 30,
      width: 180, height: 70, title: NODE_DEFS[type].label,
    }
    onUpdateProject({ ...project, canvasNodes: [...project.canvasNodes, node] })
    setSelectedId(node.id)
  }

  const deleteSelected = () => {
    if (!selectedId) return
    onUpdateProject({
      ...project,
      canvasNodes: project.canvasNodes.filter(n => n.id !== selectedId),
      canvasLinks: project.canvasLinks.filter(l => l.fromId !== selectedId && l.toId !== selectedId),
    })
    setSelectedId(null)
  }

  const duplicateNode = () => {
    const node = project.canvasNodes.find(n => n.id === selectedId)
    if (!node) return
    const copy: CanvasNode = { ...node, id: uid(), x: node.x + 30, y: node.y + 30, title: `${node.title} (Copy)` }
    onUpdateProject({ ...project, canvasNodes: [...project.canvasNodes, copy] })
    setSelectedId(copy.id)
  }

  const updateTitle = (id: string, title: string) => {
    onUpdateProject({ ...project, canvasNodes: project.canvasNodes.map(n => n.id === id ? { ...n, title } : n) })
  }

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setSelectedId(null)
      setPanning(true)
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const cp = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top)
    setMousePos(cp)

    if (panning) {
      setOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
      return
    }
    if (dragging) {
      onUpdateProject({
        ...project,
        canvasNodes: project.canvasNodes.map(n =>
          n.id === dragging.id ? { ...n, x: cp.x - dragging.ox, y: cp.y - dragging.oy } : n
        ),
      })
    }
  }

  const handleMouseUp = () => {
    setPanning(false)
    setDragging(null)
    if (connecting) setConnecting(null)
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const d = e.deltaY > 0 ? 0.9 : 1.1
      setZoom(z => Math.min(Math.max(0.2, z * d), 4))
    } else {
      setOffset(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }))
    }
  }

  const handleNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
    e.stopPropagation()
    setSelectedId(node.id)
    const rect = canvasRef.current?.getBoundingClientRect()
    const cp = screenToCanvas(e.clientX - (rect?.left || 0), e.clientY - (rect?.top || 0))
    setDragging({ id: node.id, ox: cp.x - node.x, oy: cp.y - node.y })
  }

  const startConnect = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    setConnecting(nodeId)
  }

  const endConnect = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    if (connecting && connecting !== nodeId) {
      const link: CanvasLink = { id: uid(), fromId: connecting, toId: nodeId }
      onUpdateProject({ ...project, canvasLinks: [...project.canvasLinks, link] })
    }
    setConnecting(null)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'Backspace' || e.key === 'Delete') deleteSelected()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const bezier = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1) * 0.5
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117', color: '#f0f4f8', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ height: 52, borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: '#161b22', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#7ed957', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>&larr; Back</button>
          <div style={{ width: 1, height: 24, background: '#1e293b' }} />
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{project.title}</h2>
          <span style={{ fontSize: 10, color: '#3d4654', fontFamily: 'monospace' }}>Canvas</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', background: '#0d1117', borderRadius: 8, padding: 2, gap: 2 }}>
            <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} style={{ padding: '4px 8px', background: 'none', border: 'none', color: '#8b95a5', cursor: 'pointer', fontSize: 12 }}>-</button>
            <span style={{ fontSize: 11, fontFamily: 'monospace', padding: '4px 6px', color: '#8b95a5', minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(4, z + 0.1))} style={{ padding: '4px 8px', background: 'none', border: 'none', color: '#8b95a5', cursor: 'pointer', fontSize: 12 }}>+</button>
          </div>
          {selectedId && (
            <>
              <button onClick={duplicateNode} style={{ padding: '4px 10px', background: 'rgba(126,217,87,0.15)', color: '#7ed957', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Dup</button>
              <button onClick={deleteSelected} style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Del</button>
            </>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: 200, borderRight: '1px solid #1e293b', background: '#161b22', padding: 12, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8b95a5', marginBottom: 10 }}>Components</div>
          {Object.entries(NODE_DEFS).map(([type, def]) => (
            <button
              key={type}
              onClick={() => addNode(type as CanvasNode['type'])}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                background: 'transparent', border: '1px solid transparent', borderRadius: 8, color: '#f0f4f8',
                cursor: 'pointer', marginBottom: 4, textAlign: 'left', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = '#1e293b' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 6, background: def.color + '22', color: def.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{def.icon}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{def.label}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          style={{ flex: 1, position: 'relative', cursor: panning ? 'grabbing' : 'crosshair', overflow: 'hidden' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Dot grid */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.08,
            backgroundImage: 'radial-gradient(#f0f4f8 1px, transparent 1px)',
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${offset.x}px ${offset.y}px`,
          }} />

          {/* Transform layer */}
          <div style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: '0 0', width: '100%', height: '100%' }}>
            {/* Links SVG */}
            <svg style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none', width: '100%', height: '100%' }}>
              {project.canvasLinks.map(link => {
                const from = project.canvasNodes.find(n => n.id === link.fromId)
                const to = project.canvasNodes.find(n => n.id === link.toId)
                if (!from || !to) return null
                const x1 = from.x + (from.width || 180)
                const y1 = from.y + (from.height || 70) / 2
                const x2 = to.x
                const y2 = to.y + (to.height || 70) / 2
                return <path key={link.id} d={bezier(x1, y1, x2, y2)} fill="none" stroke="#3d4654" strokeWidth={2} />
              })}
              {connecting && (() => {
                const from = project.canvasNodes.find(n => n.id === connecting)
                if (!from) return null
                const x1 = from.x + (from.width || 180)
                const y1 = from.y + (from.height || 70) / 2
                return <path d={bezier(x1, y1, mousePos.x, mousePos.y)} fill="none" stroke="#7ed957" strokeWidth={2} strokeDasharray="5,5" />
              })()}
            </svg>

            {/* Nodes */}
            {project.canvasNodes.map(node => {
              const def = NODE_DEFS[node.type] || NODE_DEFS.task
              const isSelected = selectedId === node.id
              const w = node.width || 180
              const h = node.height || 70
              return (
                <div
                  key={node.id}
                  style={{
                    position: 'absolute', left: node.x, top: node.y, width: w, height: h,
                    background: '#161b22', border: `2px solid ${isSelected ? '#7ed957' : '#1e293b'}`,
                    borderRadius: 10, overflow: 'hidden', cursor: 'grab',
                    boxShadow: isSelected ? '0 0 0 4px rgba(126,217,87,0.2)' : 'none',
                    transition: 'box-shadow 0.15s',
                  }}
                  onMouseDown={e => handleNodeMouseDown(e, node)}
                  onDoubleClick={e => { e.stopPropagation(); setEditingId(node.id) }}
                >
                  {/* Color bar */}
                  <div style={{ height: 4, background: `linear-gradient(to right, ${def.color}, ${def.color}88)` }} />
                  {/* Content */}
                  <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{def.icon}</span>
                    {editingId === node.id ? (
                      <input
                        autoFocus
                        value={node.title}
                        onChange={e => updateTitle(node.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={e => e.key === 'Enter' && setEditingId(null)}
                        onClick={e => e.stopPropagation()}
                        style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid #7ed957', color: '#f0f4f8', fontSize: 12, fontWeight: 700, outline: 'none', padding: 0 }}
                      />
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#f0f4f8' }}>{node.title}</span>
                    )}
                  </div>
                  <div style={{ padding: '0 10px', fontSize: 10, color: '#3d4654', fontFamily: 'monospace' }}>{def.label}</div>

                  {/* Ports */}
                  <div
                    style={{ position: 'absolute', left: -5, top: h / 2 - 5, width: 10, height: 10, borderRadius: 5, background: '#0d1117', border: '2px solid #3d4654', cursor: 'crosshair' }}
                    onMouseUp={e => endConnect(e, node.id)}
                  />
                  <div
                    style={{ position: 'absolute', right: -5, top: h / 2 - 5, width: 10, height: 10, borderRadius: 5, background: '#0d1117', border: '2px solid #3d4654', cursor: 'crosshair' }}
                    onMouseDown={e => startConnect(e, node.id)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
