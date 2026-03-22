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

  useEffect(() => {
    fetchContacts()
  }, [])

  async function fetchContacts() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/crm/contacts')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch contacts')
      setContacts(data.contacts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  const filtered = contacts.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (c.contactName || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    )
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-core-text">Contacts</h1>
          <p className="text-sm text-core-text-dim mt-1">
            Manage your CRM contacts. {contacts.length > 0 && `${contacts.length} total`}
          </p>
        </div>
        <button className="bg-core-green text-core-bg font-medium text-sm px-4 py-2 rounded-lg hover:brightness-110 transition-all">
          Add Contact
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-core-text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-core-card border border-core-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-core-text placeholder:text-core-text-muted focus:outline-none focus:border-core-green transition-colors"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-core-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-core-card border border-core-border rounded-xl p-8 text-center">
          <div className="text-core-red text-sm mb-3">{error}</div>
          <button
            onClick={fetchContacts}
            className="text-sm text-core-green hover:underline"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-core-card border border-core-border rounded-xl p-12 text-center">
          <svg className="w-12 h-12 text-core-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-core-text-dim text-sm">
            {search ? 'No contacts match your search.' : 'No contacts yet. Add your first contact to get started.'}
          </p>
        </div>
      ) : (
        <div className="bg-core-card border border-core-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-core-border">
                  <th className="text-left text-xs font-medium text-core-text-muted uppercase tracking-wider px-5 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-core-text-muted uppercase tracking-wider px-5 py-3">Email</th>
                  <th className="text-left text-xs font-medium text-core-text-muted uppercase tracking-wider px-5 py-3 hidden md:table-cell">Phone</th>
                  <th className="text-left text-xs font-medium text-core-text-muted uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Tags</th>
                  <th className="text-left text-xs font-medium text-core-text-muted uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-core-border">
                {filtered.map((contact) => (
                  <tr key={contact.id} className="hover:bg-core-card-hover transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-core-text">
                        {contact.contactName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-core-text-dim">{contact.email || '-'}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="text-sm text-core-text-dim">{contact.phone || '-'}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(contact.tags || []).slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex text-xs bg-core-green/10 text-core-green px-2 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {(contact.tags || []).length > 3 && (
                          <span className="text-xs text-core-text-muted">+{contact.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className="text-sm text-core-text-muted">
                        {contact.dateAdded ? new Date(contact.dateAdded).toLocaleDateString() : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
