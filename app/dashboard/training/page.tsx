'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, RefreshCw, Upload, Globe } from 'lucide-react'
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
  { slot: 1, name: 'Platform', description: 'System + Tools (merged)', status: 'locked', badge: 'System', documentCount: 144, lastUpdated: 'Built-in' },
  { slot: 2, name: 'Brand & Design', description: 'Syncs from Brand Board', status: 'auto', badge: 'Auto-sync', documentCount: 12, lastUpdated: 'Auto' },
  { slot: 3, name: 'Company', description: 'Your business knowledge', status: 'available', badge: 'FREE', documentCount: 0, lastUpdated: 'Not configured' },
  { slot: 4, name: '0nAI Security', description: 'Behavioral auth & trust scoring', status: 'locked', badge: 'Security', documentCount: 6, lastUpdated: 'Built-in' },
  { slot: 5, name: 'Available', description: 'Purchasable layer', status: 'available', documentCount: 0, lastUpdated: '' },
  { slot: 6, name: 'Available', description: 'Purchasable layer', status: 'available', documentCount: 0, lastUpdated: '' },
  { slot: 7, name: 'Available', description: 'Purchasable layer', status: 'available', documentCount: 0, lastUpdated: '' },
  { slot: 8, name: 'Available', description: 'Purchasable layer', status: 'available', documentCount: 0, lastUpdated: '' },
  { slot: 9, name: 'Available', description: 'Purchasable layer', status: 'available', documentCount: 0, lastUpdated: '' },
  { slot: 10, name: 'Available', description: 'Purchasable layer', status: 'available', documentCount: 0, lastUpdated: '' },
  { slot: 11, name: 'Available', description: 'Purchasable layer', status: 'available', documentCount: 0, lastUpdated: '' },
  { slot: 12, name: 'Available', description: 'Purchasable layer', status: 'available', documentCount: 0, lastUpdated: '' },
  { slot: 13, name: 'Available', description: 'Purchasable layer', status: 'available', documentCount: 0, lastUpdated: '' },
  { slot: 14, name: 'Available', description: 'Purchasable layer', status: 'available', documentCount: 0, lastUpdated: '' },
  { slot: 15, name: 'Reserved', description: 'System reserved', status: 'locked', badge: 'Reserved', documentCount: 0, lastUpdated: '' },
]

const statusTextClass: Record<string, string> = {
  active: 'text-core-green',
  locked: 'text-core-text-muted',
  available: 'text-core-cyan',
  auto: 'text-core-purple',
}

const statusBgClass: Record<string, string> = {
  active: 'bg-core-green/10',
  locked: 'bg-core-text-muted/10',
  available: 'bg-core-cyan/10',
  auto: 'bg-core-purple/10',
}

const statusLabel: Record<string, string> = {
  active: 'Active',
  locked: 'Locked',
  available: 'Available',
  auto: 'Auto',
}

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

  const selectedLayer = selectedSlot ? layers.find(l => l.slot === selectedSlot) : null
  const activeLayers = layers.filter(l => l.status === 'active' || l.status === 'locked' || l.status === 'auto').length
  const isError = createMsg.includes('Error') || createMsg.includes('Failed')

  return (
    <div className="max-w-[1200px] mx-auto px-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold text-core-text m-0">Knowledge Base</h1>
            <span className="px-[10px] py-[3px] rounded-md text-[10px] font-bold bg-core-green/10 text-core-green border border-core-green/20 tracking-[0.06em]">
              UNLIMITED
            </span>
          </div>
          <p className="text-[13px] text-core-text-muted mt-1">
            15 Layers Available — {activeLayers} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-core-text-muted">{kbs.length} CRM Knowledge Bases</span>
          <button
            onClick={fetchKBs}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold bg-core-green/[0.08] border border-core-green/20 text-core-green cursor-pointer"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-5">
        {/* K-Layer Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-[3px] border-core-border border-t-core-green rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
              {layers.map(layer => {
                const isSelected = selectedSlot === layer.slot
                const isLocked = layer.status === 'locked'
                const textClass = statusTextClass[layer.status]
                const bgClass = statusBgClass[layer.status]
                return (
                  <div
                    key={layer.slot}
                    onClick={() => openLayer(layer.slot)}
                    className={[
                      'rounded-xl p-4 border transition-all duration-150',
                      isSelected
                        ? 'bg-core-green/[0.04] border-core-green/30'
                        : 'bg-core-surface border-core-border',
                      isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                    ].join(' ')}
                  >
                    {/* Top row: slot + status */}
                    <div className="flex items-center justify-between mb-2.5">
                      <span className={`text-[10px] font-extrabold ${textClass} ${bgClass} px-2 py-[2px] rounded tracking-[0.05em]`}>
                        K{layer.slot}
                      </span>
                      <span className={`text-[9px] font-semibold ${textClass} uppercase tracking-[0.06em]`}>
                        {statusLabel[layer.status]}
                      </span>
                    </div>

                    {/* Name */}
                    <div className="text-[14px] font-semibold text-core-text mb-1">
                      {layer.name}
                    </div>

                    {/* Description */}
                    <div className="text-[11px] text-core-text-muted mb-2.5">
                      {layer.description}
                    </div>

                    {/* Badge */}
                    {layer.badge && (
                      <span className="inline-block text-[9px] font-bold px-2 py-[2px] rounded mb-2 bg-core-green/[0.08] text-core-green border border-core-green/15">
                        {layer.badge}
                      </span>
                    )}

                    {/* Stats */}
                    <div className="flex justify-between text-[10px] text-core-text-muted/70">
                      <span>{layer.documentCount} docs</span>
                      <span>{layer.lastUpdated}</span>
                    </div>

                    {/* Action button for configurable layers */}
                    {layer.status === 'available' && (
                      <button className="w-full mt-2.5 py-[7px] rounded-md text-[11px] font-semibold bg-core-cyan/[0.06] border border-core-cyan/15 text-core-cyan cursor-pointer">
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
          <div className="w-[360px] shrink-0 bg-core-surface border border-core-border rounded-[14px] p-5 sticky top-20 max-h-[calc(100vh-120px)] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className={`text-[11px] font-extrabold ${statusTextClass[selectedLayer.status]} ${statusBgClass[selectedLayer.status]} px-[10px] py-[3px] rounded-md`}>
                K{selectedLayer.slot}
              </span>
              <button
                onClick={() => setSelectedSlot(null)}
                className="bg-transparent border-none text-core-text-muted cursor-pointer p-1 rounded hover:text-core-text transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Name input */}
            <label className="block mb-3">
              <span className="block text-[10px] font-bold text-core-text-muted mb-1 uppercase tracking-[0.06em]">
                Name
              </span>
              <input
                value={detailName}
                onChange={e => setDetailName(e.target.value)}
                placeholder="Layer name..."
                className="w-full px-3 py-2.5 rounded-lg bg-core-bg border border-core-border text-core-text text-[13px] outline-none box-border"
              />
            </label>

            {/* Description */}
            <label className="block mb-4">
              <span className="block text-[10px] font-bold text-core-text-muted mb-1 uppercase tracking-[0.06em]">
                Description
              </span>
              <textarea
                value={detailDesc}
                onChange={e => setDetailDesc(e.target.value)}
                placeholder="What this layer does..."
                rows={2}
                className="w-full px-3 py-2.5 rounded-lg bg-core-bg border border-core-border text-core-text text-[13px] outline-none resize-y box-border font-inherit"
              />
            </label>

            {/* Documents from CRM KB */}
            <div className="mb-4">
              <span className="block text-[10px] font-bold text-core-text-muted mb-2 uppercase tracking-[0.06em]">
                Documents ({kbs.length} knowledge bases)
              </span>
              <div className="flex flex-col gap-1.5">
                {kbs.length > 0 ? kbs.map(kb => (
                  <div key={kb.id} className="px-3 py-2 rounded-lg bg-core-bg border border-core-border text-[12px] text-core-text-dim">
                    <div className="font-semibold">{kb.name}</div>
                    {kb.description && (
                      <div className="text-[10px] text-core-text-muted mt-0.5">{kb.description}</div>
                    )}
                  </div>
                )) : (
                  <div className="text-[11px] text-core-text-muted/70 text-center p-3">
                    No knowledge bases linked
                  </div>
                )}
              </div>
            </div>

            {/* Upload Document */}
            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-core-green/[0.06] border border-core-green/15 text-core-green text-[12px] font-semibold cursor-pointer mb-3">
              <Upload size={13} />
              Upload Document
            </button>

            {/* Paste Content */}
            <label className="block mb-3">
              <span className="block text-[10px] font-bold text-core-text-muted mb-1 uppercase tracking-[0.06em]">
                Paste Content
              </span>
              <textarea
                value={pasteContent}
                onChange={e => setPasteContent(e.target.value)}
                placeholder="Paste knowledge content here..."
                rows={4}
                className="w-full px-3 py-2.5 rounded-lg bg-core-bg border border-core-border text-core-text text-[12px] outline-none resize-y box-border font-inherit"
              />
            </label>

            {/* Scrape URL */}
            <label className="block mb-4">
              <span className="block text-[10px] font-bold text-core-text-muted mb-1 uppercase tracking-[0.06em]">
                Scrape URL
              </span>
              <div className="flex gap-1.5">
                <input
                  value={scrapeUrl}
                  onChange={e => setScrapeUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-[9px] rounded-lg bg-core-bg border border-core-border text-core-text text-[12px] outline-none"
                />
                <button className="flex items-center gap-1.5 px-3.5 py-[9px] rounded-lg bg-core-cyan/[0.06] border border-core-cyan/15 text-core-cyan text-[11px] font-semibold cursor-pointer whitespace-nowrap">
                  <Globe size={12} />
                  Scrape
                </button>
              </div>
            </label>

            {/* Status message */}
            {createMsg && (
              <div className={[
                'px-3 py-2 rounded-lg mb-2.5 text-[12px] border',
                isError
                  ? 'bg-core-red/[0.08] border-core-red/20 text-core-red'
                  : 'bg-core-green/[0.08] border-core-green/20 text-core-green',
              ].join(' ')}>
                {createMsg}
              </div>
            )}

            {/* Create/Save button */}
            <button
              onClick={createKB}
              disabled={creating || !detailName.trim()}
              className={[
                'w-full py-3 rounded-lg text-[13px] font-bold border-none transition-colors',
                creating || !detailName.trim()
                  ? 'bg-core-border text-core-text-muted cursor-not-allowed'
                  : 'bg-core-green text-black cursor-pointer',
              ].join(' ')}
            >
              {creating ? 'Creating...' : 'Create Knowledge Base'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
