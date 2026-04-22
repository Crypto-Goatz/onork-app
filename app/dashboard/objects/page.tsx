'use client'

import { useState, useEffect } from 'react'
import { Search, X, Boxes, ArrowRight, Layers } from 'lucide-react'

interface CustomObject {
  id: string
  key: string
  name: string
  description?: string
  fields?: { key: string; name: string; type: string }[]
  recordCount?: number
  createdAt?: string
}

interface ObjectRecord {
  id: string
  properties: Record<string, string | number | boolean>
  createdAt?: string
}

export default function ObjectsPage() {
  const [schemas, setSchemas] = useState<CustomObject[]>([])
  const [records, setRecords] = useState<ObjectRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedSchema, setSelectedSchema] = useState<CustomObject | null>(null)
  const [loadingRecords, setLoadingRecords] = useState(false)

  useEffect(() => { fetchSchemas() }, [])

  async function fetchSchemas() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/crm/objects')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setSchemas(data.schemas || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function viewRecords(schema: CustomObject) {
    setSelectedSchema(schema)
    setLoadingRecords(true)
    try {
      const res = await fetch(`/api/crm/objects?action=records&schemaId=${schema.id}`)
      const data = await res.json()
      setRecords(data.records || [])
    } catch {
      setRecords([])
    } finally {
      setLoadingRecords(false)
    }
  }

  const filtered = schemas.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="max-w-[1100px] mx-auto px-2">
      {/* Records Modal */}
      {selectedSchema && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setSelectedSchema(null)}
        >
          <div
            className="bg-core-card border border-core-border rounded-2xl p-7 max-w-[700px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.4)] max-h-[80vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-lg font-bold text-core-text m-0">{selectedSchema.name}</h2>
                <p className="text-xs text-core-text-muted mt-1">Key: {selectedSchema.key}</p>
              </div>
              <button
                onClick={() => setSelectedSchema(null)}
                className="text-core-text-muted hover:text-core-text bg-transparent border-0 cursor-pointer p-1 rounded transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Fields */}
            {selectedSchema.fields && selectedSchema.fields.length > 0 && (
              <div className="mb-5">
                <div className="text-[11px] text-core-text-muted font-semibold uppercase tracking-[0.06em] mb-2">Fields</div>
                <div className="flex gap-1.5 flex-wrap">
                  {selectedSchema.fields.map(f => (
                    <span
                      key={f.key}
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-core-cyan/10 text-core-cyan border border-core-cyan/15"
                    >
                      {f.name}{' '}
                      <span className="opacity-60">({f.type})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Records */}
            <div className="text-[11px] text-core-text-muted font-semibold uppercase tracking-[0.06em] mb-2">Records</div>
            {loadingRecords ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 rounded-full border-[3px] border-core-border border-t-core-cyan animate-spin" />
              </div>
            ) : records.length === 0 ? (
              <p className="text-core-text-muted text-sm text-center py-5">No records yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {records.map(r => (
                  <div
                    key={r.id}
                    className="px-4 py-3 rounded-[10px] border border-core-border bg-core-bg"
                  >
                    <div className="text-xs text-core-text-muted mb-1.5">ID: {r.id}</div>
                    <div className="flex gap-3 flex-wrap">
                      {Object.entries(r.properties || {}).slice(0, 5).map(([k, v]) => (
                        <div key={k} className="text-xs">
                          <span className="text-core-text-muted">{k}: </span>
                          <span className="text-core-text font-semibold">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-core-text m-0 flex items-center gap-2">
            Custom Objects
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-[10px] bg-core-green/12 text-core-green border border-core-green/20">
              UNLIMITED
            </span>
          </h1>
          <p className="text-[13px] text-core-text-muted mt-1">
            {schemas.length > 0 ? `${schemas.length} custom objects` : 'Manage custom object schemas and records'}
          </p>
        </div>
        <span className="text-[11px] font-semibold text-core-green">Activated</span>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-core-text-dim pointer-events-none" />
        <input
          type="text"
          placeholder="Search objects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-core-card border border-core-border rounded-[10px] text-core-text text-sm outline-none placeholder:text-core-text-muted focus:border-core-cyan/50 transition-colors"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-[60px]">
          <div className="w-8 h-8 rounded-full border-[3px] border-core-border border-t-core-cyan animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-core-card border border-core-border rounded-2xl p-10 text-center">
          <p className="text-core-red text-sm mb-3">{error}</p>
          <button
            onClick={fetchSchemas}
            className="text-core-cyan bg-transparent border-0 cursor-pointer text-[13px] font-semibold hover:underline"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-core-card border border-core-border rounded-2xl px-10 py-[60px] text-center">
          <Boxes size={40} className="mx-auto mb-4 text-core-text-muted opacity-30" />
          <p className="text-core-text-dim text-sm mb-2">
            {search ? 'No objects match your search.' : 'No custom objects yet.'}
          </p>
          <p className="text-core-text-muted text-[13px]">Custom objects created in your CRM will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {filtered.map(s => (
            <div
              key={s.id}
              className="bg-core-card border border-core-border rounded-xl p-5 cursor-pointer transition-colors duration-200 hover:border-core-cyan/60 group"
              onClick={() => viewRecords(s)}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-[15px] font-semibold text-core-text">{s.name}</div>
                  <div className="text-[11px] text-core-text-muted mt-0.5">Key: {s.key}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-core-cyan/10 text-core-cyan">
                  {s.fields?.length || 0} fields
                </span>
              </div>

              {s.description && (
                <p className="text-xs text-core-text-muted mb-3">{s.description}</p>
              )}

              <div className="flex justify-between items-center">
                <span className="text-xs text-core-text-muted flex items-center gap-1">
                  <Layers size={12} />
                  {s.recordCount || 0} records
                </span>
                <span className="text-xs text-core-cyan font-semibold flex items-center gap-1 group-hover:gap-1.5 transition-all">
                  View Records
                  <ArrowRight size={12} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
