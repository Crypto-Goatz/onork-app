'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * 0nCanvas Notes — Freeform creative workspace
 * Blank canvas with draggable blocks: text, headings, icons, boxes, dividers.
 * Click canvas to add. Drag to move. Double-click to edit. Auto-saves.
 */

interface Block {
  id: string
  type: 'text' | 'heading' | 'icon' | 'box' | 'divider' | 'note'
  x: number
  y: number
  w: number
  h: number
  content: string
  color: string
  fontSize: number
}

const COLORS = ['#7ed957', '#00d4ff', '#a78bfa', '#f59e0b', '#ef4444', '#E8EAED', '#7A8290']
const ICONS = ['/', '//', ':::', '[]', '<>', '()', '{}', '***', '---', '+++', '###', '@', '#', '$', '%', '&']

const BLOCK_TEMPLATES: { type: Block['type']; label: string; icon: string }[] = [
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'heading', label: 'Heading', icon: 'H' },
  { type: 'note', label: 'Sticky Note', icon: 'N' },
  { type: 'box', label: 'Box', icon: '[]' },
  { type: 'divider', label: 'Divider', icon: '--' },
  { type: 'icon', label: 'Icon', icon: '*' },
]

function newBlock(type: Block['type'], x: number, y: number): Block {
  const base = { id: `b${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, type, x, y, color: '#E8EAED' }
  switch (type) {
    case 'heading': return { ...base, w: 300, h: 48, content: 'Heading', fontSize: 24 }
    case 'text': return { ...base, w: 240, h: 32, content: 'Type here...', fontSize: 14 }
    case 'note': return { ...base, w: 200, h: 140, content: 'Note', color: '#f59e0b', fontSize: 13 }
    case 'box': return { ...base, w: 200, h: 120, content: '', color: '#7A8290', fontSize: 12 }
    case 'divider': return { ...base, w: 300, h: 4, content: '', color: '#2D3748', fontSize: 0 }
    case 'icon': return { ...base, w: 48, h: 48, content: '///', color: '#7ed957', fontSize: 20 }
    default: return { ...base, w: 200, h: 32, content: '', fontSize: 14 }
  }
}

export default function NotesCanvas() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [tool, setTool] = useState<Block['type']>('text')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Load
  useEffect(() => {
    fetch('/api/notes').then(r => r.json()).then(d => {
      if (d.blocks?.length) setBlocks(d.blocks)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  // Auto-save with debounce
  const save = useCallback((b: Block[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: b }),
      }).catch(() => {})
      setSaving(false)
    }, 1500)
  }, [])

  function updateBlock(id: string, patch: Partial<Block>) {
    setBlocks(prev => {
      const next = prev.map(b => b.id === id ? { ...b, ...patch } : b)
      save(next)
      return next
    })
  }

  function addBlock(x: number, y: number) {
    const b = newBlock(tool, x, y)
    setBlocks(prev => {
      const next = [...prev, b]
      save(next)
      return next
    })
    setSelected(b.id)
    if (b.type !== 'box' && b.type !== 'divider') setEditing(b.id)
  }

  function deleteBlock(id: string) {
    setBlocks(prev => {
      const next = prev.filter(b => b.id !== id)
      save(next)
      return next
    })
    setSelected(null)
    setEditing(null)
  }

  function handleCanvasClick(e: React.MouseEvent) {
    if (e.target !== canvasRef.current) return
    const rect = canvasRef.current!.getBoundingClientRect()
    addBlock(e.clientX - rect.left + canvasRef.current!.scrollLeft, e.clientY - rect.top + canvasRef.current!.scrollTop)
  }

  function handleMouseDown(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setSelected(id)
    const block = blocks.find(b => b.id === id)
    if (!block) return
    setDragging({ id, ox: e.clientX - block.x, oy: e.clientY - block.y })
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return
    const rect = canvasRef.current!.getBoundingClientRect()
    updateBlock(dragging.id, {
      x: Math.max(0, e.clientX - rect.left + canvasRef.current!.scrollLeft - dragging.ox + (canvasRef.current?.scrollLeft || 0)),
      y: Math.max(0, e.clientY - rect.top + canvasRef.current!.scrollTop - dragging.oy + (canvasRef.current?.scrollTop || 0)),
    })
  }

  function handleMouseUp() {
    setDragging(null)
  }

  const selectedBlock = blocks.find(b => b.id === selected)

  if (!loaded) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--jp-text-muted)' }}>Loading canvas...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <style>{`
        @keyframes note-pop { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .canvas-block { animation: note-pop 0.15s ease-out; }
        .canvas-block:hover { z-index: 10 !important; }
      `}</style>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
        borderBottom: '1px solid var(--jp-border, #1E293B)',
        background: 'var(--jp-surface, #111827)',
        flexWrap: 'wrap',
      }}>
        {/* Block type tools */}
        {BLOCK_TEMPLATES.map(t => (
          <button key={t.type} onClick={() => setTool(t.type)} style={{
            padding: '6px 12px', borderRadius: 6, border: 'none',
            background: tool === t.type ? 'rgba(110,224,90,0.15)' : 'transparent',
            color: tool === t.type ? '#7ed957' : 'var(--jp-text-muted, #4A5568)',
            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
          }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6875rem', opacity: 0.6 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}

        <div style={{ width: 1, height: 20, background: 'var(--jp-border)', margin: '0 4px' }} />

        {/* Color picker (for selected) */}
        {selectedBlock && (
          <>
            {COLORS.map(c => (
              <button key={c} onClick={() => updateBlock(selected!, { color: c })} style={{
                width: 18, height: 18, borderRadius: 4, background: c, border: selectedBlock.color === c ? '2px solid #fff' : '1px solid var(--jp-border)',
                cursor: 'pointer', flexShrink: 0,
              }} />
            ))}
            <div style={{ width: 1, height: 20, background: 'var(--jp-border)', margin: '0 4px' }} />
            <button onClick={() => deleteBlock(selected!)} style={{
              padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.6875rem',
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Delete
            </button>
          </>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.625rem', color: 'var(--jp-text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
            {blocks.length} blocks
          </span>
          <span style={{
            fontSize: '0.5625rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
            background: saving ? 'rgba(245,158,11,0.1)' : 'rgba(110,224,90,0.08)',
            color: saving ? '#f59e0b' : '#7ed957',
          }}>
            {saving ? 'Saving...' : 'Saved'}
          </span>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          flex: 1, position: 'relative', overflow: 'auto',
          background: '#0B0F19',
          backgroundImage: 'radial-gradient(circle, #1E293B 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          cursor: dragging ? 'grabbing' : 'crosshair',
          minHeight: 0,
        }}
      >
        {/* Hint when empty */}
        {blocks.length === 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none', color: 'var(--jp-text-muted)',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.3, fontFamily: "'JetBrains Mono', monospace" }}>0n</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Click anywhere to add a block</div>
            <div style={{ fontSize: '0.75rem', marginTop: 4, opacity: 0.5 }}>Select a tool from the toolbar above</div>
          </div>
        )}

        {/* Blocks */}
        {blocks.map(block => {
          const isSelected = selected === block.id
          const isEditing = editing === block.id

          if (block.type === 'divider') {
            return (
              <div
                key={block.id}
                className="canvas-block"
                onMouseDown={e => handleMouseDown(e, block.id)}
                style={{
                  position: 'absolute', left: block.x, top: block.y,
                  width: block.w, height: 4, borderRadius: 2,
                  background: block.color, cursor: 'grab',
                  outline: isSelected ? '2px solid #7ed957' : 'none', outlineOffset: 4,
                }}
              />
            )
          }

          if (block.type === 'box') {
            return (
              <div
                key={block.id}
                className="canvas-block"
                onMouseDown={e => handleMouseDown(e, block.id)}
                style={{
                  position: 'absolute', left: block.x, top: block.y,
                  width: block.w, height: block.h, borderRadius: 10,
                  border: `2px solid ${block.color}40`, background: `${block.color}08`,
                  cursor: 'grab',
                  outline: isSelected ? '2px solid #7ed957' : 'none', outlineOffset: 2,
                }}
              />
            )
          }

          if (block.type === 'icon') {
            return (
              <div
                key={block.id}
                className="canvas-block"
                onMouseDown={e => handleMouseDown(e, block.id)}
                onDoubleClick={() => {
                  const next = ICONS[(ICONS.indexOf(block.content) + 1) % ICONS.length]
                  updateBlock(block.id, { content: next })
                }}
                style={{
                  position: 'absolute', left: block.x, top: block.y,
                  width: block.w, height: block.h, borderRadius: 10,
                  background: `${block.color}15`, border: `1px solid ${block.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: block.color, fontSize: block.fontSize, fontWeight: 800,
                  fontFamily: "'JetBrains Mono', monospace", cursor: 'grab',
                  outline: isSelected ? '2px solid #7ed957' : 'none', outlineOffset: 2,
                }}
                title="Double-click to cycle icon"
              >
                {block.content}
              </div>
            )
          }

          if (block.type === 'note') {
            return (
              <div
                key={block.id}
                className="canvas-block"
                onMouseDown={e => { if (!isEditing) handleMouseDown(e, block.id) }}
                onDoubleClick={e => { e.stopPropagation(); setEditing(block.id) }}
                style={{
                  position: 'absolute', left: block.x, top: block.y,
                  width: block.w, minHeight: block.h, borderRadius: 4,
                  background: block.color, padding: '10px 12px',
                  cursor: isEditing ? 'text' : 'grab',
                  boxShadow: '2px 2px 8px rgba(0,0,0,0.3)',
                  outline: isSelected ? '2px solid #7ed957' : 'none', outlineOffset: 2,
                }}
              >
                {isEditing ? (
                  <textarea
                    autoFocus
                    value={block.content}
                    onChange={e => updateBlock(block.id, { content: e.target.value })}
                    onBlur={() => setEditing(null)}
                    onKeyDown={e => { if (e.key === 'Escape') setEditing(null) }}
                    style={{
                      width: '100%', minHeight: 80, background: 'transparent', border: 'none',
                      color: '#1a1a1a', fontSize: block.fontSize, fontFamily: 'inherit',
                      outline: 'none', resize: 'both', lineHeight: 1.5,
                    }}
                  />
                ) : (
                  <div style={{ color: '#1a1a1a', fontSize: block.fontSize, lineHeight: 1.5, whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                    {block.content || 'Double-click to edit'}
                  </div>
                )}
              </div>
            )
          }

          // text + heading
          return (
            <div
              key={block.id}
              className="canvas-block"
              onMouseDown={e => { if (!isEditing) handleMouseDown(e, block.id) }}
              onDoubleClick={e => { e.stopPropagation(); setEditing(block.id) }}
              style={{
                position: 'absolute', left: block.x, top: block.y,
                minWidth: 60, cursor: isEditing ? 'text' : 'grab',
                outline: isSelected ? '2px solid #7ed957' : 'none', outlineOffset: 4,
                borderRadius: 4,
              }}
            >
              {isEditing ? (
                <input
                  autoFocus
                  value={block.content}
                  onChange={e => updateBlock(block.id, { content: e.target.value })}
                  onBlur={() => setEditing(null)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(null) }}
                  style={{
                    background: 'transparent', border: 'none', padding: 0,
                    color: block.color, fontSize: block.fontSize,
                    fontWeight: block.type === 'heading' ? 800 : 400,
                    fontFamily: block.type === 'heading' ? 'inherit' : "'JetBrains Mono', monospace",
                    outline: 'none', minWidth: 100,
                    letterSpacing: block.type === 'heading' ? '-0.02em' : undefined,
                  }}
                />
              ) : (
                <div style={{
                  color: block.color, fontSize: block.fontSize,
                  fontWeight: block.type === 'heading' ? 800 : 400,
                  fontFamily: block.type === 'heading' ? 'inherit' : "'JetBrains Mono', monospace",
                  whiteSpace: 'nowrap', letterSpacing: block.type === 'heading' ? '-0.02em' : undefined,
                  userSelect: 'none',
                }}>
                  {block.content || 'Double-click'}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
