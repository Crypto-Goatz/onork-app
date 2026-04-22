'use client'

import { useState, useEffect } from 'react'
import { Search, Users, RefreshCw } from 'lucide-react'

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

function roleColorClass(r: string): string {
  if (r === 'admin' || r === 'agency') return 'text-core-purple'
  if (r === 'user') return 'text-core-cyan'
  return 'text-core-text-muted'
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

  const stats = [
    { label: 'Total Users', value: users.length },
    { label: 'Admins', value: users.filter(u => u.role === 'admin' || u.type === 'admin').length },
    { label: 'Active', value: users.length },
  ]

  return (
    <div className="max-w-[1100px] mx-auto px-2">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-core-text m-0 flex items-center gap-2">
            User Management
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-core-green/10 text-core-green border border-core-green/20">
              UNLIMITED
            </span>
          </h1>
          <p className="text-[13px] text-core-text-muted mt-1">
            {users.length > 0 ? `${users.length} users` : 'Manage CRM users, roles, and permissions'}
          </p>
        </div>
        <span className="text-[11px] font-semibold text-core-green">Activated</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 mb-6">
        {stats.map(s => (
          <div
            key={s.label}
            className="bg-core-card border border-core-border rounded-xl p-5"
          >
            <div className="text-[11px] text-core-text-muted uppercase tracking-[0.06em] mb-2">
              {s.label}
            </div>
            <div className="text-[28px] font-bold text-core-text">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-core-text-muted w-4 h-4 pointer-events-none" />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-core-card border border-core-border rounded-[10px] text-core-text text-[14px] outline-none placeholder:text-core-text-muted focus:border-core-cyan/50 transition-colors"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="w-8 h-8 text-core-cyan animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-core-card border border-core-border rounded-2xl p-10 text-center">
          <p className="text-core-red text-[14px] mb-3">{error}</p>
          <button
            onClick={fetchUsers}
            className="text-core-cyan bg-transparent border-none cursor-pointer text-[13px] font-semibold hover:underline"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-core-card border border-core-border rounded-2xl px-10 py-16 text-center">
          <div className="flex justify-center mb-4 opacity-30">
            <Users className="w-10 h-10 text-core-text-muted" />
          </div>
          <p className="text-core-text-dim text-[14px]">
            {search ? 'No users match your search.' : 'No CRM users found.'}
          </p>
        </div>
      ) : (
        <div className="bg-core-card border border-core-border rounded-2xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-core-border">
                {['User', 'Email', 'Phone', 'Role', 'Created'].map(h => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-[11px] font-semibold text-core-text-muted uppercase tracking-[0.06em]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr
                  key={u.id}
                  className="border-b border-core-border/50 hover:bg-core-card-hover transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-core-cyan/10 to-core-purple/10 flex items-center justify-center text-[13px] font-bold text-core-cyan shrink-0">
                        {(u.firstName?.[0] || u.name?.[0] || '?').toUpperCase()}
                      </div>
                      <span className="text-[14px] font-semibold text-core-text">
                        {u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-core-text-dim">{u.email || '—'}</td>
                  <td className="px-5 py-3.5 text-[13px] text-core-text-dim">{u.phone || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${roleColorClass(u.role || u.type || '')}`}>
                      {u.role || u.type || 'user'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-core-text-muted">
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
