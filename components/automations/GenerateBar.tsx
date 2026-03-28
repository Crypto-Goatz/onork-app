'use client'

import { useState, useRef } from 'react'
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
        style: { stroke: '#2dd4bf', strokeWidth: 2 },
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
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          background: 'rgba(14, 24, 37, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #1c2b42',
          borderRadius: 12,
          color: '#8b9ab5',
          fontSize: 14,
          cursor: 'pointer',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#2dd4bf'; e.currentTarget.style.color = '#2dd4bf' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#1c2b42'; e.currentTarget.style.color = '#8b9ab5' }}
      >
        <span style={{ fontSize: 16 }}>✨</span>
        Describe what you want to automate...
      </button>
    )
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: 600,
      background: 'rgba(14, 24, 37, 0.97)',
      backdropFilter: 'blur(16px)',
      border: '1px solid #1c2b42',
      borderRadius: 16,
      padding: 16,
      zIndex: 10,
      boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#2dd4bf' }}>
          ✨ Describe your automation
        </span>
        <button onClick={() => setExpanded(false)} style={{
          background: 'none', border: 'none', color: '#556880', cursor: 'pointer', fontSize: 16,
        }}>×</button>
      </div>
      <textarea
        ref={inputRef}
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="When a new lead comes in from my website form, score them as a lead. If they're hot, call them with AI. If they answer, book an appointment. If they don't, send a text with my booking link. Start a 7-day nurture sequence either way."
        rows={3}
        style={{
          width: '100%',
          padding: '12px 14px',
          background: '#0e1825',
          border: '1px solid #1c2b42',
          borderRadius: 10,
          color: '#e8ecf2',
          fontSize: 14,
          lineHeight: 1.6,
          resize: 'none',
          outline: 'none',
          fontFamily: '-apple-system, sans-serif',
        }}
        onFocus={e => e.target.style.borderColor = '#2dd4bf'}
        onBlur={e => e.target.style.borderColor = '#1c2b42'}
        onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleGenerate() }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <span style={{ fontSize: 11, color: '#556880' }}>⌘+Enter to generate</span>
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          style={{
            padding: '9px 20px',
            background: loading ? '#1c2b42' : 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
            color: loading ? '#556880' : '#0c1220',
            fontWeight: 700, fontSize: 13, borderRadius: 8,
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Generating...' : 'Generate Automation'}
        </button>
      </div>
    </div>
  )
}
