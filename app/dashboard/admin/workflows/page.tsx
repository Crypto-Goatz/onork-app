'use client'

import { useState } from 'react'

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
  icon: string
  color: string
  hasInput?: boolean
  inputLabel?: string
  inputPlaceholder?: string
}

const workflows: WorkflowDef[] = [
  {
    id: 'linkedin_comment_bot',
    name: 'LinkedIn Comment Bot',
    description: 'Generate AI-powered LinkedIn comments for engagement. Creates 3 variants: insightful, supportive, and curious.',
    icon: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 4a2 2 0 100 4 2 2 0 000-4z',
    color: 'var(--jp-cyan)',
    hasInput: true,
    inputLabel: 'Post Content / Topics',
    inputPlaceholder: 'Paste a LinkedIn post or describe topics to comment on...',
  },
  {
    id: 'lead_nurture_sequence',
    name: 'Lead Nurture Sequence',
    description: 'Fetch contacts tagged for onboarding from CRM and generate personalized follow-up email sequences.',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    color: 'var(--jp-green)',
  },
  {
    id: 'content_pipeline',
    name: 'Content Pipeline',
    description: 'Generate blog post ideas, LinkedIn post drafts, and content strategies for the 0nMCP ecosystem.',
    icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    color: 'var(--jp-purple)',
    hasInput: true,
    inputLabel: 'Topic Focus',
    inputPlaceholder: 'e.g., AI orchestration, MCP tools, API integration...',
  },
  {
    id: 'crm_health_check',
    name: 'CRM Health Check',
    description: 'Audit CRM data quality: contact counts, pipeline stats, stale contacts, and generate a health score report.',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    color: 'var(--jp-amber)',
  },
  {
    id: 'training_batch',
    name: 'Training Batch',
    description: 'Run an AI training feed batch — ingests sources from HN, Dev.to, CoinGecko and more into the training pipeline.',
    icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
    color: 'var(--jp-green)',
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

  const statusColors: Record<string, string> = {
    idle: 'var(--jp-text-muted)',
    running: 'var(--jp-amber)',
    completed: 'var(--jp-green)',
    failed: 'var(--jp-red)',
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  return (
    <div style={{ padding: '0 0 40px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--jp-green)', margin: 0, letterSpacing: -0.5 }}>
          Workflow Launcher
        </h1>
        <p style={{ color: 'var(--jp-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
          Real executable workflows powered by CRM API + AI generation
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: 16 }}>
        {workflows.map(wf => {
          const status = getStatus(wf.id)
          const result = results[wf.id]

          return (
            <div
              key={wf.id}
              style={{
                background: 'var(--jp-bg-card)',
                border: `1px solid ${status === 'completed' ? 'rgba(126, 217, 87, 0.3)' : status === 'failed' ? 'rgba(248, 113, 113, 0.3)' : 'var(--jp-border)'}`,
                borderRadius: 'var(--jp-radius)',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Card Header */}
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--jp-radius-sm)',
                      background: `${wf.color}15`,
                      border: `1px solid ${wf.color}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width={22} height={22} fill="none" stroke={wf.color} viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={wf.icon} />
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--jp-text)', margin: 0 }}>{wf.name}</h3>
                      <p style={{ color: 'var(--jp-text-secondary)', fontSize: 12, margin: '4px 0 0', lineHeight: 1.5 }}>{wf.description}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: statusColors[status],
                      boxShadow: status === 'running' ? `0 0 8px ${statusColors[status]}` : 'none',
                      animation: status === 'running' ? 'jp-pulse 1s ease-in-out infinite' : 'none',
                    }} />
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: statusColors[status],
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>
                      {status}
                    </span>
                  </div>
                </div>

                {/* Input field */}
                {wf.hasInput && (
                  <div style={{ marginTop: 14 }}>
                    <label style={{ color: 'var(--jp-text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                      {wf.inputLabel}
                    </label>
                    <textarea
                      value={inputs[wf.id] || ''}
                      onChange={e => setInputs(prev => ({ ...prev, [wf.id]: e.target.value }))}
                      placeholder={wf.inputPlaceholder}
                      style={{
                        width: '100%',
                        minHeight: 60,
                        padding: '10px 12px',
                        background: 'var(--jp-bg-input)',
                        border: '1px solid var(--jp-border)',
                        borderRadius: 'var(--jp-radius-xs)',
                        color: 'var(--jp-text)',
                        fontSize: 13,
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                )}

                {/* Launch + Meta */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                  <button
                    onClick={() => launchWorkflow(wf)}
                    disabled={running[wf.id]}
                    style={{
                      padding: '10px 24px',
                      background: running[wf.id] ? 'var(--jp-bg)' : 'linear-gradient(135deg, #7ed957, #5cb83a)',
                      color: running[wf.id] ? 'var(--jp-text-muted)' : '#000',
                      border: running[wf.id] ? '1px solid var(--jp-border)' : 'none',
                      borderRadius: 'var(--jp-radius-xs)',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: running[wf.id] ? 'default' : 'pointer',
                      letterSpacing: 0.3,
                      transition: 'all 0.2s',
                    }}
                  >
                    {running[wf.id] ? 'Running...' : 'Launch'}
                  </button>
                  {lastRun[wf.id] && (
                    <span style={{ color: 'var(--jp-text-muted)', fontSize: 11 }}>
                      Last run: {new Date(lastRun[wf.id]).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Results Panel */}
              {result && (
                <div style={{ borderTop: '1px solid var(--jp-border)' }}>
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [wf.id]: !prev[wf.id] }))}
                    style={{
                      width: '100%',
                      padding: '10px 20px',
                      background: 'var(--jp-bg-elevated)',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      color: 'var(--jp-text-secondary)',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <span>Results</span>
                    <svg
                      width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
                      style={{ transform: expanded[wf.id] ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expanded[wf.id] && (
                    <div style={{ padding: 20, background: 'var(--jp-bg)' }}>
                      {result.status === 'failed' ? (
                        <div style={{ color: 'var(--jp-red)', fontSize: 13 }}>
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
                        <pre style={{ color: 'var(--jp-text-secondary)', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0 }}>
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

      <style>{`@keyframes jp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  )
}

// --- Result Components ---

function LinkedInResults({ result, onCopy }: { result: WorkflowResult; onCopy: (t: string) => void }) {
  const comments = (result.comments as { style: string; comment: string; topic: string }[]) || []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ color: 'var(--jp-text-muted)', fontSize: 11, marginBottom: 4 }}>
        Context: {String(result.post_context)}
      </div>
      {comments.map((c, i) => (
        <div key={i} style={{
          background: 'var(--jp-bg-card)',
          border: '1px solid var(--jp-border)',
          borderRadius: 'var(--jp-radius-sm)',
          padding: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{
              padding: '2px 8px',
              background: i === 0 ? 'rgba(0, 212, 255, 0.1)' : i === 1 ? 'rgba(126, 217, 87, 0.1)' : 'rgba(167, 139, 250, 0.1)',
              border: `1px solid ${i === 0 ? 'rgba(0, 212, 255, 0.2)' : i === 1 ? 'rgba(126, 217, 87, 0.2)' : 'rgba(167, 139, 250, 0.2)'}`,
              borderRadius: 4,
              color: i === 0 ? 'var(--jp-cyan)' : i === 1 ? 'var(--jp-green)' : 'var(--jp-purple)',
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
            }}>
              {c.style}
            </span>
            <button
              onClick={() => onCopy(c.comment)}
              style={{
                padding: '4px 10px',
                background: 'var(--jp-bg)',
                border: '1px solid var(--jp-border)',
                borderRadius: 4,
                color: 'var(--jp-text-secondary)',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Copy
            </button>
          </div>
          <p style={{ color: 'var(--jp-text)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{c.comment}</p>
          <div style={{ color: 'var(--jp-text-muted)', fontSize: 10, marginTop: 6 }}>Topic: {c.topic}</div>
        </div>
      ))}
    </div>
  )
}

function NurtureResults({ result, onCopy }: { result: WorkflowResult; onCopy: (t: string) => void }) {
  const messages = (result.messages as { contact_id: string; contact_name: string; contact_email: string; tags: string[]; message: { subject: string; body: string; type: string } }[]) || []
  return (
    <div>
      <div style={{ color: 'var(--jp-text-muted)', fontSize: 11, marginBottom: 12 }}>
        {String(result.total_contacts_found)} contacts found
      </div>
      {messages.length === 0 ? (
        <div style={{ color: 'var(--jp-text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>
          No contacts matched nurture criteria. Tag contacts as "needs-onboarding" or "free-tier" in CRM.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              background: 'var(--jp-bg-card)',
              border: '1px solid var(--jp-border)',
              borderRadius: 'var(--jp-radius-sm)',
              padding: 14,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <span style={{ color: 'var(--jp-text)', fontSize: 14, fontWeight: 600 }}>{m.contact_name}</span>
                  <span style={{ color: 'var(--jp-text-muted)', fontSize: 12, marginLeft: 8 }}>{m.contact_email}</span>
                </div>
                <span style={{
                  padding: '2px 8px',
                  background: 'rgba(126, 217, 87, 0.1)',
                  border: '1px solid rgba(126, 217, 87, 0.2)',
                  borderRadius: 4,
                  color: 'var(--jp-green)',
                  fontSize: 10,
                  fontWeight: 600,
                }}>
                  {m.message.type}
                </span>
              </div>
              <div style={{ color: 'var(--jp-cyan)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Subject: {m.message.subject}
              </div>
              <pre style={{
                color: 'var(--jp-text-secondary)',
                fontSize: 12,
                margin: 0,
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                lineHeight: 1.6,
              }}>
                {m.message.body}
              </pre>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  onClick={() => onCopy(`Subject: ${m.message.subject}\n\n${m.message.body}`)}
                  style={{
                    padding: '4px 10px',
                    background: 'var(--jp-bg)',
                    border: '1px solid var(--jp-border)',
                    borderRadius: 4,
                    color: 'var(--jp-text-secondary)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
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
      <h4 style={{ color: 'var(--jp-purple)', fontSize: 14, fontWeight: 700, marginTop: 0, marginBottom: 12 }}>Blog Ideas</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {blogIdeas.map((idea, i) => (
          <div key={i} style={{
            background: 'var(--jp-bg-card)',
            border: '1px solid var(--jp-border)',
            borderRadius: 'var(--jp-radius-sm)',
            padding: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <h5 style={{ color: 'var(--jp-text)', fontSize: 14, fontWeight: 600, margin: 0 }}>{idea.title}</h5>
              <span style={{
                padding: '2px 8px',
                background: 'rgba(167, 139, 250, 0.1)',
                border: '1px solid rgba(167, 139, 250, 0.2)',
                borderRadius: 4,
                color: 'var(--jp-purple)',
                fontSize: 10,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {idea.angle}
              </span>
            </div>
            <ul style={{ color: 'var(--jp-text-secondary)', fontSize: 12, margin: '4px 0', paddingLeft: 16, lineHeight: 1.8 }}>
              {idea.outline.map((o, j) => <li key={j}>{o}</li>)}
            </ul>
            <div style={{ color: 'var(--jp-text-muted)', fontSize: 11, marginTop: 4 }}>~{idea.estimated_words} words</div>
          </div>
        ))}
      </div>

      <h4 style={{ color: 'var(--jp-cyan)', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>LinkedIn Post Drafts</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {linkedinPosts.map((post, i) => (
          <div key={i} style={{
            background: 'var(--jp-bg-card)',
            border: '1px solid var(--jp-border)',
            borderRadius: 'var(--jp-radius-sm)',
            padding: 14,
          }}>
            <div style={{ color: 'var(--jp-text)', fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{post.hook}</div>
            <pre style={{
              color: 'var(--jp-text-secondary)',
              fontSize: 12,
              margin: '0 0 8px',
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              lineHeight: 1.6,
            }}>
              {post.body}
            </pre>
            <div style={{ color: 'var(--jp-green)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{post.cta}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {post.hashtags.map((h, j) => (
                <span key={j} style={{
                  padding: '2px 6px',
                  background: 'rgba(0, 212, 255, 0.08)',
                  borderRadius: 4,
                  color: 'var(--jp-cyan)',
                  fontSize: 10,
                }}>
                  {h}
                </span>
              ))}
            </div>
            <button
              onClick={() => onCopy(`${post.hook}\n\n${post.body}\n\n${post.cta}\n\n${post.hashtags.join(' ')}`)}
              style={{
                padding: '4px 10px',
                background: 'var(--jp-bg)',
                border: '1px solid var(--jp-border)',
                borderRadius: 4,
                color: 'var(--jp-text-secondary)',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
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

  const scoreColor = report.health_score >= 80 ? 'var(--jp-green)' : report.health_score >= 50 ? 'var(--jp-amber)' : 'var(--jp-red)'

  return (
    <div>
      {/* Health Score */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: 16,
        background: 'var(--jp-bg-card)',
        border: '1px solid var(--jp-border)',
        borderRadius: 'var(--jp-radius-sm)',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 48, fontWeight: 800, color: scoreColor }}>{report.health_score}</div>
        <div>
          <div style={{ color: 'var(--jp-text)', fontSize: 16, fontWeight: 600 }}>Health Score</div>
          <div style={{ color: 'var(--jp-text-muted)', fontSize: 12 }}>
            {report.health_score >= 80 ? 'CRM is in good shape' : report.health_score >= 50 ? 'Some issues need attention' : 'Critical issues detected'}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Contacts', value: report.contact_count, color: 'var(--jp-green)' },
          { label: 'Pipelines', value: report.pipeline_count, color: 'var(--jp-cyan)' },
          { label: 'Opportunities', value: report.opportunity_count, color: 'var(--jp-purple)' },
          { label: 'Pipeline Value', value: `$${report.pipeline_value.toLocaleString()}`, color: 'var(--jp-amber)' },
          { label: 'Conversations', value: report.conversation_count, color: 'var(--jp-cyan)' },
          { label: 'Stale Contacts', value: report.stale_contacts, color: report.stale_contacts > 0 ? 'var(--jp-red)' : 'var(--jp-green)' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'var(--jp-bg-card)',
            border: '1px solid var(--jp-border)',
            borderRadius: 'var(--jp-radius-xs)',
            padding: 12,
            textAlign: 'center',
          }}>
            <div style={{ color: 'var(--jp-text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Issues */}
      {report.issues.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <h5 style={{ color: 'var(--jp-red)', fontSize: 12, fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Issues</h5>
          {report.issues.map((issue, i) => (
            <div key={i} style={{
              padding: '8px 12px',
              background: 'rgba(248, 113, 113, 0.06)',
              border: '1px solid rgba(248, 113, 113, 0.15)',
              borderRadius: 'var(--jp-radius-xs)',
              color: 'var(--jp-text-secondary)',
              fontSize: 12,
              marginBottom: 4,
            }}>
              {issue}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div>
          <h5 style={{ color: 'var(--jp-green)', fontSize: 12, fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Recommendations</h5>
          {report.recommendations.map((rec, i) => (
            <div key={i} style={{
              padding: '8px 12px',
              background: 'rgba(126, 217, 87, 0.06)',
              border: '1px solid rgba(126, 217, 87, 0.15)',
              borderRadius: 'var(--jp-radius-xs)',
              color: 'var(--jp-text-secondary)',
              fontSize: 12,
              marginBottom: 4,
            }}>
              {rec}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TrainingResults({ result }: { result: WorkflowResult }) {
  return (
    <div style={{
      background: 'var(--jp-bg-card)',
      border: '1px solid var(--jp-border)',
      borderRadius: 'var(--jp-radius-sm)',
      padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: result.status === 'completed' ? 'var(--jp-green)' : 'var(--jp-red)',
        }} />
        <span style={{ color: 'var(--jp-text)', fontSize: 14, fontWeight: 600 }}>
          {result.status === 'completed' ? 'Feed completed successfully' : 'Feed failed'}
        </span>
      </div>
      {result.sources_ingested !== undefined && (
        <div style={{ color: 'var(--jp-text-secondary)', fontSize: 13 }}>
          Sources ingested: <span style={{ color: 'var(--jp-green)', fontWeight: 700 }}>{String(result.sources_ingested)}</span>
        </div>
      )}
      {result.error ? (
        <div style={{ color: 'var(--jp-red)', fontSize: 12, marginTop: 8 }}>
          {String(result.error)}
        </div>
      ) : null}
    </div>
  )
}
