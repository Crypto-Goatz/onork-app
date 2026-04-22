'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Layers,
  Tag,
  GitBranch,
  Brain,
  Workflow,
  CheckCircle2,
  XCircle,
  Clock,
  Rocket,
  ChevronRight,
} from 'lucide-react'

interface DeployedItem {
  type: string
  name: string
  id?: string
}

interface DeployHistory {
  id?: string
  location_id: string
  snapshot_id: string
  snapshot_version: string
  deployed_items: DeployedItem[]
  errors: string[]
  success: boolean
  created_at?: string
}

const MASTER_SNAPSHOT = {
  id: 'master-v1',
  name: '0nCore Master Snapshot',
  description: 'Complete 0nCore setup with pipeline, custom fields, K-layers, workflows, voice AI, and chat bot',
  version: '1.0.0',
  pipeline: {
    name: '0nCore Pipeline',
    stages: ['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'],
  },
  customFields: ['0nCore User ID', '0nCore Tier', 'Trust Score', 'K-Layers Active', 'Last AI Interaction'],
  tags: ['0ncore-managed', 'ai-enabled', 'vip', 'active', 'trial', 'churned'],
  workflows: ['Lead Follow-up', 'Content Engine'],
  knowledgeBases: ['K1: Platform', 'K2: Brand & Design', 'K3: Company', 'K4: 0nAI Security'],
}

const TYPE_CLASSES: Record<string, { badge: string; label: string }> = {
  pipeline:      { badge: 'bg-core-purple/10 text-core-purple border-core-purple/20',      label: 'text-core-purple' },
  customField:   { badge: 'bg-core-cyan/10 text-core-cyan border-core-cyan/20',            label: 'text-core-cyan' },
  tag:           { badge: 'bg-core-green/10 text-core-green border-core-green/20',         label: 'text-core-green' },
  workflow:      { badge: 'bg-core-amber/10 text-core-amber border-core-amber/20',         label: 'text-core-amber' },
  knowledgeBase: { badge: 'bg-core-cyan/10 text-core-cyan border-core-cyan/20',            label: 'text-core-cyan' },
  voiceAgent:    { badge: 'bg-core-red/10 text-core-red border-core-red/20',               label: 'text-core-red' },
}

function typeBadgeClass(type: string) {
  return TYPE_CLASSES[type]?.badge ?? 'bg-core-surface text-core-text-muted border-core-border'
}

export default function SnapshotsPage() {
  const [locationId, setLocationId] = useState('')
  const [customLocationId, setCustomLocationId] = useState('')
  const [deploying, setDeploying] = useState(false)
  const [deployResult, setDeployResult] = useState<{ success: boolean; deployed: DeployedItem[]; errors: string[] } | null>(null)
  const [history, setHistory] = useState<DeployHistory[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const loc = user.user_metadata?.active_location_id || ''
        setLocationId(loc)
        setCustomLocationId(loc)
      }
    })
    loadHistory()
  }, [])

  async function loadHistory() {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('snapshot_deployments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      if (data) setHistory(data)
    } catch {
      // Table may not exist yet
    }
  }

  async function deploySnapshot() {
    const target = customLocationId.trim() || locationId
    if (!target) return
    setDeploying(true)
    setDeployResult(null)
    try {
      const res = await fetch('/api/snapshots/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: target, snapshotId: 'master-v1' }),
      })
      const data = await res.json()
      setDeployResult({
        success: data.success,
        deployed: data.deployed || [],
        errors: data.errors || [],
      })
      loadHistory()
    } catch (e) {
      setDeployResult({ success: false, deployed: [], errors: [(e as Error).message] })
    }
    setDeploying(false)
  }

  return (
    <div className="max-w-[1100px] mx-auto px-2">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-core-text m-0 flex items-center gap-2">
            Snapshot Manager
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-core-green/10 text-core-green border border-core-green/20">
              DEPLOY
            </span>
          </h1>
          <p className="text-[13px] text-core-text-muted mt-1">
            Deploy pre-configured CRM setups to any sub-location
          </p>
        </div>
      </div>

      {/* Master Snapshot Card */}
      <div className="bg-core-card border border-core-green/20 rounded-2xl p-7 mb-6">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 className="text-lg font-bold text-core-text m-0 mb-1">
              {MASTER_SNAPSHOT.name}
            </h2>
            <p className="text-[13px] text-core-text-muted m-0">
              {MASTER_SNAPSHOT.description}
            </p>
            <span className="text-[10px] font-bold text-core-green mt-2 inline-block">
              v{MASTER_SNAPSHOT.version}
            </span>
          </div>
        </div>

        {/* Snapshot Contents Grid */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 mb-6">

          {/* Pipeline */}
          <div className="bg-core-purple/5 rounded-xl p-3.5 border border-core-purple/15">
            <div className="flex items-center gap-1.5 mb-2">
              <GitBranch className="w-3 h-3 text-core-purple" />
              <span className="text-[10px] font-bold text-core-purple uppercase tracking-[0.06em]">Pipeline</span>
            </div>
            <div className="text-[13px] font-semibold text-core-text mb-1.5">
              {MASTER_SNAPSHOT.pipeline.name}
            </div>
            {MASTER_SNAPSHOT.pipeline.stages.map(s => (
              <div key={s} className="flex items-center gap-1 text-[11px] text-core-text-muted py-px">
                <ChevronRight className="w-3 h-3 shrink-0 opacity-50" />
                {s}
              </div>
            ))}
          </div>

          {/* Custom Fields */}
          <div className="bg-core-cyan/5 rounded-xl p-3.5 border border-core-cyan/15">
            <div className="flex items-center gap-1.5 mb-2">
              <Layers className="w-3 h-3 text-core-cyan" />
              <span className="text-[10px] font-bold text-core-cyan uppercase tracking-[0.06em]">Custom Fields</span>
            </div>
            {MASTER_SNAPSHOT.customFields.map(f => (
              <div key={f} className="flex items-center gap-1 text-[11px] text-core-text-muted py-px">
                <ChevronRight className="w-3 h-3 shrink-0 opacity-50" />
                {f}
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="bg-core-green/5 rounded-xl p-3.5 border border-core-green/15">
            <div className="flex items-center gap-1.5 mb-2">
              <Tag className="w-3 h-3 text-core-green" />
              <span className="text-[10px] font-bold text-core-green uppercase tracking-[0.06em]">Tags</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {MASTER_SNAPSHOT.tags.map(t => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-core-green/10 text-core-green">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* K-Layers */}
          <div className="bg-core-cyan/5 rounded-xl p-3.5 border border-core-cyan/15">
            <div className="flex items-center gap-1.5 mb-2">
              <Brain className="w-3 h-3 text-core-cyan" />
              <span className="text-[10px] font-bold text-core-cyan uppercase tracking-[0.06em]">K-Layers</span>
            </div>
            {MASTER_SNAPSHOT.knowledgeBases.map(kb => (
              <div key={kb} className="flex items-center gap-1 text-[11px] text-core-text-muted py-px">
                <ChevronRight className="w-3 h-3 shrink-0 opacity-50" />
                {kb}
              </div>
            ))}
          </div>

          {/* Workflows */}
          <div className="bg-core-amber/5 rounded-xl p-3.5 border border-core-amber/15">
            <div className="flex items-center gap-1.5 mb-2">
              <Workflow className="w-3 h-3 text-core-amber" />
              <span className="text-[10px] font-bold text-core-amber uppercase tracking-[0.06em]">Workflows</span>
            </div>
            {MASTER_SNAPSHOT.workflows.map(w => (
              <div key={w} className="flex items-center gap-1 text-[11px] text-core-text-muted py-px">
                <ChevronRight className="w-3 h-3 shrink-0 opacity-50" />
                {w}
              </div>
            ))}
          </div>
        </div>

        {/* Deploy Controls */}
        <div className="flex gap-2.5 items-end">
          <div className="flex-1">
            <label className="block text-[11px] text-core-text-muted font-semibold mb-1 uppercase tracking-[0.05em]">
              Target Location ID
            </label>
            <input
              type="text"
              value={customLocationId}
              onChange={e => setCustomLocationId(e.target.value)}
              placeholder={locationId || 'Enter CRM location ID'}
              className="w-full px-3 py-2.5 rounded-lg border border-core-border bg-core-bg text-core-text text-sm outline-none focus:border-core-green/50 transition-colors"
            />
          </div>
          <button
            onClick={deploySnapshot}
            disabled={deploying || !(customLocationId.trim() || locationId)}
            className={[
              'flex items-center gap-2 px-7 h-[42px] rounded-xl font-bold text-sm whitespace-nowrap transition-all',
              deploying || !(customLocationId.trim() || locationId)
                ? 'bg-core-surface text-core-text-muted cursor-not-allowed opacity-60'
                : 'bg-core-green text-core-bg cursor-pointer hover:opacity-90',
            ].join(' ')}
          >
            <Rocket className="w-4 h-4" />
            {deploying ? 'Deploying...' : 'Deploy Snapshot'}
          </button>
        </div>
      </div>

      {/* Deploy Result */}
      {deployResult && (
        <div className={[
          'rounded-2xl p-5 mb-6 border',
          deployResult.success
            ? 'bg-core-green/5 border-core-green/20'
            : 'bg-core-red/5 border-core-red/20',
        ].join(' ')}>
          <h3 className={[
            'flex items-center gap-2 text-[15px] font-bold mb-3',
            deployResult.success ? 'text-core-green' : 'text-core-red',
          ].join(' ')}>
            {deployResult.success
              ? <CheckCircle2 className="w-4 h-4" />
              : <XCircle className="w-4 h-4" />}
            {deployResult.success ? 'Deployment Successful' : 'Deployment Completed with Errors'}
          </h3>

          {deployResult.deployed.length > 0 && (
            <div className="mb-3">
              <div className="text-[11px] font-semibold text-core-text-muted uppercase tracking-wide mb-2">
                Deployed Items
              </div>
              <div className="flex flex-col gap-1">
                {deployResult.deployed.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px] text-core-text-dim">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${typeBadgeClass(item.type)}`}>
                      {item.type}
                    </span>
                    {item.name}
                    {item.id && (
                      <code className="text-[10px] text-core-text-muted font-mono">{item.id}</code>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {deployResult.errors.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-core-red uppercase tracking-wide mb-2">
                Errors
              </div>
              {deployResult.errors.map((err, i) => (
                <div key={i} className="text-[12px] text-core-red py-0.5">{err}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deployment History */}
      {history.length > 0 && (
        <div className="mb-6">
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-core-text mb-3">
            <Clock className="w-4 h-4 text-core-text-muted" />
            Deployment History
          </h3>
          <div className="flex flex-col gap-2">
            {history.map((h, i) => (
              <div
                key={h.id || i}
                className="bg-core-card border border-core-border rounded-xl px-4 py-3.5 flex justify-between items-center"
              >
                <div>
                  <div className="text-[13px] font-semibold text-core-text">
                    {h.snapshot_id}{' '}
                    <span className="text-[10px] text-core-text-muted">v{h.snapshot_version}</span>
                  </div>
                  <div className="text-[11px] text-core-text-muted mt-0.5">
                    Location: {h.location_id} &middot; {h.deployed_items?.length || 0} items deployed
                    {h.created_at && ` \u00b7 ${new Date(h.created_at).toLocaleString()}`}
                  </div>
                </div>
                <span className={[
                  'flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md',
                  h.success
                    ? 'bg-core-green/10 text-core-green'
                    : 'bg-core-red/10 text-core-red',
                ].join(' ')}>
                  {h.success
                    ? <CheckCircle2 className="w-3 h-3" />
                    : <XCircle className="w-3 h-3" />}
                  {h.success ? 'SUCCESS' : 'ERRORS'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
