'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Variable {
  id: string
  key: string
  label: string
  description: string
  category: string
  min_value: number
  max_value: number
  default_value: number
  direction: 'positive' | 'negative'
  data_type: string
}

interface FormulaVar {
  variable_key: string
  label: string
  weight: number
}

type Tab = 'build' | 'thresholds' | 'preview'

const BAND_COLORS = {
  NOMINAL: '#6EE05A',
  MONITOR: '#f5c518',
  REVIEW: '#f97316',
  CRITICAL: '#ef4444',
}

function getBand(score: number, critical: number, review: number, monitor: number): keyof typeof BAND_COLORS {
  if (score < critical) return 'CRITICAL'
  if (score < review) return 'REVIEW'
  if (score < monitor) return 'MONITOR'
  return 'NOMINAL'
}

export default function FormulaBuilderPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('build')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('sales')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('\u2B21')

  const [numerator, setNumerator] = useState<FormulaVar[]>([])
  const [denominator, setDenominator] = useState<FormulaVar[]>([])

  const [thresholdCritical, setThresholdCritical] = useState(40)
  const [thresholdReview, setThresholdReview] = useState(60)
  const [thresholdMonitor, setThresholdMonitor] = useState(80)

  const [variables, setVariables] = useState<Variable[]>([])
  const [varSearch, setVarSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [previewValues, setPreviewValues] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch('/api/exec/variables')
      .then(r => r.json())
      .then(d => setVariables(d.variables || []))
      .catch(() => {})
  }, [])

  // Group variables by category
  const grouped = variables.reduce<Record<string, Variable[]>>((acc, v) => {
    const cat = v.category || 'uncategorized'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(v)
    return acc
  }, {})

  const filteredGroups = Object.entries(grouped)
    .map(([cat, vars]) => ({
      category: cat,
      variables: vars.filter(v =>
        !varSearch || v.label.toLowerCase().includes(varSearch.toLowerCase()) || v.key.toLowerCase().includes(varSearch.toLowerCase())
      ),
    }))
    .filter(g => g.variables.length > 0)

  const addToNumerator = (v: Variable) => {
    if (numerator.find(n => n.variable_key === v.key)) return
    setNumerator(prev => [...prev, { variable_key: v.key, label: v.label, weight: 1.0 }])
  }

  const addToDenominator = (v: Variable) => {
    if (denominator.find(d => d.variable_key === v.key)) return
    setDenominator(prev => [...prev, { variable_key: v.key, label: v.label, weight: 1.0 }])
  }

  const removeNumerator = (key: string) => setNumerator(prev => prev.filter(n => n.variable_key !== key))
  const removeDenominator = (key: string) => setDenominator(prev => prev.filter(d => d.variable_key !== key))

  const updateWeight = (list: 'numerator' | 'denominator', key: string, weight: number) => {
    const setter = list === 'numerator' ? setNumerator : setDenominator
    setter(prev => prev.map(v => v.variable_key === key ? { ...v, weight } : v))
  }

  // Preview score computation (mirrors formula-engine.ts)
  const computePreview = useCallback(() => {
    const varDefMap: Record<string, Variable> = {}
    for (const v of variables) varDefMap[v.key] = v

    let numSum = 0, numWSum = 0
    for (const fv of numerator) {
      const def = varDefMap[fv.variable_key]
      const raw = previewValues[fv.variable_key] ?? def?.default_value ?? 50
      const range = def ? def.max_value - def.min_value : 100
      const norm = range > 0 ? Math.max(0, Math.min(1, (raw - (def?.min_value ?? 0)) / range)) : 0.5
      numSum += norm * fv.weight
      numWSum += fv.weight
    }

    let denSum = 0, denWSum = 0
    for (const fv of denominator) {
      const def = varDefMap[fv.variable_key]
      const raw = previewValues[fv.variable_key] ?? def?.default_value ?? 50
      const range = def ? def.max_value - def.min_value : 100
      const norm = range > 0 ? Math.max(0, Math.min(1, (raw - (def?.min_value ?? 0)) / range)) : 0.5
      denSum += norm * fv.weight
      denWSum += fv.weight
    }

    const numNorm = numWSum > 0 ? numSum / numWSum : 0.5
    const denNorm = denWSum > 0 ? Math.max(denSum / denWSum, 0.01) : 0.01

    let raw: number
    if (denominator.length === 0) {
      raw = numNorm * 100
    } else {
      raw = (numNorm / denNorm) * 50
    }

    return Math.min(Math.max(Math.round(raw), 1), 100)
  }, [numerator, denominator, previewValues, variables])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/exec/formulas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description, category, icon,
          numerator, denominator,
          threshold_critical: thresholdCritical,
          threshold_review: thresholdReview,
          threshold_monitor: thresholdMonitor,
        }),
      })
      if (res.ok) {
        router.push('/console/exec/formulas')
      }
    } finally {
      setSaving(false)
    }
  }

  const previewScore = computePreview()
  const previewBand = getBand(previewScore, thresholdCritical, thresholdReview, thresholdMonitor)

  const allFormulaVars = [...numerator, ...denominator]
  const allVarKeys = allFormulaVars.map(v => v.variable_key)

  // Initialize preview values for new variables
  useEffect(() => {
    const newVals = { ...previewValues }
    let changed = false
    for (const fv of allFormulaVars) {
      if (previewValues[fv.variable_key] === undefined) {
        const def = variables.find(v => v.key === fv.variable_key)
        newVals[fv.variable_key] = def?.default_value ?? 50
        changed = true
      }
    }
    if (changed) setPreviewValues(newVals)
  }, [allVarKeys.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

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
  } as const

  return (
    <div style={{
      minHeight: '100vh',
      background: '#04060d',
      fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
      padding: '32px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Back link */}
        <a
          href="/console/exec/formulas"
          style={{ fontSize: '13px', color: '#3a4f6a', textDecoration: 'none', fontFamily: '"JetBrains Mono", monospace' }}
        >
          &larr; Back to Formulas
        </a>

        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#e4efff', margin: '12px 0 24px', letterSpacing: '-0.5px' }}>
          Formula Builder
        </h1>

        {/* Meta inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 160px', gap: '12px', marginBottom: '24px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace', display: 'block', marginBottom: '4px' }}>icon</label>
            <input
              value={icon}
              onChange={e => setIcon(e.target.value)}
              style={{ ...inputStyle, textAlign: 'center', fontSize: '20px', padding: '8px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace', display: 'block', marginBottom: '4px' }}>name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Pipeline Velocity Score"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace', display: 'block', marginBottom: '4px' }}>category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="sales">sales</option>
              <option value="engagement">engagement</option>
              <option value="health">health</option>
              <option value="retention">retention</option>
              <option value="custom">custom</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '11px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace', display: 'block', marginBottom: '4px' }}>description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What does this formula measure?"
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '4px' }}>
          {(['build', 'thresholds', 'preview'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600,
                fontFamily: '"JetBrains Mono", monospace',
                background: tab === t ? 'rgba(110,224,90,0.12)' : 'transparent',
                color: tab === t ? '#6EE05A' : '#3a4f6a',
                transition: 'all 0.15s',
              }}
            >
              {t === 'build' ? 'Build' : t === 'thresholds' ? 'Thresholds' : 'Preview'}
            </button>
          ))}
        </div>

        {/* BUILD TAB */}
        {tab === 'build' && (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
            {/* Left: Variable Picker */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '16px',
              maxHeight: 'calc(100vh - 400px)',
              overflowY: 'auto',
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e4efff', margin: '0 0 12px' }}>Variables</h3>
              <input
                value={varSearch}
                onChange={e => setVarSearch(e.target.value)}
                placeholder="Search variables..."
                style={{ ...inputStyle, marginBottom: '12px', fontSize: '12px', padding: '8px 12px' }}
              />

              {filteredGroups.map(group => (
                <div key={group.category} style={{ marginBottom: '16px' }}>
                  <div style={{
                    fontSize: '10px', fontWeight: 700, color: '#3a4f6a', letterSpacing: '1px',
                    textTransform: 'uppercase', marginBottom: '8px',
                    fontFamily: '"JetBrains Mono", monospace',
                  }}>
                    {group.category}
                  </div>
                  {group.variables.map(v => {
                    const inNum = numerator.some(n => n.variable_key === v.key)
                    const inDen = denominator.some(d => d.variable_key === v.key)
                    return (
                      <div key={v.id} style={{
                        padding: '10px',
                        borderRadius: '10px',
                        background: inNum || inDen ? 'rgba(110,224,90,0.06)' : 'rgba(255,255,255,0.02)',
                        border: inNum || inDen ? '1px solid rgba(110,224,90,0.15)' : '1px solid transparent',
                        marginBottom: '6px',
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#e4efff', marginBottom: '2px' }}>{v.label}</div>
                        <div style={{ fontSize: '11px', color: '#3a4f6a', marginBottom: '8px', lineHeight: '1.4' }}>{v.description}</div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => addToNumerator(v)}
                            disabled={inNum}
                            style={{
                              flex: 1, padding: '5px 0', borderRadius: '6px', border: 'none', cursor: inNum ? 'default' : 'pointer',
                              fontSize: '11px', fontWeight: 600,
                              fontFamily: '"JetBrains Mono", monospace',
                              background: inNum ? 'rgba(110,224,90,0.08)' : 'rgba(110,224,90,0.15)',
                              color: inNum ? '#3a4f6a' : '#6EE05A',
                              opacity: inNum ? 0.5 : 1,
                            }}
                          >
                            + Numerator &uarr;
                          </button>
                          <button
                            onClick={() => addToDenominator(v)}
                            disabled={inDen}
                            style={{
                              flex: 1, padding: '5px 0', borderRadius: '6px', border: 'none', cursor: inDen ? 'default' : 'pointer',
                              fontSize: '11px', fontWeight: 600,
                              fontFamily: '"JetBrains Mono", monospace',
                              background: inDen ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.15)',
                              color: inDen ? '#3a4f6a' : '#ef4444',
                              opacity: inDen ? 0.5 : 1,
                            }}
                          >
                            + Denominator &darr;
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}

              {filteredGroups.length === 0 && (
                <p style={{ color: '#3a4f6a', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
                  {variables.length === 0 ? 'No variables defined yet' : 'No matching variables'}
                </p>
              )}
            </div>

            {/* Right: Formula Structure */}
            <div>
              {/* Numerator section */}
              <div style={{
                background: 'rgba(110,224,90,0.04)',
                border: '1px solid rgba(110,224,90,0.1)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '4px',
              }}>
                <h3 style={{
                  fontSize: '12px', fontWeight: 700, color: '#6EE05A', margin: '0 0 12px',
                  fontFamily: '"JetBrains Mono", monospace', letterSpacing: '1px', textTransform: 'uppercase',
                }}>
                  Numerator (strength signals)
                </h3>
                {numerator.length === 0 && (
                  <p style={{ color: '#3a4f6a', fontSize: '12px', fontStyle: 'italic' }}>
                    Add variables from the picker on the left
                  </p>
                )}
                {numerator.map(fv => (
                  <div key={fv.variable_key} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 14px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    marginBottom: '8px',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#e4efff' }}>{fv.label}</div>
                      <div style={{ fontSize: '10px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace' }}>{fv.variable_key}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace' }}>weight</span>
                      <input
                        type="range"
                        min={0.1} max={2.0} step={0.1}
                        value={fv.weight}
                        onChange={e => updateWeight('numerator', fv.variable_key, parseFloat(e.target.value))}
                        style={{ width: '80px', accentColor: '#6EE05A' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#6EE05A', fontFamily: '"JetBrains Mono", monospace', width: '32px', textAlign: 'right' }}>
                        {fv.weight.toFixed(1)}
                      </span>
                    </div>
                    <button
                      onClick={() => removeNumerator(fv.variable_key)}
                      style={{
                        background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444',
                        width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer',
                        fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 0',
              }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                <span style={{
                  fontSize: '12px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace',
                  padding: '4px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px',
                }}>
                  &divide; divided by
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              </div>

              {/* Denominator section */}
              <div style={{
                background: 'rgba(239,68,68,0.04)',
                border: '1px solid rgba(239,68,68,0.1)',
                borderRadius: '16px',
                padding: '20px',
              }}>
                <h3 style={{
                  fontSize: '12px', fontWeight: 700, color: '#ef4444', margin: '0 0 12px',
                  fontFamily: '"JetBrains Mono", monospace', letterSpacing: '1px', textTransform: 'uppercase',
                }}>
                  Denominator (risk signals)
                </h3>
                {denominator.length === 0 && (
                  <p style={{ color: '#3a4f6a', fontSize: '12px', fontStyle: 'italic' }}>
                    Optional. Leave empty for additive-only scoring.
                  </p>
                )}
                {denominator.map(fv => (
                  <div key={fv.variable_key} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 14px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    marginBottom: '8px',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#e4efff' }}>{fv.label}</div>
                      <div style={{ fontSize: '10px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace' }}>{fv.variable_key}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace' }}>weight</span>
                      <input
                        type="range"
                        min={0.1} max={2.0} step={0.1}
                        value={fv.weight}
                        onChange={e => updateWeight('denominator', fv.variable_key, parseFloat(e.target.value))}
                        style={{ width: '80px', accentColor: '#ef4444' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444', fontFamily: '"JetBrains Mono", monospace', width: '32px', textAlign: 'right' }}>
                        {fv.weight.toFixed(1)}
                      </span>
                    </div>
                    <button
                      onClick={() => removeDenominator(fv.variable_key)}
                      style={{
                        background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444',
                        width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer',
                        fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* THRESHOLDS TAB */}
        {tab === 'thresholds' && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '600px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#e4efff', margin: '0 0 24px' }}>
              Score Thresholds
            </h3>
            <p style={{ fontSize: '13px', color: '#b8cce0', marginBottom: '32px', lineHeight: '1.6' }}>
              Set the boundaries between score bands. Contacts scoring below the critical threshold trigger alerts.
            </p>

            {/* Threshold visualization bar */}
            <div style={{ marginBottom: '40px' }}>
              <div style={{
                display: 'flex', height: '40px', borderRadius: '12px', overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{
                  width: `${thresholdCritical}%`, background: 'rgba(239,68,68,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 600, color: BAND_COLORS.CRITICAL,
                  fontFamily: '"JetBrains Mono", monospace',
                }}>
                  {thresholdCritical > 15 ? 'CRITICAL' : ''}
                </div>
                <div style={{
                  width: `${thresholdReview - thresholdCritical}%`, background: 'rgba(249,115,22,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 600, color: BAND_COLORS.REVIEW,
                  fontFamily: '"JetBrains Mono", monospace',
                }}>
                  {thresholdReview - thresholdCritical > 10 ? 'REVIEW' : ''}
                </div>
                <div style={{
                  width: `${thresholdMonitor - thresholdReview}%`, background: 'rgba(245,197,24,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 600, color: BAND_COLORS.MONITOR,
                  fontFamily: '"JetBrains Mono", monospace',
                }}>
                  {thresholdMonitor - thresholdReview > 10 ? 'MONITOR' : ''}
                </div>
                <div style={{
                  width: `${100 - thresholdMonitor}%`, background: 'rgba(110,224,90,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 600, color: BAND_COLORS.NOMINAL,
                  fontFamily: '"JetBrains Mono", monospace',
                }}>
                  {100 - thresholdMonitor > 10 ? 'NOMINAL' : ''}
                </div>
              </div>
            </div>

            {/* Critical slider */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: BAND_COLORS.CRITICAL }}>Critical Threshold</label>
                <span style={{ fontSize: '16px', fontWeight: 700, color: BAND_COLORS.CRITICAL, fontFamily: '"JetBrains Mono", monospace' }}>
                  &lt; {thresholdCritical}
                </span>
              </div>
              <input
                type="range" min={5} max={thresholdReview - 5} value={thresholdCritical}
                onChange={e => setThresholdCritical(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: BAND_COLORS.CRITICAL }}
              />
              <p style={{ fontSize: '11px', color: '#3a4f6a', marginTop: '4px' }}>Scores below this trigger critical alerts</p>
            </div>

            {/* Review slider */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: BAND_COLORS.REVIEW }}>Review Threshold</label>
                <span style={{ fontSize: '16px', fontWeight: 700, color: BAND_COLORS.REVIEW, fontFamily: '"JetBrains Mono", monospace' }}>
                  &lt; {thresholdReview}
                </span>
              </div>
              <input
                type="range" min={thresholdCritical + 5} max={thresholdMonitor - 5} value={thresholdReview}
                onChange={e => setThresholdReview(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: BAND_COLORS.REVIEW }}
              />
              <p style={{ fontSize: '11px', color: '#3a4f6a', marginTop: '4px' }}>Scores in this range need manual review</p>
            </div>

            {/* Monitor slider */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: BAND_COLORS.MONITOR }}>Monitor Threshold</label>
                <span style={{ fontSize: '16px', fontWeight: 700, color: BAND_COLORS.MONITOR, fontFamily: '"JetBrains Mono", monospace' }}>
                  &lt; {thresholdMonitor}
                </span>
              </div>
              <input
                type="range" min={thresholdReview + 5} max={95} value={thresholdMonitor}
                onChange={e => setThresholdMonitor(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: BAND_COLORS.MONITOR }}
              />
              <p style={{ fontSize: '11px', color: '#3a4f6a', marginTop: '4px' }}>Scores above this are nominal (healthy)</p>
            </div>
          </div>
        )}

        {/* PREVIEW TAB */}
        {tab === 'preview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
            {/* Variable sliders */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '24px',
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e4efff', margin: '0 0 16px' }}>
                Adjust Variable Values
              </h3>
              {allFormulaVars.length === 0 && (
                <p style={{ color: '#3a4f6a', fontSize: '13px' }}>Add variables in the Build tab first.</p>
              )}
              {allFormulaVars.map(fv => {
                const def = variables.find(v => v.key === fv.variable_key)
                const min = def?.min_value ?? 0
                const max = def?.max_value ?? 100
                const val = previewValues[fv.variable_key] ?? def?.default_value ?? 50
                const isNum = numerator.some(n => n.variable_key === fv.variable_key)
                return (
                  <div key={fv.variable_key} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#e4efff' }}>{fv.label}</span>
                      <span style={{
                        fontSize: '13px', fontWeight: 600,
                        color: isNum ? '#6EE05A' : '#ef4444',
                        fontFamily: '"JetBrains Mono", monospace',
                      }}>
                        {val}
                      </span>
                    </div>
                    <input
                      type="range" min={min} max={max} value={val}
                      onChange={e => setPreviewValues(prev => ({ ...prev, [fv.variable_key]: parseInt(e.target.value) }))}
                      style={{ width: '100%', accentColor: isNum ? '#6EE05A' : '#ef4444' }}
                    />
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: '10px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace', marginTop: '2px',
                    }}>
                      <span>{min}</span>
                      <span style={{
                        padding: '1px 6px', borderRadius: '3px',
                        background: isNum ? 'rgba(110,224,90,0.1)' : 'rgba(239,68,68,0.1)',
                        color: isNum ? '#6EE05A' : '#ef4444',
                      }}>
                        {isNum ? 'numerator' : 'denominator'} w:{fv.weight.toFixed(1)}
                      </span>
                      <span>{max}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Score display */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'sticky',
              top: '32px',
              height: 'fit-content',
            }}>
              <div style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
                color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace', marginBottom: '16px',
              }}>
                COMPUTED SCORE
              </div>

              {/* Large score circle */}
              <div style={{
                width: '160px', height: '160px', borderRadius: '50%',
                background: `radial-gradient(circle at center, ${BAND_COLORS[previewBand]}12, transparent 70%)`,
                border: `3px solid ${BAND_COLORS[previewBand]}`,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: `0 0 40px ${BAND_COLORS[previewBand]}20`,
              }}>
                <div style={{
                  fontSize: '48px', fontWeight: 700,
                  color: BAND_COLORS[previewBand],
                  fontFamily: '"JetBrains Mono", monospace',
                  lineHeight: 1,
                }}>
                  {previewScore}
                </div>
                <div style={{ fontSize: '11px', color: '#b8cce0', fontFamily: '"JetBrains Mono", monospace', marginTop: '4px' }}>
                  / 100
                </div>
              </div>

              {/* Band label */}
              <div style={{
                padding: '6px 20px', borderRadius: '8px',
                background: `${BAND_COLORS[previewBand]}18`,
                color: BAND_COLORS[previewBand],
                fontSize: '13px', fontWeight: 700, letterSpacing: '1px',
                fontFamily: '"JetBrains Mono", monospace',
              }}>
                {previewBand}
              </div>

              {/* Threshold legend */}
              <div style={{ marginTop: '24px', width: '100%' }}>
                {[
                  { band: 'CRITICAL' as const, range: `0-${thresholdCritical - 1}` },
                  { band: 'REVIEW' as const, range: `${thresholdCritical}-${thresholdReview - 1}` },
                  { band: 'MONITOR' as const, range: `${thresholdReview}-${thresholdMonitor - 1}` },
                  { band: 'NOMINAL' as const, range: `${thresholdMonitor}-100` },
                ].map(item => (
                  <div key={item.band} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: BAND_COLORS[item.band] }} />
                      <span style={{ fontSize: '11px', color: '#b8cce0', fontFamily: '"JetBrains Mono", monospace' }}>
                        {item.band}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#3a4f6a', fontFamily: '"JetBrains Mono", monospace' }}>
                      {item.range}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Save button */}
        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <a
            href="/console/exec/formulas"
            style={{
              padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 500,
              color: '#b8cce0', textDecoration: 'none',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            Cancel
          </a>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || numerator.length === 0}
            style={{
              padding: '10px 32px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
              border: 'none', cursor: saving || !name.trim() || numerator.length === 0 ? 'not-allowed' : 'pointer',
              background: saving || !name.trim() || numerator.length === 0 ? 'rgba(110,224,90,0.2)' : '#6EE05A',
              color: saving || !name.trim() || numerator.length === 0 ? '#3a4f6a' : '#04060d',
              fontFamily: '"DM Sans", system-ui, sans-serif',
            }}
          >
            {saving ? 'Saving...' : 'Save Formula'}
          </button>
        </div>
      </div>
    </div>
  )
}
