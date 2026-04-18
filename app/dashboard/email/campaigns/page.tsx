'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Mail, Plus, Eye, Send, Clock, BarChart3, Flame, ArrowRight, Check, X,
  RefreshCw,
} from 'lucide-react'

interface Campaign {
  name: string
  status: string
  id: string
  templateId?: string
  createdAt?: string
}

interface Template {
  id: string
  name: string
  previewUrl?: string
  lastUpdated?: string
}

export default function CampaignsPage() {
  const supabase = createClient()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'campaigns' | 'templates' | 'warmup'>('campaigns')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [warmupConfig, setWarmupConfig] = useState<{ domain: string; target: number } | null>(null)
  const [warmupSchedule, setWarmupSchedule] = useState<unknown[] | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const headers = { Authorization: `Bearer ${session.access_token}` }

    const [campRes, tmplRes] = await Promise.all([
      fetch('/api/email/campaigns', { headers }).then(r => r.ok ? r.json() : { campaigns: [] }),
      fetch('/api/email/templates', { headers }).then(r => r.ok ? r.json() : { templates: [] }),
    ])
    setCampaigns(campRes.campaigns || campRes.schedules || [])
    setTemplates(tmplRes.templates || tmplRes.data || [])
    setLoading(false)
  }

  async function generateWarmup() {
    if (!warmupConfig) return
    const res = await fetch('/api/email/warmup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(warmupConfig),
    })
    if (res.ok) {
      const data = await res.json()
      setWarmupSchedule(data.schedule || [])
    }
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-text-muted animate-pulse">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Email Campaigns</h1>
          <p className="mt-1 text-sm text-text-muted">Templates, campaigns, and IP warm-up management.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" className="bg-accent text-cta-text hover:bg-accent-action gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Campaign
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {(['campaigns', 'templates', 'warmup'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              tab === t ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-white'
            }`}
          >
            {t === 'campaigns' ? `Campaigns (${campaigns.length})` : t === 'templates' ? `Templates (${templates.length})` : 'IP Warm-up'}
          </button>
        ))}
      </div>

      {/* ── Campaigns Tab ── */}
      {tab === 'campaigns' && (
        <div className="space-y-3">
          {campaigns.length === 0 ? (
            <div className="rounded-xl border border-border/50 bg-bg-card/50 p-12 text-center">
              <Mail className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-muted">No campaigns found.</p>
              <p className="text-xs text-text-muted mt-1">Create your first email campaign to get started.</p>
            </div>
          ) : (
            campaigns.map((c, i) => (
              <div key={c.id || i} className="rounded-xl border border-border/50 bg-bg-card/50 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-bg-secondary flex items-center justify-center">
                    <Mail className="h-4 w-4 text-text-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{c.name}</p>
                    <p className="text-[11px] text-text-muted">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Draft'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={
                    c.status === 'sent' ? 'bg-accent/10 text-accent border-accent/20' :
                    c.status === 'scheduled' ? 'bg-amber/10 text-amber border-amber/20' :
                    'bg-bg-secondary text-text-muted border-border/50'
                  }>
                    {c.status || 'draft'}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-7 text-xs"><BarChart3 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Templates Tab ── */}
      {tab === 'templates' && (
        <div className="space-y-3">
          <p className="text-xs text-text-muted">Select a template to preview or use in a campaign. Templates are loaded from your CRM location.</p>
          {templates.length === 0 ? (
            <div className="rounded-xl border border-border/50 bg-bg-card/50 p-12 text-center">
              <Mail className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-muted">No templates found in this location.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t, i) => (
                <div
                  key={t.id || i}
                  onClick={() => setSelectedTemplate(t)}
                  className="cursor-pointer rounded-xl border border-border/50 bg-bg-card/50 p-4 transition-colors hover:border-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Mail className="h-4 w-4 text-text-muted" />
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1"><Eye className="h-3 w-3" /> Preview</Button>
                  </div>
                  <p className="text-sm font-medium text-white truncate">{t.name || 'Untitled'}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">{t.lastUpdated ? new Date(t.lastUpdated).toLocaleDateString() : ''}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Warm-up Tab ── */}
      {tab === 'warmup' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-bg-card/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="h-5 w-5 text-orange" />
              <h2 className="text-sm font-semibold text-white">IP Warm-up Schedule Generator</h2>
            </div>
            <p className="text-xs text-text-muted mb-4">Generate a day-by-day warm-up plan for a new sending domain. Follows industry best practices for deliverability.</p>
            <div className="flex gap-3">
              <input
                className="flex-1 rounded-lg border border-border/50 bg-bg-secondary px-3 py-2 text-sm text-white placeholder:text-text-muted"
                placeholder="Sending domain (e.g. mail.yoursite.com)"
                onChange={e => setWarmupConfig(prev => ({ domain: e.target.value, target: prev?.target || 1000 }))}
              />
              <input
                type="number"
                className="w-32 rounded-lg border border-border/50 bg-bg-secondary px-3 py-2 text-sm text-white placeholder:text-text-muted"
                placeholder="Daily target"
                onChange={e => setWarmupConfig(prev => ({ domain: prev?.domain || '', target: parseInt(e.target.value) || 1000 }))}
              />
              <Button size="sm" onClick={generateWarmup} className="bg-accent text-cta-text hover:bg-accent-action">
                Generate
              </Button>
            </div>
          </div>

          {warmupSchedule && (
            <div className="rounded-xl border border-border/50 bg-bg-card/50 overflow-hidden">
              <div className="px-5 py-3 border-b border-border/50">
                <p className="text-sm font-medium text-white">30-Day Warm-up Schedule</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="px-4 py-2.5 text-left text-text-muted font-medium">Day</th>
                      <th className="px-4 py-2.5 text-left text-text-muted font-medium">Volume</th>
                      <th className="px-4 py-2.5 text-left text-text-muted font-medium">Phase</th>
                      <th className="px-4 py-2.5 text-left text-text-muted font-medium">Target</th>
                      <th className="px-4 py-2.5 text-left text-text-muted font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(warmupSchedule as Array<{ day: number; volume: number; phase: string; engagement_target: string; action: string }>).map(row => (
                      <tr key={row.day} className="border-b border-border/30 hover:bg-bg-secondary/50">
                        <td className="px-4 py-2 text-white font-medium">{row.day}</td>
                        <td className="px-4 py-2 text-white">{row.volume.toLocaleString()}</td>
                        <td className="px-4 py-2">
                          <Badge className={
                            row.phase === 'cautious' ? 'bg-red/10 text-red border-red/20' :
                            row.phase === 'building' ? 'bg-amber/10 text-amber border-amber/20' :
                            row.phase === 'accelerating' ? 'bg-teal/10 text-teal border-teal/20' :
                            'bg-accent/10 text-accent border-accent/20'
                          }>
                            {row.phase}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-text-secondary">{row.engagement_target}</td>
                        <td className="px-4 py-2 text-text-muted max-w-xs truncate">{row.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Template Preview Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        {selectedTemplate && (
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">{selectedTemplate.name}</DialogTitle>
              <DialogDescription>Template ID: {selectedTemplate.id}</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-border/50 bg-white overflow-hidden" style={{ height: 400 }}>
              {selectedTemplate.previewUrl ? (
                <iframe src={selectedTemplate.previewUrl} className="w-full h-full border-0" title="Template Preview" />
              ) : (
                <div className="flex items-center justify-center h-full text-text-muted text-sm">
                  Preview not available — open in CRM email builder to view.
                </div>
              )}
            </div>
            <DialogFooter className="flex-row items-center justify-between sm:justify-between">
              <Button variant="outline" onClick={() => setSelectedTemplate(null)}>Close</Button>
              <Button className="bg-accent text-cta-text hover:bg-accent-action gap-1.5">
                <Send className="h-3.5 w-3.5" /> Use in Campaign
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
