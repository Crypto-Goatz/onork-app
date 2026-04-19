'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLocation } from '@/lib/location-context'

type Tab = 'create' | 'history'
type Tone = 'professional' | 'casual' | 'thought-leader' | 'educational'
type StepStatus = 'pending' | 'completed' | 'failed' | 'skipped'

interface WorkflowStep {
  name: string
  status: StepStatus
  duration_ms: number
  detail?: string
}

interface SocialPost {
  platform: string
  content: string
  posted: boolean
  postId?: string
  error?: string
}

interface ExecutionRecord {
  id: string
  status: string
  workflow_type: string
  input: {
    topic: string
    tone?: string
    platforms?: string[]
    emailSegment?: string
  }
  result?: {
    blogPost?: { title: string; content: string; metaDescription?: string; tags?: string[] }
    socialPosts?: SocialPost[]
    emailCampaign?: { subject: string; html: string; sent: number; segment: string }
    steps?: WorkflowStep[]
  }
  steps: WorkflowStep[]
  started_at: string
  completed_at?: string
  error?: string
}

const PLATFORMS = [
  { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2', icon: 'in' },
  { key: 'twitter', label: 'X / Twitter', color: '#000', icon: 'X' },
  { key: 'facebook', label: 'Facebook', color: '#1877F2', icon: 'f' },
  { key: 'instagram', label: 'Instagram', color: '#E4405F', icon: 'ig' },
  { key: 'google', label: 'Google Business', color: '#4285F4', icon: 'G' },
  { key: 'tiktok', label: 'TikTok', color: '#00F2EA', icon: 'TT' },
]

const TONES: { key: Tone; label: string; desc: string }[] = [
  { key: 'professional', label: 'Professional', desc: 'Authoritative, clear, data-driven' },
  { key: 'casual', label: 'Casual', desc: 'Friendly, conversational, relatable' },
  { key: 'thought-leader', label: 'Thought Leader', desc: 'Visionary, challenges conventions' },
  { key: 'educational', label: 'Educational', desc: 'Instructive, step-by-step, detailed' },
]

const SEGMENTS = [
  { key: 'all', label: 'All Contacts' },
  { key: 'active', label: 'Active Contacts' },
  { key: 'leads', label: 'Leads Only' },
  { key: 'customers', label: 'Customers Only' },
]

const STEP_LABELS: Record<string, string> = {
  'Generate Blog Post': 'Writing blog post with AI...',
  'Generate Social Snippets': 'Creating platform-specific social posts...',
  'Post to Social Platforms': 'Publishing to connected accounts...',
  'Generate Email Campaign': 'Designing email campaign...',
  'Send Email Campaign': 'Sending to contacts...',
  'Reply to Conversation': 'Sending summary to CRM chat...',
}

export default function BlogSocialWorkflowPage() {
  const { locationId } = useLocation()
  const supabase = createClient()

  const [tab, setTab] = useState<Tab>('create')
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState<Tone>('professional')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin', 'twitter', 'facebook'])
  const [emailSegment, setEmailSegment] = useState('all')
  const [customSegment, setCustomSegment] = useState('')

  const [running, setRunning] = useState(false)
  const [liveSteps, setLiveSteps] = useState<WorkflowStep[]>([])
  const [result, setResult] = useState<ExecutionRecord['result'] | null>(null)
  const [error, setError] = useState('')

  const [history, setHistory] = useState<ExecutionRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)

  // Load history
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setHistoryLoading(false); return }

    const { data } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('workflow_type', 'blog-to-social')
      .eq('user_id', session.user.id)
      .order('started_at', { ascending: false })
      .limit(25)

    setHistory((data as ExecutionRecord[]) || [])
    setHistoryLoading(false)
  }, [supabase])

  useEffect(() => {
    if (tab === 'history') loadHistory()
  }, [tab, loadHistory])

  function togglePlatform(key: string) {
    setSelectedPlatforms(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    )
  }

  async function runWorkflow() {
    if (!topic.trim()) return
    setRunning(true)
    setError('')
    setResult(null)
    setLiveSteps([
      { name: 'Generate Blog Post', status: 'pending', duration_ms: 0 },
      { name: 'Generate Social Snippets', status: 'pending', duration_ms: 0 },
      { name: 'Post to Social Platforms', status: 'pending', duration_ms: 0 },
      { name: 'Generate Email Campaign', status: 'pending', duration_ms: 0 },
      { name: 'Send Email Campaign', status: 'pending', duration_ms: 0 },
    ])

    const segment = emailSegment === 'custom' ? customSegment : emailSegment

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/workflows/blog-to-social', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          topic: topic.trim(),
          tone,
          platforms: selectedPlatforms,
          emailSegment: segment,
          locationId: locationId || '',
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Workflow failed')
        setLiveSteps([])
      } else {
        setResult(data.result)
        setLiveSteps(data.result?.steps || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
      setLiveSteps([])
    } finally {
      setRunning(false)
    }
  }

  // -- Rendering helpers ---

  function StepIndicator({ step }: { step: WorkflowStep }) {
    const colors: Record<string, string> = {
      pending: '#3b4252',
      completed: '#7ed957',
      failed: '#ef4444',
      skipped: '#6b7280',
    }
    const icons: Record<string, string> = {
      pending: '',
      completed: '',
      failed: '!',
      skipped: '-',
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: step.status === 'pending' ? 'transparent' : colors[step.status],
          border: step.status === 'pending' ? `2px solid ${colors.pending}` : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: step.status === 'completed' ? '#000' : '#fff',
          transition: 'all 0.3s ease',
        }}>
          {step.status === 'pending' && running ? (
            <div style={{
              width: 12, height: 12,
              border: '2px solid #7ed957',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          ) : icons[step.status] || ''}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--jp-text, #f0f4f8)' }}>
            {step.name}
          </div>
          {step.status === 'pending' && running && (
            <div style={{ fontSize: 11, color: 'var(--jp-text-muted, #8b95a5)', marginTop: 2 }}>
              {STEP_LABELS[step.name] || 'Processing...'}
            </div>
          )}
          {step.status === 'completed' && step.duration_ms > 0 && (
            <div style={{ fontSize: 11, color: '#7ed957', marginTop: 2 }}>
              Completed in {(step.duration_ms / 1000).toFixed(1)}s
            </div>
          )}
          {step.status === 'failed' && step.detail && (
            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>
              {step.detail}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg, #7ed957, #5cb83a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 900, color: '#000',
        }}>B</div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--jp-text, #f0f4f8)', margin: 0 }}>
              Blog to Social + Email
            </h1>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 4,
              background: 'linear-gradient(135deg, #7ed957, #00d4ff)',
              color: '#000', letterSpacing: '0.08em',
            }}>UNLIMITED</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--jp-text-muted, #8b95a5)', marginTop: 2 }}>
            AI writes a blog, posts to social, and emails your contacts — one click.
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--jp-border, #1e293b)' }}>
        {(['create', 'history'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '10px 16px', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, textTransform: 'capitalize',
              background: tab === t ? 'var(--jp-bg-card, #161b22)' : 'transparent',
              color: tab === t ? '#7ed957' : 'var(--jp-text-muted, #8b95a5)',
              borderBottom: tab === t ? '2px solid #7ed957' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            {t === 'create' ? 'Create Workflow' : 'Execution History'}
          </button>
        ))}
      </div>

      {/* CREATE TAB */}
      {tab === 'create' && (
        <div style={{ display: 'grid', gap: 20 }}>

          {/* Topic */}
          <div style={{ background: 'var(--jp-bg-card, #161b22)', borderRadius: 12, border: '1px solid var(--jp-border, #1e293b)', padding: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--jp-text-muted, #8b95a5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Blog Topic
            </label>
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. How AI automation is transforming small business operations in 2026"
              rows={3}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 8, resize: 'vertical',
                background: 'var(--jp-bg-primary, #0d1117)',
                border: '1px solid var(--jp-border, #1e293b)',
                color: 'var(--jp-text, #f0f4f8)', fontSize: 14,
                outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Tone */}
          <div style={{ background: 'var(--jp-bg-card, #161b22)', borderRadius: 12, border: '1px solid var(--jp-border, #1e293b)', padding: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--jp-text-muted, #8b95a5)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Tone
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
              {TONES.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTone(t.key)}
                  style={{
                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    background: tone === t.key ? 'rgba(126, 217, 87, 0.1)' : 'var(--jp-bg-primary, #0d1117)',
                    border: tone === t.key ? '1px solid #7ed957' : '1px solid var(--jp-border, #1e293b)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: tone === t.key ? '#7ed957' : 'var(--jp-text, #f0f4f8)' }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--jp-text-muted, #8b95a5)', marginTop: 2 }}>
                    {t.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Platforms */}
          <div style={{ background: 'var(--jp-bg-card, #161b22)', borderRadius: 12, border: '1px solid var(--jp-border, #1e293b)', padding: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--jp-text-muted, #8b95a5)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Social Platforms
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PLATFORMS.map(p => {
                const selected = selectedPlatforms.includes(p.key)
                return (
                  <button
                    key={p.key}
                    onClick={() => togglePlatform(p.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                      background: selected ? 'rgba(126, 217, 87, 0.1)' : 'var(--jp-bg-primary, #0d1117)',
                      border: selected ? '1px solid #7ed957' : '1px solid var(--jp-border, #1e293b)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{
                      width: 22, height: 22, borderRadius: 5,
                      background: selected ? p.color : 'var(--jp-border, #1e293b)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800, color: '#fff',
                    }}>
                      {p.icon}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: selected ? '#7ed957' : 'var(--jp-text-muted, #8b95a5)' }}>
                      {p.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Email Segment */}
          <div style={{ background: 'var(--jp-bg-card, #161b22)', borderRadius: 12, border: '1px solid var(--jp-border, #1e293b)', padding: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--jp-text-muted, #8b95a5)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Email Segment
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SEGMENTS.map(s => (
                <button
                  key={s.key}
                  onClick={() => setEmailSegment(s.key)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                    background: emailSegment === s.key ? 'rgba(126, 217, 87, 0.1)' : 'var(--jp-bg-primary, #0d1117)',
                    border: emailSegment === s.key ? '1px solid #7ed957' : '1px solid var(--jp-border, #1e293b)',
                    fontSize: 13, fontWeight: 600,
                    color: emailSegment === s.key ? '#7ed957' : 'var(--jp-text-muted, #8b95a5)',
                    transition: 'all 0.2s',
                  }}
                >
                  {s.label}
                </button>
              ))}
              <button
                onClick={() => setEmailSegment('custom')}
                style={{
                  padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                  background: emailSegment === 'custom' ? 'rgba(126, 217, 87, 0.1)' : 'var(--jp-bg-primary, #0d1117)',
                  border: emailSegment === 'custom' ? '1px solid #7ed957' : '1px solid var(--jp-border, #1e293b)',
                  fontSize: 13, fontWeight: 600,
                  color: emailSegment === 'custom' ? '#7ed957' : 'var(--jp-text-muted, #8b95a5)',
                  transition: 'all 0.2s',
                }}
              >
                Custom Tag
              </button>
            </div>
            {emailSegment === 'custom' && (
              <input
                value={customSegment}
                onChange={e => setCustomSegment(e.target.value)}
                placeholder="Enter tag name..."
                style={{
                  marginTop: 10, width: '100%', maxWidth: 300, padding: '8px 12px', borderRadius: 8,
                  background: 'var(--jp-bg-primary, #0d1117)',
                  border: '1px solid var(--jp-border, #1e293b)',
                  color: 'var(--jp-text, #f0f4f8)', fontSize: 13,
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
            )}
          </div>

          {/* Run Button */}
          <button
            onClick={runWorkflow}
            disabled={running || !topic.trim() || selectedPlatforms.length === 0}
            style={{
              padding: '14px 24px', borderRadius: 10, border: 'none', cursor: running ? 'not-allowed' : 'pointer',
              background: running ? 'var(--jp-border, #1e293b)' : 'linear-gradient(135deg, #7ed957, #5cb83a)',
              color: running ? 'var(--jp-text-muted, #8b95a5)' : '#000',
              fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em',
              opacity: (!topic.trim() || selectedPlatforms.length === 0) ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            {running ? 'Running Workflow...' : 'Generate & Publish'}
          </button>

          {/* Live Progress */}
          {liveSteps.length > 0 && (
            <div style={{ background: 'var(--jp-bg-card, #161b22)', borderRadius: 12, border: '1px solid var(--jp-border, #1e293b)', padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--jp-text-muted, #8b95a5)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Workflow Progress
              </div>
              {liveSteps.map((step, i) => (
                <StepIndicator key={i} step={step} />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: 16, borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div style={{ display: 'grid', gap: 16 }}>

              {/* Blog Preview */}
              {result.blogPost && (
                <div style={{ background: 'var(--jp-bg-card, #161b22)', borderRadius: 12, border: '1px solid var(--jp-border, #1e293b)', padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7ed957' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--jp-text-muted, #8b95a5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Blog Post</span>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--jp-text, #f0f4f8)', margin: '0 0 8px 0' }}>
                    {result.blogPost.title}
                  </h3>
                  <div style={{
                    maxHeight: 200, overflow: 'auto', padding: 12, borderRadius: 8,
                    background: 'var(--jp-bg-primary, #0d1117)',
                    border: '1px solid var(--jp-border, #1e293b)',
                    fontSize: 13, color: 'var(--jp-text-secondary, #c9d1d9)',
                    lineHeight: 1.6, whiteSpace: 'pre-wrap',
                  }}>
                    {result.blogPost.content?.slice(0, 1000)}
                    {(result.blogPost.content?.length || 0) > 1000 ? '...' : ''}
                  </div>
                </div>
              )}

              {/* Social Posts */}
              {result.socialPosts && result.socialPosts.length > 0 && (
                <div style={{ background: 'var(--jp-bg-card, #161b22)', borderRadius: 12, border: '1px solid var(--jp-border, #1e293b)', padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d4ff' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--jp-text-muted, #8b95a5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Social Posts</span>
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {result.socialPosts.map((p, i) => {
                      const plat = PLATFORMS.find(x => x.key === p.platform)
                      return (
                        <div key={i} style={{
                          padding: 12, borderRadius: 8,
                          background: 'var(--jp-bg-primary, #0d1117)',
                          border: '1px solid var(--jp-border, #1e293b)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{
                              width: 20, height: 20, borderRadius: 4,
                              background: plat?.color || '#333',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 8, fontWeight: 800, color: '#fff',
                            }}>
                              {plat?.icon || p.platform[0]}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--jp-text, #f0f4f8)' }}>
                              {plat?.label || p.platform}
                            </span>
                            <span style={{
                              marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                              background: p.posted ? 'rgba(126, 217, 87, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: p.posted ? '#7ed957' : '#ef4444',
                            }}>
                              {p.posted ? 'POSTED' : p.error || 'NOT POSTED'}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--jp-text-secondary, #c9d1d9)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {p.content?.slice(0, 400)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Email Campaign */}
              {result.emailCampaign && (
                <div style={{ background: 'var(--jp-bg-card, #161b22)', borderRadius: 12, border: '1px solid var(--jp-border, #1e293b)', padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--jp-text-muted, #8b95a5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email Campaign</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--jp-bg-primary, #0d1117)', border: '1px solid var(--jp-border, #1e293b)' }}>
                      <div style={{ fontSize: 10, color: 'var(--jp-text-muted, #8b95a5)', fontWeight: 600, textTransform: 'uppercase' }}>Subject</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--jp-text, #f0f4f8)', marginTop: 2 }}>{result.emailCampaign.subject}</div>
                    </div>
                    <div style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--jp-bg-primary, #0d1117)', border: '1px solid var(--jp-border, #1e293b)' }}>
                      <div style={{ fontSize: 10, color: 'var(--jp-text-muted, #8b95a5)', fontWeight: 600, textTransform: 'uppercase' }}>Sent</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#7ed957', marginTop: 2 }}>{result.emailCampaign.sent}</div>
                    </div>
                    <div style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--jp-bg-primary, #0d1117)', border: '1px solid var(--jp-border, #1e293b)' }}>
                      <div style={{ fontSize: 10, color: 'var(--jp-text-muted, #8b95a5)', fontWeight: 600, textTransform: 'uppercase' }}>Segment</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--jp-text, #f0f4f8)', marginTop: 2 }}>{result.emailCampaign.segment}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {historyLoading && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--jp-text-muted, #8b95a5)' }}>
              <div style={{ width: 20, height: 20, margin: '0 auto 10px', border: '2px solid #7ed957', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Loading history...
            </div>
          )}

          {!historyLoading && history.length === 0 && (
            <div style={{
              textAlign: 'center', padding: 60,
              background: 'var(--jp-bg-card, #161b22)',
              borderRadius: 12, border: '1px solid var(--jp-border, #1e293b)',
              color: 'var(--jp-text-muted, #8b95a5)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No executions yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Run your first Blog to Social workflow to see results here.</div>
            </div>
          )}

          {history.map(exec => {
            const expanded = expandedHistory === exec.id
            const statusColor: Record<string, string> = {
              completed: '#7ed957',
              partial: '#f59e0b',
              running: '#00d4ff',
              failed: '#ef4444',
            }

            return (
              <div
                key={exec.id}
                style={{
                  background: 'var(--jp-bg-card, #161b22)',
                  borderRadius: 12,
                  border: '1px solid var(--jp-border, #1e293b)',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setExpandedHistory(expanded ? null : exec.id)}
                  style={{
                    width: '100%', padding: '14px 18px', border: 'none', cursor: 'pointer',
                    background: 'transparent', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}
                >
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: statusColor[exec.status] || '#6b7280',
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--jp-text, #f0f4f8)' }}>
                      {exec.result?.blogPost?.title || exec.input?.topic || 'Untitled'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--jp-text-muted, #8b95a5)', marginTop: 2 }}>
                      {new Date(exec.started_at).toLocaleString()} — {exec.status}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--jp-text-muted, #8b95a5)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    V
                  </span>
                </button>

                {expanded && (
                  <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--jp-border, #1e293b)' }}>
                    {/* Steps */}
                    <div style={{ marginTop: 12 }}>
                      {(exec.result?.steps || exec.steps || []).map((step: WorkflowStep, i: number) => (
                        <StepIndicator key={i} step={step} />
                      ))}
                    </div>

                    {/* Quick stats */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                      {exec.result?.socialPosts && (
                        <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'rgba(0, 212, 255, 0.08)', color: '#00d4ff', fontWeight: 600 }}>
                          {exec.result.socialPosts.filter(p => p.posted).length}/{exec.result.socialPosts.length} social posted
                        </span>
                      )}
                      {exec.result?.emailCampaign && (
                        <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'rgba(167, 139, 250, 0.08)', color: '#a78bfa', fontWeight: 600 }}>
                          {exec.result.emailCampaign.sent} emails sent
                        </span>
                      )}
                    </div>

                    {exec.error && (
                      <div style={{ marginTop: 10, fontSize: 12, color: '#ef4444' }}>
                        Error: {exec.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
