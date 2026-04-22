'use client'

import { useState, useRef } from 'react'
import { Sparkles, X } from 'lucide-react'
import type { Capability } from './capabilities'
import { CAPABILITIES } from './capabilities'
import type { CapabilityNodeType, CapabilityNodeData } from './CapabilityNode'
import type { Edge } from '@xyflow/react'

interface GenerateBarProps {
  onGenerate: (nodes: CapabilityNodeType[], edges: Edge[]) => void;
}

// Map .0n tool IDs to capability IDs
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
  'no_response': 'trigger_no_response',
}

function dotOnToNodes(workflow: any): { nodes: CapabilityNodeType[], edges: Edge[] } {
  const nodes: CapabilityNodeType[] = []
  const edges: Edge[] = []

  // Create trigger node
  const triggerCapId = TRIGGER_TO_CAPABILITY[workflow.trigger?.event] || 'trigger_new_lead'
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
        config: workflow.trigger?.config || {},
      },
    })
  }

  // Create step nodes
  for (let i = 0; i < (workflow.steps || []).length; i++) {
    const step = workflow.steps[i]
    const capId = TOOL_TO_CAPABILITY[step.tool] || 'ai_generate_content'
    const cap = CAPABILITIES.find(c => c.id === capId)
    if (!cap) continue

    const nodeId = `cap_${nodes.length + 1}`
    nodes.push({
      id: nodeId,
      type: 'capability',
      position: { x: 400, y: 60 + nodes.length * 160 },
      data: {
        capabilityId: cap.id,
        name: step.name || cap.name,
        description: cap.description,
        icon: cap.icon,
        color: cap.color,
        category: cap.category,
        configured: Object.keys(step.inputs || {}).length > 0,
        steps: cap.steps,
        config: step.inputs || {},
      },
    })

    // Connect to previous node
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

export default function GenerateBar({ onGenerate }: GenerateBarProps) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  async function handleGenerate() {
    if (!prompt.trim()) return
    setLoading(true)

    try {
      const res = await fetch('/api/automations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })
      const data = await res.json()

      if (data.workflow) {
        const { nodes, edges } = dotOnToNodes(data.workflow)
        onGenerate(nodes, edges)
        setPrompt('')
        setExpanded(false)
      }
    } catch {}

    setLoading(false)
  }

  if (!expanded) {
    return (
      <button
        onClick={() => { setExpanded(true); setTimeout(() => inputRef.current?.focus(), 100) }}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 px-6 py-3 bg-[rgba(14,24,37,0.95)] backdrop-blur-md border border-[#1c2b42] rounded-xl text-core-text-dim text-sm cursor-pointer z-10 flex items-center gap-2 transition-all duration-200 hover:border-core-cyan hover:text-core-cyan"
      >
        <Sparkles className="w-4 h-4" />
        Describe what you want to automate...
      </button>
    )
  }

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[90%] max-w-[600px] bg-[rgba(14,24,37,0.97)] backdrop-blur-xl border border-[#1c2b42] rounded-2xl p-4 z-10 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-[13px] font-bold text-core-cyan flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Describe your automation
        </span>
        <button
          onClick={() => setExpanded(false)}
          className="text-core-text-muted hover:text-core-text transition-colors cursor-pointer bg-transparent border-none p-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <textarea
        ref={inputRef}
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="When a new lead comes in from my website form, score them as a lead. If they're hot, call them with AI. If they answer, book an appointment. If they don't, send a text with my booking link. Start a 7-day nurture sequence either way."
        rows={3}
        className="w-full px-3.5 py-3 bg-core-surface border rounded-[10px] text-core-text text-sm leading-relaxed resize-none outline-none transition-colors duration-150"
        style={{ borderColor: inputFocused ? '#14b8a6' : '#1c2b42' }}
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
        onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleGenerate() }}
      />
      <div className="flex justify-between items-center mt-2.5">
        <span className="text-[11px] text-core-text-muted">Cmd+Enter to generate</span>
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className={`px-5 py-[9px] font-bold text-[13px] rounded-lg border-none transition-all duration-150 ${
            loading || !prompt.trim()
              ? 'bg-core-border text-core-text-muted cursor-not-allowed'
              : 'bg-gradient-to-br from-[#2dd4bf] to-core-cyan text-[#0c1220] cursor-pointer hover:opacity-90'
          }`}
        >
          {loading ? 'Generating...' : 'Generate Automation'}
        </button>
      </div>
    </div>
  )
}
