'use client'

/**
 * Canvas shell — the white-themed visual workspace, powered by React Flow
 * (@xyflow/react, MIT licensed). Same architecture as before:
 *
 *   [ Block library left rail ]  [ React Flow canvas ]  [ Jaxx chat right rail ]
 *
 * Drag from library or click → places a block. Jaxx generates blocks +
 * edges, materializes them on the canvas with green animated arrows.
 * Autosaves nodes/edges/viewport to /api/canvas/flows on every change.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, BackgroundVariant,
  addEdge, applyNodeChanges, applyEdgeChanges, useReactFlow,
  type OnNodesChange, type OnEdgesChange, type OnConnect, type Edge,
  type Connection, type Viewport,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toast } from 'sonner'
import {
  Database, Mail, MessageSquareText, Filter as FilterIcon, BarChart3,
  Sparkles, Send, Loader2, Save, Plus, Workflow, Type as TypeIcon,
  Calendar, Receipt, ShoppingBag, Search,
} from 'lucide-react'
import BlockNode, { type BlockNodeType, type BlockData } from './BlockNode'

interface BlockDef {
  type: string
  label: string
  hint: string
  icon: React.ComponentType<{ className?: string }>
  category: 'data' | 'action' | 'ai' | 'logic' | 'display'
}

const BLOCKS: BlockDef[] = [
  { type: 'contacts',       label: 'Contacts',     hint: 'Live CRM contacts',    icon: Database,         category: 'data'    },
  { type: 'pipeline',       label: 'Pipeline',     hint: 'Deal stages',          icon: Workflow,         category: 'data'    },
  { type: 'calendar',       label: 'Calendar',     hint: 'Appointments',         icon: Calendar,         category: 'data'    },
  { type: 'invoices',       label: 'Invoices',     hint: 'Billing list',         icon: Receipt,          category: 'data'    },
  { type: 'send_email',     label: 'Send Email',   hint: 'Email a list',         icon: Mail,             category: 'action'  },
  { type: 'post_linkedin',  label: 'LinkedIn',     hint: 'Post to LinkedIn',     icon: ShoppingBag,      category: 'action'  },
  { type: 'ai_compose',     label: 'AI Compose',   hint: 'Generate content',     icon: Sparkles,         category: 'ai'      },
  { type: 'ai_summarize',   label: 'Summarize',    hint: 'Distill input',        icon: MessageSquareText,category: 'ai'      },
  { type: 'filter',         label: 'Filter',       hint: 'Filter by criteria',   icon: FilterIcon,       category: 'logic'   },
  { type: 'stat_card',      label: 'Stat',         hint: 'Show a number',        icon: BarChart3,        category: 'display' },
  { type: 'note',           label: 'Note',         hint: 'Plain text note',      icon: TypeIcon,         category: 'display' },
]

const CATEGORY_LABELS: Record<BlockDef['category'], string> = {
  data: 'Data', action: 'Actions', ai: 'AI', logic: 'Logic', display: 'Display',
}

interface ChatMessage {
  role: 'user' | 'jaxx'
  text: string
  flow?: { blocks: Array<{ type: string; label: string; x: number; y: number }> }
}

const NODE_TYPES = { block: BlockNode }

export default function CanvasShell({
  flowId,
  initialName,
  initialNodes,
  initialEdges,
}: {
  flowId: string
  initialName: string
  initialNodes: BlockNodeType[]
  initialEdges: Edge[]
}) {
  return (
    <ReactFlowProvider>
      <Inner flowId={flowId} initialName={initialName} initialNodes={initialNodes} initialEdges={initialEdges} />
    </ReactFlowProvider>
  )
}

function Inner({
  flowId,
  initialName,
  initialNodes,
  initialEdges,
}: {
  flowId: string
  initialName: string
  initialNodes: BlockNodeType[]
  initialEdges: Edge[]
}) {
  const { screenToFlowPosition } = useReactFlow()

  const [nodes, setNodes] = useState<BlockNodeType[]>(initialNodes)
  const [edges, setEdges] = useState<Edge[]>(initialEdges)
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [chatOpen, setChatOpen] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'jaxx', text: 'Drop blocks from the left, or just tell me what you want to build.' },
  ])
  const [chatInput, setChatInput] = useState('')
  const [thinking, setThinking] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const counterRef = useRef(initialNodes.length)

  // ── Autosave ────────────────────────────────────────────────────
  const scheduleSave = useCallback((nextNodes?: BlockNodeType[], nextEdges?: Edge[], nextName?: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        await fetch(`/api/canvas/flows?id=${flowId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blocks: nextNodes ?? nodes,
            edges:  nextEdges ?? edges,
            name:   nextName ?? name,
          }),
        })
      } catch {
        // silent — autosave shouldn't toast on every blip
      } finally {
        setSaving(false)
      }
    }, 800)
  }, [flowId, nodes, edges, name])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  // ── React Flow change handlers ──────────────────────────────────
  const onNodesChange: OnNodesChange<BlockNodeType> = useCallback((changes) => {
    setNodes((cur) => {
      const next = applyNodeChanges(changes, cur) as BlockNodeType[]
      scheduleSave(next, undefined, undefined)
      return next
    })
  }, [scheduleSave])

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges((cur) => {
      const next = applyEdgeChanges(changes, cur)
      scheduleSave(undefined, next, undefined)
      return next
    })
  }, [scheduleSave])

  const onConnect: OnConnect = useCallback((conn: Connection) => {
    setEdges((cur) => {
      const next = addEdge({ ...conn, animated: true, style: { stroke: '#10b981', strokeWidth: 2 } }, cur)
      scheduleSave(undefined, next, undefined)
      return next
    })
  }, [scheduleSave])

  // ── Place a block at a given canvas-flow position ───────────────
  function placeBlock(b: BlockDef, position: { x: number; y: number }) {
    counterRef.current += 1
    const node: BlockNodeType = {
      id: `n${counterRef.current}_${Date.now()}`,
      type: 'block',
      position,
      data: { type: b.type, label: b.label, hint: b.hint } as BlockData,
    }
    setNodes((cur) => {
      const next = [...cur, node]
      scheduleSave(next, undefined, undefined)
      return next
    })
  }

  // Click-to-drop falls back to a center-ish viewport position
  function dropBlock(b: BlockDef) {
    placeBlock(b, { x: 200 + (Math.random() - 0.5) * 80, y: 200 + (Math.random() - 0.5) * 80 })
  }

  // ── HTML5 drag from library, drop on canvas ────────────────────
  function handleDragStart(b: BlockDef, e: DragEvent<HTMLButtonElement>) {
    e.dataTransfer.setData('application/x-0n-block', b.type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  function handleCanvasDragOver(e: DragEvent<HTMLDivElement>) {
    if (e.dataTransfer.types.includes('application/x-0n-block')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  function handleCanvasDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const blockType = e.dataTransfer.getData('application/x-0n-block')
    const block = BLOCKS.find((x) => x.type === blockType)
    if (!block) return
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    placeBlock(block, position)
  }

  // ── Jaxx chat → builds blocks + edges on the canvas ────────────
  async function sendChat() {
    const text = chatInput.trim()
    if (!text || thinking) return
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', text }])
    setThinking(true)

    try {
      const r = await fetch('/api/canvas/ai-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error || 'thinking failed')

      const planBlocks = (data.flow?.blocks as Array<{ id: string; type: string; label: string; x: number; y: number }>) ?? []
      const planEdges  = (data.flow?.edges  as Array<{ id: string; source: string; target: string }>) ?? []

      setChatMessages((prev) => [
        ...prev,
        { role: 'jaxx', text: data.message ?? 'Here you go.', flow: { blocks: planBlocks } },
      ])

      // Materialize: convert plan ids → real React Flow node ids
      if (planBlocks.length === 0) return
      const idMap: Record<string, string> = {}
      const newNodes: BlockNodeType[] = planBlocks.map((b, i) => {
        counterRef.current += 1
        const realId = `n${counterRef.current}_${Date.now()}_${i}`
        idMap[b.id] = realId
        const def = BLOCKS.find((x) => x.type === b.type)
        return {
          id: realId,
          type: 'block',
          position: { x: b.x ?? 200, y: b.y ?? 240 },
          data: {
            type: b.type,
            label: b.label,
            hint: def?.hint,
          } as BlockData,
        }
      })
      const newEdges: Edge[] = planEdges
        .filter((e) => idMap[e.source] && idMap[e.target])
        .map((e, i) => ({
          id: `e${counterRef.current}_${Date.now()}_${i}`,
          source: idMap[e.source],
          target: idMap[e.target],
          animated: true,
          style: { stroke: '#10b981', strokeWidth: 2 },
        }))

      setNodes((cur) => {
        const next = [...cur, ...newNodes]
        setEdges((curEdges) => {
          const nextEdges = [...curEdges, ...newEdges]
          scheduleSave(next, nextEdges, undefined)
          return nextEdges
        })
        return next
      })
    } catch (e) {
      setChatMessages((prev) => [...prev, { role: 'jaxx', text: e instanceof Error ? e.message : 'Something went wrong.' }])
    } finally {
      setThinking(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !thinking) {
      e.preventDefault()
      void sendChat()
    }
  }

  function onMoveEnd(_e: unknown, viewport: Viewport) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/canvas/flows?id=${flowId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ viewport }),
        })
      } catch { /* silent */ }
    }, 800)
  }

  const filteredBlocks = search
    ? BLOCKS.filter((b) => `${b.label} ${b.hint}`.toLowerCase().includes(search.toLowerCase()))
    : BLOCKS

  const grouped = useMemo(() => filteredBlocks.reduce<Record<string, BlockDef[]>>((acc, b) => {
    (acc[b.category] ||= []).push(b)
    return acc
  }, {}), [filteredBlocks])

  return (
    <div className="flex h-full w-full bg-white">
      {/* Left rail — block library */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50/60">
        <div className="border-b border-slate-200 p-3">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500 text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.45)]">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 text-sm font-semibold text-slate-900">0n Canvas</div>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search blocks…"
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-xs text-slate-700 placeholder-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {(['data', 'action', 'ai', 'logic', 'display'] as const).map((cat) => {
            const items = grouped[cat]
            if (!items?.length) return null
            return (
              <div key={cat} className="mb-4">
                <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {CATEGORY_LABELS[cat]}
                </div>
                <div className="space-y-1">
                  {items.map((b) => (
                    <button
                      key={b.type}
                      draggable
                      onDragStart={(e) => handleDragStart(b, e)}
                      onClick={() => dropBlock(b)}
                      className="group flex w-full cursor-grab items-center gap-2.5 rounded-lg border border-transparent bg-white px-2.5 py-2 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-px hover:border-slate-200 hover:shadow-[0_4px_14px_-4px_rgba(0,0,0,0.10)] active:cursor-grabbing"
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600 transition group-hover:bg-emerald-50 group-hover:text-emerald-700">
                        <b.icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-slate-800">{b.label}</span>
                        <span className="block truncate text-[10px] text-slate-500">{b.hint}</span>
                      </span>
                      <Plus className="h-3 w-3 shrink-0 text-slate-300 transition group-hover:text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </aside>

      {/* Center — canvas + top bar */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4">
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); scheduleSave(undefined, undefined, e.target.value) }}
            className="bg-transparent text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
            placeholder="Untitled canvas"
          />
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
              {saving ? <><Loader2 className="h-3 w-3 animate-spin" /> Saving</> : <><Save className="h-3 w-3" /> Saved</>}
            </span>
            <button
              onClick={() => setChatOpen((o) => !o)}
              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-slate-300 hover:bg-slate-50"
            >
              {chatOpen ? 'Hide Jaxx' : 'Show Jaxx'}
            </button>
          </div>
        </header>

        <div
          className="relative flex-1 bg-slate-50/40"
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onMoveEnd={onMoveEnd}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            defaultEdgeOptions={{ animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } }}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#e2e8f0" />
            <Controls
              showInteractive={false}
              className="!rounded-lg !border-slate-200 !bg-white !shadow-[0_4px_14px_-4px_rgba(0,0,0,0.10)]"
            />
            <MiniMap
              nodeColor="#cbd5e1"
              maskColor="rgba(241, 245, 249, 0.7)"
              className="!rounded-lg !border !border-slate-200 !bg-white !shadow-[0_4px_14px_-4px_rgba(0,0,0,0.10)]"
            />
          </ReactFlow>
        </div>
      </div>

      {/* Right rail — Jaxx chat */}
      {chatOpen && (
        <aside className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-slate-50/60">
          <div className="border-b border-slate-200 p-3">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-slate-900 text-white shadow-[0_4px_12px_-4px_rgba(0,0,0,0.4)]">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Jaxx</div>
                <div className="text-[10px] text-slate-500">Builds your canvas from words.</div>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'ml-auto bg-slate-900 text-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.20)]'
                    : 'bg-white text-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.10)]'
                }`}
              >
                {m.text}
                {m.flow && m.flow.blocks.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.flow.blocks.map((b, j) => (
                      <span key={j} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                        {b.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {thinking && (
              <div className="flex max-w-[85%] items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs text-slate-500 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <Loader2 className="h-3 w-3 animate-spin" /> Jaxx is thinking…
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-3">
            <div className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03),0_8px_24px_-12px_rgba(0,0,0,0.06)]">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={2}
                placeholder="Tell Jaxx what to build…"
                className="w-full resize-none rounded-xl bg-transparent px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
              />
              <div className="flex items-center justify-between border-t border-slate-100 px-2 py-1.5">
                <div className="text-[10px] text-slate-400">Enter ↵ to send</div>
                <button
                  onClick={() => void sendChat()}
                  disabled={thinking || !chatInput.trim()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_4px_12px_-4px_rgba(0,0,0,0.30)] transition hover:bg-slate-800 disabled:opacity-40"
                >
                  <Send className="h-3 w-3" /> Send
                </button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {[
                'Email VIP contacts the welcome template',
                'Build a course about lead generation',
                'Score my latest LinkedIn post',
                'Show contacts cold for 30+ days',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setChatInput(q)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-left text-[10px] text-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-slate-300 hover:text-slate-900"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}
