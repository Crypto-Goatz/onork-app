'use client'

import { useState, useEffect, useCallback } from 'react'

interface Source {
  id: string
  title: string
  source_type: string
  status: string
  token_count: number
  tags: string[]
  created_at: string
}

interface Pair {
  id: string
  user_input: string
  assistant_output: string
  domain: string
  quality_score: number | null
  approved: boolean
  human_reviewed: boolean
  created_at: string
}

interface Dataset {
  id: string
  name: string
  description: string
  pair_count: number
  avg_quality: number
  status: string
  target_model: string
  created_at: string
}

interface Stats {
  sources: { total: number; by_type: Record<string, number>; total_tokens: number }
  pairs: { total: number; by_domain: Record<string, number>; approved: number; scored: number; avg_quality: number }
  datasets: { total: number; list: { id: string; name: string; pairs: number; status: string }[] }
  exports: { total: number }
  council: { training_runs: number; knowledge_entries: number; avg_score: number }
}

type Tab = 'overview' | 'sources' | 'pairs' | 'datasets' | 'feed'

export default function TrainingPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [pairs, setPairs] = useState<Pair[]>([])
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [feedRunning, setFeedRunning] = useState(false)
  const [feedResult, setFeedResult] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // New pair form
  const [showNewPair, setShowNewPair] = useState(false)
  const [newPairInput, setNewPairInput] = useState('')
  const [newPairOutput, setNewPairOutput] = useState('')
  const [newPairDomain, setNewPairDomain] = useState('general')
  const [saving, setSaving] = useState(false)

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/training?action=stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data.training_center)
      }
    } catch { /* silent */ }
  }, [])

  const loadSources = useCallback(async () => {
    try {
      const url = searchQuery
        ? `/api/training?action=search&table=sources&query=${encodeURIComponent(searchQuery)}`
        : '/api/training?action=sources'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setSources(data.sources || data.results?.sources || [])
      }
    } catch { /* silent */ }
  }, [searchQuery])

  const loadPairs = useCallback(async () => {
    try {
      const url = searchQuery
        ? `/api/training?action=search&table=pairs&query=${encodeURIComponent(searchQuery)}`
        : '/api/training?action=pairs'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setPairs(data.pairs || data.results?.pairs || [])
      }
    } catch { /* silent */ }
  }, [searchQuery])

  const loadDatasets = useCallback(async () => {
    try {
      const res = await fetch('/api/training?action=datasets')
      if (res.ok) {
        const data = await res.json()
        setDatasets(data.datasets || [])
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    Promise.all([loadStats(), loadSources(), loadPairs(), loadDatasets()])
      .finally(() => setLoading(false))
  }, [loadStats, loadSources, loadPairs, loadDatasets])

  async function runFeed() {
    setFeedRunning(true)
    setFeedResult(null)
    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'feed' }),
      })
      const data = await res.json()
      setFeedResult(`Fetched from ${data.sources_checked || 0} sources — ${data.stats?.ingested || 0} new items ingested`)
      await loadStats()
      await loadSources()
    } catch {
      setFeedResult('Feed fetch failed')
    }
    setFeedRunning(false)
  }

  async function savePair() {
    if (!newPairInput.trim() || !newPairOutput.trim()) return
    setSaving(true)
    try {
      await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_pair',
          user_input: newPairInput,
          assistant_output: newPairOutput,
          domain: newPairDomain,
        }),
      })
      setNewPairInput('')
      setNewPairOutput('')
      setShowNewPair(false)
      await loadPairs()
      await loadStats()
    } catch { /* silent */ }
    setSaving(false)
  }

  async function approvePair(id: string) {
    await fetch('/api/training', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', pair_id: id }),
    })
    await loadPairs()
  }

  async function rejectPair(id: string) {
    await fetch('/api/training', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', pair_id: id }),
    })
    await loadPairs()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-core-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'sources', label: `Sources (${stats?.sources.total || 0})` },
    { key: 'pairs', label: `Pairs (${stats?.pairs.total || 0})` },
    { key: 'datasets', label: `Datasets (${stats?.datasets.total || 0})` },
    { key: 'feed', label: 'Live Feed' },
  ]

  const DOMAINS = ['general', 'crm', 'code', 'architecture', 'workflow', 'brand', 'support', 'api_pattern']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-core-text">0nAI Training Center</h1>
          <p className="text-sm text-core-text-dim mt-1">
            Train the model. Ingest sources. Build datasets. Export for fine-tuning.
          </p>
        </div>
        <button
          onClick={runFeed}
          disabled={feedRunning}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: feedRunning ? '#1a1a1a' : 'rgba(126,217,87,0.1)',
            border: '1px solid',
            borderColor: feedRunning ? '#333' : 'rgba(126,217,87,0.3)',
            color: feedRunning ? '#666' : '#7ed957',
            cursor: feedRunning ? 'not-allowed' : 'pointer',
          }}
        >
          {feedRunning ? 'Fetching...' : 'Run Feed Now'}
        </button>
      </div>

      {feedResult && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(126,217,87,0.06)', border: '1px solid rgba(126,217,87,0.15)', color: '#7ed957' }}>
          {feedResult}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: '#111' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: tab === t.key ? '#1a1a1a' : 'transparent',
              color: tab === t.key ? '#7ed957' : '#888',
              border: tab === t.key ? '1px solid #262626' : '1px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────── */}
      {tab === 'overview' && stats && (
        <div>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Sources', value: stats.sources.total, sub: `${(stats.sources.total_tokens / 1000).toFixed(1)}k tokens` },
              { label: 'Training Pairs', value: stats.pairs.total, sub: `${stats.pairs.approved} approved` },
              { label: 'Avg Quality', value: stats.pairs.avg_quality ? `${(stats.pairs.avg_quality * 100).toFixed(0)}%` : '—', sub: `${stats.pairs.scored} scored` },
              { label: 'Knowledge', value: stats.council.knowledge_entries, sub: `${stats.council.training_runs} runs` },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-xl" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
                <div className="text-2xl font-bold text-core-green">{s.value}</div>
                <div className="text-sm font-medium text-core-text mt-1">{s.label}</div>
                <div className="text-xs text-core-text-muted mt-1">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Source breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
              <h3 className="text-sm font-semibold text-core-text-dim mb-3">Sources by Category</h3>
              {Object.entries(stats.sources.by_type).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center py-1.5 border-b border-core-border last:border-0">
                  <span className="text-sm text-core-text">{type}</span>
                  <span className="text-sm font-mono text-core-green">{count}</span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
              <h3 className="text-sm font-semibold text-core-text-dim mb-3">Pairs by Domain</h3>
              {Object.entries(stats.pairs.by_domain).length > 0 ? Object.entries(stats.pairs.by_domain).map(([domain, count]) => (
                <div key={domain} className="flex justify-between items-center py-1.5 border-b border-core-border last:border-0">
                  <span className="text-sm text-core-text">{domain}</span>
                  <span className="text-sm font-mono text-core-cyan">{count}</span>
                </div>
              )) : (
                <p className="text-sm text-core-text-muted">No pairs yet. Add training pairs to get started.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SOURCES TAB ───────────────────────────────── */}
      {tab === 'sources' && (
        <div>
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadSources()}
              placeholder="Search sources..."
              className="w-full px-4 py-2.5 rounded-lg text-sm"
              style={{ background: '#111', border: '1px solid #262626', color: '#f0f0f0', outline: 'none' }}
            />
          </div>

          <div className="space-y-2">
            {sources.map(s => (
              <div key={s.id} className="p-3 rounded-lg flex items-start gap-3" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
                <div className="px-2 py-0.5 rounded text-xs font-mono" style={{ background: 'rgba(0,212,255,0.08)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.15)', flexShrink: 0 }}>
                  {s.source_type}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-core-text truncate">{s.title}</div>
                  <div className="text-xs text-core-text-muted mt-1">
                    {s.token_count} tokens · {s.tags?.join(', ')} · {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="px-2 py-0.5 rounded text-xs" style={{
                  background: s.status === 'raw' ? 'rgba(251,191,36,0.08)' : 'rgba(126,217,87,0.08)',
                  color: s.status === 'raw' ? '#fbbf24' : '#7ed957',
                  border: `1px solid ${s.status === 'raw' ? 'rgba(251,191,36,0.15)' : 'rgba(126,217,87,0.15)'}`,
                }}>
                  {s.status}
                </div>
              </div>
            ))}
            {sources.length === 0 && (
              <p className="text-center text-core-text-muted py-8">No sources yet. Run the feed or ingest data.</p>
            )}
          </div>
        </div>
      )}

      {/* ── PAIRS TAB ─────────────────────────────────── */}
      {tab === 'pairs' && (
        <div>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadPairs()}
              placeholder="Search pairs..."
              className="flex-1 px-4 py-2.5 rounded-lg text-sm"
              style={{ background: '#111', border: '1px solid #262626', color: '#f0f0f0', outline: 'none' }}
            />
            <button
              onClick={() => setShowNewPair(!showNewPair)}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: 'rgba(126,217,87,0.1)', border: '1px solid rgba(126,217,87,0.3)', color: '#7ed957' }}
            >
              + New Pair
            </button>
          </div>

          {/* New pair form */}
          {showNewPair && (
            <div className="mb-4 p-4 rounded-xl" style={{ background: '#111', border: '1px solid #262626' }}>
              <div className="grid grid-cols-1 gap-3 mb-3">
                <div>
                  <label className="text-xs text-core-text-dim block mb-1">User Input (question)</label>
                  <textarea
                    value={newPairInput}
                    onChange={e => setNewPairInput(e.target.value)}
                    rows={2}
                    placeholder="How do I create a contact in the CRM?"
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: '#0a0a0a', border: '1px solid #262626', color: '#f0f0f0', outline: 'none', resize: 'none' }}
                  />
                </div>
                <div>
                  <label className="text-xs text-core-text-dim block mb-1">Assistant Output (ideal response)</label>
                  <textarea
                    value={newPairOutput}
                    onChange={e => setNewPairOutput(e.target.value)}
                    rows={4}
                    placeholder="To create a contact, use the CRM API..."
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: '#0a0a0a', border: '1px solid #262626', color: '#f0f0f0', outline: 'none', resize: 'none' }}
                  />
                </div>
                <div className="flex gap-3 items-end">
                  <div>
                    <label className="text-xs text-core-text-dim block mb-1">Domain</label>
                    <select
                      value={newPairDomain}
                      onChange={e => setNewPairDomain(e.target.value)}
                      className="px-3 py-2 rounded-lg text-sm"
                      style={{ background: '#0a0a0a', border: '1px solid #262626', color: '#f0f0f0', outline: 'none' }}
                    >
                      {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <button
                    onClick={savePair}
                    disabled={saving || !newPairInput.trim() || !newPairOutput.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: '#7ed957', color: '#0a0a0a', opacity: saving ? 0.5 : 1 }}
                  >
                    {saving ? 'Saving...' : 'Save Pair'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pairs list */}
          <div className="space-y-2">
            {pairs.map(p => (
              <div key={p.id} className="p-3 rounded-lg" style={{ background: '#111', border: `1px solid ${p.approved ? 'rgba(126,217,87,0.2)' : '#1a1a1a'}` }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-mono" style={{ background: 'rgba(0,212,255,0.08)', color: '#00d4ff' }}>{p.domain}</span>
                    {p.quality_score !== null && (
                      <span className="text-xs font-mono" style={{ color: p.quality_score >= 0.7 ? '#7ed957' : p.quality_score >= 0.5 ? '#fbbf24' : '#f87171' }}>
                        {(p.quality_score * 100).toFixed(0)}%
                      </span>
                    )}
                    {p.approved && <span className="text-xs text-core-green">Approved</span>}
                  </div>
                  {!p.human_reviewed && (
                    <div className="flex gap-1">
                      <button onClick={() => approvePair(p.id)} className="px-2 py-1 rounded text-xs" style={{ background: 'rgba(126,217,87,0.1)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)' }}>Approve</button>
                      <button onClick={() => rejectPair(p.id)} className="px-2 py-1 rounded text-xs" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>Reject</button>
                    </div>
                  )}
                </div>
                <div className="text-sm text-core-text-dim mb-1"><strong className="text-core-text">Q:</strong> {p.user_input.slice(0, 200)}</div>
                <div className="text-sm text-core-text-dim"><strong className="text-core-text">A:</strong> {p.assistant_output.slice(0, 300)}{p.assistant_output.length > 300 ? '...' : ''}</div>
              </div>
            ))}
            {pairs.length === 0 && (
              <p className="text-center text-core-text-muted py-8">No training pairs yet. Click &quot;+ New Pair&quot; to start teaching the model.</p>
            )}
          </div>
        </div>
      )}

      {/* ── DATASETS TAB ──────────────────────────────── */}
      {tab === 'datasets' && (
        <div>
          <div className="space-y-3">
            {datasets.map(d => (
              <div key={d.id} className="p-4 rounded-xl" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold text-core-text">{d.name}</h3>
                  <span className="px-2 py-0.5 rounded text-xs font-mono" style={{
                    background: d.status === 'exported' ? 'rgba(126,217,87,0.08)' : 'rgba(0,212,255,0.08)',
                    color: d.status === 'exported' ? '#7ed957' : '#00d4ff',
                  }}>{d.status}</span>
                </div>
                {d.description && <p className="text-sm text-core-text-dim mb-2">{d.description}</p>}
                <div className="flex gap-4 text-xs text-core-text-muted">
                  <span>{d.pair_count} pairs</span>
                  <span>Quality: {d.avg_quality ? `${(d.avg_quality * 100).toFixed(0)}%` : '—'}</span>
                  <span>Target: {d.target_model}</span>
                  <span>{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {datasets.length === 0 && (
              <p className="text-center text-core-text-muted py-8">No datasets yet. Create one via the MCP tools to organize your training pairs.</p>
            )}
          </div>
        </div>
      )}

      {/* ── FEED TAB ──────────────────────────────────── */}
      {tab === 'feed' && (
        <div>
          <div className="mb-4 p-4 rounded-xl" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-core-text">Live Data Sources</h3>
              <span className="text-xs text-core-text-muted">11 verified sources · Zero cost</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { name: 'Hacker News — AI', interval: '10 min', category: 'ai_industry' },
                { name: 'arXiv — AI Papers', interval: '1 hour', category: 'ai_research' },
                { name: 'Dev.to — AI', interval: '15 min', category: 'ai_industry' },
                { name: 'Dev.to — MCP', interval: '15 min', category: 'ai_industry' },
                { name: 'Hacker News — Top', interval: '10 min', category: 'tech' },
                { name: 'GitHub — Trending', interval: '1 hour', category: 'open_source' },
                { name: 'npm — MCP Packages', interval: '1 hour', category: 'open_source' },
                { name: 'Dev.to — API', interval: '30 min', category: 'saas' },
                { name: 'Dev.to — Automation', interval: '30 min', category: 'automation' },
                { name: 'CoinGecko — Market', interval: '10 min', category: 'crypto' },
                { name: 'Wikipedia — Featured', interval: 'daily', category: 'general' },
              ].map(s => (
                <div key={s.name} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: '#0a0a0a' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: '#7ed957' }} />
                  <span className="text-sm text-core-text flex-1">{s.name}</span>
                  <span className="text-xs text-core-text-muted">{s.interval}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={runFeed}
            disabled={feedRunning}
            className="w-full py-3 rounded-lg text-sm font-bold transition-all"
            style={{
              background: feedRunning ? '#1a1a1a' : '#7ed957',
              color: feedRunning ? '#666' : '#0a0a0a',
              cursor: feedRunning ? 'not-allowed' : 'pointer',
            }}
          >
            {feedRunning ? 'Fetching from all sources...' : 'Fetch Now'}
          </button>
        </div>
      )}
    </div>
  )
}
