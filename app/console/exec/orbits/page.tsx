'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Formula {
  id: string
  name: string
  icon: string
}

interface Orbit {
  id: string
  name: string
  description: string
  color: string
  icon: string
  formula_id: string | null
  stages: string
  contact_count: number
  avg_score: number
  critical_count: number
  exec_formulas: Formula | null
  created_at: string
}

const PRESET_COLORS = ['#6EE05A', '#00d4ff', '#a78bfa', '#f5c518', '#f97316', '#ef4444']

const BAND_COLORS = {
  NOMINAL: '#6EE05A',
  MONITOR: '#f5c518',
  REVIEW: '#f97316',
  CRITICAL: '#ef4444',
}

function getScoreColor(score: number): string {
  if (score < 40) return BAND_COLORS.CRITICAL
  if (score < 60) return BAND_COLORS.REVIEW
  if (score < 80) return BAND_COLORS.MONITOR
  return BAND_COLORS.NOMINAL
}

export default function OrbitsPage() {
  const [orbits, setOrbits] = useState<Orbit[]>([])
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formColor, setFormColor] = useState('#6EE05A')
  const [formFormulaId, setFormFormulaId] = useState('')
  const [formStages, setFormStages] = useState('New, In Progress, Review, Complete')

  useEffect(() => {
    Promise.all([
      fetch('/api/exec/orbits').then(r => r.json()),
      fetch('/api/exec/formulas').then(r => r.json()),
    ]).then(([orbitsData, formulasData]) => {
      setOrbits(orbitsData.orbits || [])
      setFormulas((formulasData.formulas || []).map((f: { id: string; name: string; icon?: string }) => ({
        id: f.id, name: f.name, icon: f.icon || '',
      })))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function handleCreate() {
    if (!formName.trim()) return
    setSaving(true)
    try {
      const stagesArray = formStages.split(',').map(s => s.trim()).filter(Boolean)
      const res = await fetch('/api/exec/orbits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim(),
          color: formColor,
          formula_id: formFormulaId || null,
          stages: JSON.stringify(stagesArray),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setOrbits([...orbits, { ...data.orbit, exec_formulas: formulas.find(f => f.id === formFormulaId) || null }])
        setShowForm(false)
        setFormName('')
        setFormDescription('')
        setFormColor('#6EE05A')
        setFormFormulaId('')
        setFormStages('New, In Progress, Review, Complete')
      }
    } finally {
      setSaving(false)
    }
  }

  const mono: React.CSSProperties = { fontFamily: '"JetBrains Mono", monospace' }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#04060d',
      fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
      padding: '32px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#e4efff', margin: 0, letterSpacing: '-0.5px' }}>
              Orbits
            </h1>
            <p style={{ fontSize: '14px', color: '#3a4f6a', marginTop: '4px', ...mono }}>
              {orbits.length} orbit{orbits.length !== 1 ? 's' : ''} configured
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', background: showForm ? 'rgba(255,255,255,0.06)' : '#6EE05A',
              color: showForm ? '#b8cce0' : '#04060d', borderRadius: '10px',
              fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer',
            }}
          >
            {showForm ? 'Cancel' : (
              <>
                <span style={{ fontSize: '18px' }}>+</span>
                Create Orbit
              </>
            )}
          </button>
        </div>

        {/* Inline Create Form */}
        {showForm && (
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px', padding: '24px', marginTop: '16px', marginBottom: '24px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#e4efff', margin: '0 0 16px' }}>
              New Orbit
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Orbit name"
                style={{
                  padding: '10px 14px', borderRadius: '10px', fontSize: '14px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  color: '#e4efff', outline: 'none',
                }}
              />
              <input
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Description"
                style={{
                  padding: '10px 14px', borderRadius: '10px', fontSize: '14px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  color: '#e4efff', outline: 'none',
                }}
              />
            </div>

            {/* Color picker */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#3a4f6a', display: 'block', marginBottom: '8px', ...mono }}>
                Color
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setFormColor(c)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px', border: 'none',
                      background: c, cursor: 'pointer',
                      outline: formColor === c ? '2px solid #e4efff' : '2px solid transparent',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Formula dropdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#3a4f6a', display: 'block', marginBottom: '8px', ...mono }}>
                  Scoring Formula
                </label>
                <select
                  value={formFormulaId}
                  onChange={e => setFormFormulaId(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '14px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    color: '#e4efff', outline: 'none',
                  }}
                >
                  <option value="">No formula</option>
                  {formulas.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#3a4f6a', display: 'block', marginBottom: '8px', ...mono }}>
                  Stages (comma-separated)
                </label>
                <input
                  value={formStages}
                  onChange={e => setFormStages(e.target.value)}
                  placeholder="New, In Progress, Review, Complete"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '14px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    color: '#e4efff', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={saving || !formName.trim()}
              style={{
                padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                background: formName.trim() ? '#6EE05A' : 'rgba(110,224,90,0.3)',
                color: '#04060d', border: 'none',
                cursor: formName.trim() ? 'pointer' : 'not-allowed',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Creating...' : 'Create Orbit'}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#3a4f6a' }}>
            <div style={{
              width: '32px', height: '32px', border: '3px solid rgba(110,224,90,0.2)',
              borderTop: '3px solid #6EE05A', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            <p style={{ fontSize: '13px', ...mono }}>Loading orbits...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && orbits.length === 0 && !showForm && (
          <div style={{
            textAlign: 'center', padding: '80px 20px', marginTop: '20px',
            background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.06)',
            borderRadius: '16px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>&#x2B21;</div>
            <p style={{ color: '#b8cce0', fontSize: '16px', marginBottom: '4px' }}>No orbits yet</p>
            <p style={{ color: '#3a4f6a', fontSize: '13px' }}>Create your first orbit to start organizing contacts.</p>
          </div>
        )}

        {/* Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px', marginTop: '20px',
        }}>
          {orbits.map(orbit => (
            <Link
              key={orbit.id}
              href="/console/exec"
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px', padding: '20px', cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = `${orbit.color}33`
                  ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)'
                  ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: orbit.color, flexShrink: 0,
                    boxShadow: `0 0 8px ${orbit.color}55`,
                  }} />
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#e4efff', margin: 0, flex: 1 }}>
                    {orbit.name}
                  </h3>
                  {(orbit.critical_count ?? 0) > 0 && (
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                      background: 'rgba(239,68,68,0.15)', color: '#ef4444', ...mono,
                    }}>
                      {orbit.critical_count} critical
                    </span>
                  )}
                </div>

                {/* Description */}
                {orbit.description && (
                  <p style={{
                    fontSize: '13px', color: '#b8cce0', margin: '0 0 12px',
                    lineHeight: '1.5', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {orbit.description}
                  </p>
                )}

                {/* Formula link */}
                {orbit.exec_formulas && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 10px', borderRadius: '6px', marginBottom: '12px',
                    background: 'rgba(110,224,90,0.06)', fontSize: '12px', color: '#6EE05A', ...mono,
                  }}>
                    {orbit.exec_formulas.icon || '\u2B21'} {orbit.exec_formulas.name}
                  </div>
                )}

                {/* Stats */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
                  borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px',
                }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#3a4f6a', marginBottom: '2px', ...mono }}>contacts</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#e4efff', ...mono }}>
                      {orbit.contact_count ?? 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#3a4f6a', marginBottom: '2px', ...mono }}>avg score</div>
                    <div style={{
                      fontSize: '18px', fontWeight: 600, ...mono,
                      color: orbit.avg_score != null ? getScoreColor(orbit.avg_score) : '#3a4f6a',
                    }}>
                      {orbit.avg_score != null ? orbit.avg_score : '--'}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
