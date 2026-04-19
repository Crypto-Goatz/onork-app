'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles } from 'lucide-react'

interface Message {
  id: string
  sender: 'user' | 'bot'
  text: string
  timestamp: Date
}

interface ChatWindowProps {
  messages: Message[]
  onSendMessage: (text: string) => void
  isThinking: boolean
  suggestedReplies: string[]
}

export default function ChatWindow({ messages, onSendMessage, isThinking, suggestedReplies }: ChatWindowProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  const handleSend = (text: string = input) => {
    if (!text.trim() || isThinking) return
    onSendMessage(text)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'rgba(126,217,87,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={24} style={{ color: '#7ed957' }} />
            </div>
            <p style={{ fontSize: 14, color: '#8b95a5', textAlign: 'center', maxWidth: 280, lineHeight: 1.5 }}>
              I am your personal AI assistant. Ask me to help plan your day, prioritize tasks, or create new ones.
            </p>
          </div>
        )}

        {messages.map(msg => {
          const isBot = msg.sender === 'bot'
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isBot ? 'flex-start' : 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: isBot ? 'row' : 'row-reverse', gap: 8, maxWidth: '85%' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isBot ? 'rgba(126,217,87,0.2)' : 'rgba(0,212,255,0.15)',
                }}>
                  {isBot ? <Bot size={14} style={{ color: '#7ed957' }} /> : <User size={14} style={{ color: '#00d4ff' }} />}
                </div>
                <div style={{
                  padding: '10px 14px', borderRadius: 14, fontSize: 13, lineHeight: 1.5,
                  ...(isBot ? {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid #1e293b',
                    color: '#f0f4f8',
                    borderTopLeftRadius: 4,
                  } : {
                    background: 'rgba(126,217,87,0.15)',
                    border: '1px solid rgba(126,217,87,0.25)',
                    color: '#f0f4f8',
                    borderTopRightRadius: 4,
                  }),
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.text}
                </div>
              </div>
            </div>
          )
        })}

        {isThinking && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(126,217,87,0.2)',
              }}>
                <Sparkles size={14} style={{ color: '#7ed957' }} />
              </div>
              <div style={{
                padding: '10px 14px', borderRadius: 14, borderTopLeftRadius: 4,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid #1e293b',
                display: 'flex', gap: 6, alignItems: 'center',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7ed957', opacity: 0.6, animation: 'pulse 1.4s ease-in-out infinite' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7ed957', opacity: 0.6, animation: 'pulse 1.4s ease-in-out 0.2s infinite' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7ed957', opacity: 0.6, animation: 'pulse 1.4s ease-in-out 0.4s infinite' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested Replies */}
      {!isThinking && suggestedReplies.length > 0 && (
        <div style={{
          padding: '0 16px 8px', display: 'flex', gap: 8, overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {suggestedReplies.map((reply, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(reply)}
              style={{
                whiteSpace: 'nowrap',
                padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid #1e293b',
                color: '#8b95a5',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(126,217,87,0.4)'
                e.currentTarget.style.color = '#7ed957'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#1e293b'
                e.currentTarget.style.color = '#8b95a5'
              }}
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: 12, borderTop: '1px solid #1e293b',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid #1e293b',
          borderRadius: 12, padding: '4px 8px',
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your AI assistant..."
            disabled={isThinking}
            rows={1}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              resize: 'none', maxHeight: 80, padding: '8px 4px',
              color: '#f0f4f8', fontSize: 13,
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isThinking}
            style={{
              width: 32, height: 32, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: input.trim() && !isThinking ? '#7ed957' : 'rgba(255,255,255,0.05)',
              color: input.trim() && !isThinking ? '#0d1117' : '#3d4654',
              border: 'none', cursor: input.trim() && !isThinking ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
