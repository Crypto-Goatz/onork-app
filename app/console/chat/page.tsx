'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Mail, MessageSquare, Shield, BarChart2, Send, Target, FileText, Microscope, Zap } from 'lucide-react'

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
  { key: 'email', label: 'Write cold email', Icon: Mail, desc: 'Personalized outreach for your ICP' },
  { key: 'linkedin', label: 'Draft LinkedIn post', Icon: MessageSquare, desc: 'VPIS-optimized post in your brand tone' },
  { key: 'objections', label: 'Handle objections', Icon: Shield, desc: 'Responses to common objections from K2' },
  { key: 'strategy', label: 'Weekly strategy', Icon: BarChart2, desc: 'What to focus on this week' },
  { key: 'sequence', label: 'Email sequence', Icon: Send, desc: '3-touch follow-up sequence' },
  { key: 'pitch', label: 'Elevator pitch', Icon: Target, desc: 'Quick pitch from K1 + K3' },
  { key: 'blog', label: 'Blog post draft', Icon: FileText, desc: 'SEO-optimized article outline' },
  { key: 'competitor', label: 'Competitor analysis', Icon: Microscope, desc: 'Positioning vs competitors from K4' },
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
      const { data: { session: __sess } } = await supabase.auth.getSession()
  const user = __sess?.user ?? null
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

    const { data: { session: __sess } } = await supabase.auth.getSession()
  const user = __sess?.user ?? null
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
    <div className="min-h-screen bg-[#0d1117] flex flex-col relative">

      {/* ONBOARDING MODAL */}
      {showOnboardingModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-8 max-w-[440px] w-full shadow-2xl">
            <div className="w-14 h-14 rounded-[14px] bg-[#6EE05A] flex items-center justify-center text-[22px] font-extrabold text-[#0d1117] mb-5">
              0n
            </div>
            <h2 className="text-xl font-bold text-[#f0f4f8] mb-2">
              Complete your setup
            </h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed mb-5">
              Your AI gets smarter with every K-Layer you fill in.
              Right now you have <strong className="text-[#f0f4f8]">{activeKLayers.length} of 7</strong> layers active.
            </p>

            {/* Progress bar */}
            <div className="mb-5">
              <div className="h-2 bg-[#30363d] rounded overflow-hidden">
                <div
                  className="h-full bg-[#6EE05A] rounded transition-all duration-300"
                  style={{ width: `${onboardingPct}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[11px] text-[#6b7280]">
                <span>{onboardingPct}% complete</span>
                <span>{missingLayers.length} layers remaining</span>
              </div>
            </div>

            {/* K-layer badges */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {ALL_K_LAYERS.map(k => (
                <span
                  key={k}
                  className={`text-[11px] px-2.5 py-1 rounded font-semibold border ${
                    activeKLayers.includes(k)
                      ? 'bg-[#6EE05A]/10 text-[#6EE05A] border-[#6EE05A]/40'
                      : 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/40'
                  }`}
                >
                  {k} {activeKLayers.includes(k) ? '✓' : '○'}
                </span>
              ))}
            </div>

            <div className="flex gap-2.5">
              <a
                href="/console/welcome"
                className="flex-1 py-3 rounded-xl bg-[#6EE05A] text-[#0d1117] no-underline text-center font-semibold text-sm"
              >
                Complete Onboarding
              </a>
              <button
                onClick={() => setShowOnboardingModal(false)}
                className="px-5 py-3 rounded-xl border border-[#30363d] bg-[#161b22] text-[#9ca3af] text-sm cursor-pointer"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMAND PALETTE */}
      {showCommandPalette && (
        <div
          className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
          onClick={() => setShowCommandPalette(false)}
        >
          <div
            className="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-[520px] w-full shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[#30363d]">
              <Search size={18} className="text-[#6b7280] shrink-0" />
              <input
                ref={cmdInputRef}
                type="text"
                value={commandSearch}
                onChange={e => setCommandSearch(e.target.value)}
                placeholder="Search ANYTHING..."
                className="flex-1 border-none outline-none text-[15px] text-[#f0f4f8] bg-transparent placeholder:text-[#6b7280]"
              />
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#30363d] text-[#6b7280] font-mono">
                ESC
              </span>
            </div>

            {/* Quick actions */}
            <div className="p-2">
              <div className="text-[10px] text-[#6b7280] font-semibold px-2.5 py-1.5 tracking-widest uppercase">
                Commands
              </div>
              {filteredCommands.map((cmd) => (
                <button
                  key={cmd.key}
                  onClick={() => runCommand(cmd.key)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-none bg-transparent cursor-pointer text-left hover:bg-[#1c2333] transition-colors"
                >
                  <cmd.Icon size={18} className="text-[#6b7280] shrink-0" />
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-[#f0f4f8]">{cmd.label}</div>
                    <div className="text-[11px] text-[#6b7280]">{cmd.desc}</div>
                  </div>
                </button>
              ))}

              {filteredCommands.length === 0 && (
                <div className="py-5 text-center text-[#6b7280] text-[13px]">
                  No commands match. Type your question and press Enter to ask AI directly.
                </div>
              )}

              {/* Free text search */}
              {commandSearch.trim() && (
                <button
                  onClick={() => { setShowCommandPalette(false); sendMessage(commandSearch); setCommandSearch('') }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mt-1 border border-dashed border-[#30363d] bg-transparent cursor-pointer text-left"
                >
                  <Zap size={18} className="text-[#6EE05A] shrink-0" />
                  <div>
                    <div className="text-[13px] font-semibold text-[#6EE05A]">Ask AI: &quot;{commandSearch}&quot;</div>
                    <div className="text-[11px] text-[#6b7280]">Send as a free-form question</div>
                  </div>
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center px-4 py-2.5 border-t border-[#30363d] text-[10px] text-[#6b7280]">
              <span>
                <span className="font-mono px-1 border border-[#30363d] rounded mr-1">⌘K</span>
                to toggle
              </span>
              <span>{meta.provider === 'anthropic' ? 'Claude' : meta.provider === 'groq' ? 'Groq' : 'AI'} powered</span>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="px-6 py-3 border-b border-[#30363d] flex items-center justify-between shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#6EE05A] flex items-center justify-center text-xs font-extrabold text-[#0d1117]">
            0n
          </div>
          <div>
            <h1 className="text-base font-bold text-[#f0f4f8] m-0">
              0nCore AI
            </h1>
            <p className="text-[11px] text-[#9ca3af] m-0">
              {meta.provider === 'anthropic' ? 'Claude Sonnet' : meta.provider === 'groq' ? 'Groq Llama' : 'Ready'}
              {activeKLayers.length > 0 && ` · ${activeKLayers.length} K-Layers`}
            </p>
          </div>
        </div>

        {/* Center: Sub-location switcher */}
        <div className="flex items-center gap-2">
          {subLocations.length > 1 && (
            <select
              value={activeLocation}
              onChange={e => switchLocation(e.target.value)}
              disabled={switchingLocation}
              className="px-2.5 py-1.5 rounded-md border border-[#30363d] bg-[#161b22] text-xs text-[#f0f4f8] cursor-pointer outline-none"
            >
              {subLocations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          )}
          {switchingLocation && (
            <span className="text-[11px] text-[#6EE05A]">Switching...</span>
          )}
        </div>

        {/* Right: K-Layer badges + command palette trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCommandPalette(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#30363d] bg-[#161b22] cursor-pointer text-xs text-[#9ca3af] hover:bg-[#1c2333] transition-colors"
          >
            <Search size={14} />
            Search
            <span className="text-[9px] px-1 py-0.5 rounded border border-[#30363d] text-[#6b7280] font-mono">
              ⌘K
            </span>
          </button>

          {activeKLayers.length > 0 && (
            <div className="flex gap-1">
              {activeKLayers.map(k => (
                <span
                  key={k}
                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#6EE05A]/10 text-[#6EE05A] font-semibold border border-[#6EE05A]/30"
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PINNED ONBOARDING NOTIFICATION */}
      {profile && !profile.onboarding_complete && !showOnboardingModal && (
        <div className="px-6 py-2 bg-[#f59e0b]/5 border-b border-[#f59e0b]/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-[#f59e0b]/20 flex items-center justify-center text-xs text-[#f59e0b]">
              ○
            </div>
            <span className="text-xs text-[#f59e0b]">
              Onboarding {onboardingPct}% complete — {missingLayers.length} K-Layers remaining
            </span>
            {/* Mini progress */}
            <div className="w-15 h-1 bg-[#f59e0b]/20 rounded overflow-hidden">
              <div
                className="h-full bg-[#f59e0b] rounded"
                style={{ width: `${onboardingPct}%` }}
              />
            </div>
          </div>
          <a
            href="/console/welcome"
            className="text-xs font-semibold text-[#f59e0b] no-underline px-3 py-1 rounded border border-[#f59e0b]/40 bg-[#161b22] hover:bg-[#1c2333] transition-colors"
          >
            Complete Setup
          </a>
        </div>
      )}

      {/* MESSAGES */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 flex flex-col gap-4"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[300px] gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#6EE05A]/10 border border-[#6EE05A]/30 flex items-center justify-center text-lg font-extrabold text-[#6EE05A]">
              0n
            </div>
            <div className="text-center max-w-[420px]">
              <h2 className="text-base font-semibold text-[#f0f4f8] mb-2">
                {profile?.business_name ? `Hey, ${profile.business_name}` : 'Welcome to 0nCore AI'}
              </h2>
              <p className="text-[13px] text-[#9ca3af] leading-relaxed mb-1">
                {activeKLayers.length > 0
                  ? `I have ${activeKLayers.length} K-Layers loaded. Ask me anything about your business.`
                  : 'Complete onboarding to unlock personalized AI. For now, I can help with general questions.'
                }
              </p>
              <p className="text-[11px] text-[#6b7280]">
                Press <span className="font-mono px-1 border border-[#30363d] rounded text-[#9ca3af]">⌘K</span> for commands
              </p>
            </div>

            {/* Suggestion grid */}
            <div className="grid grid-cols-2 gap-2 max-w-[420px] w-full">
              {COMMANDS.slice(0, 4).map(cmd => (
                <button
                  key={cmd.key}
                  onClick={() => runCommand(cmd.key)}
                  className="p-2.5 rounded-lg border border-[#30363d] bg-[#161b22] text-[#9ca3af] text-xs text-left cursor-pointer leading-snug flex items-center gap-2 hover:bg-[#1c2333] transition-colors"
                >
                  <cmd.Icon size={16} className="text-[#6b7280] shrink-0" />
                  <span className="text-[#f0f4f8]">{cmd.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 max-w-[720px] w-full ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                msg.role === 'user'
                  ? 'bg-[#f0f4f8] text-[#0d1117]'
                  : 'bg-[#6EE05A] text-[#0d1117]'
              }`}
            >
              {msg.role === 'user' ? 'U' : '0n'}
            </div>
            <div
              className={`px-4 py-3 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap break-words ${
                msg.role === 'user'
                  ? 'bg-[#f0f4f8] text-[#0d1117] rounded-2xl rounded-tr-sm'
                  : 'bg-[#161b22] text-[#f0f4f8] border border-[#30363d] rounded-2xl rounded-tl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 items-center">
            <div className="w-7 h-7 rounded-full bg-[#6EE05A] flex items-center justify-center text-[10px] font-bold text-[#0d1117]">
              0n
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[#161b22] border border-[#30363d] flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6b7280] animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#6b7280] animate-pulse [animation-delay:200ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#6b7280] animate-pulse [animation-delay:400ms]" />
            </div>
          </div>
        )}
      </div>

      {/* INPUT */}
      <div className="px-6 py-4 border-t border-[#30363d] bg-[#0d1117] shrink-0">
        <div className="flex gap-2 max-w-[720px] mx-auto">
          <button
            onClick={() => setShowCommandPalette(true)}
            className="w-11 h-11 rounded-xl border border-[#30363d] bg-[#161b22] cursor-pointer flex items-center justify-center shrink-0 text-[#9ca3af] text-lg hover:bg-[#1c2333] transition-colors"
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
            className="flex-1 px-4 py-3 rounded-xl border border-[#30363d] bg-[#161b22] text-sm text-[#f0f4f8] placeholder:text-[#6b7280] outline-none resize-none leading-relaxed min-h-[44px] max-h-[120px] focus:border-[#6EE05A]/50 transition-colors"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className={`px-5 rounded-xl text-sm font-semibold shrink-0 border-none transition-colors ${
              loading || !input.trim()
                ? 'bg-[#30363d] text-[#6b7280] cursor-not-allowed'
                : 'bg-[#6EE05A] text-[#0d1117] cursor-pointer hover:bg-[#6EE05A]/90'
            }`}
          >
            Send
          </button>
        </div>
        <p className="text-[10px] text-[#6b7280] text-center mt-2">
          {activeKLayers.length > 0
            ? `K-Layers: ${activeKLayers.join(', ')} active · ${meta.provider === 'anthropic' ? 'Claude' : 'Groq'} powered`
            : 'No K-Layers active · Using Groq fallback · Complete onboarding for personalized AI'
          }
        </p>
      </div>
    </div>
  )
}
