'use client'

import { useState, useEffect, useRef } from 'react'
import { Phone } from 'lucide-react'

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

  const isError = callStatus.toLowerCase().includes('fail') || callStatus.toLowerCase().includes('error')

  return (
    <>
      {/* Floating phone button */}
      <button
        onClick={() => setOpen(!open)}
        className={[
          'fixed bottom-[88px] right-6 z-[9001] w-11 h-11 rounded-xl border-none cursor-pointer',
          'flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          open
            ? 'bg-[#161b22] shadow-[0_4px_16px_rgba(0,0,0,0.3)]'
            : 'bg-gradient-to-br from-[#14b8a6] to-[#0ea5e9] shadow-[0_4px_20px_rgba(20,184,166,0.35)]',
        ].join(' ')}
      >
        <Phone
          size={18}
          className={open ? 'text-[#f0f4f8]' : 'text-black'}
        />
      </button>

      {/* Dialer panel */}
      {open && (
        <div className="fixed bottom-36 right-6 z-[9000] w-[320px] max-h-[460px] bg-[#0d1117] border border-[#30363d] rounded-2xl flex flex-col overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_30px_rgba(20,184,166,0.05)] animate-[dialerSlideUp_0.25s_cubic-bezier(0.4,0,0.2,1)]">

          {/* Header */}
          <div className="px-4 py-3 border-b border-[#30363d] flex items-center gap-2 bg-gradient-to-br from-[#14b8a6]/[.06] to-[#0ea5e9]/[.03]">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#14b8a6] to-[#0ea5e9] flex items-center justify-center">
              <Phone size={12} className="text-black" />
            </div>
            <div className="text-[13px] font-bold text-[#f0f4f8]">Click-to-Call</div>
          </div>

          <div className="p-4 flex flex-col gap-3 overflow-y-auto">
            {/* Phone input */}
            <div>
              <div className="flex gap-2">
                <input
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="flex-1 px-3 py-2.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#f0f4f8] text-[14px] outline-none font-mono"
                  onKeyDown={e => { if (e.key === 'Enter') initiateCall(phoneNumber) }}
                />
                <button
                  onClick={() => initiateCall(phoneNumber)}
                  disabled={!phoneNumber.trim() || calling}
                  className={[
                    'w-10 h-10 rounded-lg border-none flex items-center justify-center transition-opacity',
                    phoneNumber.trim()
                      ? 'bg-gradient-to-br from-[#6EE05A] to-[#4abe2e] cursor-pointer'
                      : 'bg-[#30363d] cursor-default',
                    calling ? 'opacity-60' : '',
                  ].join(' ')}
                >
                  <Phone
                    size={16}
                    className={phoneNumber.trim() ? 'text-black' : 'text-[#4b5563]'}
                  />
                </button>
              </div>
              {callStatus && (
                <div className={`text-[11px] mt-1.5 font-semibold ${isError ? 'text-[#ef4444]' : 'text-[#6EE05A]'}`}>
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
                className="w-full px-3 py-2 rounded-lg bg-[#161b22] border border-[#30363d] text-[#f0f4f8] text-[12px] outline-none box-border"
              />
              {searchLoading && (
                <div className="text-[11px] text-[#6b7280] mt-1">Searching...</div>
              )}
              {contacts.length > 0 && (
                <div className="mt-1.5 flex flex-col gap-0.5">
                  {contacts.map(c => (
                    <button
                      key={c.id}
                      onClick={() => selectContact(c)}
                      className={[
                        'flex items-center gap-2 px-2.5 py-2 bg-white/[.02] border border-transparent rounded-md text-left text-[#d1d5db] w-full',
                        c.phone ? 'cursor-pointer' : 'cursor-default',
                      ].join(' ')}
                    >
                      <div className="w-[26px] h-[26px] rounded-md bg-[#14b8a6]/10 text-[#14b8a6] flex items-center justify-center text-[10px] font-bold shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-[#f0f4f8] overflow-hidden text-ellipsis whitespace-nowrap">{c.name}</div>
                        <div className="text-[10px] text-[#6b7280] font-mono">{c.phone || 'No phone'}</div>
                      </div>
                      {c.phone && (
                        <button
                          onClick={e => { e.stopPropagation(); initiateCall(c.phone!, c.name) }}
                          className="bg-[#6EE05A]/10 border-none rounded px-2 py-1 text-[#6EE05A] text-[10px] font-bold cursor-pointer"
                        >
                          Call
                        </button>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recent calls */}
            {recentCalls.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-[0.5px] mb-1.5">Recent</div>
                <div className="flex flex-col gap-0.5">
                  {recentCalls.slice(0, 5).map((c, i) => (
                    <button
                      key={i}
                      onClick={() => { setPhoneNumber(c.number); initiateCall(c.number, c.name) }}
                      className="flex items-center gap-2 px-2 py-1.5 bg-transparent border-none rounded-md cursor-pointer text-left w-full"
                    >
                      <Phone size={12} className="text-[#4b5563]" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-[#d1d5db] font-mono overflow-hidden text-ellipsis whitespace-nowrap">{c.number}</div>
                        {c.name && <div className="text-[10px] text-[#6b7280]">{c.name}</div>}
                      </div>
                      <div className="text-[10px] text-[#4b5563]">
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
