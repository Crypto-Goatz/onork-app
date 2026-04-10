'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatMeta {
  kLayers?: string[]
  model?: string
}

export default function ChatPage() {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [meta, setMeta] = useState<ChatMeta>({})
  const [businessName, setBusinessName] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('business_name')
        .eq('id', user.id)
        .single()
      setBusinessName(data?.business_name || '')
    }
    loadProfile()
  }, [supabase])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/console/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json()

      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        setMeta({ kLayers: data.kLayers, model: data.model })
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    }

    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
            0nCore AI
          </h1>
          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
            {businessName ? `AI for ${businessName}` : 'Your AI assistant'}
            {meta.kLayers && meta.kLayers.length > 0 && (
              <span> · K-Layers: {meta.kLayers.join(', ')}</span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(meta.kLayers || []).map(k => (
            <span key={k} style={{
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '10px',
              background: '#F0FDF4',
              color: '#166534',
              fontWeight: 600,
              border: '1px solid #BBF7D0',
            }}>
              {k}
            </span>
          ))}
          {(!meta.kLayers || meta.kLayers.length === 0) && (
            <span style={{
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '10px',
              background: '#FEF3C7',
              color: '#92400E',
              fontWeight: 600,
              border: '1px solid #FDE68A',
            }}>
              No K-Layers — complete onboarding
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            minHeight: '300px',
            gap: '16px',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}>
              0n
            </div>
            <div style={{ textAlign: 'center', maxWidth: '400px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
                {businessName ? `Hey, ${businessName}` : 'Welcome to 0nCore AI'}
              </h2>
              <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.5 }}>
                I know your business from your K-Layers. Ask me anything — write emails, plan campaigns,
                draft content, analyze your pipeline, or brainstorm strategy.
              </p>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              maxWidth: '420px',
              width: '100%',
            }}>
              {[
                'Write a cold email for my ICP',
                'Draft a LinkedIn post about what we do',
                'What should I focus on this week?',
                'Help me write a follow-up sequence',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); setTimeout(() => inputRef.current?.focus(), 50) }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    background: '#FAFAFA',
                    color: '#374151',
                    fontSize: '12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    lineHeight: 1.4,
                    fontFamily: 'inherit',
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '12px',
              maxWidth: '720px',
              width: '100%',
              margin: msg.role === 'user' ? '0 0 0 auto' : '0',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: msg.role === 'user' ? '#111827' : '#6EE05A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700,
              color: msg.role === 'user' ? '#fff' : '#080B0F',
              flexShrink: 0,
            }}>
              {msg.role === 'user' ? 'U' : '0n'}
            </div>

            {/* Bubble */}
            <div style={{
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? '#111827' : '#F3F4F6',
              color: msg.role === 'user' ? '#FFFFFF' : '#111827',
              fontSize: '14px',
              lineHeight: 1.6,
              maxWidth: '85%',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
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
              fontSize: '11px', fontWeight: 700, color: '#080B0F',
            }}>
              0n
            </div>
            <div style={{
              padding: '12px 16px', borderRadius: '16px 16px 16px 4px',
              background: '#F3F4F6', display: 'flex', gap: '4px', alignItems: 'center',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#9CA3AF', animation: 'pulse 1.2s infinite' }} />
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#9CA3AF', animation: 'pulse 1.2s infinite 0.2s' }} />
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#9CA3AF', animation: 'pulse 1.2s infinite 0.4s' }} />
            </div>
            <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }`}</style>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid #E5E7EB',
        background: '#FFFFFF',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          maxWidth: '720px',
          margin: '0 auto',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask 0nCore AI anything..."
            rows={1}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid #D1D5DB',
              fontSize: '14px',
              color: '#111827',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              minHeight: '44px',
              maxHeight: '120px',
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{
              padding: '0 20px',
              borderRadius: '12px',
              background: loading || !input.trim() ? '#D1D5DB' : '#6EE05A',
              color: '#080B0F',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              flexShrink: 0,
            }}
          >
            Send
          </button>
        </div>
        <p style={{
          fontSize: '10px',
          color: '#D1D5DB',
          textAlign: 'center',
          marginTop: '8px',
        }}>
          0nCore AI reads your K-Layers for personalized responses · Powered by Claude
        </p>
      </div>
    </div>
  )
}
