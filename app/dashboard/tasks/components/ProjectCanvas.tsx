'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ArrowLeft, Minus, Plus, Copy, Trash2 } from 'lucide-react'
import type { Project, CanvasNode, CanvasLink } from '../types'

const uid = () => Math.random().toString(36).substr(2, 9)

const NODE_DEFS: Record<string, { label: string; color: string }> = {
  task: { label: 'Task', color: '#3b82f6' },
  note: { label: 'Note', color: '#fbbf24' },
  milestone: { label: 'Milestone', color: '#a855f7' },
  trigger: { label: 'Trigger', color: '#f59e0b' },
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
    <div className="h-full flex flex-col bg-core-bg text-core-text overflow-hidden">
      {/* Toolbar */}
      <div className="h-[52px] border-b border-core-border flex items-center justify-between px-4 bg-core-surface shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 bg-transparent border-none text-core-green cursor-pointer text-[14px] font-semibold hover:opacity-80 transition-opacity"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="w-px h-6 bg-core-border" />
          <h2 className="m-0 text-[14px] font-bold text-core-text">{project.title}</h2>
          <span className="text-[10px] text-core-text-muted font-mono">Canvas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-core-bg rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}
              className="px-2 py-1 bg-transparent border-none text-core-text-muted cursor-pointer text-[12px] hover:text-core-text transition-colors"
            >
              <Minus size={12} />
            </button>
            <span className="text-[11px] font-mono px-1.5 py-1 text-core-text-muted min-w-[40px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(4, z + 0.1))}
              className="px-2 py-1 bg-transparent border-none text-core-text-muted cursor-pointer text-[12px] hover:text-core-text transition-colors"
            >
              <Plus size={12} />
            </button>
          </div>
          {selectedId && (
            <>
              <button
                onClick={duplicateNode}
                className="flex items-center gap-1 px-2.5 py-1 bg-core-green/15 text-core-green border-none rounded-md text-[11px] font-semibold cursor-pointer hover:bg-core-green/25 transition-colors"
              >
                <Copy size={11} /> Dup
              </button>
              <button
                onClick={deleteSelected}
                className="flex items-center gap-1 px-2.5 py-1 bg-core-red/15 text-core-red border-none rounded-md text-[11px] font-semibold cursor-pointer hover:bg-core-red/25 transition-colors"
              >
                <Trash2 size={11} /> Del
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-[200px] border-r border-core-border bg-core-surface p-3 overflow-y-auto shrink-0">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-core-text-muted mb-2.5">
            Components
          </div>
          {Object.entries(NODE_DEFS).map(([type, def]) => (
            <button
              key={type}
              onClick={() => addNode(type as CanvasNode['type'])}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 bg-transparent border border-transparent rounded-lg text-core-text cursor-pointer mb-1 text-left transition-all hover:bg-white/[0.04] hover:border-core-border"
            >
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-[13px] shrink-0"
                style={{ background: def.color + '22', color: def.color }}
              >
                <span className="text-[10px] font-bold">{def.label.charAt(0)}</span>
              </div>
              <div className="text-[12px] font-semibold">{def.label}</div>
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className={`flex-1 relative overflow-hidden ${panning ? 'cursor-grabbing' : 'cursor-crosshair'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Dot grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.08]"
            style={{
              backgroundImage: 'radial-gradient(#f0f4f8 1px, transparent 1px)',
              backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
              backgroundPosition: `${offset.x}px ${offset.y}px`,
            }}
          />

          {/* Transform layer */}
          <div
            className="w-full h-full"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
          >
            {/* Links SVG */}
            <svg className="absolute top-0 left-0 overflow-visible pointer-events-none w-full h-full">
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
                return <path d={bezier(x1, y1, mousePos.x, mousePos.y)} fill="none" stroke="#6EE05A" strokeWidth={2} strokeDasharray="5,5" />
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
                  className="absolute overflow-hidden cursor-grab transition-shadow"
                  style={{
                    left: node.x,
                    top: node.y,
                    width: w,
                    height: h,
                    background: '#161b22',
                    border: `2px solid ${isSelected ? '#6EE05A' : '#1e293b'}`,
                    borderRadius: 10,
                    boxShadow: isSelected ? '0 0 0 4px rgba(110,224,90,0.2)' : 'none',
                  }}
                  onMouseDown={e => handleNodeMouseDown(e, node)}
                  onDoubleClick={e => { e.stopPropagation(); setEditingId(node.id) }}
                >
                  {/* Color bar */}
                  <div
                    className="h-1"
                    style={{ background: `linear-gradient(to right, ${def.color}, ${def.color}88)` }}
                  />
                  {/* Content */}
                  <div className="px-2.5 py-2 flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded shrink-0"
                      style={{ background: def.color + '33' }}
                    />
                    {editingId === node.id ? (
                      <input
                        autoFocus
                        value={node.title}
                        onChange={e => updateTitle(node.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={e => e.key === 'Enter' && setEditingId(null)}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 bg-transparent border-none border-b border-core-green text-core-text text-[12px] font-bold outline-none p-0"
                      />
                    ) : (
                      <span className="text-[12px] font-bold text-core-text">{node.title}</span>
                    )}
                  </div>
                  <div className="px-2.5 text-[10px] text-core-text-muted font-mono">{def.label}</div>

                  {/* Ports */}
                  <div
                    className="absolute cursor-crosshair"
                    style={{
                      left: -5,
                      top: h / 2 - 5,
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      background: '#0d1117',
                      border: '2px solid #3d4654',
                    }}
                    onMouseUp={e => endConnect(e, node.id)}
                  />
                  <div
                    className="absolute cursor-crosshair"
                    style={{
                      right: -5,
                      top: h / 2 - 5,
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      background: '#0d1117',
                      border: '2px solid #3d4654',
                    }}
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
