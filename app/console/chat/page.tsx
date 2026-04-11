'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatMeta {
  kLayers?: string[]
  model?: string
  provider?: string
}

interface Profile {
  business_name: string | null
  onboarding_complete: boolean
  crm_location_id: string | null
  brand_tone: string | null
  business_type: string | null
}

interface SubLocation {
  id: string
  name: string
}

const ALL_K_LAYERS = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7']

const COMMANDS = [
  { key: 'email', label: 'Write cold email', icon: '✉', desc: 'Personalized outreach for your ICP' },
  { key: 'linkedin', label: 'Draft LinkedIn post', icon: '💬', desc: 'VPIS-optimized post in your brand tone' },
  { key: 'objections', label: 'Handle objections', icon: '🛡', desc: 'Responses to common objections from K2' },
  { key: 'strategy', label: 'Weekly strategy', icon: '📋', desc: 'What to focus on this week' },
  { key: 'sequence', label: 'Email sequence', icon: '📧', desc: '3-touch follow-up sequence' },
  { key: 'pitch', label: 'Elevator pitch', icon: '🎯', desc: 'Quick pitch from K1 + K3' },
  { key: 'blog', label: 'Blog post draft', icon: '📝', desc: 'SEO-optimized article outline' },
  { key: 'competitor', label: 'Competitor analysis', icon: '🔍', desc: 'Positioning vs competitors from K4' },
]

const COMMAND_PROMPTS: Record<string, string> = {
  email: 'Write a cold email for my ICP. Use my brand tone and reference our differentiators.',
  linkedin: 'Draft a LinkedIn post about what we do. Bold tone, no hashtags, hook in line 1.',
  objections: 'What are my top objections and how should I handle each one?',
  strategy: 'Based on my business context, what should I focus on this week?',
  sequence: 'Write a 3-email follow-up sequence for a prospect who went cold.',
  pitch: 'Write me a 30-second elevator pitch for my business.',
  blog: 'Create a blog post outline targeting my ICP with SEO keywords.',
  competitor: 'Analyze my competitive positioning. What are my strongest angles?',
}

export default function ChatPage() {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [meta, setMeta] = useState<ChatMeta>({})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeKLayers, setActiveKLayers] = useState<string[]>([])
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [commandSearch, setCommandSearch] = useState('')
  const [subLocations, setSubLocations] = useState<SubLocation[]>([])
  const [activeLocation, setActiveLocation] = useState<string>('')
  const [switchingLocation, setSwitchingLocation] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const cmdInputRef = useRef<HTMLInputElement>(null)

  // Load profile + K-layer status
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: p } = await supabase
        .from('profiles')
        .select('business_name, onboarding_complete, crm_location_id, brand_tone, business_type')
        .eq('id', user.id)
        .single()

      setProfile(p)
      setActiveLocation(p?.crm_location_id || '')

      if (p && !p.onboarding_complete) {
        setShowOnboardingModal(true)
      }

      // Get active K-layers
      const { data: kData } = await supabase
        .from('kb_content_queue')
        .select('layer')
        .eq('user_id', user.id)
        .eq('status', 'active')

      setActiveKLayers((kData || []).map(k => k.layer))
    }
    load()
  }, [supabase])

  // Load sub-locations from CRM
  useEffect(() => {
    if (!profile?.crm_location_id) return
    async function loadLocations() {
      try {
        const res = await fetch('/api/console/locations')
        const data = await res.json()
        if (data.locations) setSubLocations(data.locations)
      } catch { /* no locations endpoint yet — graceful */ }
    }
    loadLocations()
  }, [profile])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // Keyboard shortcut: Cmd+K for command palette
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(prev => !prev)
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (showCommandPalette) {
      setTimeout(() => cmdInputRef.current?.focus(), 50)
    }
  }, [showCommandPalette])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = { role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/console/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        setMeta({ kLayers: data.kLayers, model: data.model, provider: data.provider })
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Try again.' }])
    }
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [loading, messages])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function runCommand(key: string) {
    setShowCommandPalette(false)
    setCommandSearch('')
    const prompt = COMMAND_PROMPTS[key]
    if (prompt) sendMessage(prompt)
  }

  async function switchLocation(locationId: string) {
    setSwitchingLocation(true)
    setActiveLocation(locationId)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({
        crm_location_id: locationId,
      }).eq('id', user.id)
    }

    // Clear chat context since location changed
    setMessages([])
    setMeta({})
    setSwitchingLocation(false)
  }

  const onboardingPct = Math.round((activeKLayers.length / ALL_K_LAYERS.length) * 100)
  const missingLayers = ALL_K_LAYERS.filter(k => !activeKLayers.includes(k))

  const filteredCommands = commandSearch
    ? COMMANDS.filter(c => c.label.toLowerCase().includes(commandSearch.toLowerCase()) || c.desc.toLowerCase().includes(commandSearch.toLowerCase()))
    : COMMANDS

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>

      {/* ═══ ONBOARDING MODAL ═══ */}
      {showOnboardingModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '16px', padding: '32px',
            maxWidth: '440px', width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #6EE05A, #4ecb3a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', fontWeight: 800, color: '#080B0F',
              marginBottom: '20px',
            }}>
              0n
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
              Complete your setup
            </h2>
            <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.6, marginBottom: '20px' }}>
              Your AI gets smarter with every K-Layer you fill in.
              Right now you have <strong style={{ color: '#111827' }}>{activeKLayers.length} of 7</strong> layers active.
            </p>

            {/* Progress bar */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${onboardingPct}%`,
                  background: 'linear-gradient(90deg, #6EE05A, #4ecb3a)',
                  borderRadius: '4px', transition: 'width 0.3s',
                }} />
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', marginTop: '6px',
                fontSize: '11px', color: '#9CA3AF',
              }}>
                <span>{onboardingPct}% complete</span>
                <span>{missingLayers.length} layers remaining</span>
              </div>
            </div>

            {/* Missing layers */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '24px' }}>
              {ALL_K_LAYERS.map(k => (
                <span key={k} style={{
                  fontSize: '11px', padding: '4px 10px', borderRadius: '6px', fontWeight: 600,
                  background: activeKLayers.includes(k) ? '#F0FDF4' : '#FEF3C7',
                  color: activeKLayers.includes(k) ? '#166534' : '#92400E',
                  border: `1px solid ${activeKLayers.includes(k) ? '#BBF7D0' : '#FDE68A'}`,
                }}>
                  {k} {activeKLayers.includes(k) ? '✓' : '○'}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <a
                href="/console/welcome"
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  background: '#6EE05A', color: '#080B0F',
                  textDecoration: 'none', textAlign: 'center',
                  fontWeight: 600, fontSize: '14px',
                }}
              >
                Complete Onboarding
              </a>
              <button
                onClick={() => setShowOnboardingModal(false)}
                style={{
                  padding: '12px 20px', borderRadius: '10px',
                  border: '1px solid #E5E7EB', background: '#FFFFFF',
                  color: '#6B7280', fontSize: '14px', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ COMMAND PALETTE ═══ */}
      {showCommandPalette && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 90,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '15vh',
          }}
          onClick={() => setShowCommandPalette(false)}
        >
          <div
            style={{
              background: '#FFFFFF', borderRadius: '14px',
              maxWidth: '520px', width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '14px 18px', borderBottom: '1px solid #F3F4F6',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={cmdInputRef}
                type="text"
                value={commandSearch}
                onChange={e => setCommandSearch(e.target.value)}
                placeholder="Search ANYTHING..."
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  fontSize: '15px', color: '#111827', fontFamily: 'inherit',
                  background: 'transparent',
                }}
              />
              <span style={{
                fontSize: '10px', padding: '3px 6px', borderRadius: '4px',
                border: '1px solid #E5E7EB', color: '#9CA3AF',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                ESC
              </span>
            </div>

            {/* Quick actions */}
            <div style={{ padding: '8px' }}>
              <div style={{
                fontSize: '10px', color: '#9CA3AF', fontWeight: 600,
                padding: '6px 10px', letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                Commands
              </div>
              {filteredCommands.map((cmd, i) => (
                <button
                  key={cmd.key}
                  onClick={() => runCommand(cmd.key)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', borderRadius: '8px',
                    border: 'none', background: i === 0 ? '#F9FAFB' : 'transparent',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                  onMouseLeave={e => (e.currentTarget.style.background = i === 0 ? '#F9FAFB' : 'transparent')}
                >
                  <span style={{ fontSize: '18px', width: '28px', textAlign: 'center' }}>{cmd.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{cmd.label}</div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{cmd.desc}</div>
                  </div>
                </button>
              ))}

              {filteredCommands.length === 0 && (
                <div style={{
                  padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px',
                }}>
                  No commands match. Type your question and press Enter to ask AI directly.
                </div>
              )}

              {/* Free text search */}
              {commandSearch.trim() && (
                <button
                  onClick={() => { setShowCommandPalette(false); sendMessage(commandSearch); setCommandSearch('') }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', borderRadius: '8px', marginTop: '4px',
                    border: '1px dashed #D1D5DB', background: 'transparent',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: '18px', width: '28px', textAlign: 'center' }}>🔮</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#6EE05A' }}>Ask AI: "{commandSearch}"</div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Send as a free-form question</div>
                  </div>
                </button>
              )}
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 18px', borderTop: '1px solid #F3F4F6',
              fontSize: '10px', color: '#D1D5DB',
            }}>
              <span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", padding: '1px 4px', border: '1px solid #E5E7EB', borderRadius: '3px', marginRight: '4px' }}>⌘K</span>
                to toggle
              </span>
              <span>{meta.provider === 'anthropic' ? 'Claude' : meta.provider === 'groq' ? 'Groq' : 'AI'} powered</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #6EE05A, #4ecb3a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 800, color: '#080B0F',
          }}>
            0n
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>
              0nCore AI
            </h1>
            <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0 }}>
              {meta.provider === 'anthropic' ? 'Claude Sonnet' : meta.provider === 'groq' ? 'Groq Llama' : 'Ready'}
              {activeKLayers.length > 0 && ` · ${activeKLayers.length} K-Layers`}
            </p>
          </div>
        </div>

        {/* Center: Sub-location switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {subLocations.length > 1 && (
            <select
              value={activeLocation}
              onChange={e => switchLocation(e.target.value)}
              disabled={switchingLocation}
              style={{
                padding: '6px 10px', borderRadius: '6px',
                border: '1px solid #E5E7EB', background: '#FAFAFA',
                fontSize: '12px', color: '#374151', fontFamily: 'inherit',
                cursor: 'pointer', outline: 'none',
              }}
            >
              {subLocations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          )}
          {switchingLocation && (
            <span style={{ fontSize: '11px', color: '#6EE05A' }}>Switching...</span>
          )}
        </div>

        {/* Right: K-Layer badges + command palette trigger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowCommandPalette(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px',
              border: '1px solid #E5E7EB', background: '#FAFAFA',
              cursor: 'pointer', fontSize: '12px', color: '#9CA3AF',
              fontFamily: 'inherit',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Search
            <span style={{
              fontSize: '9px', padding: '1px 5px', borderRadius: '3px',
              border: '1px solid #E5E7EB', color: '#D1D5DB',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              ⌘K
            </span>
          </button>

          {activeKLayers.length > 0 ? (
            <div style={{ display: 'flex', gap: '4px' }}>
              {activeKLayers.map(k => (
                <span key={k} style={{
                  fontSize: '9px', padding: '2px 6px', borderRadius: '8px',
                  background: '#F0FDF4', color: '#166534', fontWeight: 600,
                  border: '1px solid #BBF7D0',
                }}>
                  {k}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* ═══ PINNED ONBOARDING NOTIFICATION ═══ */}
      {profile && !profile.onboarding_complete && !showOnboardingModal && (
        <div style={{
          padding: '8px 24px',
          background: 'linear-gradient(90deg, #FFFBEB, #FEF3C7)',
          borderBottom: '1px solid #FDE68A',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: '#FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px',
            }}>
              ○
            </div>
            <span style={{ fontSize: '12px', color: '#92400E' }}>
              Onboarding {onboardingPct}% complete — {missingLayers.length} K-Layers remaining
            </span>
            {/* Mini progress */}
            <div style={{
              width: '60px', height: '4px', background: '#FDE68A', borderRadius: '2px', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${onboardingPct}%`,
                background: '#F59E0B', borderRadius: '2px',
              }} />
            </div>
          </div>
          <a
            href="/console/welcome"
            style={{
              fontSize: '12px', fontWeight: 600, color: '#92400E',
              textDecoration: 'none', padding: '4px 12px',
              borderRadius: '6px', border: '1px solid #FDE68A',
              background: '#FFFFFF',
            }}
          >
            Complete Setup
          </a>
        </div>
      )}

      {/* ═══ MESSAGES ═══ */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto', padding: '24px',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}
      >
        {messages.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', flex: 1, minHeight: '300px', gap: '16px',
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: '#F0FDF4', border: '1px solid #BBF7D0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: 800, color: '#166534',
            }}>
              0n
            </div>
            <div style={{ textAlign: 'center', maxWidth: '420px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
                {profile?.business_name ? `Hey, ${profile.business_name}` : 'Welcome to 0nCore AI'}
              </h2>
              <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.5, marginBottom: '4px' }}>
                {activeKLayers.length > 0
                  ? `I have ${activeKLayers.length} K-Layers loaded. Ask me anything about your business.`
                  : 'Complete onboarding to unlock personalized AI. For now, I can help with general questions.'
                }
              </p>
              <p style={{ fontSize: '11px', color: '#D1D5DB' }}>
                Press <span style={{ fontFamily: "'JetBrains Mono', monospace", padding: '1px 4px', border: '1px solid #E5E7EB', borderRadius: '3px' }}>⌘K</span> for commands
              </p>
            </div>

            {/* Suggestion grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px', maxWidth: '420px', width: '100%',
            }}>
              {COMMANDS.slice(0, 4).map(cmd => (
                <button
                  key={cmd.key}
                  onClick={() => runCommand(cmd.key)}
                  style={{
                    padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #E5E7EB', background: '#FAFAFA',
                    color: '#374151', fontSize: '12px', textAlign: 'left',
                    cursor: 'pointer', lineHeight: 1.4, fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{cmd.icon}</span>
                  <span>{cmd.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', gap: '12px', maxWidth: '720px', width: '100%',
            margin: msg.role === 'user' ? '0 0 0 auto' : '0',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: msg.role === 'user' ? '#111827' : '#6EE05A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 700,
              color: msg.role === 'user' ? '#fff' : '#080B0F',
              flexShrink: 0,
            }}>
              {msg.role === 'user' ? 'U' : '0n'}
            </div>
            <div style={{
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? '#111827' : '#F3F4F6',
              color: msg.role === 'user' ? '#FFFFFF' : '#111827',
              fontSize: '14px', lineHeight: 1.6, maxWidth: '85%',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: '#6EE05A', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 700, color: '#080B0F',
            }}>0n</div>
            <div style={{
              padding: '12px 16px', borderRadius: '16px 16px 16px 4px',
              background: '#F3F4F6', display: 'flex', gap: '4px',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#9CA3AF', animation: 'pulse 1.2s infinite' }} />
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#9CA3AF', animation: 'pulse 1.2s infinite 0.2s' }} />
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#9CA3AF', animation: 'pulse 1.2s infinite 0.4s' }} />
            </div>
            <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }`}</style>
          </div>
        )}
      </div>

      {/* ═══ INPUT ═══ */}
      <div style={{
        padding: '16px 24px', borderTop: '1px solid #E5E7EB',
        background: '#FFFFFF', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: '8px', maxWidth: '720px', margin: '0 auto' }}>
          <button
            onClick={() => setShowCommandPalette(true)}
            style={{
              width: '44px', height: '44px', borderRadius: '12px',
              border: '1px solid #E5E7EB', background: '#FAFAFA',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: '#9CA3AF', fontSize: '18px',
            }}
            title="Commands (⌘K)"
          >
            /
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask 0nCore AI anything..."
            rows={1}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: '12px',
              border: '1px solid #D1D5DB', fontSize: '14px', color: '#111827',
              outline: 'none', resize: 'none', fontFamily: 'inherit',
              lineHeight: 1.5, minHeight: '44px', maxHeight: '120px',
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{
              padding: '0 20px', borderRadius: '12px',
              background: loading || !input.trim() ? '#D1D5DB' : '#6EE05A',
              color: '#080B0F', border: 'none', fontSize: '14px', fontWeight: 600,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              flexShrink: 0,
            }}
          >
            Send
          </button>
        </div>
        <p style={{ fontSize: '10px', color: '#D1D5DB', textAlign: 'center', marginTop: '8px' }}>
          {activeKLayers.length > 0
            ? `K-Layers: ${activeKLayers.join(', ')} active · ${meta.provider === 'anthropic' ? 'Claude' : 'Groq'} powered`
            : 'No K-Layers active · Using Groq fallback · Complete onboarding for personalized AI'
          }
        </p>
      </div>
    </div>
  )
}
