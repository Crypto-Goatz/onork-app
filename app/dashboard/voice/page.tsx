'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

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
    supabase.auth.getUser().then(({ data: { user } }) => {
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
      // Fall back to old agent endpoint
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
        setForm({ name: '', greeting: 'Hi, thanks for calling! How can I help you today?', prompt: 'You are a helpful business assistant.', voiceId: '', transferNumber: '', knowledgeBaseId: '' })
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

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)',
    color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Create Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => setShowCreate(false)}>
          <div style={{
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 16, padding: 28, maxWidth: 520, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 20px' }}>
              Create Voice Agent
            </h2>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent Name *</span>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Business Assistant" style={inp} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Greeting</span>
              <input type="text" value={form.greeting} onChange={e => setForm(f => ({ ...f, greeting: e.target.value }))} placeholder="Hi, thanks for calling..." style={inp} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prompt / Instructions</span>
              <textarea value={form.prompt} onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))} placeholder="You are a helpful assistant for..."
                rows={3} style={{ ...inp, resize: 'vertical' }} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transfer Number</span>
              <input type="tel" value={form.transferNumber} onChange={e => setForm(f => ({ ...f, transferNumber: e.target.value }))} placeholder="+1234567890" style={inp} />
            </label>
            <label style={{ display: 'block', marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Knowledge Base ID</span>
              <input type="text" value={form.knowledgeBaseId} onChange={e => setForm(f => ({ ...f, knowledgeBaseId: e.target.value }))} placeholder="Optional" style={inp} />
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={createAgent} disabled={creating || !form.name.trim()} style={{
                flex: 1, padding: 12, background: creating ? '#374151' : 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
                color: '#0c1220', fontWeight: 700, fontSize: 14, borderRadius: 10, border: 'none', cursor: creating ? 'wait' : 'pointer', fontFamily: 'inherit',
                opacity: !form.name.trim() ? 0.5 : 1,
              }}>{creating ? 'Creating...' : 'Create Agent'}</button>
              <button onClick={() => setShowCreate(false)} style={{
                padding: '12px 20px', borderRadius: 10, border: '1px solid #1c2b42',
                background: 'transparent', color: 'var(--text-muted, #6b7280)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 4px' }}>Voice AI</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)' }}>Manage voice agents, embed them on your website, or talk to your AI.</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          padding: '10px 20px', background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
          color: '#0c1220', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
        }}>+ New Agent</button>
      </div>

      {/* Agents List */}
      {agents.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', marginBottom: 12 }}>Your Voice Agents</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {agents.map(a => (
              <div key={a.id} style={{
                background: agentId === a.id ? 'rgba(45,212,191,0.08)' : 'var(--bg-card, #1f2937)',
                border: `1px solid ${agentId === a.id ? 'rgba(45,212,191,0.3)' : '#1c2b42'}`,
                borderRadius: 12, padding: '14px 18px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', transition: 'border-color 0.2s',
              }} onClick={() => setAgentId(a.id)}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>
                    ID: {a.id}
                    {a.status && <span style={{ marginLeft: 8, color: a.status === 'active' ? '#7ed957' : '#f59e0b' }}>{a.status}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={e => { e.stopPropagation(); setShowEmbed(true); setAgentId(a.id) }} style={{
                    padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: 'rgba(45,212,191,0.1)', color: 'var(--color-cyan, #14b8a6)', border: '1px solid rgba(45,212,191,0.2)', cursor: 'pointer',
                  }}>Embed</button>
                  <button onClick={e => { e.stopPropagation(); deleteAgent(a.id) }} style={{
                    padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', cursor: 'pointer',
                  }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Voice Orb */}
      <div style={{
        background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
        borderRadius: 16, padding: '40px', marginBottom: 24,
        textAlign: 'center',
      }}>
        <div style={{
          width: 120, height: 120, borderRadius: '50%', margin: '0 auto 24px',
          background: 'radial-gradient(circle, rgba(45,212,191,0.15) 0%, rgba(139,92,246,0.08) 50%, transparent 70%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid rgba(45,212,191,0.2)',
          animation: 'voice-pulse 3s ease-in-out infinite',
          cursor: 'pointer', position: 'relative',
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(45,212,191,0.3), rgba(139,92,246,0.3))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="1.5">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 19v3m-4 0h8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', marginBottom: 6 }}>
          {selectedAgent ? selectedAgent.name : `${aiName}'s Voice`}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginBottom: 20 }}>
          {loading ? 'Loading agents...' : agentId ? 'Your AI agent is active and ready to talk.' : 'Create a voice agent to get started.'}
        </p>
        {agentId && (
          <p style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>
            Agent ID: <code style={{ background: 'var(--bg-secondary, #161b22)', padding: '2px 8px', borderRadius: 4, color: 'var(--text-secondary, #9ca3af)' }}>{agentId}</code>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{
          background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
          borderRadius: 14, padding: '24px',
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', marginBottom: 6 }}>Chat Widget</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginBottom: 16, lineHeight: 1.6 }}>
            Add a chat bubble to your website. Visitors type or talk to your AI.
          </p>
          <button onClick={() => copyCode(embedCode)} style={{
            width: '100%', padding: '10px',
            background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.2)',
            borderRadius: 8, color: 'var(--color-cyan, #14b8a6)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>{copied ? 'Copied!' : 'Copy Embed Code'}</button>
        </div>

        <div style={{
          background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
          borderRadius: 14, padding: '24px',
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', marginBottom: 6 }}>
            Free Assessment
            <span style={{
              marginLeft: 8, padding: '2px 8px', borderRadius: 4,
              background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', fontSize: 10, fontWeight: 700,
            }}>LEAD GEN</span>
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginBottom: 16, lineHeight: 1.6 }}>
            Visitors get a free AI assessment of their business. Every conversation = a new lead.
          </p>
          <button onClick={() => copyCode(assessmentEmbedCode)} style={{
            width: '100%', padding: '10px',
            background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 8, color: '#8b5cf6', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>{copied ? 'Copied!' : 'Copy Assessment Code'}</button>
        </div>
      </div>

      {/* Preview */}
      <div style={{
        background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
        borderRadius: 14, padding: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)' }}>Preview Embed Code</h3>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary, #161b22)', borderRadius: 6, padding: 2 }}>
            <button onClick={() => setTheme('dark')} style={{
              padding: '4px 10px', borderRadius: 4, border: 'none', fontSize: 11, cursor: 'pointer',
              background: theme === 'dark' ? 'var(--border, #30363d)' : 'transparent',
              color: theme === 'dark' ? 'var(--color-cyan, #14b8a6)' : 'var(--text-muted, #6b7280)',
            }}>Dark</button>
            <button onClick={() => setTheme('light')} style={{
              padding: '4px 10px', borderRadius: 4, border: 'none', fontSize: 11, cursor: 'pointer',
              background: theme === 'light' ? 'var(--border, #30363d)' : 'transparent',
              color: theme === 'light' ? 'var(--color-cyan, #14b8a6)' : 'var(--text-muted, #6b7280)',
            }}>Light</button>
          </div>
        </div>
        <pre style={{
          background: 'var(--bg-secondary, #161b22)', border: '1px solid #1c2b42',
          borderRadius: 8, padding: '16px', overflow: 'auto',
          fontSize: 12, color: 'var(--text-secondary, #9ca3af)', lineHeight: 1.7,
          fontFamily: 'JetBrains Mono, monospace',
        }}>{embedCode}</pre>
      </div>
    </div>
  )
}
