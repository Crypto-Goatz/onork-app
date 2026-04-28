'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToolForm } from '@/components/command/tool-form'
import { ResultPanel } from '@/components/command/result-panel'
import { cn } from '@/lib/utils'

interface ToolDef {
  name: string
  endpointKey: string
  service: string
  serviceName: string
  category: string
  description: string
  method: string
  path: string
  baseUrl: string
  params: Record<string, { type: string; description: string; required: boolean; in: 'path' | 'query' | 'body' }>
}

interface ExecResult {
  status: 'success' | 'error'
  statusCode: number
  durationMs: number
  result: unknown
  urlsFound: string[]
  tool: string
  service: string
  serviceName?: string
}

const METHOD_TINT: Record<string, string> = {
  GET: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  POST: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  PUT: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  PATCH: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  DELETE: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider', className)}>
      {children}
    </span>
  )
}

export default function ExecutePage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool: toolName } = use(params)
  const [tool, setTool] = useState<ToolDef | null>(null)
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<ExecResult | null>(null)
  const [lastParams, setLastParams] = useState<Record<string, unknown>>({})

  // Save-as-Switch modal
  const [showSave, setShowSave] = useState(false)
  const [switchName, setSwitchName] = useState('')
  const [switchDesc, setSwitchDesc] = useState('')
  const [switchTags, setSwitchTags] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/tools/${encodeURIComponent(toolName)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setTool(null)
        else setTool(data)
      })
      .finally(() => setLoading(false))
  }, [toolName])

  async function execute(p: Record<string, unknown>) {
    setExecuting(true)
    setResult(null)
    setLastParams(p)
    try {
      const res = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolName, params: p }),
      })
      const data = (await res.json()) as ExecResult
      setResult(data)
      if (data.status === 'success') {
        toast.success(`${toolName} ran in ${data.durationMs}ms`)
      } else {
        toast.error(`${toolName} returned ${data.statusCode}`)
      }
    } catch {
      toast.error('Execution failed')
    } finally {
      setExecuting(false)
    }
  }

  async function saveSwitch() {
    if (!switchName.trim() || !result || !tool) return
    setSaving(true)
    try {
      const spec = {
        version: '1.0',
        type: 'switch',
        name: switchName,
        description: switchDesc,
        created: new Date().toISOString(),
        tool: { name: toolName, service: tool.service, method: tool.method },
        inputs: lastParams,
        outputs: { status: result.status, statusCode: result.statusCode, durationMs: result.durationMs },
        tags: switchTags.split(',').map((t) => t.trim()).filter(Boolean),
      }

      const res = await fetch('/api/switches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: switchName,
          description: switchDesc || null,
          spec,
          tags: spec.tags,
          steps: [{ tool: toolName, params: lastParams }],
          is_multi: false,
        }),
      })
      if (res.ok) {
        toast.success('Saved as Switch')
        setShowSave(false)
        setSwitchName('')
        setSwitchDesc('')
        setSwitchTags('')
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Failed to save')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-white/40">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (!tool) {
    return (
      <div className="px-6 py-10 max-w-3xl mx-auto text-center">
        <p className="text-white/60">Tool not found: <span className="font-mono">{toolName}</span></p>
        <Link href="/dashboard/tools" className="mt-3 inline-block text-sm text-[#7ed957] hover:underline">
          ← Back to tools
        </Link>
      </div>
    )
  }

  return (
    <div className="px-6 py-5 max-w-6xl mx-auto">
      <Link
        href={`/dashboard/tools/${tool.service}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> {tool.serviceName} tools
      </Link>

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h1 className="font-mono text-2xl font-bold">{tool.name}</h1>
          <Pill className={METHOD_TINT[tool.method] ?? 'bg-white/10 text-white/70 border-white/20'}>{tool.method}</Pill>
          <span className="text-[11px] uppercase tracking-wider text-white/55">{tool.serviceName}</span>
        </div>
        <p className="text-sm text-white/55">{tool.description}</p>
        <p className="mt-1 font-mono text-xs text-white/40">{tool.path}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Form */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/70">Parameters</h2>
          <ToolForm
            toolName={tool.name}
            params={tool.params}
            method={tool.method}
            onExecute={execute}
            loading={executing}
          />
        </div>

        {/* Result */}
        <div>
          {result ? (
            <ResultPanel
              {...result}
              onSaveSwitch={() => {
                setSwitchName(`${tool.name} ${new Date().toLocaleDateString()}`)
                setShowSave(true)
              }}
            />
          ) : (
            <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.01] text-sm text-white/40">
              Run the tool to see results here.
            </div>
          )}
        </div>
      </div>

      {/* Save modal */}
      {showSave && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowSave(false)}>
          <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0d1117] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Save as Switch</h2>
              <button onClick={() => setShowSave(false)} className="rounded p-1 text-white/55 hover:bg-white/5 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/70">Name *</label>
                <Input value={switchName} onChange={(e) => setSwitchName(e.target.value)} placeholder="e.g. Daily contact sync" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/70">Description</label>
                <Input value={switchDesc} onChange={(e) => setSwitchDesc(e.target.value)} placeholder="What this Switch does" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/70">Tags (comma-separated)</label>
                <Input value={switchTags} onChange={(e) => setSwitchTags(e.target.value)} placeholder="crm, daily, automated" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSave(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveSwitch} disabled={saving || !switchName.trim()}>
                {saving ? 'Saving…' : 'Save Switch'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
