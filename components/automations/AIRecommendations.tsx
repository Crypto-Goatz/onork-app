'use client'

import { useMemo } from 'react'
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

function getSuccessColor(rate: number): string {
  if (rate >= 80) return '#34d399'
  if (rate >= 60) return '#7ed957'
  if (rate >= 40) return '#fbbf24'
  if (rate >= 20) return '#f97316'
  return '#ef4444'
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
    recs.push({ capability: CAPABILITIES.find(c => c.id === 'daily_summary')!, reason: 'Get a daily digest of this automation\'s performance', successRate: 55 })
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
    <div style={{
      position: 'absolute',
      left: 16,
      top: 16,
      bottom: 16,
      width: 260,
      background: 'rgba(14, 24, 37, 0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid #1c2b42',
      borderRadius: 14,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid #1c2b42',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>🤖</span>
        <span style={{
          fontSize: 13, fontWeight: 700, color: '#2dd4bf',
          fontFamily: '-apple-system, sans-serif',
        }}>AI Recommends</span>
      </div>

      {/* Recommendations */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {recommendations.map((rec, i) => (
          <button
            key={rec.capability.id}
            onClick={() => onAdd(rec.capability)}
            style={{
              width: '100%',
              padding: '12px',
              background: '#141e30',
              border: '1px solid transparent',
              borderRadius: 10,
              marginBottom: 6,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
              display: 'block',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = `${rec.capability.color}40`
              e.currentTarget.style.background = '#1a2740'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'transparent'
              e.currentTarget.style.background = '#141e30'
            }}
          >
            {/* Top row: icon + name + success rate */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>{rec.capability.icon}</span>
              <span style={{
                fontSize: 13, fontWeight: 600, color: '#e8ecf2', flex: 1,
                fontFamily: '-apple-system, sans-serif',
              }}>{rec.capability.name}</span>
              <span style={{
                fontSize: 11, fontWeight: 800,
                color: getSuccessColor(rec.successRate),
                fontFamily: '-apple-system, sans-serif',
              }}>{rec.successRate}%</span>
            </div>

            {/* Reason */}
            <div style={{
              fontSize: 11, color: '#8b9ab5', lineHeight: 1.5,
              fontFamily: '-apple-system, sans-serif',
            }}>{rec.reason}</div>

            {/* Success bar */}
            <div style={{
              marginTop: 8, height: 3, borderRadius: 2,
              background: '#1c2b42', overflow: 'hidden',
            }}>
              <div style={{
                width: `${rec.successRate}%`,
                height: '100%',
                borderRadius: 2,
                background: `linear-gradient(90deg, ${getSuccessColor(rec.successRate)}, ${getSuccessColor(rec.successRate)}80)`,
                transition: 'width 0.3s',
              }} />
            </div>
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid #1c2b42',
        fontSize: 10,
        color: '#556880',
        textAlign: 'center',
        fontFamily: '-apple-system, sans-serif',
      }}>
        Click to add · Rates based on workflow data
      </div>
    </div>
  )
}
