'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocation } from '@/lib/location-context'

interface KBEntry {
  id: string
  name: string
  description?: string
  documentCount?: number
  updatedAt?: string
}

interface KLayer {
  slot: number
  name: string
  description: string
  status: 'active' | 'locked' | 'available' | 'auto'
  badge?: string
  kbId?: string
  documentCount: number
  lastUpdated: string
}

const DEFAULT_LAYERS: KLayer[] = [
  { slot: 1, name: '0nCore System', description: 'Platform AI', status: 'locked', badge: 'System', documentCount: 48, lastUpdated: 'Built-in' },
  { slot: 2, name: '0nMCP Tools', description: 'Tool Catalog', status: 'locked', badge: '1,554 tools', documentCount: 96, lastUpdated: 'Built-in' },
  { slot: 3, name: 'Brand & Design', description: 'Syncs from Brand Board', status: 'auto', badge: 'Auto-sync', documentCount: 12, lastUpdated: 'Auto' },
  { slot: 4, name: 'Company', description: 'Your business knowledge', status: 'available', badge: 'FREE', documentCount: 0, lastUpdated: 'Not configured' },
  { slot: 5, name: 'Personal', description: 'Adapts to you', status: 'auto', badge: 'Auto-learn', documentCount: 0, lastUpdated: 'Auto' },
  { slot: 6, name: 'Available', description: 'Configure this layer', status: 'available', documentCount: 0, lastUpdated: '' },
  { slot: 7, name: 'Available', description: 'Configure this layer', status: 'available', documentCount: 0, lastUpdated: '' },
  { slot: 8, name: 'Available', description: 'Configure this layer', status: 'available', documentCount: 0, lastUpdated: '' },
  { slot: 9, name: 'Available', description: 'Configure this layer', status: 'available', documentCount: 0, lastUpdated: '' },
  { slot: 10, name: 'Available', description: 'Configure this layer', status: 'available', documentCount: 0, lastUpdated: '' },
  { slot: 11, name: 'Available', description: 'Configure this layer', status: 'available', documentCount: 0, lastUpdated: '' },
  { slot: 12, name: 'Available', description: 'Configure this layer', status: 'available', documentCount: 0, lastUpdated: '' },
  { slot: 13, name: 'Available', description: 'Configure this layer', status: 'available', documentCount: 0, lastUpdated: '' },
  { slot: 14, name: 'Available', description: 'Configure this layer', status: 'available', documentCount: 0, lastUpdated: '' },
  { slot: 15, name: 'Available', description: 'Configure this layer', status: 'available', documentCount: 0, lastUpdated: '' },
]

export default function TrainingPage() {
  const { locationId, refreshKey } = useLocation()
  const [layers, setLayers] = useState<KLayer[]>(DEFAULT_LAYERS)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [kbs, setKbs] = useState<KBEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [detailName, setDetailName] = useState('')
  const [detailDesc, setDetailDesc] = useState('')
  const [pasteContent, setPasteContent] = useState('')
  const [scrapeUrl, setScrapeUrl] = useState('')
  const [creating, setCreating] = useState(false)
  const [createMsg, setCreateMsg] = useState('')

  const fetchKBs = useCallback(async () => {
    setLoading(true)
    try {
      const params = locationId ? `?locationId=${locationId}` : ''
      const res = await fetch(`/api/kb${params}`)
      if (res.ok) {
        const data = await res.json()
        setKbs(data.knowledgeBases || [])
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [locationId])

  useEffect(() => { fetchKBs() }, [fetchKBs, refreshKey])

  async function createKB() {
    if (!detailName.trim()) return
    setCreating(true)
    setCreateMsg('')
    try {
      const res = await fetch('/api/kb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: detailName,
          description: detailDesc,
          locationId,
        }),
      })
      if (res.ok) {
        setCreateMsg('Knowledge base created')
        await fetchKBs()
        // Update the layer name
        if (selectedSlot) {
          setLayers(prev => prev.map(l =>
            l.slot === selectedSlot
              ? { ...l, name: detailName, description: detailDesc || l.description, status: 'active' as const }
              : l
          ))
        }
      } else {
        const data = await res.json()
        setCreateMsg(data.error || 'Failed to create')
      }
    } catch {
      setCreateMsg('Error creating KB')
    }
    setCreating(false)
  }

  function openLayer(slot: number) {
    const layer = layers.find(l => l.slot === slot)
    if (!layer || layer.status === 'locked') return
    setSelectedSlot(slot)
    setDetailName(layer.name === 'Available' ? '' : layer.name)
    setDetailDesc(layer.description === 'Configure this layer' ? '' : layer.description)
    setPasteContent('')
    setScrapeUrl('')
    setCreateMsg('')
  }

  const statusColor: Record<string, string> = {
    active: '#7ed957',
    locked: '#6b7280',
    available: '#00d4ff',
    auto: '#a78bfa',
  }

  const statusLabel: Record<string, string> = {
    active: 'Active',
    locked: 'Locked',
    available: 'Available',
    auto: 'Auto',
  }

  const selectedLayer = selectedSlot ? layers.find(l => l.slot === selectedSlot) : null
  const activeLayers = layers.filter(l => l.status === 'active' || l.status === 'locked' || l.status === 'auto').length

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f0f4f8', margin: 0 }}>Knowledge Base</h1>
            <span style={{
              padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
              background: 'rgba(126,217,87,0.1)', color: '#7ed957',
              border: '1px solid rgba(126,217,87,0.2)', letterSpacing: '0.06em',
            }}>
              UNLIMITED
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            15 Layers Available — {activeLayers} active
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>{kbs.length} CRM Knowledge Bases</span>
          <button
            onClick={fetchKBs}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: 'rgba(126,217,87,0.08)', border: '1px solid rgba(126,217,87,0.2)',
              color: '#7ed957', cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* K-Layer Grid */}
        <div style={{ flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div style={{
                width: 32, height: 32, border: '3px solid #1e293b',
                borderTopColor: '#7ed957', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {layers.map(layer => {
                const isSelected = selectedSlot === layer.slot
                const isLocked = layer.status === 'locked'
                const color = statusColor[layer.status]
                return (
                  <div
                    key={layer.slot}
                    onClick={() => openLayer(layer.slot)}
                    style={{
                      background: isSelected ? 'rgba(126,217,87,0.04)' : '#161b22',
                      border: `1px solid ${isSelected ? 'rgba(126,217,87,0.3)' : '#1e293b'}`,
                      borderRadius: 12, padding: '16px',
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      opacity: isLocked ? 0.6 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    {/* Top row: slot + status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 800, color: color,
                        background: `${color}15`, padding: '2px 8px', borderRadius: 4,
                        letterSpacing: '0.05em',
                      }}>
                        K{layer.slot}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 600, color: color,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        {statusLabel[layer.status]}
                      </span>
                    </div>

                    {/* Name */}
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f4f8', marginBottom: 4 }}>
                      {layer.name}
                    </div>

                    {/* Description */}
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
                      {layer.description}
                    </div>

                    {/* Badge */}
                    {layer.badge && (
                      <span style={{
                        display: 'inline-block', fontSize: 9, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 4, marginBottom: 8,
                        background: 'rgba(126,217,87,0.08)', color: '#7ed957',
                        border: '1px solid rgba(126,217,87,0.15)',
                      }}>
                        {layer.badge}
                      </span>
                    )}

                    {/* Stats */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4b5563' }}>
                      <span>{layer.documentCount} docs</span>
                      <span>{layer.lastUpdated}</span>
                    </div>

                    {/* Action button for configurable layers */}
                    {(layer.status === 'available') && (
                      <button
                        style={{
                          width: '100%', marginTop: 10, padding: '7px 0',
                          borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)',
                          color: '#00d4ff', cursor: 'pointer',
                        }}
                      >
                        {layer.name === 'Available' ? 'Activate' : 'Configure'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedLayer && (
          <div style={{
            width: 360, flexShrink: 0,
            background: '#161b22', border: '1px solid #1e293b', borderRadius: 14,
            padding: '20px', position: 'sticky', top: 80,
            maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{
                fontSize: 11, fontWeight: 800, color: statusColor[selectedLayer.status],
                background: `${statusColor[selectedLayer.status]}15`,
                padding: '3px 10px', borderRadius: 5,
              }}>
                K{selectedLayer.slot}
              </span>
              <button
                onClick={() => setSelectedSlot(null)}
                style={{
                  background: 'none', border: 'none', color: '#4b5563',
                  cursor: 'pointer', fontSize: 16, padding: '0 4px',
                }}
              >
                x
              </button>
            </div>

            {/* Name input */}
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Name
              </span>
              <input
                value={detailName}
                onChange={e => setDetailName(e.target.value)}
                placeholder="Layer name..."
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  background: '#0d1117', border: '1px solid #1e293b',
                  color: '#f0f4f8', fontSize: 13, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </label>

            {/* Description */}
            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Description
              </span>
              <textarea
                value={detailDesc}
                onChange={e => setDetailDesc(e.target.value)}
                placeholder="What this layer does..."
                rows={2}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  background: '#0d1117', border: '1px solid #1e293b',
                  color: '#f0f4f8', fontSize: 13, outline: 'none', resize: 'vertical',
                  boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
            </label>

            {/* Documents from CRM KB */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Documents ({kbs.length} knowledge bases)
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {kbs.length > 0 ? kbs.map(kb => (
                  <div key={kb.id} style={{
                    padding: '8px 12px', borderRadius: 8,
                    background: '#0d1117', border: '1px solid #1e293b',
                    fontSize: 12, color: '#d1d5db',
                  }}>
                    <div style={{ fontWeight: 600 }}>{kb.name}</div>
                    {kb.description && (
                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{kb.description}</div>
                    )}
                  </div>
                )) : (
                  <div style={{ fontSize: 11, color: '#4b5563', textAlign: 'center', padding: 12 }}>
                    No knowledge bases linked
                  </div>
                )}
              </div>
            </div>

            {/* Upload Document placeholder */}
            <button style={{
              width: '100%', padding: '10px 0', borderRadius: 8,
              background: 'rgba(126,217,87,0.06)', border: '1px solid rgba(126,217,87,0.15)',
              color: '#7ed957', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              marginBottom: 12,
            }}>
              Upload Document
            </button>

            {/* Paste Content */}
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Paste Content
              </span>
              <textarea
                value={pasteContent}
                onChange={e => setPasteContent(e.target.value)}
                placeholder="Paste knowledge content here..."
                rows={4}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  background: '#0d1117', border: '1px solid #1e293b',
                  color: '#f0f4f8', fontSize: 12, outline: 'none', resize: 'vertical',
                  boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
            </label>

            {/* Scrape URL */}
            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Scrape URL
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={scrapeUrl}
                  onChange={e => setScrapeUrl(e.target.value)}
                  placeholder="https://..."
                  style={{
                    flex: 1, padding: '9px 12px', borderRadius: 8,
                    background: '#0d1117', border: '1px solid #1e293b',
                    color: '#f0f4f8', fontSize: 12, outline: 'none',
                  }}
                />
                <button style={{
                  padding: '9px 14px', borderRadius: 8,
                  background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)',
                  color: '#00d4ff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}>
                  Scrape
                </button>
              </div>
            </label>

            {/* Create/Save button */}
            {createMsg && (
              <div style={{
                padding: '8px 12px', borderRadius: 8, marginBottom: 10,
                background: createMsg.includes('Error') || createMsg.includes('Failed')
                  ? 'rgba(239,68,68,0.08)' : 'rgba(126,217,87,0.08)',
                border: `1px solid ${createMsg.includes('Error') || createMsg.includes('Failed')
                  ? 'rgba(239,68,68,0.2)' : 'rgba(126,217,87,0.2)'}`,
                color: createMsg.includes('Error') || createMsg.includes('Failed') ? '#f87171' : '#7ed957',
                fontSize: 12,
              }}>
                {createMsg}
              </div>
            )}

            <button
              onClick={createKB}
              disabled={creating || !detailName.trim()}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 8,
                background: creating || !detailName.trim() ? '#1e293b' : '#7ed957',
                border: 'none',
                color: creating || !detailName.trim() ? '#4b5563' : '#000',
                fontSize: 13, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer',
              }}
            >
              {creating ? 'Creating...' : 'Create Knowledge Base'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
