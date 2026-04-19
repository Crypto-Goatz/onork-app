'use client'

import { useState, useEffect, useRef } from 'react'

interface RecentCall {
  number: string
  name?: string
  time: string
}

interface ContactResult {
  id: string
  name: string
  phone?: string
  email?: string
}

const RECENT_KEY = '0ncore_recent_calls'

export function DialerButton() {
  const [open, setOpen] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [calling, setCalling] = useState(false)
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([])
  const [contactSearch, setContactSearch] = useState('')
  const [contacts, setContacts] = useState<ContactResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [callStatus, setCallStatus] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_KEY)
      if (saved) setRecentCalls(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    if (!contactSearch.trim()) { setContacts([]); return }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/crm/contacts?query=${encodeURIComponent(contactSearch)}&limit=5`)
        const data = await res.json()
        setContacts((data.contacts || []).map((c: Record<string, unknown>) => ({
          id: c.id as string,
          name: ((c.firstName || '') + ' ' + (c.lastName || '')).trim() || (c.name as string) || (c.email as string) || 'Unknown',
          phone: c.phone as string,
          email: c.email as string,
        })))
      } catch {
        setContacts([])
      }
      setSearchLoading(false)
    }, 400)
  }, [contactSearch])

  function addToRecent(number: string, name?: string) {
    const call: RecentCall = { number, name, time: new Date().toISOString() }
    const updated = [call, ...recentCalls.filter(c => c.number !== number)].slice(0, 10)
    setRecentCalls(updated)
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)) } catch {}
  }

  async function initiateCall(number: string, name?: string) {
    if (!number || calling) return
    setCalling(true)
    setCallStatus('Connecting...')
    try {
      const res = await fetch('/api/crm/phone/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: number }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Call failed')
      setCallStatus('Call initiated')
      addToRecent(number, name)
      setTimeout(() => setCallStatus(''), 3000)
    } catch (err) {
      setCallStatus(err instanceof Error ? err.message : 'Call failed')
      setTimeout(() => setCallStatus(''), 4000)
    }
    setCalling(false)
  }

  function selectContact(c: ContactResult) {
    if (c.phone) {
      setPhoneNumber(c.phone)
      setContactSearch('')
      setContacts([])
    }
  }

  return (
    <>
      {/* Floating phone button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 9001,
          width: 44, height: 44, borderRadius: 12,
          background: open ? '#1e293b' : 'linear-gradient(135deg, #00d4ff 0%, #0ea5e9 100%)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: open ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,212,255,0.35)',
          transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={open ? '#f0f4f8' : '#000'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </button>

      {/* Dialer panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 144, right: 24, zIndex: 9000,
          width: 320, maxHeight: 460,
          background: '#0d1117', border: '1px solid #1e293b', borderRadius: 16,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(0,212,255,0.05)',
          animation: 'dialerSlideUp 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(14,165,233,0.03) 100%)' }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f4f8' }}>Click-to-Call</div>
          </div>

          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
            {/* Phone input */}
            <div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 8,
                    background: '#161b22', border: '1px solid #1e293b',
                    color: '#f0f4f8', fontSize: 14, outline: 'none', fontFamily: 'monospace',
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') initiateCall(phoneNumber) }}
                />
                <button
                  onClick={() => initiateCall(phoneNumber)}
                  disabled={!phoneNumber.trim() || calling}
                  style={{
                    width: 40, height: 40, borderRadius: 8, border: 'none',
                    background: phoneNumber.trim() ? 'linear-gradient(135deg, #7ed957, #5cb83a)' : '#1e293b',
                    cursor: phoneNumber.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: calling ? 0.6 : 1,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={phoneNumber.trim() ? '#000' : '#4b5563'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </button>
              </div>
              {callStatus && (
                <div style={{ fontSize: 11, marginTop: 6, color: callStatus.includes('fail') || callStatus.includes('error') ? '#f87171' : '#7ed957', fontWeight: 600 }}>
                  {callStatus}
                </div>
              )}
            </div>

            {/* Contact search */}
            <div>
              <input
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                placeholder="Search contacts..."
                style={{
                  width: '100%', padding: '8px 12px', boxSizing: 'border-box', borderRadius: 8,
                  background: '#161b22', border: '1px solid #1e293b',
                  color: '#f0f4f8', fontSize: 12, outline: 'none',
                }}
              />
              {searchLoading && (
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Searching...</div>
              )}
              {contacts.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {contacts.map(c => (
                    <button
                      key={c.id}
                      onClick={() => selectContact(c)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                        background: 'rgba(255,255,255,0.02)', border: '1px solid transparent',
                        borderRadius: 6, cursor: c.phone ? 'pointer' : 'default', textAlign: 'left',
                        color: '#d1d5db', width: '100%',
                      }}
                    >
                      <div style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(0,212,255,0.1)', color: '#00d4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f4f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                        <div style={{ fontSize: 10, color: '#6b7280', fontFamily: 'monospace' }}>{c.phone || 'No phone'}</div>
                      </div>
                      {c.phone && (
                        <button
                          onClick={e => { e.stopPropagation(); initiateCall(c.phone!, c.name) }}
                          style={{ background: 'rgba(126,217,87,0.1)', border: 'none', borderRadius: 4, padding: '4px 8px', color: '#7ed957', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                        >Call</button>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recent calls */}
            {recentCalls.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Recent</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {recentCalls.slice(0, 5).map((c, i) => (
                    <button
                      key={i}
                      onClick={() => { setPhoneNumber(c.number); initiateCall(c.number, c.name) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                        background: 'transparent', border: 'none', borderRadius: 6,
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: '#d1d5db', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.number}</div>
                        {c.name && <div style={{ fontSize: 10, color: '#6b7280' }}>{c.name}</div>}
                      </div>
                      <div style={{ fontSize: 10, color: '#4b5563' }}>
                        {new Date(c.time).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes dialerSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  )
}
