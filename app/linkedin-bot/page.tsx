'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bot, Zap, CheckCircle, XCircle, Clock, TrendingUp,
  BarChart3, Settings, RefreshCw, Play, Pause, Send,
  ChevronDown, ChevronUp, Linkedin, AlertTriangle, Loader2,
  ToggleLeft, ToggleRight, Eye, Trash2, Calendar, Target,
  Sparkles, Activity
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BotConfig {
  id: string
  name: string
  active: boolean
  niche: string | null
  tone: string
  vpis_target: number
  max_posts_day: number
  max_comments_day: number
  auto_approve: boolean
  slack_notify: boolean
  icp_keywords: string[]
  post_time_hour: number
  linkedin_account_id: string | null
  next_fire_at?: string | null
}

interface QueueItem {
  id: string
  type: 'post' | 'comment'
  content: string
  vpis_score: number | null
  vpis_breakdown: {
    composite: number
    breakdown: Record<string, number>
    grade: string
    patterns_fired: Array<{ name: string; category: string; delta: number }>
  } | null
  hook_archetype: string | null
  rewrite_count: number
  status: string
  created_at: string
  target_post_url: string | null
}

interface StatusData {
  configs: BotConfig[]
  queue_depth: number
  published_this_week: number
  avg_vpis_score: number | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function gradeColor(grade: string) {
  if (grade === 'S') return 'text-core-green'
  if (grade === 'A') return 'text-core-cyan'
  if (grade === 'B') return 'text-core-amber'
  return 'text-core-text-dim'
}

function vpisColor(score: number) {
  if (score >= 90) return 'text-core-green'
  if (score >= 80) return 'text-core-cyan'
  if (score >= 70) return 'text-core-amber'
  return 'text-core-red'
}

function formatHour(h: number) {
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:00 ${ampm}`
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── VPIS Bar ──────────────────────────────────────────────────────────────────

function VPISBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-core-text-dim truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-core-border rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', score >= 80 ? 'bg-core-green' : score >= 60 ? 'bg-core-amber' : 'bg-core-red')}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cn('w-6 text-right font-mono', vpisColor(score))}>{score}</span>
    </div>
  )
}

// ── Queue Card ────────────────────────────────────────────────────────────────

function QueueCard({
  item,
  onApprove,
  onReject,
  approving,
}: {
  item: QueueItem
  onApprove: (id: string) => void
  onReject: (id: string) => void
  approving: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const bd = item.vpis_breakdown

  return (
    <div className="bg-core-card border border-core-border rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Linkedin className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-xs text-core-text-dim font-mono">{item.hook_archetype ?? item.type}</span>
          {item.rewrite_count > 0 && (
            <span className="text-xs bg-core-border text-core-text-muted px-1.5 py-0.5 rounded">
              {item.rewrite_count}x rewrite
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item.vpis_score !== null && (
            <div className={cn('text-sm font-bold font-mono', vpisColor(item.vpis_score))}>
              {item.vpis_score}
              {bd && <span className="text-xs font-normal ml-0.5 text-core-text-dim">/{bd.grade}</span>}
            </div>
          )}
          <span className="text-xs text-core-text-muted">{timeAgo(item.created_at)}</span>
        </div>
      </div>

      {/* Content preview */}
      <p className={cn('text-sm text-core-text leading-relaxed whitespace-pre-wrap', !expanded && 'line-clamp-4')}>
        {item.content}
      </p>
      <button
        onClick={() => setExpanded(e => !e)}
        className="text-xs text-core-text-dim flex items-center gap-1 hover:text-core-text transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Collapse' : 'Read full post'}
      </button>

      {/* VPIS breakdown */}
      {expanded && bd && (
        <div className="space-y-1.5 pt-1 border-t border-core-border">
          <p className="text-xs text-core-text-muted font-medium mb-2">VPIS Breakdown</p>
          {Object.entries(bd.breakdown).map(([k, v]) => (
            <VPISBar key={k} label={k} score={Math.round(v)} />
          ))}
          {bd.patterns_fired.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {bd.patterns_fired.map(p => (
                <span
                  key={p.name}
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded border',
                    p.delta > 0
                      ? 'border-core-green/30 text-core-green bg-core-green/5'
                      : 'border-core-red/30 text-core-red bg-core-red/5'
                  )}
                >
                  {p.delta > 0 ? '+' : ''}{p.delta} {p.name.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {item.status === 'pending_approval' && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onApprove(item.id)}
            disabled={approving === item.id}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-core-green/10 hover:bg-core-green/20 border border-core-green/30 text-core-green text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            {approving === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Approve & Schedule
          </button>
          <button
            onClick={() => onReject(item.id)}
            disabled={approving === item.id}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-core-red/10 hover:bg-core-red/20 border border-core-red/30 text-core-red text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            Reject
          </button>
        </div>
      )}

      {item.status !== 'pending_approval' && (
        <div className={cn(
          'text-xs px-2 py-1 rounded-lg border w-fit',
          item.status === 'scheduled' ? 'border-core-cyan/30 text-core-cyan bg-core-cyan/5' :
          item.status === 'published' ? 'border-core-green/30 text-core-green bg-core-green/5' :
          item.status === 'rejected' ? 'border-core-red/30 text-core-red bg-core-red/5' :
          'border-core-border text-core-text-muted'
        )}>
          {item.status}
        </div>
      )}
    </div>
  )
}

// ── Settings Panel ────────────────────────────────────────────────────────────

function SettingsPanel({ config, onUpdate }: { config: BotConfig; onUpdate: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: config.name,
    niche: config.niche ?? '',
    tone: config.tone,
    vpis_target: config.vpis_target,
    max_posts_day: config.max_posts_day,
    post_time_hour: config.post_time_hour,
    auto_approve: config.auto_approve,
    slack_notify: config.slack_notify,
    icp_keywords_raw: config.icp_keywords.join(', '),
  })

  const supabase = createClient()

  async function save() {
    setSaving(true)
    const { error } = await supabase
      .from('bot_config')
      .update({
        name: form.name,
        niche: form.niche || null,
        tone: form.tone,
        vpis_target: form.vpis_target,
        max_posts_day: form.max_posts_day,
        post_time_hour: form.post_time_hour,
        auto_approve: form.auto_approve,
        slack_notify: form.slack_notify,
        icp_keywords: form.icp_keywords_raw.split(',').map(s => s.trim()).filter(Boolean),
      })
      .eq('id', config.id)
    setSaving(false)
    if (!error) onUpdate()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-core-text-dim">Bot Name</label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full bg-core-bg border border-core-border rounded-lg px-3 py-2 text-sm text-core-text focus:outline-none focus:border-core-green"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-core-text-dim">Niche / Context</label>
          <input
            value={form.niche}
            onChange={e => setForm(f => ({ ...f, niche: e.target.value }))}
            placeholder="e.g. B2B SaaS, agency growth"
            className="w-full bg-core-bg border border-core-border rounded-lg px-3 py-2 text-sm text-core-text focus:outline-none focus:border-core-green placeholder:text-core-text-muted"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-core-text-dim">Writing Tone</label>
          <select
            value={form.tone}
            onChange={e => setForm(f => ({ ...f, tone: e.target.value }))}
            className="w-full bg-core-bg border border-core-border rounded-lg px-3 py-2 text-sm text-core-text focus:outline-none focus:border-core-green"
          >
            <option value="thought_leader">Thought Leader</option>
            <option value="builder">Builder</option>
            <option value="storyteller">Storyteller</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-core-text-dim">VPIS Target Score</label>
          <input
            type="number"
            min={60}
            max={99}
            value={form.vpis_target}
            onChange={e => setForm(f => ({ ...f, vpis_target: Number(e.target.value) }))}
            className="w-full bg-core-bg border border-core-border rounded-lg px-3 py-2 text-sm text-core-text focus:outline-none focus:border-core-green"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-core-text-dim">Max Posts / Day</label>
          <input
            type="number"
            min={1}
            max={2}
            value={form.max_posts_day}
            onChange={e => setForm(f => ({ ...f, max_posts_day: Number(e.target.value) }))}
            className="w-full bg-core-bg border border-core-border rounded-lg px-3 py-2 text-sm text-core-text focus:outline-none focus:border-core-green"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-core-text-dim">Post Time (EST)</label>
          <select
            value={form.post_time_hour}
            onChange={e => setForm(f => ({ ...f, post_time_hour: Number(e.target.value) }))}
            className="w-full bg-core-bg border border-core-border rounded-lg px-3 py-2 text-sm text-core-text focus:outline-none focus:border-core-green"
          >
            {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(h => (
              <option key={h} value={h}>{formatHour(h)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-core-text-dim">ICP Keywords (comma-separated)</label>
        <input
          value={form.icp_keywords_raw}
          onChange={e => setForm(f => ({ ...f, icp_keywords_raw: e.target.value }))}
          placeholder="AI, automation, agency, SaaS, revenue"
          className="w-full bg-core-bg border border-core-border rounded-lg px-3 py-2 text-sm text-core-text focus:outline-none focus:border-core-green placeholder:text-core-text-muted"
        />
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={() => setForm(f => ({ ...f, auto_approve: !f.auto_approve }))}
          className="flex items-center gap-2 text-sm text-core-text"
        >
          {form.auto_approve
            ? <ToggleRight className="w-5 h-5 text-core-green" />
            : <ToggleLeft className="w-5 h-5 text-core-text-dim" />}
          Auto-approve posts
        </button>
        <button
          onClick={() => setForm(f => ({ ...f, slack_notify: !f.slack_notify }))}
          className="flex items-center gap-2 text-sm text-core-text"
        >
          {form.slack_notify
            ? <ToggleRight className="w-5 h-5 text-core-green" />
            : <ToggleLeft className="w-5 h-5 text-core-text-dim" />}
          Slack notifications
        </button>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-core-green/10 hover:bg-core-green/20 border border-core-green/30 text-core-green text-sm rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
        Save Settings
      </button>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'queue' | 'settings' | 'performance'

export default function LinkedInBotPage() {
  const [status, setStatus] = useState<StatusData | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('queue')
  const [queueFilter, setQueueFilter] = useState<string>('pending_approval')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [approving, setApproving] = useState<string | null>(null)
  const [togglingBot, setTogglingBot] = useState<string | null>(null)
  const supabase = createClient()

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/bot/status')
    if (res.ok) setStatus(await res.json())
  }, [])

  const loadQueue = useCallback(async (filter = queueFilter) => {
    const supabaseClient = createClient()
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) return
    const query = supabaseClient
      .from('bot_queue')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (filter !== 'all') query.eq('status', filter)
    const { data } = await query
    setQueue((data ?? []) as QueueItem[])
  }, [queueFilter])

  useEffect(() => {
    Promise.all([loadStatus(), loadQueue()]).finally(() => setLoading(false))
  }, [loadStatus, loadQueue])

  async function toggleBot(configId: string, currentActive: boolean) {
    setTogglingBot(configId)
    await supabase.from('bot_config').update({ active: !currentActive }).eq('id', configId)
    await loadStatus()
    setTogglingBot(null)
  }

  async function generateNow(configId: string) {
    setGenerating(true)
    const res = await fetch('/api/bot/generate-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot_config_id: configId }),
    })
    if (res.ok) await Promise.all([loadQueue('pending_approval'), loadStatus()])
    else {
      const err = await res.json().catch(() => ({}))
      alert(err.error ?? 'Failed to generate post')
    }
    setGenerating(false)
  }

  async function approveItem(queueItemId: string) {
    setApproving(queueItemId)
    const res = await fetch('/api/bot/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queue_item_id: queueItemId }),
    })
    if (res.ok) await Promise.all([loadQueue(queueFilter), loadStatus()])
    else {
      const err = await res.json().catch(() => ({}))
      alert(err.error ?? 'Failed to approve post')
    }
    setApproving(null)
  }

  async function rejectItem(queueItemId: string) {
    setApproving(queueItemId)
    await fetch('/api/bot/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queue_item_id: queueItemId, reject: true }),
    })
    await loadQueue(queueFilter)
    setApproving(null)
  }

  const activeConfig = status?.configs.find(c => c.active) ?? status?.configs[0]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-core-green" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Linkedin className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-core-text">0nLinkedIn Bot</h1>
            <p className="text-xs text-core-text-muted">AI-powered LinkedIn automation with VPIS scoring</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => Promise.all([loadStatus(), loadQueue(queueFilter)])}
            className="p-2 rounded-lg border border-core-border text-core-text-dim hover:text-core-text hover:border-core-border-hi transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {activeConfig && (
            <button
              onClick={() => generateNow(activeConfig.id)}
              disabled={generating}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate Post
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      {status && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Queue Depth',
              value: status.queue_depth,
              icon: Clock,
              color: status.queue_depth > 0 ? 'text-core-amber' : 'text-core-text-dim',
            },
            {
              label: 'Published / Week',
              value: status.published_this_week,
              icon: Send,
              color: 'text-core-green',
            },
            {
              label: 'Avg VPIS',
              value: status.avg_vpis_score !== null ? `${status.avg_vpis_score}` : '—',
              icon: Target,
              color: status.avg_vpis_score !== null ? vpisColor(status.avg_vpis_score) : 'text-core-text-dim',
            },
            {
              label: 'Active Bots',
              value: status.configs.filter(c => c.active).length,
              icon: Bot,
              color: 'text-core-cyan',
            },
          ].map(stat => (
            <div key={stat.label} className="bg-core-card border border-core-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={cn('w-4 h-4', stat.color)} />
                <span className="text-xs text-core-text-muted">{stat.label}</span>
              </div>
              <div className={cn('text-2xl font-bold font-mono', stat.color)}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bot config cards */}
      {status?.configs.length === 0 && (
        <div className="bg-core-card border border-core-border rounded-xl p-8 text-center space-y-3">
          <Bot className="w-10 h-10 text-core-text-muted mx-auto" />
          <p className="text-core-text-dim text-sm">No bot configured yet.</p>
          <p className="text-core-text-muted text-xs">Set up your first LinkedIn bot to get started.</p>
        </div>
      )}

      {status?.configs.map(config => (
        <div key={config.id} className="bg-core-card border border-core-border rounded-xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn('w-2 h-2 rounded-full shrink-0', config.active ? 'bg-core-green animate-pulse' : 'bg-core-border')} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-core-text truncate">{config.name}</p>
                <p className="text-xs text-core-text-muted">
                  {config.niche ?? 'No niche set'} · {config.tone.replace('_', ' ')} · VPIS target {config.vpis_target}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {config.next_fire_at && (
                <div className="hidden sm:flex items-center gap-1 text-xs text-core-text-muted">
                  <Calendar className="w-3.5 h-3.5" />
                  Next: {new Date(config.next_fire_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })} EST
                </div>
              )}
              <button
                onClick={() => toggleBot(config.id, config.active)}
                disabled={togglingBot === config.id}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors',
                  config.active
                    ? 'bg-core-green/10 border-core-green/30 text-core-green hover:bg-core-red/10 hover:border-core-red/30 hover:text-core-red'
                    : 'bg-core-border/20 border-core-border text-core-text-dim hover:bg-core-green/10 hover:border-core-green/30 hover:text-core-green'
                )}
              >
                {togglingBot === config.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : config.active ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {config.active ? 'Pause' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Tabs */}
      <div className="border-b border-core-border">
        <div className="flex gap-0">
          {([
            { id: 'queue', label: 'Approval Queue', icon: Clock },
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'performance', label: 'Performance', icon: BarChart3 },
          ] as { id: Tab; label: string; icon: React.ElementType }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-core-green text-core-green'
                  : 'border-transparent text-core-text-dim hover:text-core-text'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'queue' && (status?.queue_depth ?? 0) > 0 && (
                <span className="bg-core-amber/20 text-core-amber text-xs px-1.5 py-0.5 rounded-full font-mono">
                  {status!.queue_depth}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {['pending_approval', 'approved', 'scheduled', 'published', 'rejected', 'all'].map(f => (
              <button
                key={f}
                onClick={() => { setQueueFilter(f); loadQueue(f) }}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-lg border transition-colors',
                  queueFilter === f
                    ? 'bg-core-green/10 border-core-green/30 text-core-green'
                    : 'border-core-border text-core-text-dim hover:border-core-border-hi hover:text-core-text'
                )}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>

          {queue.length === 0 && (
            <div className="text-center py-12 text-core-text-muted text-sm">
              No items in queue with status &ldquo;{queueFilter}&rdquo;.
            </div>
          )}

          <div className="space-y-3">
            {queue.map(item => (
              <QueueCard
                key={item.id}
                item={item}
                onApprove={approveItem}
                onReject={rejectItem}
                approving={approving}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          {!activeConfig && (
            <div className="text-center py-8 text-core-text-muted text-sm">
              No bot config found. Create one to get started.
            </div>
          )}
          {activeConfig && (
            <SettingsPanel config={activeConfig} onUpdate={loadStatus} />
          )}
        </div>
      )}

      {/* Tab: Performance */}
      {activeTab === 'performance' && (
        <div className="space-y-4">
          <div className="bg-core-card border border-core-border rounded-xl p-6 text-center space-y-3">
            <Activity className="w-8 h-8 text-core-text-muted mx-auto" />
            <p className="text-sm text-core-text-dim">
              Performance analytics populate after your first published posts.
            </p>
            <p className="text-xs text-core-text-muted">
              The weekly learning loop (every Monday) automatically adjusts VPIS weights based on engagement data.
            </p>
          </div>

          {status && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-core-card border border-core-border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-core-green" />
                  <span className="text-sm font-medium text-core-text">VPIS Performance</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-core-text-dim">
                    <span>Average VPIS score</span>
                    <span className={cn('font-mono font-bold', status.avg_vpis_score !== null ? vpisColor(status.avg_vpis_score) : 'text-core-text-muted')}>
                      {status.avg_vpis_score ?? '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-core-text-dim">
                    <span>Posts this week</span>
                    <span className="font-mono text-core-text">{status.published_this_week}</span>
                  </div>
                  <div className="flex justify-between text-core-text-dim">
                    <span>Pending approval</span>
                    <span className="font-mono text-core-amber">{status.queue_depth}</span>
                  </div>
                </div>
              </div>

              <div className="bg-core-card border border-core-border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-core-cyan" />
                  <span className="text-sm font-medium text-core-text">Learning Loop</span>
                </div>
                <div className="text-xs text-core-text-muted space-y-1.5">
                  <p>Runs every Monday at 10am EST.</p>
                  <p>Uses gradient descent on VPIS weights based on engagement deltas (likes, comments, shares).</p>
                  <p className="text-core-text-dim">Comments carry 3x weight · Shares 2x · Likes 1x</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
