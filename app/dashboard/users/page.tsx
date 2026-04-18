'use client'

import { useState, useEffect } from 'react'

interface CRMUser {
  id: string
  name: string
  firstName?: string
  lastName?: string
  email: string
  phone?: string
  role?: string
  type?: string
  permissions?: Record<string, boolean>
  createdAt?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<CRMUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/crm/users')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setUsers(data.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const filtered = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
  })

  const roleColor = (r: string) => {
    if (r === 'admin' || r === 'agency') return '#a78bfa'
    if (r === 'user') return 'var(--color-cyan, #14b8a6)'
    return 'var(--text-muted, #6b7280)'
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: 0, display: 'flex', alignItems: 'center' }}>
            User Management
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,217,87,0.12)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)', marginLeft: 8 }}>UNLIMITED</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>
            {users.length > 0 ? `${users.length} users` : 'Manage CRM users, roles, and permissions'}
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#7ed957' }}>Activated</span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Users', value: users.length },
          { label: 'Admins', value: users.filter(u => u.role === 'admin' || u.type === 'admin').length },
          { label: 'Active', value: users.length },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 12, padding: 20,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
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
          <button onClick={fetchUsers} style={{ color: 'var(--color-cyan, #14b8a6)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Try again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>&#128101;</div>
          <p style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: 14 }}>
            {search ? 'No users match your search.' : 'No CRM users found.'}
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1c2b42' }}>
                {['User', 'Email', 'Phone', 'Role', 'Created'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(28,43,66,0.5)' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1a2740'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'linear-gradient(135deg, #2dd4bf20, #8b5cf620)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: 'var(--color-cyan, #14b8a6)', flexShrink: 0,
                      }}>
                        {(u.firstName?.[0] || u.name?.[0] || '?').toUpperCase()}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>
                        {u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary, #9ca3af)' }}>{u.email || '—'}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary, #9ca3af)' }}>{u.phone || '—'}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: roleColor(u.role || u.type || '') }}>
                      {u.role || u.type || 'user'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
