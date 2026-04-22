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

  const canSend = input.trim() && !isThinking

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-core-green/15 flex items-center justify-center">
              <Bot size={24} className="text-core-green" />
            </div>
            <p className="text-[14px] text-core-text-muted text-center max-w-[280px] leading-relaxed">
              I am your personal AI assistant. Ask me to help plan your day, prioritize tasks, or create new ones.
            </p>
          </div>
        )}

        {messages.map(msg => {
          const isBot = msg.sender === 'bot'
          return (
            <div key={msg.id} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
              <div className={`flex gap-2 max-w-[85%] ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className={`w-7 h-7 rounded-full shrink-0 mt-0.5 flex items-center justify-center ${isBot ? 'bg-core-green/20' : 'bg-core-cyan/15'}`}>
                  {isBot
                    ? <Bot size={14} className="text-core-green" />
                    : <User size={14} className="text-core-cyan" />
                  }
                </div>
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed text-core-text whitespace-pre-wrap ${
                    isBot
                      ? 'bg-white/[0.04] border border-core-border rounded-tl-sm'
                      : 'bg-core-green/15 border border-core-green/25 rounded-tr-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          )
        })}

        {isThinking && (
          <div className="flex justify-start">
            <div className="flex gap-2 items-center">
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-core-green/20">
                <Sparkles size={14} className="text-core-green" />
              </div>
              <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-white/[0.04] border border-core-border flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-core-green opacity-60 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-core-green opacity-60 animate-pulse [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-core-green opacity-60 animate-pulse [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested Replies */}
      {!isThinking && suggestedReplies.length > 0 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
          {suggestedReplies.map((reply, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(reply)}
              className="whitespace-nowrap px-3 py-1.5 rounded-full text-[12px] font-semibold bg-white/[0.04] border border-core-border text-core-text-muted cursor-pointer transition-all hover:border-core-green/40 hover:text-core-green"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-core-border">
        <div className="flex items-center gap-2 bg-white/[0.03] border border-core-border rounded-xl px-2 py-1">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your AI assistant..."
            disabled={isThinking}
            rows={1}
            className="flex-1 bg-transparent border-none outline-none resize-none max-h-20 px-1 py-2 text-core-text text-[13px] placeholder:text-core-text-muted disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!canSend}
            className={`w-8 h-8 rounded-lg flex items-center justify-center border-none transition-all ${
              canSend
                ? 'bg-core-green text-core-bg cursor-pointer hover:opacity-90'
                : 'bg-white/[0.05] text-core-text-muted cursor-not-allowed'
            }`}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
