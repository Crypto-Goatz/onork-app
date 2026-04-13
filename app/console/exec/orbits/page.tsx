'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Orbit {
  id: string
  name: string
  description: string
  color: string
  icon: string
  contact_count: number
  avg_score: number
  critical_count: number
  sort_order: number
  exec_formulas: { id: string; name: string; icon: string } | null
  created_at: string
}

interface Formula {
  id: string
  name: string
  icon: string
}

const PRESET_COLORS = ['#6EE05A', '#00d4ff', '#a78bfa', '#f5c518', '#f97316', '#ef4444', '#ec4899', '#14b8a6']

export default function OrbitsPage() {
  const [orbits, setOrbits] = useState<Orbit[]>([])
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)

  // Modal form state
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6EE05A')
  const [newFormulaId, setNewFormulaId] = useState('')
  const [newDescription, setNewDescription] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/exec/orbits').then(r => r.json()),
      fetch('/api/exec/formulas').then(r => r.json()),
    ]).then(([orbitsRes, formulasRes]) => {
      setOrbits(orbitsRes.orbits || [])
      setFormulas(formulasRes.formulas || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/exec/orbits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDescription,
          color: newColor,
          formula_id: newFormulaId || null,
        }),
      })
      if (res.ok) {
        const { orbit } = await res.json()
        setOrbits(prev => [...prev, orbit])
        setShowModal(false)
        setNewName('')
        setNewDescription('')
        setNewColor('#6EE05A')
        setNewFormulaId('')
      }
    } finally {
      setCreating(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    color: '#e4efff',
    fontSize: '14px',
    fontFamily: '"DM Sans", system-ui, sans-serif',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

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
            <p style={{ fontSize: '14px', color: '#3a4f6a', marginTop: '4px', fontFamily: '"JetBrains Mono", monospace' }}>
              {orbits.length} orbit{orbits.length !== 1 ? 's' : ''} active
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', background: '#6EE05A', color: '#04060d',
              borderRadius: '10px', fontSize: '14px', fontWeight: 600,
              border: 'none', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '18px' }}>+</span>
            Create Orbit
          </button>
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
            <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '13px' }}>Loading orbits...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && orbits.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '80px 20px', marginTop: '20px',
            background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.06)',
            borderRadius: '16px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>&#x1F6F0;</div>
            <p style={{ color: '#b8cce0', fontSize: '16px', marginBottom: '4px' }}>No orbits yet</p>
            <p style={{ color: '#3a4f6a', fontSize: '13px' }}>Create your first orbit to organize and score contacts.</p>
          </div>
        )}

        {/* Orbits grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginTop: '24px' }}>
          {orbits.map(orbit => (
            <Link
              key={orbit.id}
              href="/console/exec"
              style={{ textDecoration: 'none' }}
            >
              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, background 0.2s',
                  borderLeft: `4px solid ${orbit.color || '#6EE05A'}`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = `${orbit.color || '#6EE05A'}40`
                  ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)'
                  ;(e.currentTarget as HTMLDivElement).style.borderLeftColor = orbit.color || '#6EE05A'
                  ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: orbit.color || '#6EE05A',
                    boxShadow: `0 0 12px ${orbit.color || '#6EE05A'}40`,
                  }} />
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#e4efff', margin: 0 }}>
                    {orbit.name}
                  </h3>
                </div>

                {/* Formula link */}
                {orbit.exec_formulas && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '3px 10px', borderRadius: '6px',
                    background: 'rgba(255,255,255,0.04)',
                    fontSize: '11px', color: '#b8cce0',
                    fontFamily: '"JetBrains Mono", monospace',
                    marginBottom: '16px',
                  }}>
                    <span>{orbit.exec_formulas.icon}</span>
                    {orbit.exec_formulas.name}
                  </div>
                )}

                {/* Description */}
                {orbit.description && (
                  <p style={{
                    fontSize: '13px', color: '#b8cce0', margin: '0 0 16px',
                    lineHeight: '1.5', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {orbit.description}
                  </p>
                )}

                {/* Stats */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px',
                  borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px',
                }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace', marginBottom: '2px' }}>contacts</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#e4efff', fontFamily: '"JetBrains Mono", monospace' }}>
                      {orbit.contact_count ?? 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace', marginBottom: '2px' }}>avg score</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#e4efff', fontFamily: '"JetBrains Mono", monospace' }}>
                      {orbit.avg_score ?? '--'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace', marginBottom: '2px' }}>critical</div>
                    <div style={{
                      fontSize: '18px', fontWeight: 600,
                      fontFamily: '"JetBrains Mono", monospace',
                      color: (orbit.critical_count ?? 0) > 0 ? '#ef4444' : '#3a4f6a',
                    }}>
                      {orbit.critical_count ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Create Orbit Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div style={{
            background: '#0c0f18',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '32px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#e4efff', margin: '0 0 24px' }}>
              Create Orbit
            </h2>

            {/* Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace', display: 'block', marginBottom: '4px' }}>name</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Enterprise Pipeline"
                style={inputStyle}
                autoFocus
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace', display: 'block', marginBottom: '4px' }}>description</label>
              <textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="What does this orbit track?"
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {/* Color picker */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace', display: 'block', marginBottom: '8px' }}>color</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: c, border: newColor === c ? '2px solid #e4efff' : '2px solid transparent',
                      cursor: 'pointer', transition: 'border-color 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Formula selection */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '11px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace', display: 'block', marginBottom: '4px' }}>formula</label>
              <select
                value={newFormulaId}
                onChange={e => setNewFormulaId(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">No formula (manual scoring)</option>
                {formulas.map(f => (
                  <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.04)', color: '#b8cce0', fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                style={{
                  padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: creating || !newName.trim() ? 'not-allowed' : 'pointer',
                  background: creating || !newName.trim() ? 'rgba(110,224,90,0.2)' : '#6EE05A',
                  color: creating || !newName.trim() ? '#3a4f6a' : '#04060d',
                  fontSize: '14px', fontWeight: 600,
                }}
              >
                {creating ? 'Creating...' : 'Create Orbit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
