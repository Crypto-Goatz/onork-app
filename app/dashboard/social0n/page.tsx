'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles, Send, Copy, Check, RefreshCw, BarChart3,
  ChevronDown, Linkedin, Clock, Zap, AlertTriangle,
  TrendingUp, Target, Loader2, FileText, CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface VPISScore {
  total: number
  hook: number
  structure: number
  keywords: number
  viralCoeff: number
  platformOpt: number
  cta: number
  penalties: { rule: string; factor: string; points: number; description: string }[]
  grade: string
}

interface GeneratedPost {
  post: string
  score: VPISScore
  hookPattern: string
  wordCount: number
}

const HOOK_PATTERNS = [
  { id: 'absolute', label: 'Absolute Declaration', desc: 'Bold statement of fact', example: '"Lead scoring is dead."' },
  { id: 'bait-flip', label: 'Bait & Flip', desc: 'Setup → destroy expectation', example: '"AI won\'t replace you. But..."' },
  { id: 'contrarian', label: 'Contrarian', desc: 'Opposite position + data', example: '"Most AI advice is wrong."' },
  { id: 'specificity', label: 'Specificity Hook', desc: 'Precise number = credibility', example: '"46.7% CTR drop."' },
  { id: 'confession', label: 'Confession + Contrast', desc: 'Admit something → change', example: '"I spent 3 hours a day..."' },
]

const SCORE_FACTORS = [
  { key: 'hook', label: 'Hook', weight: '25%', icon: Zap },
  { key: 'structure', label: 'Structure', weight: '20%', icon: FileText },
  { key: 'keywords', label: 'Keywords', weight: '15%', icon: Target },
  { key: 'viralCoeff', label: 'Viral', weight: '15%', icon: TrendingUp },
  { key: 'platformOpt', label: 'Platform', weight: '15%', icon: Linkedin },
  { key: 'cta', label: 'CTA', weight: '10%', icon: Send },
]

function getGradeColor(grade: string): string {
  if (grade === 'S') return 'text-core-green'
  if (grade === 'A') return 'text-core-cyan'
  if (grade === 'B') return 'text-core-amber'
  return 'text-core-red'
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-core-green'
  if (score >= 60) return 'text-core-cyan'
  if (score >= 40) return 'text-core-amber'
  return 'text-core-red'
}

function getBarColor(score: number): string {
  if (score >= 80) return 'bg-core-green'
  if (score >= 60) return 'bg-core-cyan'
  if (score >= 40) return 'bg-core-amber'
  return 'bg-core-red'
}

export default function Social0nPage() {
  const [tab, setTab] = useState<'generate' | 'score' | 'history'>('generate')
  const [topic, setTopic] = useState('')
  const [hookPattern, setHookPattern] = useState('absolute')
  const [persona, setPersona] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<GeneratedPost | null>(null)
  const [copied, setCopied] = useState(false)

  // Score tab
  const [scoreText, setScoreText] = useState('')
  const [scoring, setScoring] = useState(false)
  const [scoreResult, setScoreResult] = useState<VPISScore | null>(null)

  // History
  const [history, setHistory] = useState<GeneratedPost[]>([])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('social0n_history') || '[]')
      setHistory(stored)
    } catch {}
  }, [])

  async function handleGenerate() {
    if (!topic.trim()) return
    setGenerating(true)
    setResult(null)

    try {
      const res = await fetch('/api/social0n/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, hookPattern, persona }),
      })
      const data = await res.json()
      setResult(data)

      // Save to history
      const updated = [data, ...history].slice(0, 50)
      setHistory(updated)
      localStorage.setItem('social0n_history', JSON.stringify(updated))
    } catch {}
    setGenerating(false)
  }

  async function handleScore() {
    if (!scoreText.trim()) return
    setScoring(true)
    setScoreResult(null)

    try {
      const res = await fetch('/api/social0n/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: scoreText }),
      })
      const data = await res.json()
      setScoreResult(data.score)
    } catch {}
    setScoring(false)
  }

  function handleCopy() {
    if (!result?.post) return
    navigator.clipboard.writeText(result.post)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A66C2]/20 to-core-cyan/20 flex items-center justify-center">
            <Linkedin className="w-5 h-5 text-[#0A66C2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-core-text">social0n</h1>
            <p className="text-xs text-core-text-muted">LinkedIn AI Growth Engine — VPIS v0.5</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-core-card border border-core-border rounded-xl overflow-hidden mb-6">
        {[
          { key: 'generate' as const, label: 'Generate Post', icon: Sparkles },
          { key: 'score' as const, label: 'Score Post', icon: BarChart3 },
          { key: 'history' as const, label: 'History', icon: Clock },
        ].map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-colors',
                tab === t.key ? 'bg-core-green/15 text-core-green' : 'text-core-text-muted hover:text-core-text')}>
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ═══ Generate Tab ═══ */}
      {tab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: Controls */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-core-card border border-core-border rounded-xl p-5">
              <label className="text-xs font-semibold text-core-text-muted uppercase tracking-wide mb-2 block">Topic</label>
              <textarea value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="What should this post be about?"
                rows={3}
                className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-sm text-core-text placeholder:text-core-text-muted focus:outline-none focus:border-core-cyan transition-colors resize-none" />
            </div>

            <div className="bg-core-card border border-core-border rounded-xl p-5">
              <label className="text-xs font-semibold text-core-text-muted uppercase tracking-wide mb-2 block">Hook Pattern</label>
              <div className="space-y-1.5">
                {HOOK_PATTERNS.map(hp => (
                  <button key={hp.id} onClick={() => setHookPattern(hp.id)}
                    className={cn('w-full text-left px-3 py-2.5 rounded-lg border transition-all',
                      hookPattern === hp.id
                        ? 'bg-core-cyan/10 border-core-cyan/30 text-core-cyan'
                        : 'bg-transparent border-core-border text-core-text-dim hover:border-core-border-hi')}>
                    <div className="text-xs font-semibold">{hp.label}</div>
                    <div className="text-[10px] text-core-text-muted mt-0.5">{hp.example}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-core-card border border-core-border rounded-xl p-5">
              <label className="text-xs font-semibold text-core-text-muted uppercase tracking-wide mb-2 block">Persona (optional)</label>
              <input value={persona} onChange={e => setPersona(e.target.value)}
                placeholder="e.g. AI automation consultant"
                className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-2.5 text-sm text-core-text placeholder:text-core-text-muted focus:outline-none focus:border-core-cyan transition-colors" />
            </div>

            <button onClick={handleGenerate} disabled={!topic.trim() || generating}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-core-green text-core-bg font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Generating...' : 'Generate Post'}
            </button>
          </div>

          {/* Right: Result */}
          <div className="lg:col-span-3">
            {result ? (
              <div className="space-y-4 animate-fade-in">
                {/* Score badge */}
                <div className="flex items-center gap-4 bg-core-card border border-core-border rounded-xl p-4">
                  <div className={cn('text-4xl font-black', getGradeColor(result.score.grade))}>{result.score.grade}</div>
                  <div>
                    <div className={cn('text-2xl font-bold', getScoreColor(result.score.total))}>{result.score.total}</div>
                    <div className="text-xs text-core-text-muted">VPIS Score · {result.wordCount} words</div>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <button onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-core-green text-core-bg font-semibold text-xs rounded-lg hover:brightness-110 transition-all">
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button onClick={handleGenerate} disabled={generating}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-core-card border border-core-border rounded-lg text-xs text-core-text-dim hover:text-core-text transition-colors">
                      <RefreshCw className={cn('w-3.5 h-3.5', generating && 'animate-spin')} />
                      Retry
                    </button>
                  </div>
                </div>

                {/* Factor breakdown */}
                <div className="bg-core-card border border-core-border rounded-xl p-4">
                  <div className="text-xs font-semibold text-core-text-muted uppercase tracking-wide mb-3">Score Breakdown</div>
                  <div className="space-y-2">
                    {SCORE_FACTORS.map(f => {
                      const Icon = f.icon
                      const val = result.score[f.key as keyof VPISScore] as number
                      return (
                        <div key={f.key} className="flex items-center gap-3">
                          <Icon className="w-3.5 h-3.5 text-core-text-muted shrink-0" />
                          <span className="text-xs text-core-text-dim w-16">{f.label}</span>
                          <div className="flex-1 h-1.5 bg-core-border rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all', getBarColor(val))} style={{ width: `${val}%` }} />
                          </div>
                          <span className={cn('text-xs font-bold w-8 text-right', getScoreColor(val))}>{val}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Penalties */}
                {result.score.penalties.length > 0 && (
                  <div className="bg-core-red/5 border border-core-red/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-core-red mb-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Penalties ({result.score.penalties.length})
                    </div>
                    {result.score.penalties.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-core-text-dim py-1">
                        <span className="text-core-red font-mono">{p.points}</span>
                        <span>{p.description}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Post content */}
                <div className="bg-core-card border border-core-border rounded-xl p-5">
                  <div className="text-xs font-semibold text-core-text-muted uppercase tracking-wide mb-3">Generated Post</div>
                  <div className="text-sm text-core-text leading-relaxed whitespace-pre-wrap">{result.post}</div>
                </div>
              </div>
            ) : (
              <div className="bg-core-card border border-core-border rounded-xl p-12 text-center">
                <Linkedin className="w-10 h-10 text-core-text-muted mx-auto mb-3" />
                <p className="text-sm text-core-text-muted">Enter a topic and generate your first post</p>
                <p className="text-xs text-core-text-muted mt-1">BE writing style enforced · VPIS scored · Won't publish below 80</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Score Tab ═══ */}
      {tab === 'score' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-core-card border border-core-border rounded-xl p-5">
              <label className="text-xs font-semibold text-core-text-muted uppercase tracking-wide mb-2 block">Paste any LinkedIn post</label>
              <textarea value={scoreText} onChange={e => setScoreText(e.target.value)}
                placeholder="Paste a post here to score it..."
                rows={12}
                className="w-full bg-core-bg border border-core-border rounded-lg px-4 py-3 text-sm text-core-text placeholder:text-core-text-muted focus:outline-none focus:border-core-cyan transition-colors resize-none" />
            </div>
            <button onClick={handleScore} disabled={!scoreText.trim() || scoring}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-core-cyan text-core-bg font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50">
              {scoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              {scoring ? 'Scoring...' : 'Score Post'}
            </button>
          </div>

          {scoreResult && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-4 bg-core-card border border-core-border rounded-xl p-5">
                <div className={cn('text-5xl font-black', getGradeColor(scoreResult.grade))}>{scoreResult.grade}</div>
                <div>
                  <div className={cn('text-3xl font-bold', getScoreColor(scoreResult.total))}>{scoreResult.total}</div>
                  <div className="text-xs text-core-text-muted">VPIS Score</div>
                </div>
              </div>

              <div className="bg-core-card border border-core-border rounded-xl p-4 space-y-2">
                {SCORE_FACTORS.map(f => {
                  const Icon = f.icon
                  const val = scoreResult[f.key as keyof VPISScore] as number
                  return (
                    <div key={f.key} className="flex items-center gap-3">
                      <Icon className="w-3.5 h-3.5 text-core-text-muted shrink-0" />
                      <span className="text-xs text-core-text-dim w-16">{f.label}</span>
                      <div className="flex-1 h-1.5 bg-core-border rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', getBarColor(val))} style={{ width: `${val}%` }} />
                      </div>
                      <span className={cn('text-xs font-bold w-8 text-right', getScoreColor(val))}>{val}</span>
                    </div>
                  )
                })}
              </div>

              {scoreResult.penalties.length > 0 && (
                <div className="bg-core-red/5 border border-core-red/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-core-red mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {scoreResult.penalties.length} penalties detected
                  </div>
                  {scoreResult.penalties.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-core-text-dim py-1">
                      <span className="text-core-red font-mono">{p.points}</span>
                      <span>{p.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ History Tab ═══ */}
      {tab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="bg-core-card border border-core-border rounded-xl p-12 text-center">
              <Clock className="w-8 h-8 text-core-text-muted mx-auto mb-3" />
              <p className="text-sm text-core-text-muted">No posts generated yet</p>
            </div>
          ) : (
            history.map((item, i) => (
              <div key={i} className="bg-core-card border border-core-border rounded-xl p-4 hover:border-core-border-hi transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={cn('text-lg font-black', getGradeColor(item.score.grade))}>{item.score.grade}</span>
                    <span className={cn('text-sm font-bold', getScoreColor(item.score.total))}>{item.score.total}</span>
                    <span className="text-xs text-core-text-muted">{item.wordCount} words</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-core-border/30 text-core-text-muted capitalize">{item.hookPattern}</span>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(item.post); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-core-card border border-core-border rounded-md text-[10px] text-core-text-muted hover:text-core-text transition-colors">
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <p className="text-xs text-core-text-dim leading-relaxed line-clamp-3">{item.post}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
