'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Settings, Paperclip, Send, Plus } from 'lucide-react'

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

  const crewColor = activeCrew?.avatar_color || '#6EE05A'

  // ── Render ──

  return (
    <div className="flex flex-col overflow-hidden relative h-[calc(100vh-64px)] bg-core-bg text-core-text">

      {/* ═══ TOP TAB BAR ═══ */}
      <div className="flex items-center gap-1.5 px-5 py-2.5 overflow-x-auto flex-shrink-0 border-b border-core-border">
        {crews.filter(c => c.status !== 'archived').map(crew => {
          const isActive = activeCrew?.id === crew.id
          return (
            <button
              key={crew.id}
              onClick={() => { setActiveCrew(crew); inputRef.current?.focus() }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer whitespace-nowrap transition-all duration-150 flex-shrink-0"
              style={{
                border: isActive ? `2px solid ${crew.avatar_color}` : '2px solid transparent',
                background: isActive ? `${crew.avatar_color}14` : 'var(--core-card)',
                color: isActive ? crew.avatar_color : 'var(--core-text-dim)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: crew.avatar_color }}
              />
              {crew.name}
            </button>
          )
        })}

        {/* Add crew + Settings */}
        <button
          onClick={() => setShowNewCrew(true)}
          className="flex items-center justify-center px-3 py-2 rounded-lg text-[13px] font-semibold cursor-pointer whitespace-nowrap transition-colors border border-dashed border-core-border bg-transparent text-core-text-muted"
        >
          <Plus size={14} />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setShowSettings(p => !p)}
          className="p-2 rounded-lg border-none cursor-pointer transition-colors"
          style={{
            background: showSettings ? 'var(--core-card)' : 'transparent',
            color: showSettings ? crewColor : 'var(--core-text-muted)',
          }}
        >
          <Settings size={18} />
        </button>
      </div>

      {/* ═══ MAIN AREA ═══ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ═══ CENTER PANEL ═══ */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Crew Header */}
          <div className="px-6 py-3.5 flex items-center gap-3 flex-shrink-0 border-b border-core-border">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
              style={{ background: crewColor, color: '#0d1117' }}
            >
              {initials(activeCrew?.name || '')}
            </div>
            <div>
              <div className="text-base font-bold">{activeCrew?.name}</div>
              <div className="text-[11px] text-core-text-muted">
                {activeCrew?.description}
                {' · '}
                <span style={{ color: crewColor }}>
                  {activeCrew?.k_layers?.map(k => K_LAYER_DEPARTMENTS[k]?.label).filter(Boolean).join(', ')}
                </span>
              </div>
            </div>
            <div className="flex-1" />
            {/* K-Layer badges */}
            <div className="flex gap-1">
              {activeCrew?.k_layers?.map(k => (
                <span
                  key={k}
                  title={K_LAYER_DEPARTMENTS[k]?.description}
                  className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{
                    background: `${crewColor}18`,
                    color: crewColor,
                    border: `1px solid ${crewColor}30`,
                  }}
                >
                  {k}
                </span>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            {currentMessages.length === 0 && (
              <div className="flex-1 flex items-center justify-center flex-col gap-3 text-core-text-muted">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold opacity-60"
                  style={{ background: crewColor, color: '#0d1117' }}
                >
                  {initials(activeCrew?.name || '')}
                </div>
                <span className="text-sm">Start a conversation with {activeCrew?.name}</span>
              </div>
            )}

            {currentMessages.map(msg => {
              const isUser = msg.role === 'user'
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 items-end ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div
                      className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={{ background: crewColor, color: '#0d1117' }}
                    >
                      {initials(activeCrew?.name || '')}
                    </div>
                  )}
                  <div
                    className="max-w-[65%] px-3.5 py-2.5 text-[13.5px] leading-[1.55] break-words whitespace-pre-wrap"
                    style={{
                      borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isUser ? crewColor : 'var(--core-card)',
                      color: isUser ? '#0d1117' : 'var(--core-text)',
                      border: isUser ? 'none' : `1px solid ${crewColor}25`,
                    }}
                  >
                    {msg.content}
                    <div
                      className="text-[10px] mt-1 opacity-50"
                      style={{ textAlign: isUser ? 'right' : 'left' }}
                    >
                      {msg.time}
                    </div>
                  </div>
                  {isUser && (
                    <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 bg-core-card border border-core-border text-core-text-dim">
                      U
                    </div>
                  )}
                </div>
              )
            })}

            {loading && (
              <div className="flex gap-2 items-end">
                <div
                  className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{ background: crewColor, color: '#0d1117' }}
                >
                  {initials(activeCrew?.name || '')}
                </div>
                <div
                  className="px-4 py-3 flex gap-1 items-center bg-core-card"
                  style={{ borderRadius: '16px 16px 16px 4px' }}
                >
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
            <div className="px-6 pb-3 flex flex-col items-center gap-2">
              <span className="text-[12px] font-semibold tracking-[0.04em] text-core-text-muted">
                Suggested Prompts
              </span>
              <div className="flex gap-2 flex-wrap justify-center">
                {prompts.map(p => (
                  <button
                    key={p.label}
                    onClick={() => { setInput(p.prompt); inputRef.current?.focus() }}
                    className="px-4 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-transform duration-100 hover:scale-[1.04] border-none"
                    style={{ background: p.color, color: '#0d1117' }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div className="px-5 pt-3 pb-4 flex gap-2.5 items-end border-t border-core-border">
            <button className="flex items-center justify-center rounded-lg w-10 h-10 cursor-pointer flex-shrink-0 transition-colors bg-core-card border border-core-border text-core-text-muted">
              <Paperclip size={16} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${activeCrew?.name || 'crew'}...`}
              rows={1}
              className="flex-1 rounded-xl px-3.5 py-2.5 text-[13.5px] resize-none outline-none min-h-[40px] max-h-[120px] leading-[1.45] font-[inherit] transition-colors duration-150 bg-core-card text-core-text"
              style={{
                border: `1px solid ${input.trim() ? `${crewColor}50` : 'var(--core-border)'}`,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 border-none transition-all duration-150"
              style={{
                background: input.trim() ? crewColor : 'var(--core-card)',
                color: input.trim() ? '#0d1117' : 'var(--core-text-muted)',
                cursor: input.trim() ? 'pointer' : 'default',
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>

        {/* ═══ RIGHT PANEL — History ═══ */}
        <div className="w-[280px] min-w-[280px] flex flex-col overflow-hidden border-l border-core-border bg-core-bg">
          {/* Panel header */}
          <div className="px-4 py-3.5 flex items-center justify-between flex-shrink-0 border-b border-core-border">
            <div>
              <div className="text-sm font-bold" style={{ color: crewColor }}>
                {activeCrew?.name}
              </div>
              <div className="text-[11px] text-core-text-muted">
                {showSettings ? 'Settings' : 'History'}
              </div>
            </div>
            <button
              onClick={() => setShowSettings(p => !p)}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors bg-core-card border border-core-border text-core-text-dim"
            >
              {showSettings ? 'History' : 'Settings'}
            </button>
          </div>

          {showSettings ? (
            /* ── Settings View ── */
            <div className="flex-1 overflow-y-auto p-4">
              {/* Avatar + info */}
              <div className="flex flex-col items-center gap-2.5 mb-5">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
                  style={{ background: crewColor, color: '#0d1117' }}
                >
                  {initials(activeCrew?.name || '')}
                </div>
                <span
                  className="text-[11px] px-2.5 py-0.5 rounded-xl font-semibold uppercase tracking-[0.04em]"
                  style={{
                    background: `${crewColor}18`,
                    color: crewColor,
                  }}
                >
                  {activeCrew?.role}
                </span>
              </div>

              {/* K-Layers */}
              <div className="mb-4">
                <div className="text-[10px] font-bold tracking-[0.08em] uppercase mb-2 text-core-text-muted">
                  K-Layers (Department Knowledge)
                </div>
                {['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7'].map(k => {
                  const active = activeCrew?.k_layers?.includes(k)
                  const dept = K_LAYER_DEPARTMENTS[k]
                  return (
                    <div
                      key={k}
                      className="flex items-center gap-2 px-2 py-1.5 mb-1 rounded-md"
                      style={{ background: active ? `${crewColor}10` : 'transparent' }}
                    >
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: active ? `${crewColor}20` : 'var(--core-card)',
                          color: active ? crewColor : 'var(--core-text-muted)',
                          border: `1px solid ${active ? crewColor + '30' : 'var(--core-border)'}`,
                        }}
                      >
                        {k}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-[11px] font-semibold"
                          style={{ color: active ? 'var(--core-text)' : 'var(--core-text-muted)' }}
                        >
                          {dept?.label}
                        </div>
                        <div className="text-[10px] text-core-text-muted">
                          {dept?.integrations.join(', ')}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Tools */}
              <div className="mb-4">
                <div className="text-[10px] font-bold tracking-[0.08em] uppercase mb-2 text-core-text-muted">
                  Tools
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(activeCrew?.tools?.length ? activeCrew.tools : ['none']).map(t => (
                    <span
                      key={t}
                      className="text-[11px] px-2 py-0.5 rounded-[5px] bg-core-card text-core-text-dim border border-core-border"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {activeCrew && !activeCrew.id.startsWith('__') && (
                <div className="mt-auto">
                  {deleteConfirm === activeCrew.id ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => deleteCrew(activeCrew.id)}
                        className="flex-1 py-2 rounded-lg border-none bg-red-600 text-white text-[12px] font-semibold cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 py-2 rounded-lg text-[12px] font-semibold cursor-pointer border border-core-border bg-transparent text-core-text-dim"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(activeCrew.id)}
                      className="w-full py-2 rounded-lg text-[13px] font-semibold cursor-pointer"
                      style={{
                        border: '1px solid rgba(220,38,38,0.3)',
                        background: 'rgba(220,38,38,0.08)',
                        color: '#f87171',
                      }}
                    >
                      Delete Crew
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ── History View ── */
            <div className="flex-1 overflow-y-auto p-2">
              {currentMessages.filter(m => m.id !== 'welcome-' + activeCrew?.id).length === 0 ? (
                <div className="py-10 px-4 text-center text-[12px] text-core-text-muted">
                  No conversation history yet.
                  <br />Start chatting to see messages here.
                </div>
              ) : (
                currentMessages
                  .filter(m => m.id !== 'welcome-' + activeCrew?.id)
                  .map(msg => (
                    <div
                      key={msg.id}
                      className="px-3 py-2.5 mb-1 rounded-lg cursor-pointer bg-transparent"
                      style={{
                        borderLeft: msg.role === 'user'
                          ? `3px solid ${crewColor}`
                          : '3px solid var(--core-border)',
                      }}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className="text-[10px] font-bold uppercase tracking-[0.04em]"
                          style={{ color: msg.role === 'user' ? crewColor : 'var(--core-text-muted)' }}
                        >
                          {msg.role === 'user' ? 'You' : activeCrew?.name}
                        </span>
                        <span className="text-[10px] text-core-text-muted">
                          {msg.time}
                        </span>
                      </div>
                      <div
                        className="text-[12px] leading-[1.4] overflow-hidden text-core-text-dim"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
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
          className="absolute inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowNewCrew(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-[380px] rounded-2xl p-6 bg-core-card border border-core-border"
          >
            <div className="text-base font-bold mb-5">Create New Crew</div>

            <label className="text-[11px] font-semibold text-core-text-dim">NAME</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Content Writer"
              className="w-full rounded-lg px-3 py-2 text-[13px] outline-none mt-1.5 mb-3.5 bg-core-bg border border-core-border text-core-text"
            />

            <label className="text-[11px] font-semibold text-core-text-dim">DEPARTMENT</label>
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[13px] outline-none mt-1.5 mb-3.5 bg-core-bg border border-core-border text-core-text"
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

            <label className="text-[11px] font-semibold text-core-text-dim">COLOR</label>
            <div className="flex gap-2 mt-1.5 mb-3.5">
              {['#6EE05A', '#3b82f6', '#a78bfa', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'].map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className="w-7 h-7 rounded-full cursor-pointer transition-transform"
                  style={{
                    background: c,
                    border: newColor === c ? '2px solid #fff' : '2px solid transparent',
                  }}
                />
              ))}
            </div>

            <label className="text-[11px] font-semibold text-core-text-dim">K-LAYERS</label>
            <div className="flex flex-wrap gap-1.5 mt-1.5 mb-5">
              {['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7'].map(k => {
                const selected = newKLayers.includes(k)
                return (
                  <button
                    key={k}
                    onClick={() => setNewKLayers(prev => selected ? prev.filter(l => l !== k) : [...prev, k])}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-md cursor-pointer transition-colors"
                    style={{
                      background: selected ? 'rgba(110,224,90,0.12)' : 'var(--core-bg)',
                      color: selected ? '#6EE05A' : 'var(--core-text-muted)',
                      border: selected ? '1px solid rgba(110,224,90,0.25)' : '1px solid var(--core-border)',
                    }}
                  >
                    {k}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setShowNewCrew(false)}
                className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold cursor-pointer transition-colors border border-core-border bg-transparent text-core-text-dim"
              >
                Cancel
              </button>
              <button
                onClick={createCrew}
                disabled={!newName.trim()}
                className="flex-1 py-2.5 rounded-lg border-none text-[13px] font-bold transition-colors"
                style={{
                  background: newName.trim() ? '#6EE05A' : 'var(--core-bg)',
                  color: newName.trim() ? '#0d1117' : 'var(--core-text-muted)',
                  cursor: newName.trim() ? 'pointer' : 'default',
                }}
              >
                Create Crew
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .chat-typing-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: ${crewColor};
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
