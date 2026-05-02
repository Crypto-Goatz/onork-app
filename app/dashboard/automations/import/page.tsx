'use client'

import { useState } from 'react'
import {
  Loader2,
  Upload,
  FileJson,
  Sparkles,
  Save,
  AlertCircle,
  CheckCircle2,
  ArrowRightLeft,
  Plus,
  Power,
  Copy,
  Check,
} from 'lucide-react'

const EXAMPLE_DOT_ON = {
  schema: '0n-workflow/v1',
  name: 'CRM Stack Scan — qualify by tech stack',
  version: '1.0.0',
  description: 'When a new lead is tagged for scanning, look up their company, scan their stack, classify business, score readiness, and tag for routing.',
  trigger: {
    type: 'trigger_tag_added',
    config: { tag_name: 'scan-me' },
  },
  steps: [
    {
      id: 'cap_1',
      action: 'ai_generate_content',
      input: {
        name: 'Gather contact data',
        category: 'crm',
        config: { contact_id: '{{trigger.contact_id}}' },
      },
      depends_on: [],
    },
    {
      id: 'cap_2',
      action: 'ai_generate_content',
      input: {
        name: 'Extract company from email',
        category: 'ai',
        config: { email: '{{step_001.email}}' },
      },
      depends_on: ['cap_1'],
    },
    {
      id: 'cap_3',
      action: 'ai_generate_content',
      input: {
        name: 'Tech stack scan',
        category: 'ai',
        config: { domain: '{{step_002.domain}}' },
      },
      depends_on: ['cap_2'],
    },
    {
      id: 'cap_4',
      action: 'ai_generate_content',
      input: {
        name: 'AI readiness scan',
        category: 'ai',
        config: { domain: '{{step_002.domain}}' },
      },
      depends_on: ['cap_2'],
    },
    {
      id: 'cap_5',
      action: 'ai_generate_content',
      input: {
        name: 'Update contact with results',
        category: 'crm',
        config: {
          contact_id: '{{trigger.contact_id}}',
          custom_fields: {
            company_domain: '{{step_002.domain}}',
            tech_stack_score: '{{step_003.score}}',
            ai_readiness_score: '{{step_004.score}}',
          },
        },
      },
      depends_on: ['cap_3', 'cap_4'],
    },
    {
      id: 'cap_6',
      action: 'ai_generate_content',
      input: {
        name: 'Append to leaderboard sheet',
        category: 'integration',
        config: { spreadsheet_id: 'TBD', tab: 'qualified-leads' },
      },
      depends_on: ['cap_5'],
    },
  ],
}

interface ResolvedStep {
  id: string
  action: string
  input?: { name?: string; category?: string; config?: Record<string, unknown> }
  config?: Record<string, unknown>
  depends_on?: string[]
  remapped?: boolean
  unmappable?: boolean
}

interface CreatedResource {
  type: 'tag' | 'custom_field'
  name: string
  id: string
}

interface ResolvedWorkflow {
  schema: string
  name: string
  description?: string
  trigger: { type: string; config: Record<string, unknown> }
  steps: ResolvedStep[]
  created: CreatedResource[]
  swap_notes: string[]
  available?: Record<string, boolean>
}

interface ImportQuestion {
  key: string
  question: string
  step_id?: string
  type: 'select' | 'text' | 'boolean'
  options?: { value: string; label: string }[]
  suggested?: string
}

interface ApiResponse {
  ok: boolean
  preview?: boolean
  saved?: boolean
  workflow?: ResolvedWorkflow
  workflow_id?: string
  status?: string
  needs_input?: boolean
  questions?: ImportQuestion[]
  errors?: string[]
  error?: string
  edit_url?: string
  toggle_url?: string
  created?: CreatedResource[]
  swap_notes?: string[]
}

export default function AutomationImportPage() {
  const [raw, setRaw] = useState(JSON.stringify(EXAMPLE_DOT_ON, null, 2))
  const [busy, setBusy] = useState<'idle' | 'preview' | 'save'>('idle')
  const [result, setResult] = useState<ApiResponse | null>(null)
  const [copied, setCopied] = useState(false)

  function loadExample() {
    setRaw(JSON.stringify(EXAMPLE_DOT_ON, null, 2))
    setResult(null)
  }

  function copyJson() {
    if (!result?.workflow) return
    navigator.clipboard.writeText(JSON.stringify(result.workflow, null, 2)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function call(save: boolean) {
    setBusy(save ? 'save' : 'preview')
    setResult(null)
    try {
      let body: { dot_on: unknown; save: boolean; activate: boolean }
      try {
        body = { dot_on: JSON.parse(raw), save, activate: false }
      } catch {
        setResult({ ok: false, error: 'Invalid JSON in editor' })
        setBusy('idle')
        return
      }

      const res = await fetch('/api/automations/import-dot-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data: ApiResponse = await res.json()
      setResult(data)
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setBusy('idle')
    }
  }

  const w = result?.workflow

  return (
    <div className="min-h-screen bg-core-bg text-core-text px-6 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-core-green" />
              Import .0n
            </h1>
            <p className="text-sm text-core-text-dim mt-1 max-w-2xl">
              Paste a .0n workflow file. The resolver will normalize step ids, rewrite variable
              refs, map generic stubs to real actions, swap unsupported integrations for
              CRM-native equivalents, and pre-resolve every tag / custom field. CRM is one
              capability — never the boss.
            </p>
          </div>
          <button
            onClick={loadExample}
            className="shrink-0 flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-core-border bg-core-surface hover:bg-core-surface/80 transition-colors"
          >
            <FileJson className="w-4 h-4" />
            Load CRM Stack Scan example
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Input editor ─────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-core-text-dim uppercase tracking-wider">
                Source .0n
              </h2>
              <span className="text-xs text-core-text-muted font-mono">
                {raw.split('\n').length} lines · {raw.length} chars
              </span>
            </div>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              spellCheck={false}
              className="w-full h-[600px] p-4 rounded-lg border border-core-border bg-core-surface font-mono text-xs leading-relaxed text-core-text-dim resize-none focus:outline-none focus:border-core-green/50 focus:ring-1 focus:ring-core-green/30"
              placeholder='{"schema": "0n-workflow/v1", "name": "...", "trigger": {...}, "steps": [...]}'
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => call(false)}
                disabled={busy !== 'idle' || !raw.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-core-cyan text-core-bg font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {busy === 'preview' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Resolve preview
              </button>
              <button
                onClick={() => call(true)}
                disabled={busy !== 'idle' || !raw.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-core-green text-core-bg font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {busy === 'save' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save (paused)
              </button>
              <span className="text-xs text-core-text-muted ml-auto">
                Save = persist to <code className="font-mono">user_workflows</code> · paused until toggled
              </span>
            </div>
          </div>

          {/* ── Result panel ─────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-core-text-dim uppercase tracking-wider">
                Resolver output
              </h2>
              {w && (
                <button
                  onClick={copyJson}
                  className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-md border border-core-border bg-core-surface hover:bg-core-surface/80 transition-colors"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-core-green" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copied ? 'Copied' : 'Copy resolved JSON'}
                </button>
              )}
            </div>

            {/* idle */}
            {!result && (
              <div className="h-[600px] rounded-lg border border-dashed border-core-border bg-core-surface/30 flex items-center justify-center text-sm text-core-text-muted">
                Hit <span className="font-mono mx-1 text-core-cyan">Resolve preview</span> to see the output
              </div>
            )}

            {/* error */}
            {result?.error && !result.questions && (
              <div className="rounded-lg border border-core-red/40 bg-core-red/5 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-core-red shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-core-red text-sm">Resolver error</p>
                  <p className="text-xs text-core-text-dim mt-1 font-mono">{result.error}</p>
                  {result.errors?.length ? (
                    <ul className="text-xs text-core-text-dim mt-2 space-y-1 list-disc list-inside">
                      {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  ) : null}
                </div>
              </div>
            )}

            {/* questions */}
            {result?.needs_input && result.questions?.length ? (
              <div className="rounded-lg border border-core-amber/40 bg-core-amber/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-core-amber" />
                  <p className="font-semibold text-core-amber text-sm">
                    {result.questions.length} clarifying question{result.questions.length === 1 ? '' : 's'}
                  </p>
                </div>
                {result.questions.map((q) => (
                  <div key={q.key} className="text-sm">
                    <p className="text-core-text">{q.question}</p>
                    {q.options?.length ? (
                      <ul className="mt-1 ml-4 text-xs text-core-text-dim list-disc">
                        {q.options.map((o) => <li key={o.value}>{o.label}</li>)}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {/* saved confirmation */}
            {result?.saved && result.workflow_id && (
              <div className="rounded-lg border border-core-green/40 bg-core-green/5 p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-core-green shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-core-green text-sm">Saved (paused)</p>
                  <p className="text-xs text-core-text-dim mt-1 font-mono break-all">
                    workflow_id: {result.workflow_id}
                  </p>
                  <div className="flex gap-2 mt-3">
                    {result.edit_url && (
                      <a
                        href={result.edit_url}
                        className="text-xs px-3 py-1.5 rounded-md bg-core-surface border border-core-border hover:bg-core-surface/80 transition-colors"
                      >
                        Open in builder
                      </a>
                    )}
                    {result.toggle_url && (
                      <button
                        onClick={async () => {
                          await fetch(result.toggle_url!, { method: 'POST' })
                          alert('Toggled — refresh /dashboard/automations to see status')
                        }}
                        className="text-xs px-3 py-1.5 rounded-md bg-core-green text-core-bg font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                      >
                        <Power className="w-3 h-3" />
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* workflow preview */}
            {w && (
              <div className="rounded-lg border border-core-border bg-core-surface overflow-hidden">
                {/* trigger */}
                <div className="px-4 py-3 border-b border-core-border">
                  <p className="text-xs uppercase tracking-wider text-core-text-muted">Trigger</p>
                  <p className="text-sm font-mono text-core-cyan mt-0.5">{w.trigger.type}</p>
                  {Object.keys(w.trigger.config).length > 0 && (
                    <pre className="text-[11px] text-core-text-dim mt-1 font-mono">
                      {JSON.stringify(w.trigger.config, null, 2)}
                    </pre>
                  )}
                </div>

                {/* steps */}
                <div className="px-4 py-3 border-b border-core-border">
                  <p className="text-xs uppercase tracking-wider text-core-text-muted mb-2">
                    Steps · {w.steps.length}
                  </p>
                  <ol className="space-y-2">
                    {w.steps.map((s, i) => (
                      <li key={s.id} className="flex items-start gap-3 text-sm">
                        <span className="shrink-0 w-6 h-6 rounded-md bg-core-bg border border-core-border flex items-center justify-center text-[11px] font-mono text-core-text-muted">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-core-green text-xs">{s.action}</span>
                            {s.remapped && (
                              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-core-cyan/10 text-core-cyan border border-core-cyan/30">
                                remapped
                              </span>
                            )}
                            {s.unmappable && (
                              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-core-red/10 text-core-red border border-core-red/30">
                                unmappable
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-core-text-dim font-mono">id: {s.id}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* swap notes */}
                {w.swap_notes.length > 0 && (
                  <div className="px-4 py-3 border-b border-core-border bg-core-cyan/5">
                    <p className="text-xs uppercase tracking-wider text-core-cyan mb-2 flex items-center gap-1.5">
                      <ArrowRightLeft className="w-3 h-3" />
                      Integration swaps · {w.swap_notes.length}
                    </p>
                    <ul className="space-y-1">
                      {w.swap_notes.map((n, i) => (
                        <li key={i} className="text-xs text-core-text font-mono">{n}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* created resources */}
                {w.created.length > 0 && (
                  <div className="px-4 py-3 bg-core-green/5">
                    <p className="text-xs uppercase tracking-wider text-core-green mb-2 flex items-center gap-1.5">
                      <Plus className="w-3 h-3" />
                      Created during resolve · {w.created.length}
                    </p>
                    <ul className="space-y-1">
                      {w.created.map((r, i) => (
                        <li key={i} className="text-xs font-mono text-core-text">
                          <span className="text-core-text-muted">{r.type}</span>{' '}
                          <span className="text-core-green">{r.name}</span>{' '}
                          <span className="text-core-text-muted">→ {r.id}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
