'use client'

import { useState } from 'react'

interface Snapshot {
  id: string
  name: string
  type: string
  status: string
  createdAt: string
  size?: string
}

export default function SnapshotsPage() {
  const [snapshots] = useState<Snapshot[]>([])
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', type: 'full' })

  const filtered = snapshots.filter((s) => {
    if (!search) return true
    return s.name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>
      {/* Create Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => setShowCreate(false)}>
          <div style={{
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 16, padding: 28, maxWidth: 460, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 20px' }}>
              Create Snapshot
            </h2>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Snapshot Name</span>
              <input type="text" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="My Snapshot"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</span>
              <select value={createForm.type} onChange={e => setCreateForm(f => ({ ...f, type: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
                <option value="full">Full Snapshot</option>
                <option value="workflows">Workflows Only</option>
                <option value="funnels">Funnels Only</option>
                <option value="settings">Settings Only</option>
              </select>
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{
                flex: 1, padding: 12, background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
                color: '#0c1220', fontWeight: 700, fontSize: 14, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}>Create Snapshot</button>
              <button onClick={() => setShowCreate(false)} style={{
                padding: '12px 20px', borderRadius: 10, border: '1px solid #1c2b42',
                background: 'transparent', color: 'var(--text-muted, #6b7280)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: 0, display: 'flex', alignItems: 'center' }}>
            Snapshot Manager
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,217,87,0.12)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)', marginLeft: 8 }}>UNLIMITED</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>Create, share, and restore CRM snapshots</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#7ed957' }}>Activated</span>
          <button onClick={() => setShowCreate(true)} style={{
            padding: '10px 20px', background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
            color: '#0c1220', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
          }}>+ Create Snapshot</button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input type="text" placeholder="Search snapshots..." value={search} onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px 12px 40px',
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 10, color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23556880' stroke-width='2' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: '14px center',
          }} />
      </div>

      {/* Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Snapshots', value: snapshots.length.toString(), icon: '&#128247;' },
          { label: 'Shared', value: '0', icon: '&#128279;' },
          { label: 'Restorable', value: snapshots.length.toString(), icon: '&#128260;' },
        ].map((s) => (
          <div key={s.label} style={{
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 12, padding: '20px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>&#128247;</div>
          <p style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: 14, marginBottom: 8 }}>No snapshots yet.</p>
          <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, marginBottom: 16 }}>
            Snapshots let you save and restore your entire CRM configuration.
          </p>
          <button onClick={() => setShowCreate(true)} style={{
            padding: '10px 20px', background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
            color: '#0c1220', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
          }}>+ Create Snapshot</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((s) => (
            <div key={s.id} style={{
              background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
              borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>{s.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>{s.type} &middot; {new Date(s.createdAt).toLocaleDateString()}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(45,212,191,0.1)', color: 'var(--color-cyan, #14b8a6)', border: '1px solid rgba(45,212,191,0.2)', cursor: 'pointer' }}>Share</button>
                <button style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(126,217,87,0.1)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)', cursor: 'pointer' }}>Restore</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
