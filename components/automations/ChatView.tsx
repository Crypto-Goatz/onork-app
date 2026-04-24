'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, Zap } from 'lucide-react'
import type { Edge } from '@xyflow/react'
import type { CapabilityNodeType, CapabilityNodeData } from './CapabilityNode'
import { CAPABILITIES } from './capabilities'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  workflowUpdate?: {
    nodes: CapabilityNodeType[]
    edges: Edge[]
    name?: string
    addedCount: number
    addedNames: string[]
  }
  timestamp: Date
}

interface ChatViewProps {
  nodes: CapabilityNodeType[]
  edges: Edge[]
  onUpdateWorkflow: (nodes: CapabilityNodeType[], edges: Edge[], name?: string) => void
  automationName: string
  messages: ChatMessage[]
  onMessagesChange: (messages: ChatMessage[]) => void
}

// Tool ID → capability ID mapping (shared with GenerateBar)
const TOOL_TO_CAPABILITY: Record<string, string> = {
  ai_score_lead: 'score_hot_leads',
  ai_classify_intent: 'ai_classify_intent',
  ai_generate_content: 'ai_generate_content',
  ai_ask_council: 'ai_ask_council',
  crm_send_email: 'start_email_campaign',
  crm_send_sms: 'send_sms',
  crm_voice_ai_call: 'trigger_new_lead',
  crm_create_appointment: 'book_appointment',
  crm_create_opportunity: 'qualify_lead',
  crm_move_opportunity: 'qualify_lead',
  crm_add_tag: 'trigger_tag_added',
  send_reminder_sequence: 'send_reminder',
  send_review_request: 'send_review_request',
  stripe_create_invoice: 'create_invoice',
  stripe_check_payment: 'track_payment',
}

const TRIGGER_TO_CAPABILITY: Record<string, string> = {
  'contact.created': 'trigger_new_lead',
  'form.submitted': 'trigger_form_submit',
  'appointment.booked': 'trigger_appointment_booked',
  'payment.received': 'trigger_payment_received',
  'tag.added': 'trigger_tag_added',
  no_response: 'trigger_no_response',
}

function dotOnToNodes(workflow: Record<string, unknown>): { nodes: CapabilityNodeType[]; edges: Edge[] } {
  const nodes: CapabilityNodeType[] = []
  const edges: Edge[] = []

  const trigger = workflow.trigger as Record<string, unknown> | undefined
  const triggerCapId = TRIGGER_TO_CAPABILITY[(trigger?.event as string) ?? ''] || 'trigger_new_lead'
  const triggerCap = CAPABILITIES.find(c => c.id === triggerCapId)
  if (triggerCap) {
    nodes.push({
      id: 'cap_1',
      type: 'capability',
      position: { x: 400, y: 60 },
      data: {
        capabilityId: triggerCap.id,
        name: triggerCap.name,
        description: triggerCap.description,
        icon: triggerCap.icon,
        color: triggerCap.color,
        category: triggerCap.category,
        configured: true,
        steps: triggerCap.steps,
        config: (trigger?.config as Record<string, string>) || {},
      } as CapabilityNodeData,
    })
  }

  const steps = (workflow.steps as Array<Record<string, unknown>>) || []
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const capId = TOOL_TO_CAPABILITY[step.tool as string] || 'ai_generate_content'
    const cap = CAPABILITIES.find(c => c.id === capId)
    if (!cap) continue

    const nodeId = `cap_${nodes.length + 1}`
    nodes.push({
      id: nodeId,
      type: 'capability',
      position: { x: 400, y: 60 + nodes.length * 160 },
      data: {
        capabilityId: cap.id,
        name: (step.name as string) || cap.name,
        description: cap.description,
        icon: cap.icon,
        color: cap.color,
        category: cap.category,
        configured: Object.keys((step.inputs as Record<string, string>) || {}).length > 0,
        steps: cap.steps,
        config: (step.inputs as Record<string, string>) || {},
      } as CapabilityNodeData,
    })

    const prevId = nodes[nodes.length - 2]?.id
    if (prevId) {
      edges.push({
        id: `e_${prevId}_${nodeId}`,
        source: prevId,
        target: nodeId,
        animated: true,
        style: { stroke: '#14b8a6', strokeWidth: 2 },
        type: 'smoothstep',
      })
    }
  }

  return { nodes, edges }
}

export default function ChatView({ nodes, edges, onUpdateWorkflow, automationName, messages, onMessagesChange }: ChatViewProps) {
  const setMessages = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    if (typeof updater === 'function') {
      onMessagesChange(updater(messages))
    } else {
      onMessagesChange(updater)
    }
  }, [messages, onMessagesChange])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [workflowUpdated, setWorkflowUpdated] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-resize textarea
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 96)}px` // max ~4 rows
  }, [])

  const flashUpdated = useCallback(() => {
    setWorkflowUpdated(true)
    setTimeout(() => setWorkflowUpdated(false), 3000)
  }, [])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setLoading(true)

    try {
      const res = await fetch('/api/automations/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          currentNodes: nodes,
          currentEdges: edges,
          capabilities: CAPABILITIES,
        }),
      })

      const data = await res.json()
      const replyText: string = data.reply || data.message || 'Got it. Let me update your automation.'

      let workflowUpdate: ChatMessage['workflowUpdate'] | undefined

      if (data.workflow) {
        const { nodes: newNodes, edges: newEdges } = dotOnToNodes(data.workflow)
        const newName: string | undefined = data.workflow.name || automationName

        const addedNames = newNodes.map((n) => n.data.name as string)
        workflowUpdate = {
          nodes: newNodes,
          edges: newEdges,
          name: newName,
          addedCount: newNodes.length,
          addedNames,
        }

        onUpdateWorkflow(newNodes, newEdges, newName)
        flashUpdated()
      }

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: replyText,
        workflowUpdate,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch {
      const errMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }, [input, loading, nodes, edges, automationName, onUpdateWorkflow, flashUpdated])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    },
    [sendMessage],
  )

  const hasMessages = messages.length > 1 // more than just the welcome

  return (
    <div className="flex flex-col h-full bg-core-bg">
      {/* Workflow updated banner */}
      <div
        className={`flex items-center gap-2 px-4 py-2 bg-core-cyan/10 border-b border-core-cyan/20 text-core-cyan text-xs font-semibold transition-all duration-300 overflow-hidden ${
          workflowUpdated ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <Zap className="w-3.5 h-3.5 shrink-0" />
        Workflow updated on canvas
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-core-text-muted py-16">
            <Bot className="w-10 h-10 text-core-border" />
            <p className="text-sm text-center max-w-[220px]">
              Describe what you want to automate
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Bubble */}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-core-cyan/20 border border-core-cyan/30 text-core-text rounded-br-sm'
                  : 'bg-core-card border border-core-border text-core-text rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>

            {/* Workflow summary card */}
            {msg.workflowUpdate && (
              <div className="max-w-[85%] bg-core-surface border border-core-border rounded-xl px-3.5 py-2.5 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-core-cyan text-xs font-bold">
                  <Zap className="w-3.5 h-3.5" />
                  Added {msg.workflowUpdate.addedCount} node{msg.workflowUpdate.addedCount !== 1 ? 's' : ''}
                </div>
                <div className="flex flex-wrap gap-1">
                  {msg.workflowUpdate.addedNames.map((name, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-core-card border border-core-border rounded-md text-[11px] text-core-text-dim"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-start">
            <div className="bg-core-card border border-core-border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-core-text-muted animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-core-text-muted animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-core-text-muted animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-core-border bg-core-surface px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Describe a change or add a step..."
            rows={1}
            className="flex-1 resize-none bg-core-card border border-core-border rounded-xl px-3.5 py-2.5 text-sm text-core-text placeholder:text-core-text-muted outline-none focus:border-core-cyan transition-colors duration-150 leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-core-cyan text-core-bg transition-all duration-150 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-core-text-muted">
          Enter to send &middot; Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
