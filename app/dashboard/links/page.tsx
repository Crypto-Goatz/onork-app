'use client'

import { useState } from 'react'

interface TriggerLink {
  id: string
  name: string
  url: string
  type: string
  clicks?: number
  status: string
  createdAt: string
}

export default function LinksPage() {
  const [links] = useState<TriggerLink[]>([])
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', redirectUrl: '', type: 'trigger' })

  const filtered = links.filter(l => !search || l.name.toLowerCase().includes(search.toLowerCase()))

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
              Create Trigger Link
            </h2>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Link Name</span>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Onboarding Trigger"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Redirect URL</span>
              <input type="url" value={form.redirectUrl} onChange={e => setForm(f => ({ ...f, redirectUrl: e.target.value }))} placeholder="https://mysite.com/thank-you"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</span>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
                <option value="trigger">Trigger Link</option>
                <option value="tracking">Tracking Link</option>
                <option value="redirect">Redirect</option>
              </select>
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{
                flex: 1, padding: 12, background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
                color: '#0c1220', fontWeight: 700, fontSize: 14, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}>Create Link</button>
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
            Link Triggers
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,217,87,0.12)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)', marginLeft: 8 }}>UNLIMITED</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>Create and manage trigger links for automations</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#7ed957' }}>Activated</span>
          <button onClick={() => setShowCreate(true)} style={{
            padding: '10px 20px', background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
            color: '#0c1220', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
          }}>+ Create Link</button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input type="text" placeholder="Search links..." value={search} onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px 12px 40px',
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 10, color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23556880' stroke-width='2' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: '14px center',
          }} />
      </div>

      {/* Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { title: 'Trigger Links', desc: 'Click triggers automations for contacts', icon: '&#9889;' },
          { title: 'Tracking Links', desc: 'Track clicks with UTM parameters', icon: '&#128200;' },
          { title: 'Redirects', desc: 'Smart redirects with contact attribution', icon: '&#128279;' },
        ].map(f => (
          <div key={f.title} style={{
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 12, padding: 20,
          }}>
            <div style={{ fontSize: 24, marginBottom: 12, opacity: 0.5 }} dangerouslySetInnerHTML={{ __html: f.icon }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)', marginBottom: 4 }}>{f.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>&#128279;</div>
          <p style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: 14, marginBottom: 8 }}>No trigger links yet.</p>
          <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, marginBottom: 16 }}>
            Trigger links fire automations when a contact clicks them.
          </p>
          <button onClick={() => setShowCreate(true)} style={{
            padding: '10px 20px', background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
            color: '#0c1220', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
          }}>+ Create Link</button>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1c2b42' }}>
                {['Name', 'Type', 'Clicks', 'Status', 'Created'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid rgba(28,43,66,0.5)' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1a2740'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>{l.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>{l.url}</div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'rgba(45,212,191,0.1)', color: 'var(--color-cyan, #14b8a6)' }}>{l.type}</span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary, #9ca3af)' }}>{(l.clicks || 0).toLocaleString()}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: l.status === 'active' ? '#7ed957' : 'var(--text-muted, #6b7280)' }}>{l.status}</span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{new Date(l.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
