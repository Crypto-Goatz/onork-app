'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLocation } from '@/lib/location-context'
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Loader2,
  ChevronDown,
  Rss,
  Share2,
  Mail,
} from 'lucide-react'

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
  { key: 'linkedin', label: 'LinkedIn', color: 'bg-[#0A66C2]', abbr: 'in' },
  { key: 'twitter', label: 'X / Twitter', color: 'bg-black', abbr: 'X' },
  { key: 'facebook', label: 'Facebook', color: 'bg-[#1877F2]', abbr: 'f' },
  { key: 'instagram', label: 'Instagram', color: 'bg-[#E4405F]', abbr: 'ig' },
  { key: 'google', label: 'Google Business', color: 'bg-[#4285F4]', abbr: 'G' },
  { key: 'tiktok', label: 'TikTok', color: 'bg-[#00F2EA]', abbr: 'TT' },
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

function StepIndicator({ step, running }: { step: WorkflowStep; running: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="shrink-0 w-7 h-7 flex items-center justify-center">
        {step.status === 'pending' && running ? (
          <Loader2 className="w-5 h-5 text-core-green animate-spin" />
        ) : step.status === 'completed' ? (
          <CheckCircle2 className="w-5 h-5 text-core-green" />
        ) : step.status === 'failed' ? (
          <XCircle className="w-5 h-5 text-core-red" />
        ) : step.status === 'skipped' ? (
          <MinusCircle className="w-5 h-5 text-core-text-muted" />
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-core-border" />
        )}
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-semibold text-core-text">{step.name}</div>
        {step.status === 'pending' && running && (
          <div className="text-[11px] text-core-text-muted mt-0.5">
            {STEP_LABELS[step.name] || 'Processing...'}
          </div>
        )}
        {step.status === 'completed' && step.duration_ms > 0 && (
          <div className="text-[11px] text-core-green mt-0.5">
            Completed in {(step.duration_ms / 1000).toFixed(1)}s
          </div>
        )}
        {step.status === 'failed' && step.detail && (
          <div className="text-[11px] text-core-red mt-0.5">{step.detail}</div>
        )}
      </div>
    </div>
  )
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

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-core-green to-[#5cb83a] flex items-center justify-center shrink-0">
          <Rss className="w-5 h-5 text-black" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-core-text m-0">
              Blog to Social + Email
            </h1>
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-gradient-to-r from-core-green to-core-cyan text-black tracking-widest">
              UNLIMITED
            </span>
          </div>
          <div className="text-[12px] text-core-text-muted mt-0.5">
            AI writes a blog, posts to social, and emails your contacts — one click.
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 mb-6 rounded-lg overflow-hidden border border-core-border">
        {(['create', 'history'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'flex-1 px-4 py-2.5 border-none cursor-pointer text-[13px] font-bold capitalize transition-all duration-200',
              tab === t
                ? 'bg-core-card text-core-green border-b-2 border-core-green'
                : 'bg-transparent text-core-text-muted border-b-2 border-transparent',
            ].join(' ')}
          >
            {t === 'create' ? 'Create Workflow' : 'Execution History'}
          </button>
        ))}
      </div>

      {/* CREATE TAB */}
      {tab === 'create' && (
        <div className="grid gap-5">

          {/* Topic */}
          <div className="bg-core-card rounded-xl border border-core-border p-5">
            <label className="block text-[12px] font-bold text-core-text-muted mb-2 uppercase tracking-[0.06em]">
              Blog Topic
            </label>
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. How AI automation is transforming small business operations in 2026"
              rows={3}
              className="w-full px-3.5 py-3 rounded-lg resize-y bg-core-bg border border-core-border text-core-text text-[14px] outline-none font-inherit placeholder:text-core-text-muted"
            />
          </div>

          {/* Tone */}
          <div className="bg-core-card rounded-xl border border-core-border p-5">
            <label className="block text-[12px] font-bold text-core-text-muted mb-3 uppercase tracking-[0.06em]">
              Tone
            </label>
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
              {TONES.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTone(t.key)}
                  className={[
                    'px-3.5 py-2.5 rounded-lg cursor-pointer text-left transition-all duration-200',
                    tone === t.key
                      ? 'bg-core-green/10 border border-core-green'
                      : 'bg-core-bg border border-core-border',
                  ].join(' ')}
                >
                  <div className={`text-[13px] font-bold ${tone === t.key ? 'text-core-green' : 'text-core-text'}`}>
                    {t.label}
                  </div>
                  <div className="text-[11px] text-core-text-muted mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Platforms */}
          <div className="bg-core-card rounded-xl border border-core-border p-5">
            <label className="block text-[12px] font-bold text-core-text-muted mb-3 uppercase tracking-[0.06em]">
              Social Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => {
                const selected = selectedPlatforms.includes(p.key)
                return (
                  <button
                    key={p.key}
                    onClick={() => togglePlatform(p.key)}
                    className={[
                      'flex items-center gap-2 px-3.5 py-2 rounded-lg cursor-pointer transition-all duration-200',
                      selected
                        ? 'bg-core-green/10 border border-core-green'
                        : 'bg-core-bg border border-core-border',
                    ].join(' ')}
                  >
                    <span className={`w-[22px] h-[22px] rounded-[5px] ${selected ? p.color : 'bg-core-border'} flex items-center justify-center text-[9px] font-extrabold text-white`}>
                      {p.abbr}
                    </span>
                    <span className={`text-[13px] font-semibold ${selected ? 'text-core-green' : 'text-core-text-muted'}`}>
                      {p.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Email Segment */}
          <div className="bg-core-card rounded-xl border border-core-border p-5">
            <label className="block text-[12px] font-bold text-core-text-muted mb-3 uppercase tracking-[0.06em]">
              Email Segment
            </label>
            <div className="flex flex-wrap gap-2">
              {SEGMENTS.map(s => (
                <button
                  key={s.key}
                  onClick={() => setEmailSegment(s.key)}
                  className={[
                    'px-4 py-2 rounded-lg cursor-pointer text-[13px] font-semibold transition-all duration-200',
                    emailSegment === s.key
                      ? 'bg-core-green/10 border border-core-green text-core-green'
                      : 'bg-core-bg border border-core-border text-core-text-muted',
                  ].join(' ')}
                >
                  {s.label}
                </button>
              ))}
              <button
                onClick={() => setEmailSegment('custom')}
                className={[
                  'px-4 py-2 rounded-lg cursor-pointer text-[13px] font-semibold transition-all duration-200',
                  emailSegment === 'custom'
                    ? 'bg-core-green/10 border border-core-green text-core-green'
                    : 'bg-core-bg border border-core-border text-core-text-muted',
                ].join(' ')}
              >
                Custom Tag
              </button>
            </div>
            {emailSegment === 'custom' && (
              <input
                value={customSegment}
                onChange={e => setCustomSegment(e.target.value)}
                placeholder="Enter tag name..."
                className="mt-2.5 w-full max-w-[300px] px-3 py-2 rounded-lg bg-core-bg border border-core-border text-core-text text-[13px] outline-none font-inherit placeholder:text-core-text-muted"
              />
            )}
          </div>

          {/* Run Button */}
          <button
            onClick={runWorkflow}
            disabled={running || !topic.trim() || selectedPlatforms.length === 0}
            className={[
              'px-6 py-3.5 rounded-xl border-none text-[15px] font-extrabold tracking-tight transition-all duration-200',
              running
                ? 'bg-core-border text-core-text-muted cursor-not-allowed'
                : 'bg-gradient-to-br from-core-green to-[#5cb83a] text-black cursor-pointer',
              (!topic.trim() || selectedPlatforms.length === 0) ? 'opacity-50' : 'opacity-100',
            ].join(' ')}
          >
            {running ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Running Workflow...
              </span>
            ) : (
              'Generate & Publish'
            )}
          </button>

          {/* Live Progress */}
          {liveSteps.length > 0 && (
            <div className="bg-core-card rounded-xl border border-core-border p-5">
              <div className="text-[12px] font-bold text-core-text-muted mb-3 uppercase tracking-[0.06em]">
                Workflow Progress
              </div>
              {liveSteps.map((step, i) => (
                <StepIndicator key={i} step={step} running={running} />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-core-red/[0.08] border border-core-red/30 text-core-red text-[13px]">
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="grid gap-4">

              {/* Blog Preview */}
              {result.blogPost && (
                <div className="bg-core-card rounded-xl border border-core-border p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-core-green" />
                    <span className="text-[12px] font-bold text-core-text-muted uppercase tracking-[0.06em]">Blog Post</span>
                  </div>
                  <h3 className="text-[18px] font-extrabold text-core-text m-0 mb-2">
                    {result.blogPost.title}
                  </h3>
                  <div className="max-h-[200px] overflow-auto p-3 rounded-lg bg-core-bg border border-core-border text-[13px] text-core-text-dim leading-relaxed whitespace-pre-wrap">
                    {result.blogPost.content?.slice(0, 1000)}
                    {(result.blogPost.content?.length || 0) > 1000 ? '...' : ''}
                  </div>
                </div>
              )}

              {/* Social Posts */}
              {result.socialPosts && result.socialPosts.length > 0 && (
                <div className="bg-core-card rounded-xl border border-core-border p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-core-cyan" />
                    <span className="text-[12px] font-bold text-core-text-muted uppercase tracking-[0.06em]">Social Posts</span>
                  </div>
                  <div className="grid gap-2.5">
                    {result.socialPosts.map((p, i) => {
                      const plat = PLATFORMS.find(x => x.key === p.platform)
                      return (
                        <div key={i} className="p-3 rounded-lg bg-core-bg border border-core-border">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`w-5 h-5 rounded ${plat?.color || 'bg-core-border'} flex items-center justify-center text-[8px] font-extrabold text-white`}>
                              {plat?.abbr || p.platform[0]}
                            </span>
                            <span className="text-[12px] font-bold text-core-text">
                              {plat?.label || p.platform}
                            </span>
                            <span className={[
                              'ml-auto text-[10px] font-bold px-2 py-0.5 rounded',
                              p.posted
                                ? 'bg-core-green/10 text-core-green'
                                : 'bg-core-red/10 text-core-red',
                            ].join(' ')}>
                              {p.posted ? 'POSTED' : p.error || 'NOT POSTED'}
                            </span>
                          </div>
                          <div className="text-[12px] text-core-text-dim leading-relaxed whitespace-pre-wrap">
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
                <div className="bg-core-card rounded-xl border border-core-border p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-core-purple" />
                    <span className="text-[12px] font-bold text-core-text-muted uppercase tracking-[0.06em]">Email Campaign</span>
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    <div className="px-3.5 py-2 rounded-lg bg-core-bg border border-core-border">
                      <div className="text-[10px] text-core-text-muted font-semibold uppercase">Subject</div>
                      <div className="text-[13px] font-bold text-core-text mt-0.5">{result.emailCampaign.subject}</div>
                    </div>
                    <div className="px-3.5 py-2 rounded-lg bg-core-bg border border-core-border">
                      <div className="text-[10px] text-core-text-muted font-semibold uppercase">Sent</div>
                      <div className="text-[20px] font-extrabold text-core-green mt-0.5">{result.emailCampaign.sent}</div>
                    </div>
                    <div className="px-3.5 py-2 rounded-lg bg-core-bg border border-core-border">
                      <div className="text-[10px] text-core-text-muted font-semibold uppercase">Segment</div>
                      <div className="text-[13px] font-bold text-core-text mt-0.5">{result.emailCampaign.segment}</div>
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
        <div className="grid gap-3">
          {historyLoading && (
            <div className="text-center py-10 text-core-text-muted flex flex-col items-center gap-2.5">
              <Loader2 className="w-5 h-5 animate-spin text-core-green" />
              Loading history...
            </div>
          )}

          {!historyLoading && history.length === 0 && (
            <div className="text-center py-16 bg-core-card rounded-xl border border-core-border text-core-text-muted">
              <div className="text-[14px] font-semibold">No executions yet</div>
              <div className="text-[12px] mt-1">Run your first Blog to Social workflow to see results here.</div>
            </div>
          )}

          {history.map(exec => {
            const expanded = expandedHistory === exec.id
            const statusColorMap: Record<string, string> = {
              completed: 'bg-core-green',
              partial: 'bg-core-amber',
              running: 'bg-core-cyan',
              failed: 'bg-core-red',
            }
            const dotColor = statusColorMap[exec.status] || 'bg-core-text-muted'

            return (
              <div
                key={exec.id}
                className="bg-core-card rounded-xl border border-core-border overflow-hidden"
              >
                <button
                  onClick={() => setExpandedHistory(expanded ? null : exec.id)}
                  className="w-full px-[18px] py-3.5 border-none cursor-pointer bg-transparent text-left flex items-center gap-3"
                >
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
                  <div className="flex-1">
                    <div className="text-[14px] font-bold text-core-text">
                      {exec.result?.blogPost?.title || exec.input?.topic || 'Untitled'}
                    </div>
                    <div className="text-[11px] text-core-text-muted mt-0.5">
                      {new Date(exec.started_at).toLocaleString()} — {exec.status}
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-core-text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {expanded && (
                  <div className="px-[18px] pb-3.5 border-t border-core-border">
                    <div className="mt-3">
                      {(exec.result?.steps || exec.steps || []).map((step: WorkflowStep, i: number) => (
                        <StepIndicator key={i} step={step} running={false} />
                      ))}
                    </div>

                    <div className="flex gap-3 mt-3 flex-wrap">
                      {exec.result?.socialPosts && (
                        <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md bg-core-cyan/[0.08] text-core-cyan font-semibold">
                          <Share2 className="w-3 h-3" />
                          {exec.result.socialPosts.filter(p => p.posted).length}/{exec.result.socialPosts.length} social posted
                        </span>
                      )}
                      {exec.result?.emailCampaign && (
                        <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md bg-core-purple/[0.08] text-core-purple font-semibold">
                          <Mail className="w-3 h-3" />
                          {exec.result.emailCampaign.sent} emails sent
                        </span>
                      )}
                    </div>

                    {exec.error && (
                      <div className="mt-2.5 text-[12px] text-core-red">
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
