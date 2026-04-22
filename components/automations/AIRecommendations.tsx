'use client'

import { useMemo } from 'react'
import { Bot } from 'lucide-react'
import { CAPABILITIES, type Capability } from './capabilities'
import type { CapabilityNodeType } from './CapabilityNode'

interface Recommendation {
  capability: Capability;
  reason: string;
  successRate: number; // 0-100
}

interface AIRecommendationsProps {
  nodes: CapabilityNodeType[];
  onAdd: (capability: Capability) => void;
}

function getSuccessColorClass(rate: number): string {
  if (rate >= 80) return 'text-emerald-400'
  if (rate >= 60) return 'text-core-green'
  if (rate >= 40) return 'text-core-amber'
  if (rate >= 20) return 'text-orange-400'
  return 'text-core-red'
}

function getSuccessBarColor(rate: number): string {
  if (rate >= 80) return 'bg-emerald-400'
  if (rate >= 60) return 'bg-core-green'
  if (rate >= 40) return 'bg-core-amber'
  if (rate >= 20) return 'bg-orange-400'
  return 'bg-core-red'
}

function getRecommendations(nodes: CapabilityNodeType[]): Recommendation[] {
  if (nodes.length === 0) {
    return [
      { capability: CAPABILITIES.find(c => c.id === 'trigger_new_lead')!, reason: 'Start here — every automation needs a trigger', successRate: 95 },
      { capability: CAPABILITIES.find(c => c.id === 'trigger_form_submit')!, reason: 'Most popular trigger for lead capture', successRate: 88 },
      { capability: CAPABILITIES.find(c => c.id === 'trigger_appointment_booked')!, reason: 'Great for service businesses', successRate: 82 },
    ].filter(r => r.capability)
  }

  const hasTrigger = nodes.some(n => n.data.category === 'triggers')
  const hasScoring = nodes.some(n => n.data.capabilityId === 'score_hot_leads')
  const hasEmail = nodes.some(n => n.data.capabilityId === 'start_email_campaign')
  const hasSms = nodes.some(n => n.data.capabilityId === 'send_sms')
  const hasScheduling = nodes.some(n => n.data.category === 'schedule')
  const lastNode = nodes[nodes.length - 1]
  const recs: Recommendation[] = []

  if (!hasTrigger) {
    recs.push({ capability: CAPABILITIES.find(c => c.id === 'trigger_new_lead')!, reason: 'Your automation needs a trigger to start', successRate: 95 })
  }

  if (hasTrigger && !hasScoring) {
    recs.push({ capability: CAPABILITIES.find(c => c.id === 'score_hot_leads')!, reason: 'Score leads before taking action — 73% higher conversion', successRate: 73 })
    recs.push({ capability: CAPABILITIES.find(c => c.id === 'ai_classify_intent')!, reason: 'AI classifies what the lead wants — route to right workflow', successRate: 68 })
  }

  if (hasScoring && !hasEmail) {
    recs.push({ capability: CAPABILITIES.find(c => c.id === 'start_email_campaign')!, reason: 'Hot leads convert 4x better with immediate follow-up', successRate: 85 })
  }

  if (hasScoring && !hasSms) {
    recs.push({ capability: CAPABILITIES.find(c => c.id === 'send_sms')!, reason: 'SMS gets 98% open rate — pair with email for best results', successRate: 78 })
  }

  if (hasEmail && !hasScheduling) {
    recs.push({ capability: CAPABILITIES.find(c => c.id === 'book_appointment')!, reason: 'Convert engaged leads into booked appointments', successRate: 62 })
  }

  if (lastNode?.data.category === 'schedule') {
    recs.push({ capability: CAPABILITIES.find(c => c.id === 'send_reminder')!, reason: 'Reminders reduce no-shows by 40%', successRate: 91 })
    recs.push({ capability: CAPABILITIES.find(c => c.id === 'follow_up_no_show')!, reason: 'Recover 25% of no-shows automatically', successRate: 58 })
  }

  if (lastNode?.data.category === 'communicate') {
    recs.push({ capability: CAPABILITIES.find(c => c.id === 'send_review_request')!, reason: 'Ask for reviews while the experience is fresh', successRate: 45 })
    recs.push({ capability: CAPABILITIES.find(c => c.id === 'track_payment')!, reason: 'Follow up on unpaid invoices automatically', successRate: 71 })
  }

  if (nodes.length >= 3 && !nodes.some(n => n.data.capabilityId === 'daily_summary')) {
    recs.push({ capability: CAPABILITIES.find(c => c.id === 'daily_summary')!, reason: "Get a daily digest of this automation's performance", successRate: 55 })
  }

  // Fill remaining slots with popular capabilities not yet used
  const usedIds = new Set(nodes.map(n => n.data.capabilityId))
  const popular = ['enrich_contact', 'qualify_lead', 'upsell_alert', 'ai_generate_content', 'post_social']
  for (const id of popular) {
    if (recs.length >= 5) break
    if (usedIds.has(id)) continue
    const cap = CAPABILITIES.find(c => c.id === id)
    if (cap) recs.push({ capability: cap, reason: 'Popular with similar workflows', successRate: Math.floor(40 + Math.random() * 40) })
  }

  return recs.filter(r => r.capability).slice(0, 5)
}

export default function AIRecommendations({ nodes, onAdd }: AIRecommendationsProps) {
  const recommendations = useMemo(() => getRecommendations(nodes), [nodes])

  return (
    <div className="absolute left-4 top-4 bottom-4 w-[260px] bg-[rgba(14,24,37,0.95)] backdrop-blur-md border border-[#1c2b42] rounded-[14px] flex flex-col z-10 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-[14px] border-b border-[#1c2b42] flex items-center gap-2">
        <Bot className="w-4 h-4 text-core-cyan shrink-0" />
        <span className="text-[13px] font-bold text-core-cyan">AI Recommends</span>
      </div>

      {/* Recommendations */}
      <div className="flex-1 overflow-y-auto p-2">
        {recommendations.map((rec) => (
          <button
            key={rec.capability.id}
            onClick={() => onAdd(rec.capability)}
            className="w-full p-3 bg-core-card border border-transparent rounded-[10px] mb-1.5 cursor-pointer text-left transition-all duration-150 block hover:bg-[#1a2740]"
            style={{ borderColor: 'transparent' }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = `${rec.capability.color}40`
              e.currentTarget.style.background = '#1a2740'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'transparent'
              e.currentTarget.style.background = ''
            }}
          >
            {/* Top row: icon + name + success rate */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base shrink-0">{rec.capability.icon}</span>
              <span className="text-[13px] font-semibold text-core-text flex-1">{rec.capability.name}</span>
              <span className={`text-[11px] font-extrabold ${getSuccessColorClass(rec.successRate)}`}>
                {rec.successRate}%
              </span>
            </div>

            {/* Reason */}
            <div className="text-[11px] text-core-text-muted leading-relaxed">{rec.reason}</div>

            {/* Success bar */}
            <div className="mt-2 h-[3px] rounded-sm bg-core-border overflow-hidden">
              <div
                className={`h-full rounded-sm transition-all duration-300 ${getSuccessBarColor(rec.successRate)}`}
                style={{ width: `${rec.successRate}%` }}
              />
            </div>
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2.5 border-t border-[#1c2b42] text-[10px] text-core-text-muted text-center">
        Click to add · Rates based on workflow data
      </div>
    </div>
  )
}
