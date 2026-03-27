'use client'

import { useState, useRef, useEffect } from 'react'

interface ChatMessage {
  id: string
  text: string
  direction: 'incoming' | 'outgoing'
  time: string
  source?: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: "Welcome to 0nCore. I'm your AI assistant powered by 0nAI + 0nMCP. I have access to 1,171 tools across 54 services.\n\nI can help you manage contacts, run workflows, check billing, generate content, and more. What would you like to do?",
      direction: 'incoming',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: '0nai',
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const text = inputValue.trim()
    if (!text || sending) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      text,
      direction: 'outgoing',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setSending(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      const data = await res.json()

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        text: data.response || data.error || 'No response received.',
        direction: 'incoming',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: data.source || '0nai',
      }

      setMessages(prev => [...prev, aiMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        text: 'Connection error. Make sure 0nMCP is running: 0nmcp serve',
        direction: 'incoming',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'error',
      }])
    }

    setSending(false)
  }

  return (
    <div>
      <div className="jp-page-header">
        <h1 className="jp-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'var(--jp-green)' }}>0n</span>AI Chat
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 8px',
            background: 'rgba(126,217,87,0.15)', color: 'var(--jp-green)',
            borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>Live</span>
        </h1>
        <p className="jp-page-subtitle">Talk to your AI — powered by 0nMCP with 1,171 tools</p>
      </div>

      <div style={{
        background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)',
        borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        height: 'calc(100vh - 200px)', minHeight: 500,
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--jp-border)',
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--jp-bg-card)',
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #7ed957, #5cb83a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 14, color: '#0A0E17',
          }}>0n</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--jp-text)' }}>0nAI</div>
            <div style={{ fontSize: 11, color: 'var(--jp-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--jp-green)', display: 'inline-block',
              }} />
              {sending ? 'Thinking...' : 'Online — 1,171 tools ready'}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--jp-text-muted)' }}>
            0nMCP v2.5.0
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: 20,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {messages.map(msg => (
            <div key={msg.id}>
              <div style={{
                maxWidth: '80%',
                padding: '12px 16px',
                borderRadius: 14,
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                ...(msg.direction === 'outgoing' ? {
                  alignSelf: 'flex-end',
                  marginLeft: 'auto',
                  background: 'var(--jp-green)',
                  color: '#0A0E17',
                  borderBottomRightRadius: 4,
                } : {
                  alignSelf: 'flex-start',
                  background: 'var(--jp-bg)',
                  color: 'var(--jp-text)',
                  border: '1px solid var(--jp-border)',
                  borderBottomLeftRadius: 4,
                }),
              }}>
                {msg.text}
              </div>
              <div style={{
                fontSize: 10, color: 'var(--jp-text-muted)', marginTop: 4,
                textAlign: msg.direction === 'outgoing' ? 'right' : 'left',
                display: 'flex', gap: 6,
                justifyContent: msg.direction === 'outgoing' ? 'flex-end' : 'flex-start',
              }}>
                <span>{msg.time}</span>
                {msg.source && msg.direction === 'incoming' && (
                  <span style={{
                    background: msg.source === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(126,217,87,0.1)',
                    color: msg.source === 'error' ? '#ef4444' : 'var(--jp-green)',
                    padding: '1px 5px', borderRadius: 3, fontSize: 9,
                  }}>{msg.source}</span>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div style={{
              alignSelf: 'flex-start', padding: '12px 16px',
              background: 'var(--jp-bg)', border: '1px solid var(--jp-border)',
              borderRadius: 14, borderBottomLeftRadius: 4,
              display: 'flex', gap: 4,
            }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--jp-text-muted)',
                  animation: `bounce 1.4s infinite ${i * 0.2}s`,
                }} />
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--jp-border)',
          display: 'flex', gap: 10, alignItems: 'center',
          background: 'var(--jp-bg-card)',
        }}>
          <input
            type="text"
            placeholder="Ask 0nAI anything..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            disabled={sending}
            style={{
              flex: 1, padding: '12px 16px',
              background: 'var(--jp-bg)', border: '1px solid var(--jp-border)',
              borderRadius: 12, color: 'var(--jp-text)',
              fontSize: 13, fontFamily: 'inherit', outline: 'none',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !inputValue.trim()}
            style={{
              padding: '12px 24px',
              background: sending ? 'var(--jp-border)' : 'var(--jp-green)',
              color: '#0A0E17', border: 'none', borderRadius: 12,
              fontWeight: 700, fontSize: 13, cursor: sending ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.2s',
              opacity: sending || !inputValue.trim() ? 0.5 : 1,
            }}
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
