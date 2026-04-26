'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  MessageSquare, Send, Loader2, ArrowLeft, User,
  Clock, RefreshCw, AlertTriangle, Inbox,
} from 'lucide-react'
import * as crm from '@/lib/crm/sdk'

interface Conversation {
  id: string
  contactId: string
  type: string
  lastMessageBody?: string
  lastMessageDate?: string
  unreadCount?: number
  contactName?: string
  fullName?: string
}

interface Message {
  id: string
  body: string
  direction: 'inbound' | 'outbound'
  dateAdded: string
}

function formatTime(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString()
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedConversation = conversations.find(c => c.id === selectedId)

  const loadConversations = useCallback(async () => {
    setLoadingList(true)
    setError('')
    try {
      const data = await crm.conversations.list({ limit: 50, skip: 0 })
      setConversations(data.conversations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    }
    setLoadingList(false)
  }, [])

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true)
    try {
      const data = await crm.conversations.getMessages(conversationId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msgs = (data.messages?.messages || []).map((m: any) => ({
        id: String(m.id || ''),
        body: String(m.body || ''),
        direction: String(m.direction || 'inbound') as 'inbound' | 'outbound',
        dateAdded: String(m.dateAdded || ''),
      }))
      setMessages(msgs)
    } catch (err) {
      toast.error('Failed to load messages')
    }
    setLoadingMessages(false)
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId)
    }
  }, [selectedId, loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedId || !selectedConversation) return
    setSending(true)
    try {
      await crm.conversations.send(selectedId, {
        type: 'SMS',
        message: messageInput.trim(),
        contactId: selectedConversation.contactId,
      })
      setMessageInput('')
      toast.success('Message sent')
      await loadMessages(selectedId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message')
    }
    setSending(false)
  }

  const contactDisplayName = (c: Conversation) =>
    c.contactName || c.fullName || 'Unknown Contact'

  return (
    <div className="flex h-[calc(100vh-64px)] max-w-[1400px] mx-auto">
      {/* Left Panel - Conversation List */}
      <div className={`w-[360px] shrink-0 border-r border-white/[0.06] flex flex-col bg-white/[0.02] ${selectedId ? 'hidden md:flex' : 'flex w-full md:w-[360px]'}`}>
        {/* List Header */}
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-lg font-extrabold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#7ed957]" />
              Conversations
            </h1>
            <button
              onClick={loadConversations}
              disabled={loadingList}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-transparent border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-white/30">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 mx-3 mt-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* List Loading */}
        {loadingList && (
          <div className="flex items-center justify-center py-20 flex-1">
            <Loader2 className="w-5 h-5 animate-spin text-[#7ed957]" />
          </div>
        )}

        {/* Conversation Items */}
        {!loadingList && (
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && !error ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <Inbox className="w-10 h-10 text-white/10 mb-3" />
                <p className="text-sm text-white/30">No conversations yet</p>
                <p className="text-xs text-white/20 mt-1">Messages will appear here when contacts reach out</p>
              </div>
            ) : (
              conversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer border-none transition-colors ${
                    selectedId === c.id
                      ? 'bg-[#7ed957]/10 border-l-2 border-l-[#7ed957]'
                      : 'bg-transparent hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-white/60 text-sm font-bold shrink-0">
                    {contactDisplayName(c)[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-semibold truncate ${(c.unreadCount || 0) > 0 ? 'text-white' : 'text-white/70'}`}>
                        {contactDisplayName(c)}
                      </span>
                      <span className="text-[10px] text-white/30 shrink-0">
                        {formatTime(c.lastMessageDate || '')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className={`text-xs truncate ${(c.unreadCount || 0) > 0 ? 'text-white/60' : 'text-white/30'}`}>
                        {c.lastMessageBody || 'No messages'}
                      </span>
                      {(c.unreadCount || 0) > 0 && (
                        <span className="w-5 h-5 rounded-full bg-[#7ed957] text-black text-[10px] font-bold flex items-center justify-center shrink-0">
                          {(c.unreadCount || 0) > 9 ? '9+' : c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right Panel - Message Thread */}
      <div className={`flex-1 flex flex-col bg-white/[0.01] ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <MessageSquare className="w-12 h-12 text-white/10 mb-4" />
            <p className="text-sm text-white/30 font-medium">Select a conversation</p>
            <p className="text-xs text-white/20 mt-1">Choose a conversation from the list to view messages</p>
          </div>
        ) : (
          <>
            {/* Thread Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
              <button
                onClick={() => setSelectedId(null)}
                className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center bg-transparent border border-white/[0.06] text-white/40 hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-white/60 text-sm font-bold shrink-0">
                {selectedConversation ? contactDisplayName(selectedConversation)[0]?.toUpperCase() : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {selectedConversation ? contactDisplayName(selectedConversation) : 'Unknown'}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-white/30 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {selectedConversation?.lastMessageDate
                    ? formatTime(selectedConversation.lastMessageDate)
                    : 'No recent activity'}
                </div>
              </div>
              <button
                onClick={() => selectedId && loadMessages(selectedId)}
                disabled={loadingMessages}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-transparent border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingMessages ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-5 h-5 animate-spin text-[#7ed957]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <MessageSquare className="w-8 h-8 text-white/10 mb-3" />
                  <p className="text-sm text-white/30">No messages yet</p>
                  <p className="text-xs text-white/20 mt-1">Send a message to start the conversation</p>
                </div>
              ) : (
                messages.map(m => (
                  <div
                    key={m.id}
                    className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        m.direction === 'outbound'
                          ? 'bg-[#7ed957]/20 text-[#7ed957] rounded-br-md'
                          : 'bg-white/[0.06] text-white/80 rounded-bl-md'
                      }`}
                    >
                      <p className="m-0 break-words whitespace-pre-wrap">{m.body}</p>
                      <div className={`text-[10px] mt-1.5 ${
                        m.direction === 'outbound' ? 'text-[#7ed957]/50 text-right' : 'text-white/20'
                      }`}>
                        {m.dateAdded ? new Date(m.dateAdded).toLocaleString() : ''}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="px-5 py-4 border-t border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-end gap-3">
                <textarea
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-white/20 outline-none focus:border-[#7ed957]/40 transition-colors resize-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!messageInput.trim() || sending}
                  className="w-11 h-11 rounded-xl bg-[#7ed957] text-black flex items-center justify-center cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-white/20 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
