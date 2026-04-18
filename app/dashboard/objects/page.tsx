'use client'

import { useState, useEffect } from 'react'

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
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>
      {/* Records Modal */}
      {selectedSchema && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => setSelectedSchema(null)}>
          <div style={{
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 16, padding: 28, maxWidth: 700, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)', maxHeight: '80vh', overflow: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: 0 }}>{selectedSchema.name}</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>Key: {selectedSchema.key}</p>
              </div>
              <button onClick={() => setSelectedSchema(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted, #6b7280)', cursor: 'pointer', fontSize: 18 }}>&times;</button>
            </div>

            {selectedSchema.fields && selectedSchema.fields.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Fields</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selectedSchema.fields.map(f => (
                    <span key={f.key} style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: 'rgba(45,212,191,0.1)', color: 'var(--color-cyan, #14b8a6)',
                      border: '1px solid rgba(45,212,191,0.15)',
                    }}>{f.name} <span style={{ opacity: 0.6 }}>({f.type})</span></span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Records</div>
            {loadingRecords ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div style={{ width: 24, height: 24, border: '3px solid #1c2b42', borderTopColor: 'var(--color-cyan, #14b8a6)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : records.length === 0 ? (
              <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, textAlign: 'center', padding: 20 }}>No records yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {records.map(r => (
                  <div key={r.id} style={{
                    padding: '12px 16px', borderRadius: 10, border: '1px solid #1c2b42',
                    background: 'var(--bg-primary, #0f172a)',
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginBottom: 6 }}>ID: {r.id}</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {Object.entries(r.properties || {}).slice(0, 5).map(([k, v]) => (
                        <div key={k} style={{ fontSize: 12 }}>
                          <span style={{ color: 'var(--text-muted, #6b7280)' }}>{k}: </span>
                          <span style={{ color: 'var(--text-primary, #f0f4f8)', fontWeight: 600 }}>{String(v)}</span>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: 0, display: 'flex', alignItems: 'center' }}>
            Custom Objects
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,217,87,0.12)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)', marginLeft: 8 }}>UNLIMITED</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>
            {schemas.length > 0 ? `${schemas.length} custom objects` : 'Manage custom object schemas and records'}
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#7ed957' }}>Activated</span>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input type="text" placeholder="Search objects..." value={search} onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px 12px 40px',
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 10, color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23556880' stroke-width='2' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: '14px center',
          }} />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #1c2b42', borderTopColor: 'var(--color-cyan, #14b8a6)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#f87171', fontSize: 14, marginBottom: 12 }}>{error}</p>
          <button onClick={fetchSchemas} style={{ color: 'var(--color-cyan, #14b8a6)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Try again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>&#128451;</div>
          <p style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: 14, marginBottom: 8 }}>
            {search ? 'No objects match your search.' : 'No custom objects yet.'}
          </p>
          <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13 }}>Custom objects created in your CRM will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(s => (
            <div key={s.id} style={{
              background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
              borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'border-color 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#2dd4bf'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1c2b42'}
              onClick={() => viewRecords(s)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>Key: {s.key}</div>
                </div>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'rgba(45,212,191,0.1)', color: 'var(--color-cyan, #14b8a6)' }}>
                  {s.fields?.length || 0} fields
                </span>
              </div>
              {s.description && <p style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginBottom: 12 }}>{s.description}</p>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{s.recordCount || 0} records</span>
                <span style={{ fontSize: 12, color: 'var(--color-cyan, #14b8a6)', fontWeight: 600 }}>View Records &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
