'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Formula {
  id: string
  name: string
  description: string
  category: string
  icon: string
  is_template: boolean
  is_published: boolean
  formula_json: {
    numerator: { variable_key: string; weight: number; label: string }[]
    denominator: { variable_key: string; weight: number; label: string }[]
  }
  threshold_critical: number
  threshold_review: number
  threshold_monitor: number
  contacts_scored: number
  avg_score: number
  success_rate: number
  created_at: string
}

const BAND_COLORS = {
  NOMINAL: '#6EE05A',
  MONITOR: '#f5c518',
  REVIEW: '#f97316',
  CRITICAL: '#ef4444',
}

const CATEGORY_COLORS: Record<string, string> = {
  sales: '#6EE05A',
  engagement: '#00d4ff',
  health: '#a78bfa',
  custom: '#f5c518',
  retention: '#f97316',
}

function ThresholdBar({ critical, review, monitor }: { critical: number; review: number; monitor: number }) {
  return (
    <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', width: '100%', background: 'rgba(255,255,255,0.04)' }}>
      <div style={{ width: `${critical}%`, background: BAND_COLORS.CRITICAL }} />
      <div style={{ width: `${review - critical}%`, background: BAND_COLORS.REVIEW }} />
      <div style={{ width: `${monitor - review}%`, background: BAND_COLORS.MONITOR }} />
      <div style={{ width: `${100 - monitor}%`, background: BAND_COLORS.NOMINAL }} />
    </div>
  )
}

export default function FormulasPage() {
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'templates' | 'custom'>('all')

  useEffect(() => {
    fetch('/api/exec/formulas')
      .then(r => r.json())
      .then(d => { setFormulas(d.formulas || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = formulas.filter(f => {
    if (filter === 'templates') return f.is_template
    if (filter === 'custom') return !f.is_template
    return true
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: '#04060d',
      fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
      padding: '32px',
    }}>
      {/* Header */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#e4efff', margin: 0, letterSpacing: '-0.5px' }}>
              Formula Library
            </h1>
            <p style={{ fontSize: '14px', color: '#3a4f6a', marginTop: '4px', fontFamily: '"JetBrains Mono", monospace' }}>
              {formulas.length} formula{formulas.length !== 1 ? 's' : ''} configured
            </p>
          </div>
          <Link
            href="/console/exec/formulas/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: '#6EE05A',
              color: '#04060d',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            <span style={{ fontSize: '18px' }}>+</span>
            Create Formula
          </Link>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', marginTop: '20px' }}>
          {(['all', 'templates', 'custom'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: filter === f ? 'rgba(110,224,90,0.15)' : 'rgba(255,255,255,0.03)',
                color: filter === f ? '#6EE05A' : '#b8cce0',
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              {f === 'all' ? 'All' : f === 'templates' ? 'Templates' : 'Custom'}
            </button>
          ))}
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
            <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '13px' }}>Loading formulas...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px', maxWidth: 540, margin: '0 auto',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16, margin: '0 auto 20px',
              background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3h6l1 7-4 2-4-2 1-7z" /><path d="M10 17v4" /><path d="M14 17v4" /><path d="M6 21h12" />
              </svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e4efff', marginBottom: 8 }}>Create your first formula</h3>
            <p style={{ color: '#5a6f8a', fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>
              A formula tells 0nExec how to score your contacts. You pick the factors that matter —
              like engagement, deal size, or response time — and assign weights. The AI calculates a health score for every contact automatically.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
              {[
                { label: 'Sales Pipeline', desc: 'Score deals by close likelihood', color: '#6EE05A' },
                { label: 'Lead Quality', desc: 'Rank leads by fit', color: '#00d4ff' },
                { label: 'Churn Risk', desc: 'Flag customers about to leave', color: '#f97316' },
              ].map(uc => (
                <div key={uc.label} style={{ flex: 1, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${uc.color}20`, textAlign: 'left' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: uc.color, marginBottom: 3 }}>{uc.label}</div>
                  <div style={{ fontSize: 11, color: '#5a6f8a', lineHeight: 1.4 }}>{uc.desc}</div>
                </div>
              ))}
            </div>
            <Link href="/console/exec/formulas/new" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 24px', borderRadius: 10, background: '#6EE05A', color: '#04060d',
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
            }}>
              + Create Your First Formula
            </Link>
          </div>
        )}

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {filtered.map(formula => (
            <Link
              key={formula.id}
              href={`/console/exec/formulas/${formula.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
                position: 'relative',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(110,224,90,0.2)'
                  ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)'
                  ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'
                }}
              >
                {/* Template badge */}
                {formula.is_template && (
                  <div style={{
                    position: 'absolute', top: '12px', right: '12px',
                    padding: '2px 8px', borderRadius: '4px',
                    background: 'rgba(110,224,90,0.12)', color: '#6EE05A',
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px',
                    fontFamily: '"JetBrains Mono", monospace',
                  }}>
                    TEMPLATE
                  </div>
                )}

                {/* Icon + Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: 'rgba(110,224,90,0.08)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                  }}>
                    {formula.icon || '\u2B21'}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#e4efff', margin: 0 }}>
                      {formula.name}
                    </h3>
                    <span style={{
                      display: 'inline-block', marginTop: '2px',
                      padding: '1px 8px', borderRadius: '4px', fontSize: '11px',
                      fontFamily: '"JetBrains Mono", monospace', fontWeight: 500,
                      background: `${CATEGORY_COLORS[formula.category] || '#3a4f6a'}18`,
                      color: CATEGORY_COLORS[formula.category] || '#3a4f6a',
                    }}>
                      {formula.category}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p style={{
                  fontSize: '13px', color: '#b8cce0', margin: '0 0 16px',
                  lineHeight: '1.5', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {formula.description || 'No description'}
                </p>

                {/* Threshold visualization */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace' }}>0</span>
                    <span style={{ fontSize: '10px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace' }}>100</span>
                  </div>
                  <ThresholdBar
                    critical={formula.threshold_critical}
                    review={formula.threshold_review}
                    monitor={formula.threshold_monitor}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '10px', color: BAND_COLORS.CRITICAL, fontFamily: '"JetBrains Mono", monospace' }}>{formula.threshold_critical}</span>
                    <span style={{ fontSize: '10px', color: BAND_COLORS.REVIEW, fontFamily: '"JetBrains Mono", monospace' }}>{formula.threshold_review}</span>
                    <span style={{ fontSize: '10px', color: BAND_COLORS.MONITOR, fontFamily: '"JetBrains Mono", monospace' }}>{formula.threshold_monitor}</span>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px',
                  borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px',
                }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace', marginBottom: '2px' }}>scored</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#e4efff', fontFamily: '"JetBrains Mono", monospace' }}>
                      {formula.contacts_scored ?? 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace', marginBottom: '2px' }}>avg</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#e4efff', fontFamily: '"JetBrains Mono", monospace' }}>
                      {formula.avg_score ?? '--'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace', marginBottom: '2px' }}>win%</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#6EE05A', fontFamily: '"JetBrains Mono", monospace' }}>
                      {formula.success_rate != null ? `${formula.success_rate}%` : '--'}
                    </div>
                  </div>
                </div>

                {/* Variable count */}
                <div style={{
                  display: 'flex', gap: '12px', marginTop: '12px',
                  fontSize: '11px', fontFamily: '"JetBrains Mono", monospace', color: '#3a4f6a',
                }}>
                  <span>{formula.formula_json?.numerator?.length || 0} numerator vars</span>
                  <span>{formula.formula_json?.denominator?.length || 0} denominator vars</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
