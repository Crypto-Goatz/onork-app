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
      <div className="jp-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="jp-page-title">0nAI Training Center</h1>
          <p className="jp-page-subtitle">
            Train the model. Ingest sources. Build datasets. Export for fine-tuning.
          </p>
        </div>
        <button
          onClick={runFeed}
          disabled={feedRunning}
          className={feedRunning ? 'jp-btn jp-btn-outline' : 'jp-btn jp-btn-outline'}
          style={{
            opacity: feedRunning ? 0.5 : 1,
            cursor: feedRunning ? 'not-allowed' : 'pointer',
            borderColor: feedRunning ? 'var(--jp-border)' : 'rgba(126,217,87,0.3)',
            color: feedRunning ? 'var(--jp-text-muted)' : 'var(--jp-green)',
            background: feedRunning ? 'transparent' : 'var(--jp-green-glow)',
          }}
        >
          {feedRunning ? 'Fetching...' : 'Run Feed Now'}
        </button>
      </div>

      {feedResult && (
        <div className="jp-card" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--jp-green-glow)', borderColor: 'rgba(126,217,87,0.15)', color: 'var(--jp-green)', fontSize: '0.875rem' }}>
          {feedResult}
        </div>
      )}

      {/* Tabs */}
      <div className="jp-tabs" style={{ borderBottom: 'none', background: 'var(--jp-bg-elevated)', borderRadius: 'var(--jp-radius-sm)', padding: '4px', marginBottom: '1.5rem', gap: '4px' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`jp-tab ${tab === t.key ? 'active' : ''}`}
            style={{
              borderBottom: 'none',
              borderRadius: 'var(--jp-radius-xs)',
              background: tab === t.key ? 'var(--jp-bg-card-hover)' : 'transparent',
              border: tab === t.key ? '1px solid var(--jp-border-hi)' : '1px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* -- OVERVIEW TAB -- */}
      {tab === 'overview' && stats && (
        <div>
          {/* Stat cards */}
          <div className="jp-stat-grid" style={{ marginBottom: '1.5rem' }}>
            {[
              { label: 'Sources', value: stats.sources.total, sub: `${(stats.sources.total_tokens / 1000).toFixed(1)}k tokens`, accent: 'green' },
              { label: 'Training Pairs', value: stats.pairs.total, sub: `${stats.pairs.approved} approved`, accent: 'cyan' },
              { label: 'Avg Quality', value: stats.pairs.avg_quality ? `${(stats.pairs.avg_quality * 100).toFixed(0)}%` : '\u2014', sub: `${stats.pairs.scored} scored`, accent: 'purple' },
              { label: 'Knowledge', value: stats.council.knowledge_entries, sub: `${stats.council.training_runs} runs`, accent: 'amber' },
            ].map(s => (
              <div key={s.label} className={`jp-stat-card ${s.accent}`}>
                <div className="jp-stat-label">{s.label}</div>
                <div className="jp-stat-value" style={{ color: `var(--jp-${s.accent})` }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)', marginTop: '4px' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Source breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            <div className="jp-card">
              <div className="jp-card-header">
                <h3>Sources by Category</h3>
              </div>
              <div className="jp-card-body" style={{ padding: 0 }}>
                {Object.entries(stats.sources.by_type).map(([type, count]) => (
                  <div key={type} className="jp-activity-item" style={{ padding: '10px 20px' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--jp-text)', flex: 1 }}>{type}</span>
                    <span style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: 'var(--jp-green)' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="jp-card">
              <div className="jp-card-header">
                <h3>Pairs by Domain</h3>
              </div>
              <div className="jp-card-body" style={{ padding: 0 }}>
                {Object.entries(stats.pairs.by_domain).length > 0 ? Object.entries(stats.pairs.by_domain).map(([domain, count]) => (
                  <div key={domain} className="jp-activity-item" style={{ padding: '10px 20px' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--jp-text)', flex: 1 }}>{domain}</span>
                    <span style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: 'var(--jp-cyan)' }}>{count}</span>
                  </div>
                )) : (
                  <div className="jp-empty-state" style={{ padding: '2rem' }}>
                    <p className="jp-empty-state-text">No pairs yet. Add training pairs to get started.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -- SOURCES TAB -- */}
      {tab === 'sources' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadSources()}
              placeholder="Search sources..."
              className="jp-input"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sources.map(s => (
              <div key={s.id} className="jp-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span className="jp-badge cyan" style={{ flexShrink: 0 }}>
                  {s.source_type}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--jp-text)' }} className="truncate">{s.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)', marginTop: '4px' }}>
                    {s.token_count} tokens · {s.tags?.join(', ')} · {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span className={`jp-badge ${s.status === 'raw' ? 'amber' : 'green'}`}>
                  {s.status}
                </span>
              </div>
            ))}
            {sources.length === 0 && (
              <div className="jp-empty-state">
                <p className="jp-empty-state-text">No sources yet. Run the feed or ingest data.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- PAIRS TAB -- */}
      {tab === 'pairs' && (
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadPairs()}
              placeholder="Search pairs..."
              className="jp-input"
              style={{ flex: 1 }}
            />
            <button
              onClick={() => setShowNewPair(!showNewPair)}
              className="jp-btn jp-btn-outline"
              style={{ borderColor: 'rgba(126,217,87,0.3)', color: 'var(--jp-green)', background: 'var(--jp-green-glow)' }}
            >
              + New Pair
            </button>
          </div>

          {/* New pair form */}
          {showNewPair && (
            <div className="jp-card" style={{ marginBottom: '1rem', padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--jp-text-secondary)', display: 'block', marginBottom: '4px' }}>User Input (question)</label>
                  <textarea
                    value={newPairInput}
                    onChange={e => setNewPairInput(e.target.value)}
                    rows={2}
                    placeholder="How do I create a contact in the CRM?"
                    className="jp-textarea"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--jp-text-secondary)', display: 'block', marginBottom: '4px' }}>Assistant Output (ideal response)</label>
                  <textarea
                    value={newPairOutput}
                    onChange={e => setNewPairOutput(e.target.value)}
                    rows={4}
                    placeholder="To create a contact, use the CRM API..."
                    className="jp-textarea"
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--jp-text-secondary)', display: 'block', marginBottom: '4px' }}>Domain</label>
                    <select
                      value={newPairDomain}
                      onChange={e => setNewPairDomain(e.target.value)}
                      className="jp-select"
                    >
                      {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <button
                    onClick={savePair}
                    disabled={saving || !newPairInput.trim() || !newPairOutput.trim()}
                    className="jp-btn jp-btn-primary"
                    style={{ opacity: saving ? 0.5 : 1 }}
                  >
                    {saving ? 'Saving...' : 'Save Pair'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pairs list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {pairs.map(p => (
              <div key={p.id} className="jp-card" style={{ padding: '12px 16px', borderColor: p.approved ? 'rgba(126,217,87,0.2)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="jp-badge cyan">{p.domain}</span>
                    {p.quality_score !== null && (
                      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: p.quality_score >= 0.7 ? 'var(--jp-green)' : p.quality_score >= 0.5 ? 'var(--jp-amber)' : 'var(--jp-red)' }}>
                        {(p.quality_score * 100).toFixed(0)}%
                      </span>
                    )}
                    {p.approved && <span className="jp-badge green">Approved</span>}
                  </div>
                  {!p.human_reviewed && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => approvePair(p.id)} className="jp-btn jp-btn-outline" style={{ padding: '2px 8px', fontSize: '0.75rem', borderColor: 'rgba(126,217,87,0.2)', color: 'var(--jp-green)' }}>Approve</button>
                      <button onClick={() => rejectPair(p.id)} className="jp-btn jp-btn-outline" style={{ padding: '2px 8px', fontSize: '0.75rem', borderColor: 'rgba(248,113,113,0.2)', color: 'var(--jp-red)' }}>Reject</button>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--jp-text-secondary)', marginBottom: '4px' }}><strong style={{ color: 'var(--jp-text)' }}>Q:</strong> {p.user_input.slice(0, 200)}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--jp-text-secondary)' }}><strong style={{ color: 'var(--jp-text)' }}>A:</strong> {p.assistant_output.slice(0, 300)}{p.assistant_output.length > 300 ? '...' : ''}</div>
              </div>
            ))}
            {pairs.length === 0 && (
              <div className="jp-empty-state">
                <p className="jp-empty-state-text">No training pairs yet. Click &quot;+ New Pair&quot; to start teaching the model.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- DATASETS TAB -- */}
      {tab === 'datasets' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {datasets.map(d => (
              <div key={d.id} className="jp-card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--jp-text)', margin: 0 }}>{d.name}</h3>
                  <span className={`jp-badge ${d.status === 'exported' ? 'green' : 'cyan'}`}>{d.status}</span>
                </div>
                {d.description && <p style={{ fontSize: '0.875rem', color: 'var(--jp-text-secondary)', margin: '0 0 8px' }}>{d.description}</p>}
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--jp-text-muted)' }}>
                  <span>{d.pair_count} pairs</span>
                  <span>Quality: {d.avg_quality ? `${(d.avg_quality * 100).toFixed(0)}%` : '\u2014'}</span>
                  <span>Target: {d.target_model}</span>
                  <span>{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {datasets.length === 0 && (
              <div className="jp-empty-state">
                <p className="jp-empty-state-text">No datasets yet. Create one via the MCP tools to organize your training pairs.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- FEED TAB -- */}
      {tab === 'feed' && (
        <div>
          <div className="jp-card" style={{ marginBottom: '1rem' }}>
            <div className="jp-card-header">
              <h3>Live Data Sources</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)' }}>11 verified sources · Zero cost</span>
            </div>
            <div className="jp-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem' }}>
                {[
                  { name: 'Hacker News \u2014 AI', interval: '10 min', category: 'ai_industry' },
                  { name: 'arXiv \u2014 AI Papers', interval: '1 hour', category: 'ai_research' },
                  { name: 'Dev.to \u2014 AI', interval: '15 min', category: 'ai_industry' },
                  { name: 'Dev.to \u2014 MCP', interval: '15 min', category: 'ai_industry' },
                  { name: 'Hacker News \u2014 Top', interval: '10 min', category: 'tech' },
                  { name: 'GitHub \u2014 Trending', interval: '1 hour', category: 'open_source' },
                  { name: 'npm \u2014 MCP Packages', interval: '1 hour', category: 'open_source' },
                  { name: 'Dev.to \u2014 API', interval: '30 min', category: 'saas' },
                  { name: 'Dev.to \u2014 Automation', interval: '30 min', category: 'automation' },
                  { name: 'CoinGecko \u2014 Market', interval: '10 min', category: 'crypto' },
                  { name: 'Wikipedia \u2014 Featured', interval: 'daily', category: 'general' },
                ].map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: 'var(--jp-radius-xs)', background: 'var(--jp-bg)' }}>
                    <div className="jp-activity-dot green" style={{ width: 8, height: 8 }} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--jp-text)', flex: 1 }}>{s.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)' }}>{s.interval}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={runFeed}
            disabled={feedRunning}
            className={feedRunning ? 'jp-btn jp-btn-outline' : 'jp-btn jp-btn-primary'}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.75rem',
              cursor: feedRunning ? 'not-allowed' : 'pointer',
              opacity: feedRunning ? 0.5 : 1,
            }}
          >
            {feedRunning ? 'Fetching from all sources...' : 'Fetch Now'}
          </button>
        </div>
      )}
    </div>
  )
}
