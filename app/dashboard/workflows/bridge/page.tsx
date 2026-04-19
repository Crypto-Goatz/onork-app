'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BridgeExecution {
  id: string
  action: string
  intent: string
  status: string
  result: {
    success: boolean
    summary: string
    created: { type: string; id?: string; name: string; detail?: string }[]
    errors?: string[]
  } | null
  created_at: string
  completed_at: string | null
}

interface Template {
  key: string
  name: string
  description: string
  trigger: string
  stepCount: number
}

const TEMPLATES: Template[] = [
  { key: 'lead-followup', name: 'Lead Follow-up Sequence', description: 'Text in 5 min, email in 1 hour, call task in 24 hours', trigger: 'contact.created', stepCount: 3 },
  { key: 'appointment-reminder', name: 'Appointment Reminder', description: 'Email 24h before, text 1h before appointment', trigger: 'appointment.scheduled', stepCount: 2 },
  { key: 'review-request', name: 'Review Request', description: 'Text after 2h, email at 24h asking for a review', trigger: 'appointment.completed', stepCount: 2 },
  { key: 'winback', name: 'Win-back Campaign', description: 'Re-engage inactive contacts over 60 days', trigger: 'contact.inactive', stepCount: 3 },
  { key: 'onboarding', name: 'Client Onboarding', description: 'Welcome email, getting started guide, pro tips, check-in call', trigger: 'contact.created', stepCount: 4 },
  { key: 'missed-call', name: 'Missed Call Text-back', description: 'Instant text when a call is missed', trigger: 'call.missed', stepCount: 2 },
  { key: 'invoice-followup', name: 'Invoice Follow-up', description: 'Reminder emails for unpaid invoices', trigger: 'invoice.sent', stepCount: 3 },
]

export default function BridgePage() {
  const [executions, setExecutions] = useState<BridgeExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [tryInput, setTryInput] = useState('')
  const [tryLoading, setTryLoading] = useState(false)
  const [tryResult, setTryResult] = useState<BridgeExecution['result'] | null>(null)
  const [deployingTemplate, setDeployingTemplate] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadExecutions()
  }, [])

  async function loadExecutions() {
    setLoading(true)
    const { data } = await supabase
      .from('bridge_executions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    setExecutions((data as BridgeExecution[]) || [])
    setLoading(false)
  }

  async function tryBridge() {
    if (!tryInput.trim() || tryLoading) return
    setTryLoading(true)
    setTryResult(null)

    try {
      const res = await fetch('/api/agent-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: tryInput.trim() }),
      })
      const data = await res.json()
      setTryResult(data)
      // Refresh executions list
      loadExecutions()
    } catch {
      setTryResult({ success: false, summary: 'Connection error', created: [], errors: ['Failed to reach Agent Bridge'] })
    }
    setTryLoading(false)
  }

  async function deployTemplate(key: string) {
    const tpl = TEMPLATES.find((t) => t.key === key)
    if (!tpl) return
    setDeployingTemplate(key)

    try {
      const res = await fetch('/api/agent-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-workflow',
          intent: `Deploy the ${tpl.name} template: ${tpl.description}`,
        }),
      })
      const data = await res.json()
      setTryResult(data)
      loadExecutions()
    } catch {
      setTryResult({ success: false, summary: 'Failed to deploy template', created: [], errors: ['Connection error'] })
    }
    setDeployingTemplate(null)
  }

  function statusBadge(status: string) {
    const colors: Record<string, { bg: string; text: string }> = {
      completed: { bg: 'rgba(126,217,87,0.12)', text: '#7ed957' },
      running: { bg: 'rgba(0,212,255,0.12)', text: '#00d4ff' },
      failed: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
    }
    const c = colors[status] || colors.running
    return (
      <span style={{
        display: 'inline-block', padding: '2px 8px', borderRadius: 4,
        fontSize: 11, fontWeight: 600,
        background: c.bg, color: c.text,
      }}>
        {status}
      </span>
    )
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary, #f0f4f8)', margin: 0 }}>
          <span style={{ color: '#7ed957' }}>Agent</span> Bridge
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted, #6b7280)', margin: '6px 0 0' }}>
          Create agents, workflows, voice AI, and more from natural language.
        </p>
      </div>

      {/* Try It Section */}
      <div style={{
        background: 'var(--bg-card, #161b22)',
        border: '1px solid var(--border, #1e293b)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 12px' }}>
          Try It
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', margin: '0 0 12px' }}>
          Describe what you want to automate in plain English.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); tryBridge() }} style={{ display: 'flex', gap: 8 }}>
          <input
            value={tryInput}
            onChange={(e) => setTryInput(e.target.value)}
            placeholder="e.g., Set up a lead follow-up sequence with text, email, and a call task"
            disabled={tryLoading}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 8,
              background: 'var(--bg-primary, #0d1117)',
              border: '1px solid var(--border, #1e293b)',
              color: 'var(--text-primary, #f0f4f8)',
              fontSize: 13, outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            disabled={tryLoading || !tryInput.trim()}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none',
              background: tryInput.trim() ? '#7ed957' : 'var(--border, #1e293b)',
              color: tryInput.trim() ? '#000' : 'var(--text-muted, #6b7280)',
              fontSize: 13, fontWeight: 700, cursor: tryInput.trim() ? 'pointer' : 'default',
              transition: 'all 0.2s', whiteSpace: 'nowrap',
              opacity: tryLoading ? 0.6 : 1,
            }}
          >
            {tryLoading ? 'Running...' : 'Execute'}
          </button>
        </form>

        {/* Try Result */}
        {tryResult && (
          <div style={{
            marginTop: 16, padding: 16, borderRadius: 8,
            background: tryResult.success ? 'rgba(126,217,87,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${tryResult.success ? 'rgba(126,217,87,0.15)' : 'rgba(239,68,68,0.15)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: 4,
                background: tryResult.success ? '#7ed957' : '#ef4444',
              }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)' }}>
                {tryResult.success ? 'Success' : 'Failed'}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary, #8b95a5)', margin: 0, lineHeight: 1.6 }}>
              {tryResult.summary}
            </p>
            {tryResult.created?.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {tryResult.created.map((c, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                    borderTop: i > 0 ? '1px solid var(--border, #1e293b)' : 'none',
                  }}>
                    <span style={{
                      padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                      background: 'rgba(0,212,255,0.1)', color: '#00d4ff',
                      textTransform: 'uppercase',
                    }}>{c.type}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-primary, #f0f4f8)', fontWeight: 600 }}>{c.name}</span>
                    {c.detail && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>{c.detail}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {tryResult.errors && tryResult.errors.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {tryResult.errors.map((e, i) => (
                  <p key={i} style={{ fontSize: 12, color: '#ef4444', margin: '2px 0' }}>{e}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Templates */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 12px' }}>
          Templates
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {TEMPLATES.map((tpl) => (
            <div key={tpl.key} style={{
              background: 'var(--bg-card, #161b22)',
              border: '1px solid var(--border, #1e293b)',
              borderRadius: 10, padding: 16,
              display: 'flex', flexDirection: 'column', gap: 8,
              transition: 'border-color 0.15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: 0 }}>
                  {tpl.name}
                </h3>
                <span style={{
                  padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                  background: 'rgba(126,217,87,0.08)', color: '#7ed957',
                }}>
                  {tpl.stepCount} steps
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', margin: 0, lineHeight: 1.5 }}>
                {tpl.description}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{
                  padding: '2px 6px', borderRadius: 4, fontSize: 10,
                  background: 'rgba(0,212,255,0.08)', color: '#00d4ff',
                  fontFamily: 'monospace',
                }}>
                  {tpl.trigger}
                </span>
              </div>
              <button
                onClick={() => deployTemplate(tpl.key)}
                disabled={deployingTemplate === tpl.key}
                style={{
                  marginTop: 8, padding: '8px 0', borderRadius: 6, border: '1px solid rgba(126,217,87,0.2)',
                  background: 'rgba(126,217,87,0.06)',
                  color: '#7ed957', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.15s',
                  opacity: deployingTemplate === tpl.key ? 0.5 : 1,
                }}
              >
                {deployingTemplate === tpl.key ? 'Deploying...' : 'Deploy'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Executions */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: 0 }}>
            Recent Executions
          </h2>
          <button
            onClick={loadExecutions}
            style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border, #1e293b)',
              background: 'transparent', color: 'var(--text-muted, #6b7280)',
              fontSize: 12, cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{
            padding: 40, textAlign: 'center',
            background: 'var(--bg-card, #161b22)',
            border: '1px solid var(--border, #1e293b)',
            borderRadius: 10,
          }}>
            <div style={{
              width: 24, height: 24, border: '2px solid var(--border, #1e293b)',
              borderTopColor: '#7ed957', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : executions.length === 0 ? (
          <div style={{
            padding: 40, textAlign: 'center',
            background: 'var(--bg-card, #161b22)',
            border: '1px solid var(--border, #1e293b)',
            borderRadius: 10,
          }}>
            <p style={{ fontSize: 14, color: 'var(--text-muted, #6b7280)', margin: 0 }}>
              No executions yet. Try the Agent Bridge above or deploy a template.
            </p>
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-card, #161b22)',
            border: '1px solid var(--border, #1e293b)',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            {executions.map((exec, i) => (
              <div key={exec.id} style={{
                padding: '14px 16px',
                borderBottom: i < executions.length - 1 ? '1px solid var(--border, #1e293b)' : 'none',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                      background: 'rgba(167,139,250,0.1)', color: '#a78bfa',
                      textTransform: 'uppercase', fontFamily: 'monospace',
                    }}>
                      {exec.action}
                    </span>
                    {statusBadge(exec.status)}
                    <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>
                      {timeAgo(exec.created_at)}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 4px', fontWeight: 500 }}>
                    {exec.intent}
                  </p>
                  {exec.result?.summary && (
                    <p style={{ fontSize: 12, color: 'var(--text-secondary, #8b95a5)', margin: 0 }}>
                      {exec.result.summary}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
