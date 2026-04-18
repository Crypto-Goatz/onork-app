'use client'

import { useState } from 'react'

interface WPSite {
  id: string
  name: string
  url: string
  status: 'connected' | 'disconnected' | 'error'
  wpVersion?: string
  plugins?: number
  lastSync?: string
}

export default function WordPressPage() {
  const [sites] = useState<WPSite[]>([])
  const [showConnect, setShowConnect] = useState(false)
  const [form, setForm] = useState({ url: '', apiKey: '', username: '' })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>
      {/* Connect Modal */}
      {showConnect && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => setShowConnect(false)}>
          <div style={{
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 16, padding: 28, maxWidth: 460, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 20px' }}>
              Connect WordPress Site
            </h2>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Site URL</span>
              <input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://mysite.com"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</span>
              <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="admin"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Application Password</span>
              <input type="password" value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </label>
            <p style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', marginBottom: 16, lineHeight: 1.5 }}>
              Generate an Application Password in WordPress under Users &rarr; Profile &rarr; Application Passwords.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{
                flex: 1, padding: 12, background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
                color: '#0c1220', fontWeight: 700, fontSize: 14, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}>Connect Site</button>
              <button onClick={() => setShowConnect(false)} style={{
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
            WordPress Manager
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,217,87,0.12)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)', marginLeft: 8 }}>UNLIMITED</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>Connect and manage your WordPress sites</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#7ed957' }}>Activated</span>
          <button onClick={() => setShowConnect(true)} style={{
            padding: '10px 20px', background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
            color: '#0c1220', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
          }}>+ Connect Site</button>
        </div>
      </div>

      {/* Features */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { title: 'Posts & Pages', desc: 'Create, edit, and publish content', icon: '&#128196;' },
          { title: 'Plugins', desc: 'Install, activate, and manage plugins', icon: '&#128268;' },
          { title: 'Media Library', desc: 'Upload and manage media files', icon: '&#127912;' },
          { title: 'Themes', desc: 'Switch and customize themes', icon: '&#127912;' },
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

      {/* Sites List */}
      {sites.length === 0 ? (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>&#127760;</div>
          <p style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: 14, marginBottom: 8 }}>No WordPress sites connected.</p>
          <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, marginBottom: 16 }}>
            Connect a WordPress site to manage content, plugins, and settings from here.
          </p>
          <button onClick={() => setShowConnect(true)} style={{
            padding: '10px 20px', background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
            color: '#0c1220', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
          }}>+ Connect Site</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sites.map(s => (
            <div key={s.id} style={{
              background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
              borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'linear-gradient(135deg, #21759b20, #21759b10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color: '#21759b',
                }}>W</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{s.url}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {s.wpVersion && <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>WP {s.wpVersion}</span>}
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: s.status === 'connected' ? '#7ed957' : s.status === 'error' ? '#f87171' : 'var(--text-muted, #6b7280)',
                }}>{s.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
