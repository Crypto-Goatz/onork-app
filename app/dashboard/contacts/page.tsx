'use client'

import { useEffect, useState } from 'react'

interface Contact {
  id: string
  contactName: string
  firstName: string
  lastName: string
  email: string
  phone: string
  tags: string[]
  dateAdded: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { fetchContacts() }, [])

  async function fetchContacts() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/crm/contacts')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setContacts(data.contacts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const filtered = contacts.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (c.contactName || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e8ecf2', margin: 0 }}>Contacts</h1>
          <p style={{ fontSize: 13, color: '#556880', marginTop: 4 }}>
            {contacts.length > 0 ? `${contacts.length} contacts` : 'Manage your contacts'}
          </p>
        </div>
        <button style={{
          padding: '10px 20px',
          background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
          color: '#0c1220', fontWeight: 700, fontSize: 13,
          borderRadius: 10, border: 'none', cursor: 'pointer',
        }}>+ Add Contact</button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px 12px 40px',
            background: '#141e30', border: '1px solid #1c2b42',
            borderRadius: 10, color: '#e8ecf2', fontSize: 14,
            outline: 'none', transition: 'border-color 0.2s',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23556880' stroke-width='2' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: '14px center',
          }}
          onFocus={e => e.target.style.borderColor = '#2dd4bf'}
          onBlur={e => e.target.style.borderColor = '#1c2b42'}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{
            width: 32, height: 32, border: '3px solid #1c2b42',
            borderTopColor: '#2dd4bf', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{
          background: '#141e30', border: '1px solid #1c2b42',
          borderRadius: 14, padding: '40px', textAlign: 'center',
        }}>
          <p style={{ color: '#f87171', fontSize: 14, marginBottom: 12 }}>{error}</p>
          <button onClick={fetchContacts} style={{
            color: '#2dd4bf', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>Try again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: '#141e30', border: '1px solid #1c2b42',
          borderRadius: 14, padding: '60px 40px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>👤</div>
          <p style={{ color: '#8b9ab5', fontSize: 14 }}>
            {search ? 'No contacts match your search.' : 'No contacts yet.'}
          </p>
        </div>
      ) : (
        <div style={{
          background: '#141e30', border: '1px solid #1c2b42',
          borderRadius: 14, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1c2b42' }}>
                {['Name', 'Email', 'Phone', 'Tags', 'Added'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '12px 20px',
                    fontSize: 11, fontWeight: 600, color: '#556880',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(28,43,66,0.5)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1a2740'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'linear-gradient(135deg, #2dd4bf20, #8b5cf620)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: '#2dd4bf', flexShrink: 0,
                      }}>
                        {(c.firstName?.[0] || c.contactName?.[0] || '?').toUpperCase()}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#e8ecf2' }}>
                        {c.contactName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#8b9ab5' }}>{c.email || '—'}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#8b9ab5' }}>{c.phone || '—'}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(c.tags || []).slice(0, 2).map(tag => (
                        <span key={tag} style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                          background: 'rgba(45,212,191,0.1)', color: '#2dd4bf',
                        }}>{tag}</span>
                      ))}
                      {(c.tags || []).length > 2 && (
                        <span style={{ fontSize: 11, color: '#556880' }}>+{c.tags.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12, color: '#556880' }}>
                    {c.dateAdded ? new Date(c.dateAdded).toLocaleDateString() : '—'}
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
