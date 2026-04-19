'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

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

export default function SnapshotsPage() {
  const [locationId, setLocationId] = useState('')
  const [customLocationId, setCustomLocationId] = useState('')
  const [deploying, setDeploying] = useState(false)
  const [deployResult, setDeployResult] = useState<{ success: boolean; deployed: DeployedItem[]; errors: string[] } | null>(null)
  const [history, setHistory] = useState<DeployHistory[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const loc = user.user_metadata?.active_location_id || ''
        setLocationId(loc)
        setCustomLocationId(loc)
      }
    })
    // Load deployment history
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

  const typeColor = (type: string) => {
    const map: Record<string, string> = {
      pipeline: '#8b5cf6',
      customField: '#14b8a6',
      tag: '#7ed957',
      workflow: '#f59e0b',
      knowledgeBase: '#60a5fa',
      voiceAgent: '#ec4899',
    }
    return map[type] || 'var(--text-muted, #6b7280)'
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: 0, display: 'flex', alignItems: 'center' }}>
            Snapshot Manager
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,217,87,0.12)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)', marginLeft: 8 }}>DEPLOY</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>Deploy pre-configured CRM setups to any sub-location</p>
        </div>
      </div>

      {/* Master Snapshot Card */}
      <div style={{
        background: 'var(--bg-card, #1f2937)', border: '1px solid rgba(126,217,87,0.2)',
        borderRadius: 16, padding: 28, marginBottom: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 4px' }}>
              {MASTER_SNAPSHOT.name}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', margin: 0 }}>{MASTER_SNAPSHOT.description}</p>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#7ed957', marginTop: 8, display: 'inline-block' }}>v{MASTER_SNAPSHOT.version}</span>
          </div>
        </div>

        {/* Snapshot Contents */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div style={{ background: 'rgba(139,92,246,0.06)', borderRadius: 10, padding: 14, border: '1px solid rgba(139,92,246,0.15)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Pipeline</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)', marginBottom: 6 }}>{MASTER_SNAPSHOT.pipeline.name}</div>
            {MASTER_SNAPSHOT.pipeline.stages.map(s => (
              <div key={s} style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', padding: '1px 0' }}>{s}</div>
            ))}
          </div>

          <div style={{ background: 'rgba(45,212,191,0.06)', borderRadius: 10, padding: 14, border: '1px solid rgba(45,212,191,0.15)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#14b8a6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Custom Fields</div>
            {MASTER_SNAPSHOT.customFields.map(f => (
              <div key={f} style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', padding: '1px 0' }}>{f}</div>
            ))}
          </div>

          <div style={{ background: 'rgba(126,217,87,0.06)', borderRadius: 10, padding: 14, border: '1px solid rgba(126,217,87,0.15)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#7ed957', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {MASTER_SNAPSHOT.tags.map(t => (
                <span key={t} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(126,217,87,0.1)', color: '#7ed957' }}>{t}</span>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(96,165,250,0.06)', borderRadius: 10, padding: 14, border: '1px solid rgba(96,165,250,0.15)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>K-Layers</div>
            {MASTER_SNAPSHOT.knowledgeBases.map(kb => (
              <div key={kb} style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', padding: '1px 0' }}>{kb}</div>
            ))}
          </div>

          <div style={{ background: 'rgba(245,158,11,0.06)', borderRadius: 10, padding: 14, border: '1px solid rgba(245,158,11,0.15)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Workflows</div>
            {MASTER_SNAPSHOT.workflows.map(w => (
              <div key={w} style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', padding: '1px 0' }}>{w}</div>
            ))}
          </div>
        </div>

        {/* Deploy Controls */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Target Location ID
            </label>
            <input
              type="text" value={customLocationId}
              onChange={e => setCustomLocationId(e.target.value)}
              placeholder={locationId || 'Enter CRM location ID'}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)',
                color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={deploySnapshot}
            disabled={deploying || !(customLocationId.trim() || locationId)}
            style={{
              padding: '10px 28px', height: 42,
              background: deploying ? '#374151' : 'linear-gradient(135deg, #7ed957, #5cb83a)',
              color: '#0c1220', fontWeight: 700, fontSize: 14, borderRadius: 10, border: 'none',
              cursor: deploying ? 'wait' : 'pointer', fontFamily: 'inherit',
              opacity: !(customLocationId.trim() || locationId) ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {deploying ? 'Deploying...' : 'Deploy Snapshot'}
          </button>
        </div>
      </div>

      {/* Deploy Result */}
      {deployResult && (
        <div style={{
          background: deployResult.success ? 'rgba(126,217,87,0.06)' : 'rgba(248,113,113,0.06)',
          border: `1px solid ${deployResult.success ? 'rgba(126,217,87,0.2)' : 'rgba(248,113,113,0.2)'}`,
          borderRadius: 14, padding: 20, marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: deployResult.success ? '#7ed957' : '#f87171', marginBottom: 12 }}>
            {deployResult.success ? 'Deployment Successful' : 'Deployment Completed with Errors'}
          </h3>
          {deployResult.deployed.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', marginBottom: 8 }}>Deployed Items</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {deployResult.deployed.map((item, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary, #9ca3af)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: `${typeColor(item.type)}15`, color: typeColor(item.type) }}>{item.type}</span>
                    {item.name}
                    {item.id && <code style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)' }}>{item.id}</code>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {deployResult.errors.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#f87171', textTransform: 'uppercase', marginBottom: 8 }}>Errors</div>
              {deployResult.errors.map((err, i) => (
                <div key={i} style={{ fontSize: 12, color: '#f87171', padding: '2px 0' }}>{err}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deployment History */}
      {history.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', marginBottom: 12 }}>Deployment History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((h, i) => (
              <div key={h.id || i} style={{
                background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
                borderRadius: 12, padding: '14px 18px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>
                    {h.snapshot_id} <span style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)' }}>v{h.snapshot_version}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>
                    Location: {h.location_id} | {h.deployed_items?.length || 0} items deployed
                    {h.created_at && ` | ${new Date(h.created_at).toLocaleString()}`}
                  </div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                  background: h.success ? 'rgba(126,217,87,0.12)' : 'rgba(248,113,113,0.12)',
                  color: h.success ? '#7ed957' : '#f87171',
                }}>{h.success ? 'SUCCESS' : 'ERRORS'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
