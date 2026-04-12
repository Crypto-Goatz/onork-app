'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ── Types ──

interface Crew {
  id: string
  name: string
  role: string
  description: string
  avatar_color: string
  k_layers: string[]
  tools: string[]
  status: string
  message_count: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface DisplayMessage extends Message {
  id: string
  time: string
}

// ── K-Layer Department System ──

const K_LAYER_DEPARTMENTS: Record<string, { label: string; description: string; integrations: string[] }> = {
  K1: { label: 'Brand Voice', description: 'Tone, messaging, identity', integrations: ['crm', 'social', 'email'] },
  K2: { label: 'Audience & ICP', description: 'Customer profiles, segments, behavior', integrations: ['crm', 'analytics', 'ads'] },
  K3: { label: 'Products', description: 'Offerings, pricing, positioning', integrations: ['stripe', 'crm', 'shopify'] },
  K4: { label: 'Intelligence', description: 'Competitor analysis, market data', integrations: ['analytics', 'search', 'social'] },
  K5: { label: 'Playbooks', description: 'Sales scripts, sequences, SOPs', integrations: ['crm', 'email', 'calendar'] },
  K6: { label: 'Integrations', description: 'Connected services, APIs, webhooks', integrations: ['all'] },
  K7: { label: 'Memory', description: 'Learning, patterns, recommendations', integrations: ['supabase', 'ai'] },
}

// ── Default Crews (Department-based K-Layers) ──

const DEFAULT_CREWS: Crew[] = [
  {
    id: '__my0n__',
    name: 'My 0n',
    role: 'general',
    description: 'Your personal AI operator — all K-Layers',
    avatar_color: '#6EE05A',
    k_layers: ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7'],
    tools: ['chat', 'execute', 'analyze', 'compose'],
    status: 'active',
    message_count: 0,
  },
  {
    id: '__0nsales__',
    name: '0nSales',
    role: 'sales',
    description: 'Pipeline, deals, outreach, follow-ups',
    avatar_color: '#3b82f6',
    k_layers: ['K1', 'K2', 'K3', 'K5'],
    tools: ['crm', 'email', 'pipeline', 'sequences'],
    status: 'active',
    message_count: 0,
  },
  {
    id: '__0nsocial__',
    name: '0nSocial',
    role: 'social',
    description: 'Content, posts, engagement, growth',
    avatar_color: '#a78bfa',
    k_layers: ['K1', 'K2', 'K3'],
    tools: ['social', 'content', 'scheduling', 'analytics'],
    status: 'active',
    message_count: 0,
  },
  {
    id: '__0ncomm__',
    name: '0nComm',
    role: 'communication',
    description: 'Email, SMS, chat, customer service',
    avatar_color: '#f59e0b',
    k_layers: ['K1', 'K5', 'K6'],
    tools: ['email', 'sms', 'chat', 'templates'],
    status: 'active',
    message_count: 0,
  },
  {
    id: '__0nweb__',
    name: '0nWeb',
    role: 'development',
    description: 'Sites, funnels, landing pages, SEO',
    avatar_color: '#06b6d4',
    k_layers: ['K1', 'K6', 'K7'],
    tools: ['websites', 'funnels', 'seo', 'analytics'],
    status: 'active',
    message_count: 0,
  },
  {
    id: '__0nbrand__',
    name: '0nBrand',
    role: 'design',
    description: 'Identity, assets, creative, guidelines',
    avatar_color: '#ec4899',
    k_layers: ['K1', 'K3', 'K4'],
    tools: ['design', 'brand', 'content', 'assets'],
    status: 'active',
    message_count: 0,
  },
  {
    id: '__0ntrack__',
    name: '0nTrack',
    role: 'analytics',
    description: 'Metrics, reporting, attribution, forecasting',
    avatar_color: '#ef4444',
    k_layers: ['K2', 'K4', 'K6'],
    tools: ['analytics', 'reporting', 'dashboards', 'alerts'],
    status: 'active',
    message_count: 0,
  },
]

// ── Context-Aware Suggested Prompts Per Crew ──

const CREW_PROMPTS: Record<string, { label: string; color: string; prompt: string }[]> = {
  '__my0n__': [
    { label: 'AI Suggestions', color: '#6EE05A', prompt: 'What should I focus on today based on my pipeline and calendar?' },
    { label: 'Quick Status', color: '#3b82f6', prompt: 'Give me a status update across all departments' },
    { label: 'Generate Workflow', color: '#a78bfa', prompt: 'Create a workflow that...' },
  ],
  '__0nsales__': [
    { label: 'Pipeline Review', color: '#3b82f6', prompt: 'Show me my pipeline and highlight stalled deals' },
    { label: 'Cold Email', color: '#06b6d4', prompt: 'Write a cold email for my ICP' },
    { label: 'Follow-Up', color: '#f59e0b', prompt: 'Draft follow-ups for all contacts I haven\'t reached in 7 days' },
    { label: 'Objection Handler', color: '#ef4444', prompt: 'What are my top objections and how should I handle each one?' },
  ],
  '__0nsocial__': [
    { label: 'Content Ideas', color: '#a78bfa', prompt: 'Generate 5 content ideas based on trending topics in my industry' },
    { label: 'LinkedIn Post', color: '#3b82f6', prompt: 'Draft a LinkedIn post about what we do' },
    { label: 'Schedule Week', color: '#06b6d4', prompt: 'Plan my social media content for this week' },
  ],
  '__0ncomm__': [
    { label: 'Email Template', color: '#f59e0b', prompt: 'Create an email template for new leads' },
    { label: 'SMS Campaign', color: '#ec4899', prompt: 'Draft an SMS sequence for appointment reminders' },
    { label: 'Auto-Responder', color: '#6EE05A', prompt: 'Set up an auto-response for after-hours inquiries' },
  ],
  '__0nweb__': [
    { label: 'SEO Audit', color: '#06b6d4', prompt: 'Run an SEO audit on my main landing page' },
    { label: 'Landing Page', color: '#3b82f6', prompt: 'Generate a high-converting landing page for my top offer' },
    { label: 'Site Speed', color: '#ef4444', prompt: 'Analyze my site performance and suggest improvements' },
  ],
  '__0nbrand__': [
    { label: 'Brand Audit', color: '#ec4899', prompt: 'Audit my brand consistency across all channels' },
    { label: 'Elevator Pitch', color: '#a78bfa', prompt: '30-second elevator pitch for my business' },
    { label: 'Messaging Guide', color: '#f59e0b', prompt: 'Create a messaging framework for my brand' },
  ],
  '__0ntrack__': [
    { label: 'Weekly Report', color: '#ef4444', prompt: 'Generate a weekly performance report' },
    { label: 'Attribution', color: '#3b82f6', prompt: 'Which channels are driving the most conversions?' },
    { label: 'Forecast', color: '#6EE05A', prompt: 'Forecast my revenue for the next 30 days based on current pipeline' },
  ],
}

// ── Helpers ──

function initials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function timeNow(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ── Component ──

export default function ChatPage() {
  const [crews, setCrews] = useState<Crew[]>(DEFAULT_CREWS)
  const [activeCrew, setActiveCrew] = useState<Crew>(DEFAULT_CREWS[0])
  const [messages, setMessages] = useState<Map<string, DisplayMessage[]>>(
    new Map(DEFAULT_CREWS.map(c => [c.id, [{
      id: 'welcome-' + c.id,
      role: 'assistant' as const,
      content: `I'm ${c.name}. ${c.description}. I have access to K-Layers ${c.k_layers.join(', ')} — ask me anything.`,
      time: timeNow(),
    }]])),
  )
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showNewCrew, setShowNewCrew] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('general')
  const [newColor, setNewColor] = useState('#6EE05A')
  const [newKLayers, setNewKLayers] = useState<string[]>(['K1'])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ── Fetch crews ──

  useEffect(() => {
    fetch('/api/crews')
      .then(r => r.json())
      .then(d => {
        const fetched: Crew[] = d.crews || []
        if (fetched.length > 0) {
          const merged = DEFAULT_CREWS.map(dc => {
            const match = fetched.find(f => f.name === dc.name)
            return match ? { ...dc, ...match, k_layers: match.k_layers || dc.k_layers } : dc
          })
          const custom = fetched.filter(f => !DEFAULT_CREWS.some(dc => dc.name === f.name))
          setCrews([...merged, ...custom])
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeCrew?.id])

  const currentMessages = messages.get(activeCrew?.id || '') || []

  // ── Send message ──

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading || !activeCrew) return

    const userMsg: DisplayMessage = { id: uid(), role: 'user', content: text, time: timeNow() }

    setMessages(prev => {
      const next = new Map(prev)
      next.set(activeCrew.id, [...(next.get(activeCrew.id) || []), userMsg])
      return next
    })
    setInput('')
    setLoading(true)

    try {
      const history: Message[] = (messages.get(activeCrew.id) || []).map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/console/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, crewId: activeCrew.id }),
      })
      const data = await res.json()

      const aiMsg: DisplayMessage = {
        id: uid(),
        role: 'assistant',
        content: data.reply || data.error || 'No response.',
        time: timeNow(),
      }

      setMessages(prev => {
        const next = new Map(prev)
        next.set(activeCrew.id, [...(next.get(activeCrew.id) || []), aiMsg])
        return next
      })
    } catch {
      setMessages(prev => {
        const next = new Map(prev)
        next.set(activeCrew.id, [...(next.get(activeCrew.id) || []), {
          id: uid(), role: 'assistant', content: 'Connection error. Try again.', time: timeNow(),
        }])
        return next
      })
    } finally {
      setLoading(false)
    }
  }, [input, loading, activeCrew, messages])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // ── Create/Delete crew ──

  async function createCrew() {
    if (!newName.trim()) return
    try {
      const res = await fetch('/api/crews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), role: newRole, avatar_color: newColor, k_layers: newKLayers, tools: [] }),
      })
      const d = await res.json()
      if (d.crew) {
        setCrews(prev => [...prev, d.crew])
        setActiveCrew(d.crew)
        setShowNewCrew(false)
        setNewName(''); setNewRole('general'); setNewColor('#6EE05A'); setNewKLayers(['K1'])
      }
    } catch {}
  }

  async function deleteCrew(id: string) {
    try {
      await fetch('/api/crews', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      setCrews(prev => prev.filter(c => c.id !== id))
      if (activeCrew?.id === id) setActiveCrew(DEFAULT_CREWS[0])
      setDeleteConfirm(null)
      setShowSettings(false)
    } catch {}
  }

  // ── Current crew prompts ──
  const prompts = CREW_PROMPTS[activeCrew?.id] || CREW_PROMPTS['__my0n__']

  // ── Render ──

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 64px)',
      background: 'var(--jp-bg, #0d1117)',
      color: 'var(--jp-text, #f0f4f8)',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* ═══ TOP TAB BAR ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '10px 20px',
        borderBottom: '1px solid var(--jp-border, #30363d)',
        overflowX: 'auto',
        flexShrink: 0,
      }}>
        {crews.filter(c => c.status !== 'archived').map(crew => {
          const isActive = activeCrew?.id === crew.id
          return (
            <button
              key={crew.id}
              onClick={() => { setActiveCrew(crew); inputRef.current?.focus() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 8,
                border: isActive ? `2px solid ${crew.avatar_color}` : '2px solid transparent',
                background: isActive ? `${crew.avatar_color}14` : 'var(--jp-bg-card, #161b22)',
                color: isActive ? crew.avatar_color : 'var(--jp-text-secondary, #9ca3af)',
                fontSize: 13, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: crew.avatar_color,
                flexShrink: 0,
              }} />
              {crew.name}
            </button>
          )
        })}

        {/* Add crew + Settings */}
        <button
          onClick={() => setShowNewCrew(true)}
          style={{
            padding: '8px 12px', borderRadius: 8,
            border: '1px dashed var(--jp-border, #30363d)',
            background: 'transparent',
            color: 'var(--jp-text-muted, #6b7280)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          +
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowSettings(p => !p)}
          style={{
            padding: 8, borderRadius: 8,
            background: showSettings ? 'var(--jp-bg-card, #161b22)' : 'transparent',
            border: 'none', cursor: 'pointer',
            color: showSettings ? '#6EE05A' : 'var(--jp-text-muted, #6b7280)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* ═══ MAIN AREA ═══ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ═══ CENTER PANEL ═══ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Crew Header */}
          <div style={{
            padding: '14px 24px',
            display: 'flex', alignItems: 'center', gap: 12,
            borderBottom: '1px solid var(--jp-border, #30363d)',
            flexShrink: 0,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: activeCrew?.avatar_color || '#6EE05A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#0d1117',
            }}>
              {initials(activeCrew?.name || '')}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{activeCrew?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--jp-text-muted, #6b7280)' }}>
                {activeCrew?.description}
                {' · '}
                <span style={{ color: activeCrew?.avatar_color }}>
                  {activeCrew?.k_layers?.map(k => K_LAYER_DEPARTMENTS[k]?.label).filter(Boolean).join(', ')}
                </span>
              </div>
            </div>
            <div style={{ flex: 1 }} />
            {/* K-Layer badges */}
            <div style={{ display: 'flex', gap: 4 }}>
              {activeCrew?.k_layers?.map(k => (
                <span key={k} title={K_LAYER_DEPARTMENTS[k]?.description} style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 8px',
                  borderRadius: 4,
                  background: `${activeCrew.avatar_color}18`,
                  color: activeCrew.avatar_color,
                  border: `1px solid ${activeCrew.avatar_color}30`,
                }}>{k}</span>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '20px 24px',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            {currentMessages.length === 0 && (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 12, color: 'var(--jp-text-muted, #6b7280)',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: activeCrew?.avatar_color || '#6EE05A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 700, color: '#0d1117', opacity: 0.6,
                }}>
                  {initials(activeCrew?.name || '')}
                </div>
                <span style={{ fontSize: 14 }}>Start a conversation with {activeCrew?.name}</span>
              </div>
            )}

            {currentMessages.map(msg => {
              const isUser = msg.role === 'user'
              return (
                <div key={msg.id} style={{
                  display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
                  gap: 8, alignItems: 'flex-end',
                }}>
                  {!isUser && (
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: activeCrew?.avatar_color || '#6EE05A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#0d1117', flexShrink: 0,
                    }}>
                      {initials(activeCrew?.name || '')}
                    </div>
                  )}
                  <div style={{
                    maxWidth: '65%', padding: '10px 14px',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isUser ? activeCrew?.avatar_color || '#6EE05A' : 'var(--jp-bg-card, #161b22)',
                    color: isUser ? '#0d1117' : 'var(--jp-text, #f0f4f8)',
                    fontSize: 13.5, lineHeight: 1.55, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                    border: isUser ? 'none' : `1px solid ${activeCrew?.avatar_color || '#6EE05A'}25`,
                  }}>
                    {msg.content}
                    <div style={{ fontSize: 10, marginTop: 4, opacity: 0.5, textAlign: isUser ? 'right' : 'left' }}>
                      {msg.time}
                    </div>
                  </div>
                  {isUser && (
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: 'var(--jp-bg-card, #161b22)',
                      border: '1px solid var(--jp-border, #30363d)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: 'var(--jp-text-secondary, #9ca3af)', flexShrink: 0,
                    }}>U</div>
                  )}
                </div>
              )
            })}

            {loading && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: activeCrew?.avatar_color || '#6EE05A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#0d1117', flexShrink: 0,
                }}>
                  {initials(activeCrew?.name || '')}
                </div>
                <div style={{
                  padding: '12px 18px', borderRadius: '16px 16px 16px 4px',
                  background: 'var(--jp-bg-card, #161b22)', display: 'flex', gap: 4, alignItems: 'center',
                }}>
                  <span className="chat-typing-dot" style={{ animationDelay: '0ms' }} />
                  <span className="chat-typing-dot" style={{ animationDelay: '200ms' }} />
                  <span className="chat-typing-dot" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts */}
          {currentMessages.length <= 1 && (
            <div style={{
              padding: '0 24px 12px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--jp-text-muted, #6b7280)', letterSpacing: '0.04em' }}>
                Suggested Prompts
              </span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {prompts.map(p => (
                  <button
                    key={p.label}
                    onClick={() => { setInput(p.prompt); inputRef.current?.focus() }}
                    style={{
                      padding: '7px 16px', borderRadius: 20,
                      border: 'none',
                      background: p.color,
                      color: '#0d1117',
                      fontSize: 12, fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'transform 0.1s, box-shadow 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = `0 0 12px ${p.color}40` }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div style={{
            padding: '12px 20px 16px',
            borderTop: '1px solid var(--jp-border, #30363d)',
            display: 'flex', gap: 10, alignItems: 'flex-end',
          }}>
            <button style={{
              background: 'var(--jp-bg-card, #161b22)',
              border: '1px solid var(--jp-border, #30363d)',
              borderRadius: 8, width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--jp-text-muted, #6b7280)', cursor: 'pointer', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${activeCrew?.name || 'crew'}...`}
              rows={1}
              style={{
                flex: 1,
                background: 'var(--jp-bg-card, #161b22)',
                border: `1px solid ${input.trim() ? (activeCrew?.avatar_color || '#6EE05A') + '50' : 'var(--jp-border, #30363d)'}`,
                borderRadius: 12, padding: '10px 14px',
                color: 'var(--jp-text, #f0f4f8)',
                fontSize: 13.5, resize: 'none', outline: 'none',
                minHeight: 40, maxHeight: 120,
                lineHeight: 1.45, fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                width: 40, height: 40, borderRadius: 10, border: 'none',
                background: input.trim() ? activeCrew?.avatar_color || '#6EE05A' : 'var(--jp-bg-card, #161b22)',
                color: input.trim() ? '#0d1117' : 'var(--jp-text-muted, #6b7280)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'default', flexShrink: 0,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* ═══ RIGHT PANEL — History ═══ */}
        <div style={{
          width: 280, minWidth: 280,
          borderLeft: '1px solid var(--jp-border, #30363d)',
          background: 'var(--jp-bg, #0d1117)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Panel header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--jp-border, #30363d)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: activeCrew?.avatar_color }}>
                {activeCrew?.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--jp-text-muted, #6b7280)' }}>
                {showSettings ? 'Settings' : 'History'}
              </div>
            </div>
            <button onClick={() => setShowSettings(p => !p)} style={{
              padding: '4px 10px', borderRadius: 6,
              background: 'var(--jp-bg-card, #161b22)',
              border: '1px solid var(--jp-border, #30363d)',
              color: 'var(--jp-text-secondary, #9ca3af)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>
              {showSettings ? 'History' : 'Settings'}
            </button>
          </div>

          {showSettings ? (
            /* ── Settings View ── */
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {/* Avatar + info */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: activeCrew?.avatar_color || '#6EE05A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 700, color: '#0d1117',
                }}>
                  {initials(activeCrew?.name || '')}
                </div>
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 12,
                  background: `${activeCrew?.avatar_color}18`, color: activeCrew?.avatar_color,
                  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {activeCrew?.role}
                </span>
              </div>

              {/* K-Layers */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--jp-text-muted, #6b7280)', textTransform: 'uppercase', marginBottom: 8 }}>
                  K-Layers (Department Knowledge)
                </div>
                {['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7'].map(k => {
                  const active = activeCrew?.k_layers?.includes(k)
                  const dept = K_LAYER_DEPARTMENTS[k]
                  return (
                    <div key={k} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 8px', marginBottom: 4, borderRadius: 6,
                      background: active ? `${activeCrew?.avatar_color}10` : 'transparent',
                    }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        background: active ? `${activeCrew?.avatar_color}20` : 'var(--jp-bg-card, #161b22)',
                        color: active ? activeCrew?.avatar_color : 'var(--jp-text-muted, #6b7280)',
                        border: `1px solid ${active ? activeCrew?.avatar_color + '30' : 'var(--jp-border, #30363d)'}`,
                      }}>{k}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: active ? 'var(--jp-text, #f0f4f8)' : 'var(--jp-text-muted, #6b7280)' }}>
                          {dept?.label}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--jp-text-muted, #6b7280)' }}>
                          {dept?.integrations.join(', ')}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Tools */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--jp-text-muted, #6b7280)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Tools
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(activeCrew?.tools?.length ? activeCrew.tools : ['none']).map(t => (
                    <span key={t} style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 5,
                      background: 'var(--jp-bg-card, #161b22)',
                      color: 'var(--jp-text-secondary, #9ca3af)',
                      border: '1px solid var(--jp-border, #30363d)',
                    }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {activeCrew && !activeCrew.id.startsWith('__') && (
                <div style={{ marginTop: 'auto' }}>
                  {deleteConfirm === activeCrew.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => deleteCrew(activeCrew.id)} style={{
                        flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                        background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>Confirm</button>
                      <button onClick={() => setDeleteConfirm(null)} style={{
                        flex: 1, padding: '9px 0', borderRadius: 8,
                        border: '1px solid var(--jp-border, #30363d)',
                        background: 'transparent', color: 'var(--jp-text-secondary, #9ca3af)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(activeCrew.id)} style={{
                      width: '100%', padding: '9px 0', borderRadius: 8,
                      border: '1px solid rgba(220,38,38,0.3)',
                      background: 'rgba(220,38,38,0.08)', color: '#f87171',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>Delete Crew</button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ── History View ── */
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {currentMessages.filter(m => m.id !== 'welcome-' + activeCrew?.id).length === 0 ? (
                <div style={{
                  padding: '40px 16px', textAlign: 'center',
                  color: 'var(--jp-text-muted, #6b7280)', fontSize: 12,
                }}>
                  No conversation history yet.
                  <br />Start chatting to see messages here.
                </div>
              ) : (
                currentMessages
                  .filter(m => m.id !== 'welcome-' + activeCrew?.id)
                  .map(msg => (
                    <div key={msg.id} style={{
                      padding: '10px 12px', marginBottom: 4,
                      borderRadius: 8, cursor: 'pointer',
                      background: 'transparent',
                      borderLeft: msg.role === 'user' ? `3px solid ${activeCrew?.avatar_color || '#6EE05A'}` : '3px solid var(--jp-border, #30363d)',
                    }}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginBottom: 4,
                      }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          color: msg.role === 'user' ? activeCrew?.avatar_color : 'var(--jp-text-muted, #6b7280)',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>
                          {msg.role === 'user' ? 'You' : activeCrew?.name}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--jp-text-muted, #6b7280)' }}>
                          {msg.time}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 12, color: 'var(--jp-text-secondary, #9ca3af)',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        lineHeight: 1.4,
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ NEW CREW MODAL ═══ */}
      {showNewCrew && (
        <div
          style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
          onClick={() => setShowNewCrew(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{
            width: 380, background: 'var(--jp-bg-card, #161b22)',
            border: '1px solid var(--jp-border, #30363d)', borderRadius: 14, padding: 24,
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Create New Crew</div>

            <label style={{ fontSize: 11, color: 'var(--jp-text-secondary, #9ca3af)', fontWeight: 600 }}>NAME</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Content Writer"
              style={{
                width: '100%', background: 'var(--jp-bg, #0d1117)',
                border: '1px solid var(--jp-border, #30363d)', borderRadius: 8,
                padding: '9px 12px', color: 'var(--jp-text, #f0f4f8)',
                fontSize: 13, outline: 'none', marginTop: 6, marginBottom: 14,
              }}
            />

            <label style={{ fontSize: 11, color: 'var(--jp-text-secondary, #9ca3af)', fontWeight: 600 }}>DEPARTMENT</label>
            <select value={newRole} onChange={e => setNewRole(e.target.value)}
              style={{
                width: '100%', background: 'var(--jp-bg, #0d1117)',
                border: '1px solid var(--jp-border, #30363d)', borderRadius: 8,
                padding: '9px 12px', color: 'var(--jp-text, #f0f4f8)',
                fontSize: 13, outline: 'none', marginTop: 6, marginBottom: 14,
              }}
            >
              <option value="general">General</option>
              <option value="sales">Sales</option>
              <option value="marketing">Marketing</option>
              <option value="social">Social Media</option>
              <option value="communication">Communication</option>
              <option value="development">Development</option>
              <option value="design">Design / Brand</option>
              <option value="analytics">Analytics / Tracking</option>
              <option value="support">Customer Service</option>
            </select>

            <label style={{ fontSize: 11, color: 'var(--jp-text-secondary, #9ca3af)', fontWeight: 600 }}>COLOR</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, marginBottom: 14 }}>
              {['#6EE05A', '#3b82f6', '#a78bfa', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'].map(c => (
                <button key={c} onClick={() => setNewColor(c)} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c,
                  border: newColor === c ? '2px solid #fff' : '2px solid transparent',
                  cursor: 'pointer',
                }} />
              ))}
            </div>

            <label style={{ fontSize: 11, color: 'var(--jp-text-secondary, #9ca3af)', fontWeight: 600 }}>K-LAYERS</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, marginBottom: 20 }}>
              {['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7'].map(k => {
                const selected = newKLayers.includes(k)
                return (
                  <button key={k}
                    onClick={() => setNewKLayers(prev => selected ? prev.filter(l => l !== k) : [...prev, k])}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 6,
                      background: selected ? 'rgba(110,224,90,0.12)' : 'var(--jp-bg, #0d1117)',
                      color: selected ? '#6EE05A' : 'var(--jp-text-muted, #6b7280)',
                      border: selected ? '1px solid rgba(110,224,90,0.25)' : '1px solid var(--jp-border, #30363d)',
                      cursor: 'pointer',
                    }}
                  >{k}</button>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNewCrew(false)} style={{
                flex: 1, padding: '10px 0', borderRadius: 8,
                border: '1px solid var(--jp-border, #30363d)',
                background: 'transparent', color: 'var(--jp-text-secondary, #9ca3af)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={createCrew} disabled={!newName.trim()} style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                background: newName.trim() ? '#6EE05A' : 'var(--jp-bg, #0d1117)',
                color: newName.trim() ? '#0d1117' : 'var(--jp-text-muted, #6b7280)',
                fontSize: 13, fontWeight: 700, cursor: newName.trim() ? 'pointer' : 'default',
              }}>Create Crew</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .chat-typing-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: ${activeCrew?.avatar_color || '#6EE05A'};
          display: inline-block;
          animation: chatTypingBounce 1.2s infinite ease-in-out;
        }
        @keyframes chatTypingBounce {
          0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}
