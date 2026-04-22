"use client"

/**
 * /dashboard/cro9-engine/:id — live engine view.
 *
 * Sections:
 *   - Growth chart (clicks / position / impressions over 28 days)
 *   - Active tasks table
 *   - Activity log
 *   - Adaptive weights
 *   - Settings
 */

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Loader2, ArrowLeft, Play, Zap, AlertTriangle, ExternalLink,
  Check, LineChart as LineChartIcon, History, Sparkles, Settings, TrendingUp, TrendingDown,
} from 'lucide-react'

interface Site {
  id: string
  site_url: string
  domain: string
  gsc_property: string | null
  apply_mode: string
  status: string
  trial_ends_at: string | null
  last_run_at: string | null
  last_run_status: string | null
  last_run_summary: { pagesAnalyzed?: number; tasksGenerated?: number; tasksBriefed?: number; errors?: string[] } | null
  serpapi_key_masked?: string
}
interface Weight { factor: string; value: number; update_count: number; last_updated: string }
interface Stats { tasksTotal: number; tasksPending: number; tasksApplied: number; tasksImproved: number; historyCount: number }
interface Task {
  id: string; url: string; primary_keyword: string | null; bucket: string; priority_action: string; score: number
  status: string; clicks: number; impressions: number; position: number; ctr: number; ctr_gap: number
  brief: Record<string, unknown> | null; created_at: string; applied_at: string | null
  delta?: { clicks?: number; impressions?: number; position?: number; ctr?: number } | null
}
interface HistoryEntry { id: string; task_id: string | null; action_type: string; payload: unknown; outcome: unknown; created_at: string }
interface ChartRow { date: string; clicks: number; impressions: number; ctr: number; position: number }

export default function Cro9SitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [site, setSite] = useState<Site | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [weights, setWeights] = useState<Weight[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [chart, setChart] = useState<ChartRow[]>([])
  const [running, setRunning] = useState(false)

  useEffect(() => { loadAll() }, [id])

  async function token() {
    const s = createClient()
    const { data: { session } } = await s.auth.getSession()
    return session?.access_token || ''
  }

  async function loadAll() {
    setLoading(true); setErr(null)
    try {
      const t = await token()
      if (!t) { setErr('Please sign in'); setLoading(false); return }
      const h = { Authorization: `Bearer ${t}` }
      const [sr, tr, hr, cr] = await Promise.all([
        fetch(`/api/cro9/sites/${id}`, { headers: h }).then((r) => r.json()),
        fetch(`/api/cro9/sites/${id}/tasks?limit=50`, { headers: h }).then((r) => r.json()),
        fetch(`/api/cro9/sites/${id}/history?limit=100`, { headers: h }).then((r) => r.json()),
        fetch(`/api/cro9/sites/${id}/chart`, { headers: h }).then((r) => r.json()),
      ])
      if (sr.error) throw new Error(sr.error)
      setSite(sr.site); setStats(sr.stats); setWeights(sr.weights || [])
      setTasks(tr.tasks || []); setHistory(hr.entries || []); setChart(cr.rows || [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'error')
    } finally { setLoading(false) }
  }

  async function runNow() {
    setRunning(true); setErr(null)
    try {
      const t = await token()
      const r = await fetch(`/api/cro9/sites/${id}/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_pages: 15, briefs: true }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'analyze_failed')
      await loadAll()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'error')
    } finally { setRunning(false) }
  }

  async function markApplied(taskId: string) {
    const t = await token()
    await fetch(`/api/cro9/sites/${id}/tasks/${taskId}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    await loadAll()
  }

  if (loading) return <main className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>
  if (err) return (
    <main className="max-w-xl mx-auto py-12 px-4">
      <Card className="border-destructive/40 bg-destructive/5"><CardContent className="pt-6 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
        <div><div className="text-sm font-semibold text-destructive">{err}</div>
          <Link href="/dashboard/cro9-engine" className="text-xs underline mt-2 inline-block">Back to sites</Link></div>
      </CardContent></Card>
    </main>
  )
  if (!site) return null

  const latest = chart[chart.length - 1]
  const earliest = chart[0]
  const deltaClicks = latest && earliest ? latest.clicks - earliest.clicks : 0
  const deltaImpressions = latest && earliest ? latest.impressions - earliest.impressions : 0
  const deltaPosition = latest && earliest ? earliest.position - latest.position : 0
  const sumClicks = chart.reduce((s, r) => s + r.clicks, 0)
  const sumImpressions = chart.reduce((s, r) => s + r.impressions, 0)
  const avgPosition = chart.length ? chart.reduce((s, r) => s + r.position, 0) / chart.length : 0

  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/dashboard/cro9-engine" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-3 w-3" /> All sites
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1">CRO9 Engine</div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{site.domain}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {site.gsc_property || 'GSC not connected'} · apply mode: <span className="font-mono">{site.apply_mode}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{site.status}</Badge>
            <Button onClick={runNow} disabled={running} className="gap-2">
              {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</> : <><Play className="h-4 w-4" /> Run now</>}
            </Button>
          </div>
        </div>

        {/* Growth stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="Clicks (28d)" value={sumClicks.toLocaleString()} delta={deltaClicks} />
          <Stat label="Impressions (28d)" value={sumImpressions.toLocaleString()} delta={deltaImpressions} />
          <Stat label="Avg position" value={avgPosition > 0 ? avgPosition.toFixed(1) : '—'} delta={deltaPosition} invertColor />
          <Stat label="Tasks applied" value={String(stats?.tasksApplied || 0)} deltaText={`${stats?.tasksImproved || 0} improved`} />
        </div>

        {/* Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><LineChartIcon className="h-4 w-4" /> Growth — last 28 days</CardTitle>
            <CardDescription>Daily impressions + clicks from Search Console</CardDescription>
          </CardHeader>
          <CardContent>
            {chart.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No GSC data yet. Run the analysis or wait for the daily cron.
              </div>
            ) : (
              <MiniLineChart rows={chart} />
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="tasks">
          <TabsList>
            <TabsTrigger value="tasks" className="gap-2"><Sparkles className="h-3.5 w-3.5" /> Tasks ({stats?.tasksPending || 0})</TabsTrigger>
            <TabsTrigger value="activity" className="gap-2"><History className="h-3.5 w-3.5" /> Activity</TabsTrigger>
            <TabsTrigger value="weights" className="gap-2"><TrendingUp className="h-3.5 w-3.5" /> Weights</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Settings className="h-3.5 w-3.5" /> Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-4">
            {tasks.length === 0 ? (
              <Card><CardContent className="pt-8 pb-8 text-center text-sm text-muted-foreground">
                No tasks yet. Run the analysis to scan your site.
              </CardContent></Card>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left p-3">Score</th>
                      <th className="text-left p-3">Page</th>
                      <th className="text-left p-3 hidden md:table-cell">Keyword</th>
                      <th className="text-left p-3">Bucket</th>
                      <th className="text-left p-3 hidden lg:table-cell">Position</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-right p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {tasks.map((t) => (
                      <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-mono font-bold text-sm tabular-nums">{(t.score * 100).toFixed(0)}</td>
                        <td className="p-3 max-w-xs truncate" title={t.url}>
                          <a href={t.url} target="_blank" rel="noopener" className="hover:underline inline-flex items-center gap-1">
                            {t.url.replace(/^https?:\/\//, '')} <ExternalLink className="h-3 w-3 opacity-60" />
                          </a>
                        </td>
                        <td className="p-3 hidden md:table-cell font-mono text-xs truncate max-w-[140px]">{t.primary_keyword || '—'}</td>
                        <td className="p-3"><Badge variant="outline" className="font-mono text-[10px] tracking-wider">{t.bucket}</Badge></td>
                        <td className="p-3 hidden lg:table-cell tabular-nums">{t.position ? t.position.toFixed(1) : '—'}</td>
                        <td className="p-3"><TaskStatusBadge status={t.status} /></td>
                        <td className="p-3 text-right">
                          {(t.status === 'pending' || t.status === 'briefed') && (
                            <Button size="sm" variant="outline" onClick={() => markApplied(t.id)}>
                              <Check className="h-3 w-3" /> Applied
                            </Button>
                          )}
                          {t.brief && <DetailLink href={`#brief-${t.id}`} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            {history.length === 0 ? (
              <Card><CardContent className="pt-8 pb-8 text-center text-sm text-muted-foreground">No activity yet.</CardContent></Card>
            ) : (
              <ol className="relative border-l border-border/60 pl-6 space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="relative">
                    <div className="absolute -left-[29px] top-1 w-2 h-2 rounded-full bg-primary" />
                    <div className="text-xs text-muted-foreground font-mono">{new Date(h.created_at).toLocaleString()}</div>
                    <div className="text-sm font-medium">{humanAction(h.action_type)}</div>
                    {h.payload != null && (
                      <details className="text-xs text-muted-foreground mt-1">
                        <summary className="cursor-pointer">payload</summary>
                        <pre className="mt-2 p-2 bg-muted/30 rounded overflow-x-auto text-[10px]">{JSON.stringify(h.payload, null, 2)}</pre>
                      </details>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>

          <TabsContent value="weights" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Adaptive weights</CardTitle>
                <CardDescription>These self-tune as measurements come in. Higher = more influence on scoring.</CardDescription>
              </CardHeader>
              <CardContent>
                {weights.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No weights yet — first analysis run seeds defaults.</div>
                ) : (
                  <ul className="space-y-2">
                    {weights.sort((a, b) => b.value - a.value).map((w) => (
                      <li key={w.factor}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-mono uppercase tracking-wider text-xs">{w.factor}</span>
                          <span className="tabular-nums font-semibold">{(w.value * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                            style={{ width: `${Math.min(100, w.value * 100)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {w.update_count} updates · last {new Date(w.last_updated).toLocaleDateString()}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Site settings</CardTitle>
                <CardDescription>To change, use <code>PATCH /api/cro9/sites/{id}</code>. Editable UI coming next.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row k="Site URL" v={site.site_url} />
                <Row k="GSC property" v={site.gsc_property || '(not connected)'} />
                <Row k="Apply mode" v={site.apply_mode} />
                <Row k="SerpAPI key" v={site.serpapi_key_masked || '(not set)'} />
                <Row k="Status" v={site.status} />
                {site.trial_ends_at && <Row k="Trial ends" v={new Date(site.trial_ends_at).toLocaleDateString()} />}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}

function Stat({ label, value, delta, deltaText, invertColor }: { label: string; value: string; delta?: number; deltaText?: string; invertColor?: boolean }) {
  const effectiveDelta = delta ?? 0
  const dir = effectiveDelta === 0 ? 'flat' : effectiveDelta > 0 ? (invertColor ? 'bad' : 'good') : (invertColor ? 'good' : 'bad')
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {(typeof delta === 'number' || deltaText) && (
          <div className={`text-[11px] mt-1 flex items-center gap-1 ${
            dir === 'good' ? 'text-emerald-500' : dir === 'bad' ? 'text-rose-500' : 'text-muted-foreground'
          }`}>
            {typeof delta === 'number' ? (delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />) : null}
            {deltaText ?? `${delta! > 0 ? '+' : ''}${typeof delta === 'number' ? delta.toFixed(delta % 1 === 0 ? 0 : 1) : ''}`}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TaskStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-muted text-muted-foreground',
    briefed: 'bg-violet-500/10 text-violet-600 border-violet-500/40',
    applied: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/40',
    measuring: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/40',
    improved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/40',
    flat: 'bg-muted text-muted-foreground',
    regressed: 'bg-rose-500/10 text-rose-600 border-rose-500/40',
    archived: 'bg-muted text-muted-foreground',
  }
  return <Badge variant="outline" className={map[status] || ''}>{status}</Badge>
}

function DetailLink({ href }: { href: string }) { return <a className="ml-2 text-[11px] underline text-muted-foreground" href={href}>brief</a> }

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-0 border-border/60">
      <dt className="text-xs text-muted-foreground uppercase tracking-wider">{k}</dt>
      <dd className="font-mono text-xs truncate max-w-[60%] text-right">{v}</dd>
    </div>
  )
}

function humanAction(a: string): string {
  const map: Record<string, string> = {
    site_created: 'Site onboarded',
    site_updated: 'Settings updated',
    analyze_run: 'Daily analysis run',
    brief_generated: 'Content brief generated',
    task_created: 'Task scored + queued',
    apply_manual: 'Task marked as applied',
    apply_auto: 'Rewrite auto-applied',
    measure: 'Outcome measured',
    weight_adjust: 'Adaptive weights updated',
    trial_expired: 'Trial expired',
    error: 'Engine error',
  }
  return map[a] || a
}

// Tiny inline SVG line chart — no deps
function MiniLineChart({ rows }: { rows: ChartRow[] }) {
  const W = 700, H = 160, PAD = 24
  const maxI = Math.max(1, ...rows.map((r) => r.impressions))
  const maxC = Math.max(1, ...rows.map((r) => r.clicks))
  const pathFor = (key: 'impressions' | 'clicks') => {
    const max = key === 'impressions' ? maxI : maxC
    const step = (W - PAD * 2) / Math.max(1, rows.length - 1)
    return rows.map((r, i) => {
      const x = PAD + i * step
      const y = H - PAD - ((r[key] / max) * (H - PAD * 2))
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    }).join(' ')
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40">
      <defs>
        <linearGradient id="c9grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${pathFor('impressions')} L ${W - PAD} ${H - PAD} L ${PAD} ${H - PAD} Z`} fill="url(#c9grad)" />
      <path d={pathFor('impressions')} stroke="#f97316" strokeWidth="2" fill="none" />
      <path d={pathFor('clicks')} stroke="#dc2626" strokeWidth="2" fill="none" />
    </svg>
  )
}
