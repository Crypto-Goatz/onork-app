'use client'

/**
 * Canvas shell — the white-themed visual workspace.
 *
 * Layout:
 *   [ Block library left rail ]  [ Tldraw canvas ]  [ Jaxx chat right rail ]
 *
 * Tldraw owns pan/zoom/select/keyboard. Custom shapes carry block data.
 * Chat panel lets Jaxx materialize blocks on the canvas from natural language.
 *
 * Every state change autosaves to /api/canvas/flows via PATCH.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import {
  Database, Mail, MessageSquareText, Filter as FilterIcon, BarChart3,
  Sparkles, Send, Loader2, Save, Plus, Workflow, Type as TypeIcon,
  Calendar, Receipt, ShoppingBag, Search,
} from 'lucide-react'
import 'tldraw/tldraw.css'
import type { Editor, TLShapeId } from 'tldraw'

const Tldraw = dynamic(
  () => import('tldraw').then((m) => m.Tldraw),
  { ssr: false, loading: () => <div className="flex h-full w-full items-center justify-center bg-slate-50"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div> }
)

interface BlockDef {
  type: string
  label: string
  hint: string
  icon: React.ComponentType<{ className?: string }>
  category: 'data' | 'action' | 'ai' | 'logic' | 'display'
}

const BLOCKS: BlockDef[] = [
  { type: 'contacts',    label: 'Contacts',    hint: 'Live CRM contacts',    icon: Database,         category: 'data'    },
  { type: 'pipeline',    label: 'Pipeline',    hint: 'Deal stages',          icon: Workflow,         category: 'data'    },
  { type: 'calendar',    label: 'Calendar',    hint: 'Appointments',         icon: Calendar,         category: 'data'    },
  { type: 'invoices',    label: 'Invoices',    hint: 'Billing list',         icon: Receipt,          category: 'data'    },
  { type: 'send_email',  label: 'Send Email',  hint: 'Email a list',         icon: Mail,             category: 'action'  },
  { type: 'post_linkedin', label: 'LinkedIn',  hint: 'Post to LinkedIn',     icon: ShoppingBag,      category: 'action'  },
  { type: 'ai_compose',  label: 'AI Compose',  hint: 'Generate content',     icon: Sparkles,         category: 'ai'      },
  { type: 'ai_summarize',label: 'Summarize',   hint: 'Distill input',        icon: MessageSquareText,category: 'ai'      },
  { type: 'filter',      label: 'Filter',      hint: 'Filter by criteria',   icon: FilterIcon,       category: 'logic'   },
  { type: 'stat_card',   label: 'Stat',        hint: 'Show a number',        icon: BarChart3,        category: 'display' },
  { type: 'note',        label: 'Note',        hint: 'Plain text note',      icon: TypeIcon,         category: 'display' },
]

const CATEGORY_LABELS: Record<BlockDef['category'], string> = {
  data: 'Data',
  action: 'Actions',
  ai: 'AI',
  logic: 'Logic',
  display: 'Display',
}

interface ChatMessage {
  role: 'user' | 'jaxx'
  text: string
  flow?: { blocks: Array<{ type: string; label: string; x: number; y: number }> }
}

export default function CanvasShell({ flowId, initialName }: { flowId: string; initialName: string }) {
  const editorRef = useRef<Editor | null>(null)
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

  const onMount = useCallback((editor: Editor) => {
    editorRef.current = editor
    editor.user.updateUserPreferences({ colorScheme: 'light' })
  }, [])

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const editor = editorRef.current
      if (!editor) return
      setSaving(true)
      try {
        const snapshot = editor.getSnapshot()
        await fetch(`/api/canvas/flows?id=${flowId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blocks: snapshot.document?.store ?? {},
            viewport: editor.getViewportPageBounds().toJson(),
            name,
          }),
        })
      } catch {
        // silent — autosave shouldn't toast on every blip
      } finally {
        setSaving(false)
      }
    }, 800)
  }, [flowId, name])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  // ── Place a block at a specific page-coordinate point ───────────
  function placeBlockAt(b: BlockDef, page: { x: number; y: number }) {
    const editor = editorRef.current
    if (!editor) return
    editor.createShape({
      type: 'note',
      x: page.x - 100,
      y: page.y - 100,
      props: {
        richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: `${b.label}\n${b.hint}` }] }] },
        size: 's',
        font: 'sans',
        color: 'light-blue',
      },
    } as Parameters<Editor['createShape']>[0])
    scheduleSave()
  }

  // Click-to-drop falls back to viewport center
  function dropBlock(b: BlockDef) {
    const editor = editorRef.current
    if (!editor) return
    const bounds = editor.getViewportPageBounds()
    placeBlockAt(b, {
      x: bounds.x + bounds.w / 2,
      y: bounds.y + bounds.h / 2 + (Math.random() - 0.5) * 80,
    })
  }

  // ── HTML5 drag from the library, drop onto the canvas ──────────
  const canvasContainerRef = useRef<HTMLDivElement | null>(null)
  function handleDragStart(b: BlockDef, e: React.DragEvent) {
    e.dataTransfer.setData('application/x-0n-block', b.type)
    e.dataTransfer.effectAllowed = 'copy'
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const editor = editorRef.current
    if (!editor) return
    const blockType = e.dataTransfer.getData('application/x-0n-block')
    const block = BLOCKS.find((x) => x.type === blockType)
    if (!block) return
    // Convert client coords (relative to viewport) to tldraw page coords
    const rect = canvasContainerRef.current?.getBoundingClientRect()
    if (!rect) return
    const page = editor.screenToPage({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    placeBlockAt(block, page)
  }
  function handleDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes('application/x-0n-block')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }

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

      const blocks = (data.flow?.blocks as Array<{ type: string; label: string; x: number; y: number }>) ?? []
      setChatMessages((prev) => [
        ...prev,
        { role: 'jaxx', text: data.message ?? 'Here you go.', flow: { blocks } },
      ])

      // Materialize on canvas
      const editor = editorRef.current
      if (editor && blocks.length) {
        const ids: TLShapeId[] = []
        for (const b of blocks) {
          const id = `shape:${crypto.randomUUID()}` as TLShapeId
          ids.push(id)
          editor.createShape({
            id,
            type: 'note',
            x: b.x ?? 200,
            y: b.y ?? 200,
            props: {
              richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: b.label }] }] },
              size: 's',
              font: 'sans',
              color: 'light-blue',
            },
          } as Parameters<Editor['createShape']>[0])
        }
        scheduleSave()
      }
    } catch (e) {
      setChatMessages((prev) => [...prev, { role: 'jaxx', text: e instanceof Error ? e.message : 'Something went wrong.' }])
    } finally {
      setThinking(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendChat()
    }
  }

  const filteredBlocks = search
    ? BLOCKS.filter((b) => `${b.label} ${b.hint}`.toLowerCase().includes(search.toLowerCase()))
    : BLOCKS

  const grouped = filteredBlocks.reduce<Record<string, BlockDef[]>>((acc, b) => {
    (acc[b.category] ||= []).push(b)
    return acc
  }, {})

  return (
    <div className="flex h-full w-full bg-white">
      {/* Left rail — block library */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50/60">
        <div className="border-b border-slate-200 p-3">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--accent)] text-white shadow-[0_4px_12px_-4px_rgba(110,224,90,0.5)]">
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
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600 transition group-hover:bg-[var(--accent)]/15 group-hover:text-[var(--accent-foreground,#16803c)]">
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

      {/* Center — tldraw canvas + top bar */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4">
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); scheduleSave() }}
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
          ref={canvasContainerRef}
          className="relative flex-1"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <Tldraw onMount={onMount} hideUi={false} />
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
