'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { Copy, Download, Upload, FileJson, Check } from 'lucide-react'
import type { Edge } from '@xyflow/react'
import type { CapabilityNodeType } from './CapabilityNode'

export interface DotOnViewProps {
  nodes: CapabilityNodeType[]
  edges: Edge[]
  automationName: string
  onImport: (nodes: CapabilityNodeType[], edges: Edge[], name: string) => void
}

// ── Build a .0n workflow document from nodes + edges ──
function buildDotOn(
  nodes: CapabilityNodeType[],
  edges: Edge[],
  name: string
): object {
  const triggers = nodes
    .filter((n) => n.data.category === 'triggers')
    .map((n) => ({
      type: n.data.capabilityId,
      config: n.data.config ?? {},
    }))

  const steps = nodes
    .filter((n) => n.data.category !== 'triggers')
    .map((n) => {
      const dependsOn = edges
        .filter((e) => e.target === n.id)
        .map((e) => e.source)

      return {
        id: n.id,
        action: n.data.capabilityId,
        input: {
          name: n.data.name,
          category: n.data.category,
          config: n.data.config ?? {},
        },
        depends_on: dependsOn,
      }
    })

  return {
    schema: '0n-workflow/v1',
    name: name || 'Untitled Automation',
    version: '1.0.0',
    description: `Automation with ${nodes.length} node${nodes.length !== 1 ? 's' : ''} — built in 0nork visual builder`,
    triggers,
    steps,
    metadata: {
      created_at: new Date().toISOString(),
      node_count: nodes.length,
      source: 'visual_builder',
    },
  }
}

// ── Parse a .0n document back into nodes + edges ──
function parseDotOn(raw: string): {
  nodes: CapabilityNodeType[]
  edges: Edge[]
  name: string
} | null {
  try {
    const doc = JSON.parse(raw)
    if (doc.schema !== '0n-workflow/v1') return null

    const nodes: CapabilityNodeType[] = []
    const edges: Edge[] = []
    let counter = 0

    // Rebuild trigger nodes
    ;(doc.triggers ?? []).forEach((t: { type: string; config: Record<string, string> }, i: number) => {
      const nodeId = `cap_${counter++}`
      nodes.push({
        id: nodeId,
        type: 'capability',
        position: { x: 100, y: 80 + i * 180 },
        data: {
          capabilityId: t.type,
          name: t.type,
          description: '',
          icon: '⚡',
          color: '#ef4444',
          category: 'triggers',
          configured: Object.keys(t.config ?? {}).length > 0,
          steps: [],
          config: t.config ?? {},
        },
      })
    })

    // Rebuild step nodes
    ;(doc.steps ?? []).forEach((s: {
      id: string
      action: string
      input: { name: string; category: string; config: Record<string, string> }
      depends_on: string[]
    }) => {
      const nodeId = s.id ?? `cap_${counter++}`
      nodes.push({
        id: nodeId,
        type: 'capability',
        position: { x: 400 + counter * 20, y: 80 + counter * 160 },
        data: {
          capabilityId: s.action,
          name: s.input?.name ?? s.action,
          description: '',
          icon: '⚡',
          color: '#14b8a6',
          category: s.input?.category ?? 'ai',
          configured: Object.keys(s.input?.config ?? {}).length > 0,
          steps: [],
          config: s.input?.config ?? {},
        },
      })
      counter++

      // Rebuild edges from depends_on
      ;(s.depends_on ?? []).forEach((srcId: string, ei: number) => {
        edges.push({
          id: `e_${srcId}_${nodeId}_${ei}`,
          source: srcId,
          target: nodeId,
          animated: true,
          style: { stroke: '#14b8a6', strokeWidth: 2 },
          type: 'smoothstep',
        })
      })
    })

    return { nodes, edges, name: doc.name ?? 'Untitled Automation' }
  } catch {
    return null
  }
}

// ── Very simple JSON syntax colouring via CSS classes (no lib needed) ──
function syntaxHighlight(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = 'text-core-cyan'
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-core-purple'
          } else {
            cls = 'text-core-green'
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-core-amber'
        } else if (/null/.test(match)) {
          cls = 'text-core-text-muted'
        }
        return `<span class="${cls}">${match}</span>`
      }
    )
}

export default function DotOnView({
  nodes,
  edges,
  automationName,
  onImport,
}: DotOnViewProps) {
  const [copied, setCopied] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [editedJson, setEditedJson] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Canonical JSON derived from nodes/edges
  const canonicalJson = useMemo(
    () => JSON.stringify(buildDotOn(nodes, edges, automationName), null, 2),
    [nodes, edges, automationName]
  )

  // Sync textarea whenever the canonical changes (unless user is editing)
  useEffect(() => {
    setEditedJson(null)
  }, [canonicalJson])

  const displayJson = editedJson ?? canonicalJson

  // ── Copy ──
  function handleCopy() {
    navigator.clipboard.writeText(displayJson).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Export .0n file ──
  function handleExport() {
    const blob = new Blob([displayJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(automationName || 'automation').replace(/\s+/g, '-').toLowerCase()}.0n`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Import .0n file via picker ──
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseDotOn(text)
      if (!parsed) {
        setImportError('Invalid .0n file — must be schema "0n-workflow/v1"')
        return
      }
      onImport(parsed.nodes, parsed.edges, parsed.name)
      setEditedJson(null)
    }
    reader.readAsText(file)
    // Reset so same file can be re-imported
    e.target.value = ''
  }

  // ── Apply manual edits from textarea ──
  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setEditedJson(e.target.value)
    setImportError(null)
  }

  // ── Apply edited JSON into canvas ──
  function handleApplyEdits() {
    if (!editedJson) return
    const parsed = parseDotOn(editedJson)
    if (!parsed) {
      setImportError('JSON is not valid .0n — check schema and try again')
      return
    }
    onImport(parsed.nodes, parsed.edges, parsed.name)
    setEditedJson(null)
  }

  const lineCount = displayJson.split('\n').length

  return (
    <div className="flex flex-col h-full bg-core-bg">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-core-border bg-core-surface shrink-0">
        <FileJson size={16} className="text-core-cyan shrink-0" />
        <span className="text-xs font-semibold text-core-text-dim uppercase tracking-wider">
          .0n Document
        </span>
        <span className="text-[11px] text-core-text-muted ml-1">
          {automationName || 'Untitled Automation'}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Apply manual edits */}
          {editedJson && editedJson !== canonicalJson && (
            <button
              onClick={handleApplyEdits}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-core-cyan text-core-bg hover:opacity-90 transition-opacity"
            >
              Apply edits
            </button>
          )}

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border border-core-border bg-core-card hover:bg-core-card-hover text-core-text-dim transition-colors"
          >
            {copied ? (
              <Check size={13} className="text-core-green" />
            ) : (
              <Copy size={13} />
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border border-core-border bg-core-card hover:bg-core-card-hover text-core-text-dim transition-colors"
          >
            <Download size={13} />
            Export .0n
          </button>

          {/* Import */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border border-core-border bg-core-card hover:bg-core-card-hover text-core-text-dim transition-colors"
          >
            <Upload size={13} />
            Import .0n
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".0n,.json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* ── Error banner ── */}
      {importError && (
        <div className="px-4 py-2 text-xs text-core-red bg-[#ef444415] border-b border-[#ef444430] shrink-0">
          {importError}
        </div>
      )}

      {/* ── Editor area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Line numbers */}
        <div
          className="select-none text-right pr-3 pt-4 text-[12px] leading-[1.6] font-mono text-core-text-muted bg-core-surface border-r border-core-border overflow-hidden shrink-0"
          style={{ width: '3.5rem' }}
          aria-hidden
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1}>{i + 1}</div>
          ))}
        </div>

        {/* Editable textarea — overlaid on top of highlight layer */}
        <div className="relative flex-1 overflow-auto">
          {/* Syntax-highlighted background (read-only visual) */}
          <pre
            className="absolute inset-0 p-4 text-[12px] leading-[1.6] font-mono whitespace-pre pointer-events-none overflow-hidden text-core-text-muted"
            aria-hidden
            dangerouslySetInnerHTML={{ __html: syntaxHighlight(displayJson) }}
          />

          {/* Actual editable textarea — transparent text so the highlight shows through */}
          <textarea
            ref={textareaRef}
            value={displayJson}
            onChange={handleTextareaChange}
            spellCheck={false}
            className="absolute inset-0 w-full h-full p-4 text-[12px] leading-[1.6] font-mono resize-none bg-transparent text-transparent caret-core-cyan outline-none selection:bg-core-cyan/20"
            style={{ caretColor: '#14b8a6' }}
          />
        </div>
      </div>

      {/* ── Footer stats ── */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-core-border bg-core-surface shrink-0">
        <span className="text-[11px] text-core-text-muted">
          {nodes.length} node{nodes.length !== 1 ? 's' : ''}
        </span>
        <span className="text-[11px] text-core-text-muted">
          {edges.length} connection{edges.length !== 1 ? 's' : ''}
        </span>
        <span className="text-[11px] text-core-text-muted">
          {lineCount} lines
        </span>
        <span className="ml-auto text-[11px] text-core-text-muted font-mono">
          0n-workflow/v1
        </span>
      </div>
    </div>
  )
}
