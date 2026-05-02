'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mic, Code, Zap, Trash2, Copy, Check } from 'lucide-react'

interface VoiceAgent {
  id: string
  name: string
  greeting?: string
  prompt?: string
  voiceId?: string
  transferNumber?: string
  knowledgeBaseId?: string
  status?: string
}

export default function VoicePage() {
  const [agents, setAgents] = useState<VoiceAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [agentId, setAgentId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showEmbed, setShowEmbed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [aiName, setAiName] = useState('0nAI')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    greeting: 'Hi, thanks for calling! How can I help you today?',
    prompt: 'You are a helpful business assistant.',
    voiceId: '',
    transferNumber: '',
    knowledgeBaseId: '',
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session: __sess } }) => {
      const user = __sess?.user ?? null;
      if (user) {
        setLocationId(user.user_metadata?.active_location_id || '')
        setAiName(user.user_metadata?.ai_name || '0nAI')
      }
    })
    loadAgents()
  }, [])

  async function loadAgents() {
    setLoading(true)
    try {
      const res = await fetch('/api/crm/voice-ai')
      const data = await res.json()
      if (data.agents && Array.isArray(data.agents)) {
        setAgents(data.agents)
        if (data.agents.length > 0 && !agentId) {
          setAgentId(data.agents[0].id)
        }
      }
    } catch {
      try {
        const res = await fetch('/api/crm/agent')
        const d = await res.json()
        if (d.agentId) setAgentId(d.agentId)
      } catch {}
    }
    setLoading(false)
  }

  async function createAgent() {
    if (!form.name.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/crm/voice-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.agent) {
        setAgents(prev => [...prev, data.agent])
        setAgentId(data.agent.id || '')
        setShowCreate(false)
        setForm({
          name: '',
          greeting: 'Hi, thanks for calling! How can I help you today?',
          prompt: 'You are a helpful business assistant.',
          voiceId: '',
          transferNumber: '',
          knowledgeBaseId: '',
        })
      }
    } catch {}
    setCreating(false)
  }

  async function deleteAgent(id: string) {
    try {
      await fetch('/api/crm/voice-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', agentId: id }),
      })
      setAgents(prev => prev.filter(a => a.id !== id))
      if (agentId === id) setAgentId('')
    } catch {}
  }

  const selectedAgent = agents.find(a => a.id === agentId)

  const embedCode = `<!-- ${aiName} Voice Widget -->
<script src="https://widgets.leadconnectorhq.com/loader.js"
  data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
  data-widget-id="${agentId}">
</script>`

  const assessmentEmbedCode = `<!-- ${aiName} Free Business Assessment -->
<div id="0nai-assessment" style="position:fixed;bottom:24px;right:24px;z-index:9999;">
  <script src="https://widgets.leadconnectorhq.com/loader.js"
    data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
    data-widget-id="${agentId}">
  </script>
</div>`

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-[900px] mx-auto">

      {/* Create Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-core-card border border-core-border rounded-2xl p-7 w-full max-w-[520px] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-core-text mb-5">Create Voice Agent</h2>

            <label className="block mb-3">
              <span className="block text-[11px] font-semibold text-core-text-muted uppercase tracking-wide mb-1">
                Agent Name *
              </span>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Business Assistant"
                className="w-full px-3 py-2.5 rounded-lg border border-core-border bg-core-bg text-core-text text-sm outline-none box-border font-inherit placeholder:text-core-text-muted"
              />
            </label>

            <label className="block mb-3">
              <span className="block text-[11px] font-semibold text-core-text-muted uppercase tracking-wide mb-1">
                Greeting
              </span>
              <input
                type="text"
                value={form.greeting}
                onChange={e => setForm(f => ({ ...f, greeting: e.target.value }))}
                placeholder="Hi, thanks for calling..."
                className="w-full px-3 py-2.5 rounded-lg border border-core-border bg-core-bg text-core-text text-sm outline-none box-border font-inherit placeholder:text-core-text-muted"
              />
            </label>

            <label className="block mb-3">
              <span className="block text-[11px] font-semibold text-core-text-muted uppercase tracking-wide mb-1">
                Prompt / Instructions
              </span>
              <textarea
                value={form.prompt}
                onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
                placeholder="You are a helpful assistant for..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-core-border bg-core-bg text-core-text text-sm outline-none box-border font-inherit placeholder:text-core-text-muted resize-y"
              />
            </label>

            <label className="block mb-3">
              <span className="block text-[11px] font-semibold text-core-text-muted uppercase tracking-wide mb-1">
                Transfer Number
              </span>
              <input
                type="tel"
                value={form.transferNumber}
                onChange={e => setForm(f => ({ ...f, transferNumber: e.target.value }))}
                placeholder="+1234567890"
                className="w-full px-3 py-2.5 rounded-lg border border-core-border bg-core-bg text-core-text text-sm outline-none box-border font-inherit placeholder:text-core-text-muted"
              />
            </label>

            <label className="block mb-5">
              <span className="block text-[11px] font-semibold text-core-text-muted uppercase tracking-wide mb-1">
                Knowledge Base ID
              </span>
              <input
                type="text"
                value={form.knowledgeBaseId}
                onChange={e => setForm(f => ({ ...f, knowledgeBaseId: e.target.value }))}
                placeholder="Optional"
                className="w-full px-3 py-2.5 rounded-lg border border-core-border bg-core-bg text-core-text text-sm outline-none box-border font-inherit placeholder:text-core-text-muted"
              />
            </label>

            <div className="flex gap-2.5">
              <button
                onClick={createAgent}
                disabled={creating || !form.name.trim()}
                className="flex-1 py-3 bg-core-cyan text-core-bg font-bold text-sm rounded-[10px] border-none cursor-pointer font-inherit disabled:opacity-50 disabled:cursor-wait"
              >
                {creating ? 'Creating...' : 'Create Agent'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-5 py-3 rounded-[10px] border border-core-border bg-transparent text-core-text-muted text-sm cursor-pointer font-inherit"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-core-text mb-1">Voice AI</h1>
          <p className="text-[13px] text-core-text-muted">
            Manage voice agents, embed them on your website, or talk to your AI.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 bg-core-cyan text-core-bg font-bold text-[13px] rounded-[10px] border-none cursor-pointer"
        >
          + New Agent
        </button>
      </div>

      {/* Agents List */}
      {agents.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-core-text mb-3">Your Voice Agents</h3>
          <div className="flex flex-col gap-2">
            {agents.map(a => (
              <div
                key={a.id}
                onClick={() => setAgentId(a.id)}
                className={[
                  'rounded-xl px-[18px] py-3.5 flex justify-between items-center cursor-pointer transition-colors border',
                  agentId === a.id
                    ? 'bg-core-cyan/10 border-core-cyan/30'
                    : 'bg-core-card border-core-border',
                ].join(' ')}
              >
                <div>
                  <div className="text-sm font-semibold text-core-text">{a.name}</div>
                  <div className="text-[11px] text-core-text-muted mt-0.5 flex items-center gap-2">
                    <span>ID: {a.id}</span>
                    {a.status && (
                      <span className={a.status === 'active' ? 'text-core-green' : 'text-core-amber'}>
                        {a.status}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={e => { e.stopPropagation(); setShowEmbed(true); setAgentId(a.id) }}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-core-cyan/10 text-core-cyan border border-core-cyan/20 cursor-pointer"
                  >
                    <span className="flex items-center gap-1">
                      <Code size={11} />
                      Embed
                    </span>
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); deleteAgent(a.id) }}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-core-red/10 text-core-red border border-core-red/20 cursor-pointer"
                  >
                    <span className="flex items-center gap-1">
                      <Trash2 size={11} />
                      Delete
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Voice Orb */}
      <div className="bg-core-card border border-core-border rounded-2xl p-10 mb-6 text-center">
        <div className="relative w-[120px] h-[120px] rounded-full mx-auto mb-6 flex items-center justify-center border-2 border-core-cyan/20 bg-[radial-gradient(circle,rgba(45,212,191,0.15)_0%,rgba(139,92,246,0.08)_50%,transparent_70%)] animate-[voice-pulse_3s_ease-in-out_infinite] cursor-pointer">
          <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-core-cyan/30 to-core-purple/30 flex items-center justify-center">
            <Mic size={24} className="text-core-cyan" strokeWidth={1.5} />
          </div>
        </div>

        <h3 className="text-base font-bold text-core-text mb-1.5">
          {selectedAgent ? selectedAgent.name : `${aiName}'s Voice`}
        </h3>
        <p className="text-[13px] text-core-text-muted mb-5">
          {loading
            ? 'Loading agents...'
            : agentId
            ? 'Your AI agent is active and ready to talk.'
            : 'Create a voice agent to get started.'}
        </p>
        {agentId && (
          <p className="text-[11px] text-core-text-muted">
            Agent ID:{' '}
            <code className="bg-core-surface px-2 py-0.5 rounded text-core-text-dim">{agentId}</code>
          </p>
        )}

        <style>{`
          @keyframes voice-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(45,212,191,0.15); }
            50% { box-shadow: 0 0 0 20px rgba(45,212,191,0); }
          }
        `}</style>
      </div>

      {/* Embed Options */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-core-card border border-core-border rounded-[14px] p-6">
          <h3 className="text-[15px] font-bold text-core-text mb-1.5">Chat Widget</h3>
          <p className="text-xs text-core-text-muted mb-4 leading-relaxed">
            Add a chat bubble to your website. Visitors type or talk to your AI.
          </p>
          <button
            onClick={() => copyCode(embedCode)}
            className="w-full py-2.5 bg-core-cyan/10 border border-core-cyan/20 rounded-lg text-core-cyan text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-2"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Embed Code'}
          </button>
        </div>

        <div className="bg-core-card border border-core-border rounded-[14px] p-6">
          <h3 className="text-[15px] font-bold text-core-text mb-1.5 flex items-center gap-2">
            Free Assessment
            <span className="px-2 py-0.5 rounded bg-core-purple/10 text-core-purple text-[10px] font-bold">
              LEAD GEN
            </span>
          </h3>
          <p className="text-xs text-core-text-muted mb-4 leading-relaxed">
            Visitors get a free AI assessment of their business. Every conversation = a new lead.
          </p>
          <button
            onClick={() => copyCode(assessmentEmbedCode)}
            className="w-full py-2.5 bg-core-purple/10 border border-core-purple/20 rounded-lg text-core-purple text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-2"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Assessment Code'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-core-card border border-core-border rounded-[14px] p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[15px] font-bold text-core-text">Preview Embed Code</h3>
          <div className="flex gap-1 bg-core-surface rounded-md p-0.5">
            <button
              onClick={() => setTheme('dark')}
              className={[
                'px-2.5 py-1 rounded text-[11px] cursor-pointer border-none font-inherit transition-colors',
                theme === 'dark'
                  ? 'bg-core-border text-core-cyan'
                  : 'bg-transparent text-core-text-muted',
              ].join(' ')}
            >
              Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className={[
                'px-2.5 py-1 rounded text-[11px] cursor-pointer border-none font-inherit transition-colors',
                theme === 'light'
                  ? 'bg-core-border text-core-cyan'
                  : 'bg-transparent text-core-text-muted',
              ].join(' ')}
            >
              Light
            </button>
          </div>
        </div>
        <pre className="bg-core-surface border border-core-border rounded-lg p-4 overflow-auto text-xs text-core-text-dim leading-relaxed font-[JetBrains_Mono,monospace]">
          {embedCode}
        </pre>
      </div>

    </div>
  )
}
