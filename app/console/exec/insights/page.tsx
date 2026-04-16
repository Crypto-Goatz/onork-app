'use client'

import { useState, useEffect } from 'react'

interface Pattern {
  id?: string
  pattern_type: string
  title: string
  description: string
  recommendation: string
  confidence: number
  sample_size: number
}

const DEMO_PATTERNS: Pattern[] = [
  {
    pattern_type: 'stall_predictor',
    title: 'Contacts below 40 rarely close',
    description: '15% win rate below score 40',
    recommendation: 'Set intervention at 40',
    confidence: 82,
    sample_size: 23,
  },
  {
    pattern_type: 'success_signal',
    title: 'High engagement + DM access predicts win',
    description: '90% of won deals had engagement>75 and DM access>80',
    recommendation: 'Prioritize DM access in early stages',
    confidence: 88,
    sample_size: 31,
  },
  {
    pattern_type: 'churn_signal',
    title: 'Score decline >10pts in 2 weeks = churn',
    description: '78% of churned contacts showed this pattern',
    recommendation: 'Auto-flag on 10pt decline',
    confidence: 75,
    sample_size: 18,
  },
]

const PATTERN_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  stall_predictor: { icon: '\uD83D\uDD34', color: '#ef4444', label: 'Stall Predictor' },
  success_signal: { icon: '\uD83D\uDFE2', color: '#6EE05A', label: 'Success Signal' },
  churn_signal: { icon: '\uD83D\uDFE1', color: '#f5c518', label: 'Churn Signal' },
  weight_suggestion: { icon: '\uD83D\uDCA1', color: '#00d4ff', label: 'Weight Suggestion' },
}

function getPatternConfig(type: string) {
  return PATTERN_CONFIG[type] || { icon: '\uD83D\uDCA1', color: '#a78bfa', label: type }
}

export default function InsightsPage() {
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetch('/api/exec/patterns')
      .then(r => {
        if (!r.ok) throw new Error('Failed')
        return r.json()
      })
      .then(d => {
        const fetched = d.patterns || []
        setPatterns(fetched.length > 0 ? fetched : DEMO_PATTERNS)
        setLoading(false)
      })
      .catch(() => {
        setPatterns(DEMO_PATTERNS)
        setLoading(false)
      })
  }, [])

  function handleDismiss(index: number) {
    setDismissed(prev => new Set(prev).add(index))
  }

  const mono: React.CSSProperties = { fontFamily: '"JetBrains Mono", monospace' }
  const visiblePatterns = patterns.filter((_, i) => !dismissed.has(i))

  return (
    <div style={{
      minHeight: '100vh',
      background: '#04060d',
      fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
      padding: '32px',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#e4efff', margin: 0, letterSpacing: '-0.5px' }}>
            AI Insights
          </h1>
          <p style={{ fontSize: '14px', color: '#3a4f6a', marginTop: '4px', ...mono }}>
            {visiblePatterns.length} pattern{visiblePatterns.length !== 1 ? 's' : ''} detected
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#3a4f6a' }}>
            <div style={{
              width: '32px', height: '32px', border: '3px solid rgba(110,224,90,0.2)',
              borderTop: '3px solid #6EE05A', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            <p style={{ fontSize: '13px', ...mono }}>Analyzing patterns...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && visiblePatterns.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.06)',
            borderRadius: '16px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>&#x2B21;</div>
            <p style={{ color: '#b8cce0', fontSize: '16px', marginBottom: '4px' }}>No patterns to show</p>
            <p style={{ color: '#3a4f6a', fontSize: '13px' }}>Patterns will appear as the system analyzes your contact data.</p>
          </div>
        )}

        {/* Pattern Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {patterns.map((pattern, index) => {
            if (dismissed.has(index)) return null
            const config = getPatternConfig(pattern.pattern_type)
            return (
              <div
                key={pattern.id || index}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '16px', padding: '24px',
                  borderLeft: `3px solid ${config.color}`,
                }}
              >
                {/* Type badge + title */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', lineHeight: 1 }}>{config.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px',
                      background: `${config.color}18`, color: config.color,
                      marginBottom: '6px', ...mono,
                    }}>
                      {config.label.toUpperCase()}
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#e4efff', margin: 0 }}>
                      {pattern.title}
                    </h3>
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: '13px', color: '#b8cce0', margin: '0 0 12px', lineHeight: '1.5' }}>
                  {pattern.description}
                </p>

                {/* Recommendation box */}
                <div style={{
                  padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(110,224,90,0.04)', border: '1px solid rgba(110,224,90,0.1)',
                  marginBottom: '16px',
                }}>
                  <div style={{ fontSize: '10px', color: '#6EE05A', marginBottom: '4px', fontWeight: 700, letterSpacing: '0.5px', ...mono }}>
                    RECOMMENDATION
                  </div>
                  <div style={{ fontSize: '13px', color: '#e4efff', lineHeight: '1.4' }}>
                    {pattern.recommendation}
                  </div>
                </div>

                {/* Confidence bar + sample size + actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Confidence */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#3a4f6a', ...mono }}>confidence</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: config.color, ...mono }}>
                        {pattern.confidence}%
                      </span>
                    </div>
                    <div style={{
                      height: '6px', borderRadius: '3px', overflow: 'hidden',
                      background: 'rgba(255,255,255,0.04)', width: '100%',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: '3px',
                        width: `${pattern.confidence}%`, background: config.color,
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>

                  {/* Sample size */}
                  <div style={{ textAlign: 'center', minWidth: '60px' }}>
                    <div style={{ fontSize: '10px', color: '#3a4f6a', marginBottom: '2px', ...mono }}>sample</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#e4efff', ...mono }}>
                      {pattern.sample_size}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleDismiss(index)}
                      style={{
                        padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                        color: '#3a4f6a', cursor: 'pointer',
                      }}
                    >
                      Dismiss
                    </button>
                    <button
                      style={{
                        padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                        background: `${config.color}18`, border: `1px solid ${config.color}33`,
                        color: config.color, cursor: 'pointer',
                      }}
                    >
                      Act
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
