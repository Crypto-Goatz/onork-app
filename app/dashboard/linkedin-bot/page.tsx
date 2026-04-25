'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Zap, Check, X, RefreshCw, Send, Clock, BarChart3,
  Settings, TrendingUp, Loader2, MessageSquare, Target,
  AlertTriangle, ChevronDown, Play, Pause, Shield,
} from 'lucide-react'
import { WelcomeModal } from '@/components/ui/welcome-modal'
import { PageLoading, InlineError, EmptyState } from '@/components/ui/page-states'

type Tab = 'queue' | 'performance' | 'settings'

interface QueueItem {
  id: string
  content_type: string
  content_text: string
  vpis_score: number
  hook_score: number
  patterns_fired: string[]
  hook_archetype: string
  status: string
  created_at: string
}

interface BotConfig {
  target_keywords: string[]
  icp_description: string
  max_posts_per_day: number
  max_comments_per_day: number
  auto_post_enabled: boolean
  auto_comment_enabled: boolean
  emergency_pause: boolean
  posting_window_start: number
  posting_window_end: number
  product_mention_level: string
}

export default function LinkedInBotPage() {
  const [tab, setTab] = useState<Tab>('queue')
  const [loading, setLoading] = useState(true)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [config, setConfig] = useState<BotConfig | null>(null)
  const [stats, setStats] = useState({ pending: 0, approved: 0, posted: 0, rejected: 0, avgScore: 0 })
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [topic, setTopic] = useState('')
  const [linkedinConnected, setLinkedinConnected] = useState(false)
  const [linkedinName, setLinkedinName] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [configRes, liRes] = await Promise.all([
        fetch('/api/bot/config'),
        fetch('/api/linkedin-bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status' }),
        }),
      ])
      if (configRes.ok) {
        const data = await configRes.json()
        setConfig(data.config)
        setQueue(data.queue || [])
        setStats(data.stats || {})
      }
      if (liRes.ok) {
        const liData = await liRes.json()
        setLinkedinConnected(liData.connected || false)
        setLinkedinName(liData.name || '')
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function generatePost() {
    if (!topic.trim()) { toast.error('Enter a topic'); return }
    setGenerating(true)
    try {
      const res = await fetch('/api/bot/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          hook_archetype: 'bait_and_flip',
          product_mention: config?.product_mention_level || 'moderate',
        }),
      })
      const data = await res.json()
      if (data.queue_id) {
        toast.success(`Post generated — VPIS ${data.scores?.adjusted_score}`)
        setTopic('')
        loadData()
      } else {
        toast.error(data.error || 'Generation failed')
      }
    } catch { toast.error('Network error') }
    setGenerating(false)
  }

  async function handlePublish(id: string) {
    setPublishing(id)
    try {
      const res = await fetch('/api/linkedin-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', queue_id: id }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Posted to LinkedIn!', { description: `Post ID: ${data.post_id}` })
        loadData()
      } else {
        toast.error('Post failed', { description: data.error })
      }
    } catch { toast.error('Network error') }
    setPublishing(null)
  }

  async function connectLinkedIn() {
    try {
      const res = await fetch('/api/auth/connect/linkedin')
      if (res.ok) {
        const { url } = await res.json()
        const popup = window.open(url, 'connect-linkedin', 'width=600,height=700')
        const check = setInterval(() => {
          if (popup?.closed) { clearInterval(check); loadData() }
        }, 1000)
      }
    } catch {}
  }

  async function handleAction(id: string, action: 'approve' | 'reject') {
    const res = await fetch('/api/bot/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queue_id: id, action }),
    })
    if (res.ok) {
      toast.success(action === 'approve' ? 'Approved' : 'Rejected')
      loadData()
    }
  }

  async function saveConfig(updates: Partial<BotConfig>) {
    const res = await fetch('/api/bot/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      const data = await res.json()
      setConfig(data.config)
      toast.success('Settings saved')
    }
  }

  if (loading) return <PageLoading message="Loading LinkedIn Bot" />

  const pendingItems = queue.filter(q => q.status === 'pending_approval')
  const postedItems = queue.filter(q => q.status === 'posted')

  return (
    <div className="px-6 py-5 max-w-[1100px] mx-auto">
      <WelcomeModal
        storageKey="linkedin-bot"
        title="0nLinkedIn Bot"
        subtitle="AI-powered LinkedIn posting with VPIS scoring. Every post scored, every pattern tracked, always learning."
        steps={[
          { title: 'Generate posts with AI', description: 'Enter a topic — the AI writes a VPIS-optimized LinkedIn post. It rewrites up to 3 times targeting a score of 85+.', icon: <Zap className="w-5 h-5 text-[#f97316]" />, tip: 'The AI uses Vibe Style rules: short sentences, no corporate vocab, specific numbers, closing question.' },
          { title: 'Review and approve', description: 'Every post sits in your approval queue with a full VPIS score breakdown. Approve, edit, or reject with one click.', icon: <Check className="w-5 h-5 text-[#22c55e]" />, tip: 'Posts scoring 85+ are highlighted as high performers.' },
          { title: 'The formula learns', description: 'After posting, the bot tracks engagement (likes, comments, shares). The VPIS formula self-tunes its weights based on what actually works.', icon: <TrendingUp className="w-5 h-5 text-[#00d4ff]" /> },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-core-text flex items-center gap-2 m-0">
            <span className="text-[#f97316]">0n</span>LinkedIn Bot
            {config?.emergency_pause && (
              <span className="px-2 py-0.5 rounded-md bg-core-red/10 text-core-red text-[10px] font-bold">PAUSED</span>
            )}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[12px] text-core-text-muted m-0">
              VPIS v0.5 &middot; {stats.posted} posted &middot; Avg score {stats.avgScore}
            </p>
            {linkedinConnected ? (
              <span className="flex items-center gap-1 text-[11px] text-core-green font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-core-green" /> LinkedIn: {linkedinName}
              </span>
            ) : (
              <button onClick={connectLinkedIn}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0A66C2]/10 text-[#0A66C2] text-[11px] font-semibold cursor-pointer border border-[#0A66C2]/20 hover:bg-[#0A66C2]/20 transition-colors">
                Connect LinkedIn
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-core-border bg-transparent text-core-text-muted text-[12px] cursor-pointer hover:text-core-text transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Pending', value: stats.pending, color: 'text-core-amber' },
          { label: 'Approved', value: stats.approved, color: 'text-core-green' },
          { label: 'Posted', value: stats.posted, color: 'text-core-cyan' },
          { label: 'Avg Score', value: stats.avgScore, color: 'text-[#f97316]' },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl bg-core-card border border-core-border">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-core-text-muted uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-core-card rounded-xl p-1 border border-core-border">
        {([
          { key: 'queue', label: 'Approval Queue', Icon: MessageSquare },
          { key: 'performance', label: 'Performance', Icon: BarChart3 },
          { key: 'settings', label: 'Settings', Icon: Settings },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-all border-none ${tab === t.key ? 'bg-[#f97316]/10 text-[#f97316] font-semibold' : 'bg-transparent text-core-text-dim hover:text-core-text'}`}>
            <t.Icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Generate */}
      {tab === 'queue' && (
        <div className="mb-5 p-4 rounded-xl bg-core-card border border-core-border">
          <div className="flex gap-2">
            <input
              type="text" value={topic} onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generatePost()}
              placeholder="Enter a topic — AI generates a VPIS-scored post..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-core-bg border border-core-border text-core-text text-[13px] placeholder:text-core-text-muted outline-none focus:border-[#f97316]/40"
            />
            <button onClick={generatePost} disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f97316] text-white text-[13px] font-bold cursor-pointer border-none hover:bg-[#f97316]/90 disabled:opacity-50">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {generating ? 'Generating...' : 'Generate Post'}
            </button>
          </div>
        </div>
      )}

      {/* Queue Tab */}
      {tab === 'queue' && (
        <div className="space-y-3">
          {pendingItems.length === 0 && (
            <EmptyState icon={MessageSquare} title="Queue is empty" description="Generate a post to get started." />
          )}
          {pendingItems.map(item => (
            <div key={item.id} className="rounded-xl bg-core-card border border-core-border p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${item.vpis_score >= 85 ? 'bg-core-green/10 text-core-green' : item.vpis_score >= 75 ? 'bg-core-amber/10 text-core-amber' : 'bg-core-red/10 text-core-red'}`}>
                  VPIS {item.vpis_score}
                </span>
                <span className="text-[10px] text-core-text-muted capitalize">{item.content_type}</span>
                {item.hook_archetype && (
                  <span className="text-[10px] text-core-text-muted">{item.hook_archetype.replace(/_/g, ' ')}</span>
                )}
                <span className="text-[10px] text-core-text-muted ml-auto">
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-[13px] text-core-text-dim leading-relaxed whitespace-pre-wrap mb-4">
                {item.content_text}
              </p>
              {item.patterns_fired?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.patterns_fired.map(p => (
                    <span key={p} className="px-1.5 py-0.5 rounded text-[9px] bg-[#f97316]/10 text-[#f97316] font-mono">{p}</span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                {linkedinConnected && (
                  <button onClick={() => handlePublish(item.id)} disabled={publishing === item.id}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A66C2] text-white text-[12px] font-bold cursor-pointer border-none hover:bg-[#0A66C2]/90 disabled:opacity-50">
                    {publishing === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {publishing === item.id ? 'Publishing...' : 'Post to LinkedIn'}
                  </button>
                )}
                <button onClick={() => handleAction(item.id, 'approve')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-core-green text-core-bg text-[12px] font-bold cursor-pointer border-none">
                  <Check className="w-3.5 h-3.5" /> Approve
                </button>
                <button onClick={() => handleAction(item.id, 'reject')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-core-border text-core-text-muted text-[12px] cursor-pointer bg-transparent hover:text-core-red hover:border-core-red/30">
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}

          {postedItems.length > 0 && (
            <>
              <h3 className="text-[11px] font-bold text-core-text-muted uppercase tracking-wider mt-6">Recently Posted</h3>
              {postedItems.slice(0, 5).map(item => (
                <div key={item.id} className="rounded-xl bg-core-card border border-core-border p-4 opacity-60">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-core-green/10 text-core-green">VPIS {item.vpis_score}</span>
                    <span className="text-[10px] text-core-text-muted">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[12px] text-core-text-muted line-clamp-2">{item.content_text}</p>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Performance Tab */}
      {tab === 'performance' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-core-card border border-core-border p-6 text-center">
            <TrendingUp className="w-10 h-10 mx-auto text-core-border mb-3" />
            <h3 className="text-[15px] font-bold text-core-text mb-1">Performance Dashboard</h3>
            <p className="text-[13px] text-core-text-muted">
              Post at least 5 pieces of content to see performance data.
              The learning loop activates after enough data to detect patterns.
            </p>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {tab === 'settings' && config && (
        <div className="space-y-4">
          <div className="rounded-xl bg-core-card border border-core-border p-5">
            <h3 className="text-[14px] font-bold text-core-text mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-core-red" /> Safety Controls
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-core-text">Emergency Pause</p>
                  <p className="text-[11px] text-core-text-muted">Stop all automated posting immediately</p>
                </div>
                <button onClick={() => saveConfig({ emergency_pause: !config.emergency_pause })}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer border-none ${config.emergency_pause ? 'bg-core-red' : 'bg-core-border'}`}>
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${config.emergency_pause ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-core-text">Auto-Post</p>
                  <p className="text-[11px] text-core-text-muted">Posts auto-fire after approval timeout</p>
                </div>
                <button onClick={() => saveConfig({ auto_post_enabled: !config.auto_post_enabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer border-none ${config.auto_post_enabled ? 'bg-core-green' : 'bg-core-border'}`}>
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${config.auto_post_enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-core-text">Auto-Comment</p>
                  <p className="text-[11px] text-core-text-muted">Comments auto-fire on high-score targets</p>
                </div>
                <button onClick={() => saveConfig({ auto_comment_enabled: !config.auto_comment_enabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer border-none ${config.auto_comment_enabled ? 'bg-core-green' : 'bg-core-border'}`}>
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${config.auto_comment_enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-core-card border border-core-border p-5">
            <h3 className="text-[14px] font-bold text-core-text mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-[#f97316]" /> Content Settings
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-core-text-muted font-semibold uppercase tracking-wider">ICP Description</label>
                <textarea
                  defaultValue={config.icp_description || ''}
                  onBlur={e => saveConfig({ icp_description: e.target.value })}
                  placeholder="Founders using 3+ AI tools that don't connect..."
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-core-bg border border-core-border text-core-text text-[13px] outline-none resize-none h-20"
                />
              </div>
              <div>
                <label className="text-[11px] text-core-text-muted font-semibold uppercase tracking-wider">Target Keywords</label>
                <input
                  defaultValue={config.target_keywords?.join(', ') || ''}
                  onBlur={e => saveConfig({ target_keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean) })}
                  placeholder="mcp, claude, ai automation, workflow"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-core-bg border border-core-border text-core-text text-[13px] outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-core-text-muted font-semibold uppercase tracking-wider">Max Posts/Day</label>
                  <input type="number" defaultValue={config.max_posts_per_day}
                    onBlur={e => saveConfig({ max_posts_per_day: parseInt(e.target.value) || 1 })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-core-bg border border-core-border text-core-text text-[13px] outline-none" />
                </div>
                <div>
                  <label className="text-[11px] text-core-text-muted font-semibold uppercase tracking-wider">Max Comments/Day</label>
                  <input type="number" defaultValue={config.max_comments_per_day}
                    onBlur={e => saveConfig({ max_comments_per_day: parseInt(e.target.value) || 5 })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-core-bg border border-core-border text-core-text text-[13px] outline-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
