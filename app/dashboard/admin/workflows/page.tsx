'use client'

import { useState } from 'react'
import {
  Linkedin,
  Users,
  FileText,
  ShieldCheck,
  Lightbulb,
  Play,
  ChevronDown,
  Copy,
  CheckCircle,
  XCircle,
} from 'lucide-react'

interface WorkflowResult {
  action: string
  status: string
  generated_at?: string
  [key: string]: unknown
}

interface WorkflowDef {
  id: string
  name: string
  description: string
  icon: React.ElementType
  colorClass: string
  iconBgClass: string
  iconBorderClass: string
  hasInput?: boolean
  inputLabel?: string
  inputPlaceholder?: string
}

const workflows: WorkflowDef[] = [
  {
    id: 'linkedin_comment_bot',
    name: 'LinkedIn Comment Bot',
    description: 'Generate AI-powered LinkedIn comments for engagement. Creates 3 variants: insightful, supportive, and curious.',
    icon: Linkedin,
    colorClass: 'text-core-cyan',
    iconBgClass: 'bg-core-cyan/10',
    iconBorderClass: 'border-core-cyan/20',
    hasInput: true,
    inputLabel: 'Post Content / Topics',
    inputPlaceholder: 'Paste a LinkedIn post or describe topics to comment on...',
  },
  {
    id: 'lead_nurture_sequence',
    name: 'Lead Nurture Sequence',
    description: 'Fetch contacts tagged for onboarding from CRM and generate personalized follow-up email sequences.',
    icon: Users,
    colorClass: 'text-core-green',
    iconBgClass: 'bg-core-green/10',
    iconBorderClass: 'border-core-green/20',
  },
  {
    id: 'content_pipeline',
    name: 'Content Pipeline',
    description: 'Generate blog post ideas, LinkedIn post drafts, and content strategies for the 0nMCP ecosystem.',
    icon: FileText,
    colorClass: 'text-core-purple',
    iconBgClass: 'bg-core-purple/10',
    iconBorderClass: 'border-core-purple/20',
    hasInput: true,
    inputLabel: 'Topic Focus',
    inputPlaceholder: 'e.g., AI orchestration, MCP tools, API integration...',
  },
  {
    id: 'crm_health_check',
    name: 'CRM Health Check',
    description: 'Audit CRM data quality: contact counts, pipeline stats, stale contacts, and generate a health score report.',
    icon: ShieldCheck,
    colorClass: 'text-core-amber',
    iconBgClass: 'bg-core-amber/10',
    iconBorderClass: 'border-core-amber/20',
  },
  {
    id: 'training_batch',
    name: 'Training Batch',
    description: 'Run an AI training feed batch — ingests sources from HN, Dev.to, CoinGecko and more into the training pipeline.',
    icon: Lightbulb,
    colorClass: 'text-core-green',
    iconBgClass: 'bg-core-green/10',
    iconBorderClass: 'border-core-green/20',
  },
]

export default function WorkflowsPage() {
  const [running, setRunning] = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<Record<string, WorkflowResult>>({})
  const [lastRun, setLastRun] = useState<Record<string, string>>({})
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  async function launchWorkflow(wf: WorkflowDef) {
    setRunning(prev => ({ ...prev, [wf.id]: true }))
    setResults(prev => { const n = { ...prev }; delete n[wf.id]; return n })

    try {
      const input: Record<string, unknown> = {}
      if (wf.id === 'linkedin_comment_bot' && inputs[wf.id]) {
        input.postContent = inputs[wf.id]
        input.topics = inputs[wf.id].split(',').map(t => t.trim()).filter(Boolean)
      }
      if (wf.id === 'content_pipeline' && inputs[wf.id]) {
        input.topic = inputs[wf.id]
      }

      const res = await fetch('/api/admin/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: wf.id, input }),
      })

      const data = await res.json()
      setResults(prev => ({ ...prev, [wf.id]: data }))
      setLastRun(prev => ({ ...prev, [wf.id]: new Date().toISOString() }))
      setExpanded(prev => ({ ...prev, [wf.id]: true }))
    } catch (err) {
      setResults(prev => ({
        ...prev,
        [wf.id]: { action: wf.id, status: 'failed', error: (err as Error).message },
      }))
    } finally {
      setRunning(prev => ({ ...prev, [wf.id]: false }))
    }
  }

  function getStatus(id: string): 'idle' | 'running' | 'completed' | 'failed' {
    if (running[id]) return 'running'
    if (results[id]?.status === 'failed') return 'failed'
    if (results[id]) return 'completed'
    return 'idle'
  }

  const statusDotClass: Record<string, string> = {
    idle: 'bg-core-text-muted',
    running: 'bg-core-amber animate-pulse shadow-[0_0_8px_var(--core-amber)]',
    completed: 'bg-core-green',
    failed: 'bg-core-red',
  }

  const statusLabelClass: Record<string, string> = {
    idle: 'text-core-text-muted',
    running: 'text-core-amber',
    completed: 'text-core-green',
    failed: 'text-core-red',
  }

  const cardBorderClass: Record<string, string> = {
    idle: 'border-core-border',
    running: 'border-core-border',
    completed: 'border-core-green/30',
    failed: 'border-core-red/30',
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="pb-10">
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-core-green tracking-tight m-0">
          Workflow Launcher
        </h1>
        <p className="text-core-text-muted text-[13px] mt-1 mb-0">
          Real executable workflows powered by CRM API + AI generation
        </p>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))' }}>
        {workflows.map(wf => {
          const status = getStatus(wf.id)
          const result = results[wf.id]
          const Icon = wf.icon

          return (
            <div
              key={wf.id}
              className={`bg-core-card border rounded-[var(--radius)] overflow-hidden transition-colors duration-200 ${cardBorderClass[status]}`}
            >
              {/* Card Header */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3.5 items-start flex-1">
                    <div className={`w-11 h-11 rounded-[var(--radius-sm)] ${wf.iconBgClass} border ${wf.iconBorderClass} flex items-center justify-center shrink-0`}>
                      <Icon size={22} className={wf.colorClass} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-core-text m-0">{wf.name}</h3>
                      <p className="text-core-text-dim text-[12px] mt-1 mb-0 leading-relaxed">{wf.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`w-2 h-2 rounded-full ${statusDotClass[status]}`} />
                    <span className={`text-[11px] font-semibold uppercase tracking-wide ${statusLabelClass[status]}`}>
                      {status}
                    </span>
                  </div>
                </div>

                {/* Input field */}
                {wf.hasInput && (
                  <div className="mt-3.5">
                    <label className="text-core-text-muted text-[11px] font-semibold uppercase tracking-wide block mb-1.5">
                      {wf.inputLabel}
                    </label>
                    <textarea
                      value={inputs[wf.id] || ''}
                      onChange={e => setInputs(prev => ({ ...prev, [wf.id]: e.target.value }))}
                      placeholder={wf.inputPlaceholder}
                      className="w-full min-h-[60px] px-3 py-2.5 bg-core-surface border border-core-border rounded-[var(--radius-xs)] text-core-text text-[13px] resize-y outline-none font-[inherit] placeholder:text-core-text-muted"
                    />
                  </div>
                )}

                {/* Launch + Meta */}
                <div className="flex items-center justify-between mt-3.5">
                  <button
                    onClick={() => launchWorkflow(wf)}
                    disabled={running[wf.id]}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-[var(--radius-xs)] text-[13px] font-bold tracking-wide transition-all duration-200 ${
                      running[wf.id]
                        ? 'bg-core-bg border border-core-border text-core-text-muted cursor-default'
                        : 'bg-gradient-to-br from-core-green to-[#5cb83a] text-black border-0 cursor-pointer hover:opacity-90'
                    }`}
                  >
                    <Play size={14} />
                    {running[wf.id] ? 'Running...' : 'Launch'}
                  </button>
                  {lastRun[wf.id] && (
                    <span className="text-core-text-muted text-[11px]">
                      Last run: {new Date(lastRun[wf.id]).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Results Panel */}
              {result && (
                <div className="border-t border-core-border">
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [wf.id]: !prev[wf.id] }))}
                    className="w-full px-5 py-2.5 bg-core-surface border-0 flex items-center justify-between cursor-pointer text-core-text-dim text-[12px] font-semibold"
                  >
                    <span>Results</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-150 ${expanded[wf.id] ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {expanded[wf.id] && (
                    <div className="p-5 bg-core-bg">
                      {result.status === 'failed' ? (
                        <div className="text-core-red text-[13px]">
                          Error: {String(result.error || 'Unknown error')}
                        </div>
                      ) : wf.id === 'linkedin_comment_bot' ? (
                        <LinkedInResults result={result} onCopy={copyToClipboard} />
                      ) : wf.id === 'lead_nurture_sequence' ? (
                        <NurtureResults result={result} onCopy={copyToClipboard} />
                      ) : wf.id === 'content_pipeline' ? (
                        <ContentResults result={result} onCopy={copyToClipboard} />
                      ) : wf.id === 'crm_health_check' ? (
                        <HealthResults result={result} />
                      ) : wf.id === 'training_batch' ? (
                        <TrainingResults result={result} />
                      ) : (
                        <pre className="text-core-text-dim text-[12px] font-mono whitespace-pre-wrap m-0">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// --- Result Components ---

const commentStyleClasses: Record<number, { badge: string; text: string }> = {
  0: { badge: 'bg-core-cyan/10 border-core-cyan/20 text-core-cyan', text: 'text-core-cyan' },
  1: { badge: 'bg-core-green/10 border-core-green/20 text-core-green', text: 'text-core-green' },
  2: { badge: 'bg-core-purple/10 border-core-purple/20 text-core-purple', text: 'text-core-purple' },
}

function LinkedInResults({ result, onCopy }: { result: WorkflowResult; onCopy: (t: string) => void }) {
  const comments = (result.comments as { style: string; comment: string; topic: string }[]) || []
  return (
    <div className="flex flex-col gap-3">
      <div className="text-core-text-muted text-[11px] mb-1">
        Context: {String(result.post_context)}
      </div>
      {comments.map((c, i) => {
        const style = commentStyleClasses[i] ?? commentStyleClasses[2]
        return (
          <div key={i} className="bg-core-card border border-core-border rounded-[var(--radius-sm)] p-3.5">
            <div className="flex justify-between mb-2">
              <span className={`px-2 py-0.5 border rounded text-[10px] font-semibold uppercase ${style.badge}`}>
                {c.style}
              </span>
              <button
                onClick={() => onCopy(c.comment)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-core-bg border border-core-border rounded text-core-text-dim text-[11px] cursor-pointer hover:text-core-text transition-colors"
              >
                <Copy size={11} />
                Copy
              </button>
            </div>
            <p className="text-core-text text-[13px] m-0 leading-relaxed">{c.comment}</p>
            <div className="text-core-text-muted text-[10px] mt-1.5">Topic: {c.topic}</div>
          </div>
        )
      })}
    </div>
  )
}

function NurtureResults({ result, onCopy }: { result: WorkflowResult; onCopy: (t: string) => void }) {
  const messages = (result.messages as { contact_id: string; contact_name: string; contact_email: string; tags: string[]; message: { subject: string; body: string; type: string } }[]) || []
  return (
    <div>
      <div className="text-core-text-muted text-[11px] mb-3">
        {String(result.total_contacts_found)} contacts found
      </div>
      {messages.length === 0 ? (
        <div className="text-core-text-muted text-[13px] text-center py-5">
          No contacts matched nurture criteria. Tag contacts as &quot;needs-onboarding&quot; or &quot;free-tier&quot; in CRM.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {messages.map((m, i) => (
            <div key={i} className="bg-core-card border border-core-border rounded-[var(--radius-sm)] p-3.5">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="text-core-text text-[14px] font-semibold">{m.contact_name}</span>
                  <span className="text-core-text-muted text-[12px] ml-2">{m.contact_email}</span>
                </div>
                <span className="px-2 py-0.5 bg-core-green/10 border border-core-green/20 rounded text-core-green text-[10px] font-semibold">
                  {m.message.type}
                </span>
              </div>
              <div className="text-core-cyan text-[13px] font-semibold mb-1.5">
                Subject: {m.message.subject}
              </div>
              <pre className="text-core-text-dim text-[12px] m-0 whitespace-pre-wrap font-[inherit] leading-relaxed">
                {m.message.body}
              </pre>
              <div className="flex gap-2 mt-2.5">
                <button
                  onClick={() => onCopy(`Subject: ${m.message.subject}\n\n${m.message.body}`)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-core-bg border border-core-border rounded text-core-text-dim text-[11px] cursor-pointer hover:text-core-text transition-colors"
                >
                  <Copy size={11} />
                  Copy Email
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ContentResults({ result, onCopy }: { result: WorkflowResult; onCopy: (t: string) => void }) {
  const blogIdeas = (result.blog_ideas as { title: string; angle: string; outline: string[]; estimated_words: number }[]) || []
  const linkedinPosts = (result.linkedin_posts as { hook: string; body: string; cta: string; hashtags: string[] }[]) || []

  return (
    <div>
      <h4 className="text-core-purple text-[14px] font-bold mt-0 mb-3">Blog Ideas</h4>
      <div className="flex flex-col gap-2.5 mb-5">
        {blogIdeas.map((idea, i) => (
          <div key={i} className="bg-core-card border border-core-border rounded-[var(--radius-sm)] p-3.5">
            <div className="flex justify-between items-start mb-1.5">
              <h5 className="text-core-text text-[14px] font-semibold m-0">{idea.title}</h5>
              <span className="px-2 py-0.5 bg-core-purple/10 border border-core-purple/20 rounded text-core-purple text-[10px] font-semibold whitespace-nowrap shrink-0 ml-2">
                {idea.angle}
              </span>
            </div>
            <ul className="text-core-text-dim text-[12px] my-1 pl-4 leading-[1.8]">
              {idea.outline.map((o, j) => <li key={j}>{o}</li>)}
            </ul>
            <div className="text-core-text-muted text-[11px] mt-1">~{idea.estimated_words} words</div>
          </div>
        ))}
      </div>

      <h4 className="text-core-cyan text-[14px] font-bold mb-3">LinkedIn Post Drafts</h4>
      <div className="flex flex-col gap-2.5">
        {linkedinPosts.map((post, i) => (
          <div key={i} className="bg-core-card border border-core-border rounded-[var(--radius-sm)] p-3.5">
            <div className="text-core-text text-[15px] font-bold mb-2">{post.hook}</div>
            <pre className="text-core-text-dim text-[12px] m-0 mb-2 whitespace-pre-wrap font-[inherit] leading-relaxed">
              {post.body}
            </pre>
            <div className="text-core-green text-[12px] font-semibold mb-1.5">{post.cta}</div>
            <div className="flex flex-wrap gap-1 mb-2">
              {post.hashtags.map((h, j) => (
                <span key={j} className="px-1.5 py-0.5 bg-core-cyan/10 rounded text-core-cyan text-[10px]">
                  {h}
                </span>
              ))}
            </div>
            <button
              onClick={() => onCopy(`${post.hook}\n\n${post.body}\n\n${post.cta}\n\n${post.hashtags.join(' ')}`)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-core-bg border border-core-border rounded text-core-text-dim text-[11px] cursor-pointer hover:text-core-text transition-colors"
            >
              <Copy size={11} />
              Copy Post
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function HealthResults({ result }: { result: WorkflowResult }) {
  const report = result.report as {
    contact_count: number
    pipeline_count: number
    pipeline_value: number
    opportunity_count: number
    conversation_count: number
    stale_contacts: number
    contacts_without_email: number
    health_score: number
    issues: string[]
    recommendations: string[]
  }
  if (!report) return null

  const scoreColorClass =
    report.health_score >= 80
      ? 'text-core-green'
      : report.health_score >= 50
      ? 'text-core-amber'
      : 'text-core-red'

  const stats = [
    { label: 'Contacts', value: report.contact_count, colorClass: 'text-core-green' },
    { label: 'Pipelines', value: report.pipeline_count, colorClass: 'text-core-cyan' },
    { label: 'Opportunities', value: report.opportunity_count, colorClass: 'text-core-purple' },
    { label: 'Pipeline Value', value: `$${report.pipeline_value.toLocaleString()}`, colorClass: 'text-core-amber' },
    { label: 'Conversations', value: report.conversation_count, colorClass: 'text-core-cyan' },
    { label: 'Stale Contacts', value: report.stale_contacts, colorClass: report.stale_contacts > 0 ? 'text-core-red' : 'text-core-green' },
  ]

  return (
    <div>
      {/* Health Score */}
      <div className="flex items-center gap-5 p-4 bg-core-card border border-core-border rounded-[var(--radius-sm)] mb-4">
        <div className={`text-[48px] font-extrabold leading-none ${scoreColorClass}`}>{report.health_score}</div>
        <div>
          <div className="text-core-text text-[16px] font-semibold">Health Score</div>
          <div className="text-core-text-muted text-[12px]">
            {report.health_score >= 80
              ? 'CRM is in good shape'
              : report.health_score >= 50
              ? 'Some issues need attention'
              : 'Critical issues detected'}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
        {stats.map((s, i) => (
          <div key={i} className="bg-core-card border border-core-border rounded-[var(--radius-xs)] p-3 text-center">
            <div className="text-core-text-muted text-[10px] uppercase tracking-wide mb-1">{s.label}</div>
            <div className={`text-[20px] font-bold ${s.colorClass}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Issues */}
      {report.issues.length > 0 && (
        <div className="mb-3">
          <h5 className="text-core-red text-[12px] font-semibold m-0 mb-2 uppercase tracking-wide">Issues</h5>
          {report.issues.map((issue, i) => (
            <div key={i} className="px-3 py-2 bg-core-red/5 border border-core-red/15 rounded-[var(--radius-xs)] text-core-text-dim text-[12px] mb-1">
              {issue}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div>
          <h5 className="text-core-green text-[12px] font-semibold m-0 mb-2 uppercase tracking-wide">Recommendations</h5>
          {report.recommendations.map((rec, i) => (
            <div key={i} className="px-3 py-2 bg-core-green/5 border border-core-green/15 rounded-[var(--radius-xs)] text-core-text-dim text-[12px] mb-1">
              {rec}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TrainingResults({ result }: { result: WorkflowResult }) {
  const isCompleted = result.status === 'completed'
  return (
    <div className="bg-core-card border border-core-border rounded-[var(--radius-sm)] p-4">
      <div className="flex items-center gap-3 mb-2">
        {isCompleted ? (
          <CheckCircle size={16} className="text-core-green" />
        ) : (
          <XCircle size={16} className="text-core-red" />
        )}
        <span className="text-core-text text-[14px] font-semibold">
          {isCompleted ? 'Feed completed successfully' : 'Feed failed'}
        </span>
      </div>
      {result.sources_ingested !== undefined && (
        <div className="text-core-text-dim text-[13px]">
          Sources ingested:{' '}
          <span className="text-core-green font-bold">{String(result.sources_ingested)}</span>
        </div>
      )}
      {result.error ? (
        <div className="text-core-red text-[12px] mt-2">{String(result.error)}</div>
      ) : null}
    </div>
  )
}
