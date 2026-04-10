'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Contact {
  id: string
  firstName?: string
  lastName?: string
  name?: string
  email?: string
  phone?: string
  tags?: string[]
}

const TAG_COLORS = ['#6EE05A', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

function getTagColor(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

export default function ContactsPage() {
  const supabase = createClient()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [noLocation, setNoLocation] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [newTag, setNewTag] = useState('')
  const [addingTag, setAddingTag] = useState(false)

  const fetchContacts = useCallback(async (query = '') => {
    setLoading(true)
    const params = query ? `?query=${encodeURIComponent(query)}` : ''
    const res = await fetch(`/api/console/contacts${params}`)
    const data = await res.json()
    if (data.error === 'No location provisioned') {
      setNoLocation(true)
    } else {
      setNoLocation(false)
      setContacts(data.contacts || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== undefined) fetchContacts(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, fetchContacts])

  async function handleAddTag() {
    if (!selectedContact || !newTag.trim()) return
    setAddingTag(true)
    await fetch(`/api/console/contacts/${selectedContact.id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: [newTag.trim()] }),
    })
    setSelectedContact({
      ...selectedContact,
      tags: [...(selectedContact.tags || []), newTag.trim()],
    })
    setNewTag('')
    setAddingTag(false)
  }

  if (noLocation) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #E5E7EB',
            borderTopColor: '#6EE05A',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#6B7280', fontSize: '15px' }}>Setting up your account...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
    }}>
      {/* Main list */}
      <div style={{ flex: 1, padding: '24px', maxWidth: selectedContact ? '60%' : '100%' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
          Contacts
        </h1>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search contacts..."
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #D1D5DB',
            fontSize: '14px',
            color: '#111827',
            marginBottom: '16px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
            Loading contacts...
          </div>
        ) : contacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
            {search ? 'No contacts match your search.' : 'No contacts yet.'}
          </div>
        ) : (
          <div>
            {contacts.map(contact => {
              const displayName = contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown'
              return (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: selectedContact?.id === contact.id ? '#F9FAFB' : '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                      {[contact.email, contact.phone].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '200px', justifyContent: 'flex-end' }}>
                    {(contact.tags || []).slice(0, 3).map(tag => (
                      <span key={tag} style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: `${getTagColor(tag)}20`,
                        color: getTagColor(tag),
                        fontWeight: 600,
                      }}>
                        {tag}
                      </span>
                    ))}
                    {(contact.tags || []).length > 3 && (
                      <span style={{ fontSize: '10px', color: '#9CA3AF' }}>
                        +{(contact.tags || []).length - 3}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Side panel */}
      {selectedContact && (
        <div style={{
          width: '360px',
          borderLeft: '1px solid #E5E7EB',
          padding: '24px',
          background: '#F9FAFB',
          overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
              {selectedContact.name || `${selectedContact.firstName || ''} ${selectedContact.lastName || ''}`.trim()}
            </h2>
            <button
              onClick={() => setSelectedContact(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#9CA3AF',
              }}
            >
              ✕
            </button>
          </div>

          {selectedContact.email && (
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, display: 'block', marginBottom: '2px' }}>EMAIL</span>
              <span style={{ fontSize: '14px', color: '#374151' }}>{selectedContact.email}</span>
            </div>
          )}

          {selectedContact.phone && (
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, display: 'block', marginBottom: '2px' }}>PHONE</span>
              <span style={{ fontSize: '14px', color: '#374151' }}>{selectedContact.phone}</span>
            </div>
          )}

          {/* Tags */}
          <div style={{ marginTop: '20px' }}>
            <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, display: 'block', marginBottom: '8px' }}>TAGS</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {(selectedContact.tags || []).map(tag => (
                <span key={tag} style={{
                  fontSize: '12px',
                  padding: '4px 10px',
                  borderRadius: '14px',
                  background: `${getTagColor(tag)}20`,
                  color: getTagColor(tag),
                  fontWeight: 600,
                }}>
                  {tag}
                </span>
              ))}
              {(!selectedContact.tags || selectedContact.tags.length === 0) && (
                <span style={{ fontSize: '13px', color: '#9CA3AF' }}>No tags</span>
              )}
            </div>

            {/* Add tag */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                placeholder="Add tag..."
                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '13px',
                  color: '#111827',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleAddTag}
                disabled={addingTag || !newTag.trim()}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#6EE05A',
                  color: '#080B0F',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: addingTag ? 'not-allowed' : 'pointer',
                }}
              >
                {addingTag ? '...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
