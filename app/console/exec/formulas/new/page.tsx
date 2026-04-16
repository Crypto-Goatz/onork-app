'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Variable {
  id: string
  key: string
  label: string
  description: string
  category: string
  data_type: string
  min_value: number
  max_value: number
}

interface FormulaVar {
  variable_key: string
  weight: number
  label: string
}

type Tab = 'build' | 'thresholds' | 'preview'

const BAND_COLORS = {
  NOMINAL: '#6EE05A',
  MONITOR: '#f5c518',
  REVIEW: '#f97316',
  CRITICAL: '#ef4444',
}

const CATEGORY_COLORS: Record<string, string> = {
  engagement: '#00d4ff',
  activity: '#a78bfa',
  fit: '#6EE05A',
  pipeline: '#f5c518',
  custom: '#f97316',
}

function getBandColor(score: number, critical: number, review: number, monitor: number): string {
  if (score < critical) return BAND_COLORS.CRITICAL
  if (score < review) return BAND_COLORS.REVIEW
  if (score < monitor) return BAND_COLORS.MONITOR
  return BAND_COLORS.NOMINAL
}

export default function FormulaBuilderPage() {
  const router = useRouter()
  const [variables, setVariables] = useState<Variable[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('build')

  // Formula fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('custom')

  // Numerator / Denominator
  const [numerator, setNumerator] = useState<FormulaVar[]>([])
  const [denominator, setDenominator] = useState<FormulaVar[]>([])

  // Thresholds
  const [thresholdCritical, setThresholdCritical] = useState(40)
  const [thresholdReview, setThresholdReview] = useState(60)
  const [thresholdMonitor, setThresholdMonitor] = useState(80)

  // Preview values
  const [previewValues, setPreviewValues] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch('/api/exec/variables')
      .then(r => r.json())
      .then(d => { setVariables(d.variables || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const grouped = variables.reduce<Record<string, Variable[]>>((acc, v) => {
    const cat = v.category || 'custom'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(v)
    return acc
  }, {})

  function addToNumerator(v: Variable) {
    if (numerator.some(n => n.variable_key === v.key)) return
    setNumerator([...numerator, { variable_key: v.key, weight: 1.0, label: v.label }])
  }

  function addToDenominator(v: Variable) {
    if (denominator.some(d => d.variable_key === v.key)) return
    setDenominator([...denominator, { variable_key: v.key, weight: 1.0, label: v.label }])
  }

  function removeNumerator(key: string) {
    setNumerator(numerator.filter(n => n.variable_key !== key))
  }

  function removeDenominator(key: string) {
    setDenominator(denominator.filter(d => d.variable_key !== key))
  }

  function updateWeight(list: FormulaVar[], setList: (v: FormulaVar[]) => void, key: string, weight: number) {
    setList(list.map(item => item.variable_key === key ? { ...item, weight } : item))
  }

  function computePreviewScore(): number {
    const allVars = [...numerator, ...denominator]
    if (allVars.length === 0) return 0

    let numSum = 0
    let numWeightSum = 0
    for (const n of numerator) {
      const val = previewValues[n.variable_key] ?? 50
      numSum += val * n.weight
      numWeightSum += n.weight
    }

    let denSum = 0
    let denWeightSum = 0
    for (const d of denominator) {
      const val = previewValues[d.variable_key] ?? 50
      denSum += val * d.weight
      denWeightSum += d.weight
    }

    if (denominator.length === 0) {
      return numWeightSum > 0 ? Math.round(numSum / numWeightSum) : 0
    }

    const numAvg = numWeightSum > 0 ? numSum / numWeightSum : 0
    const denAvg = denWeightSum > 0 ? denSum / denWeightSum : 1
    if (denAvg === 0) return 0
    const raw = (numAvg / denAvg) * 50
    return Math.round(Math.max(0, Math.min(100, raw)))
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/exec/formulas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category,
          numerator,
          denominator,
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
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => router.push('/console/exec/formulas')}
            style={{
              background: 'none', border: 'none', color: '#3a4f6a', cursor: 'pointer',
              fontSize: '13px', padding: 0, marginBottom: '12px', ...mono,
            }}
          >
            &larr; Back to Formulas
          </button>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#e4efff', margin: 0, letterSpacing: '-0.5px' }}>
            Formula Builder
          </h1>
          <p style={{ fontSize: '14px', color: '#3a4f6a', marginTop: '4px', ...mono }}>
            Create a custom scoring formula
          </p>
        </div>

        {/* Name / Description / Category */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', marginBottom: '24px',
        }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Formula name"
            style={{
              padding: '10px 14px', borderRadius: '10px', fontSize: '14px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              color: '#e4efff', outline: 'none',
            }}
          />
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description"
            style={{
              padding: '10px 14px', borderRadius: '10px', fontSize: '14px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              color: '#e4efff', outline: 'none',
            }}
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{
              padding: '10px 14px', borderRadius: '10px', fontSize: '14px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              color: '#e4efff', outline: 'none', minWidth: '130px',
            }}
          >
            <option value="custom">Custom</option>
            <option value="sales">Sales</option>
            <option value="engagement">Engagement</option>
            <option value="health">Health</option>
            <option value="retention">Retention</option>
          </select>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
          {(['build', 'thresholds', 'preview'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: activeTab === tab ? 'rgba(110,224,90,0.15)' : 'rgba(255,255,255,0.03)',
                color: activeTab === tab ? '#6EE05A' : '#b8cce0',
                ...mono,
              }}
            >
              {tab === 'build' ? 'Build' : tab === 'thresholds' ? 'Thresholds' : 'Preview'}
            </button>
          ))}
        </div>

        {/* BUILD TAB */}
        {activeTab === 'build' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
            {/* Left: Variable Picker */}
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px', padding: '16px', maxHeight: '600px', overflowY: 'auto',
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e4efff', margin: '0 0 12px', ...mono }}>
                Variables
              </h3>
              {loading && (
                <p style={{ fontSize: '12px', color: '#3a4f6a', ...mono }}>Loading...</p>
              )}
              {Object.entries(grouped).map(([cat, vars]) => (
                <div key={cat} style={{ marginBottom: '16px' }}>
                  <div style={{
                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px',
                    color: CATEGORY_COLORS[cat] || '#3a4f6a', marginBottom: '8px',
                    textTransform: 'uppercase', ...mono,
                  }}>
                    {cat}
                  </div>
                  {vars.map(v => (
                    <div key={v.id} style={{
                      padding: '8px 10px', borderRadius: '8px', marginBottom: '4px',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      <div style={{ fontSize: '13px', color: '#e4efff', fontWeight: 500, marginBottom: '2px' }}>
                        {v.label}
                      </div>
                      <div style={{ fontSize: '11px', color: '#3a4f6a', marginBottom: '6px', lineHeight: '1.4' }}>
                        {v.description || v.key}
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => addToNumerator(v)}
                          style={{
                            padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                            border: 'none', cursor: 'pointer',
                            background: 'rgba(110,224,90,0.15)', color: '#6EE05A', ...mono,
                          }}
                        >
                          +Num &uarr;
                        </button>
                        <button
                          onClick={() => addToDenominator(v)}
                          style={{
                            padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                            border: 'none', cursor: 'pointer',
                            background: 'rgba(239,68,68,0.15)', color: '#ef4444', ...mono,
                          }}
                        >
                          +Den &darr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {!loading && variables.length === 0 && (
                <p style={{ fontSize: '12px', color: '#3a4f6a', ...mono }}>No variables found</p>
              )}
            </div>

            {/* Right: Formula Structure */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Numerator */}
              <div style={{
                background: 'rgba(110,224,90,0.04)', border: '1px solid rgba(110,224,90,0.15)',
                borderRadius: '16px', padding: '16px', minHeight: '120px',
              }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#6EE05A', margin: '0 0 12px', ...mono }}>
                  NUMERATOR
                </h3>
                {numerator.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#3a4f6a', ...mono }}>
                    Add variables from the left panel
                  </p>
                )}
                {numerator.map(n => (
                  <div key={n.variable_key} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 10px',
                    borderRadius: '8px', marginBottom: '6px', background: 'rgba(255,255,255,0.03)',
                  }}>
                    <span style={{ flex: 1, fontSize: '13px', color: '#e4efff', fontWeight: 500 }}>{n.label}</span>
                    <span style={{ fontSize: '11px', color: '#3a4f6a', ...mono }}>w:</span>
                    <input
                      type="range"
                      min="0.1" max="2.0" step="0.1"
                      value={n.weight}
                      onChange={e => updateWeight(numerator, setNumerator, n.variable_key, parseFloat(e.target.value))}
                      style={{ width: '80px', accentColor: '#6EE05A' }}
                    />
                    <span style={{ fontSize: '12px', color: '#6EE05A', width: '32px', textAlign: 'right', ...mono }}>
                      {n.weight.toFixed(1)}
                    </span>
                    <button
                      onClick={() => removeNumerator(n.variable_key)}
                      style={{
                        background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: '6px',
                        color: '#ef4444', cursor: 'pointer', padding: '4px 8px', fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div style={{
                textAlign: 'center', fontSize: '24px', fontWeight: 700, color: '#3a4f6a',
                letterSpacing: '4px', padding: '4px 0',
              }}>
                &divide;
              </div>

              {/* Denominator */}
              <div style={{
                background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: '16px', padding: '16px', minHeight: '120px',
              }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444', margin: '0 0 12px', ...mono }}>
                  DENOMINATOR
                </h3>
                {denominator.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#3a4f6a', ...mono }}>
                    Add variables from the left panel
                  </p>
                )}
                {denominator.map(d => (
                  <div key={d.variable_key} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 10px',
                    borderRadius: '8px', marginBottom: '6px', background: 'rgba(255,255,255,0.03)',
                  }}>
                    <span style={{ flex: 1, fontSize: '13px', color: '#e4efff', fontWeight: 500 }}>{d.label}</span>
                    <span style={{ fontSize: '11px', color: '#3a4f6a', ...mono }}>w:</span>
                    <input
                      type="range"
                      min="0.1" max="2.0" step="0.1"
                      value={d.weight}
                      onChange={e => updateWeight(denominator, setDenominator, d.variable_key, parseFloat(e.target.value))}
                      style={{ width: '80px', accentColor: '#ef4444' }}
                    />
                    <span style={{ fontSize: '12px', color: '#ef4444', width: '32px', textAlign: 'right', ...mono }}>
                      {d.weight.toFixed(1)}
                    </span>
                    <button
                      onClick={() => removeDenominator(d.variable_key)}
                      style={{
                        background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: '6px',
                        color: '#ef4444', cursor: 'pointer', padding: '4px 8px', fontSize: '12px',
                        fontWeight: 700,
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
        {activeTab === 'thresholds' && (
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px', padding: '32px', maxWidth: '600px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#e4efff', margin: '0 0 24px' }}>
              Score Thresholds
            </h3>

            {/* Critical */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: BAND_COLORS.CRITICAL }}>
                  Critical (below this = red)
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: BAND_COLORS.CRITICAL, ...mono }}>
                  {thresholdCritical}
                </span>
              </div>
              <input
                type="range" min="10" max="90" value={thresholdCritical}
                onChange={e => {
                  const v = parseInt(e.target.value)
                  setThresholdCritical(v)
                  if (v >= thresholdReview) setThresholdReview(v + 5)
                  if (v >= thresholdMonitor) setThresholdMonitor(v + 10)
                }}
                style={{ width: '100%', accentColor: BAND_COLORS.CRITICAL }}
              />
            </div>

            {/* Review */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: BAND_COLORS.REVIEW }}>
                  Review (below this = orange)
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: BAND_COLORS.REVIEW, ...mono }}>
                  {thresholdReview}
                </span>
              </div>
              <input
                type="range" min="20" max="95" value={thresholdReview}
                onChange={e => {
                  const v = parseInt(e.target.value)
                  setThresholdReview(v)
                  if (v <= thresholdCritical) setThresholdCritical(v - 5)
                  if (v >= thresholdMonitor) setThresholdMonitor(v + 5)
                }}
                style={{ width: '100%', accentColor: BAND_COLORS.REVIEW }}
              />
            </div>

            {/* Monitor */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: BAND_COLORS.MONITOR }}>
                  Monitor (below this = yellow)
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: BAND_COLORS.MONITOR, ...mono }}>
                  {thresholdMonitor}
                </span>
              </div>
              <input
                type="range" min="30" max="99" value={thresholdMonitor}
                onChange={e => {
                  const v = parseInt(e.target.value)
                  setThresholdMonitor(v)
                  if (v <= thresholdReview) setThresholdReview(v - 5)
                  if (v <= thresholdCritical) setThresholdCritical(v - 10)
                }}
                style={{ width: '100%', accentColor: BAND_COLORS.MONITOR }}
              />
            </div>

            {/* Preview bar */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: '#3a4f6a', ...mono }}>0</span>
                <span style={{ fontSize: '10px', color: '#3a4f6a', ...mono }}>100</span>
              </div>
              <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', width: '100%' }}>
                <div style={{ width: `${thresholdCritical}%`, background: BAND_COLORS.CRITICAL }} />
                <div style={{ width: `${thresholdReview - thresholdCritical}%`, background: BAND_COLORS.REVIEW }} />
                <div style={{ width: `${thresholdMonitor - thresholdReview}%`, background: BAND_COLORS.MONITOR }} />
                <div style={{ width: `${100 - thresholdMonitor}%`, background: BAND_COLORS.NOMINAL }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', color: BAND_COLORS.CRITICAL, ...mono }}>Critical &lt;{thresholdCritical}</span>
                <span style={{ fontSize: '11px', color: BAND_COLORS.REVIEW, ...mono }}>Review &lt;{thresholdReview}</span>
                <span style={{ fontSize: '11px', color: BAND_COLORS.MONITOR, ...mono }}>Monitor &lt;{thresholdMonitor}</span>
                <span style={{ fontSize: '11px', color: BAND_COLORS.NOMINAL, ...mono }}>Nominal</span>
              </div>
            </div>
          </div>
        )}

        {/* PREVIEW TAB */}
        {activeTab === 'preview' && (
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px', padding: '32px',
          }}>
            {numerator.length === 0 && denominator.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#3a4f6a', textAlign: 'center', padding: '40px 0', ...mono }}>
                Add variables in the Build tab first
              </p>
            ) : (
              <>
                {/* Score display */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <div style={{
                    fontSize: '72px', fontWeight: 700, lineHeight: 1,
                    color: getBandColor(computePreviewScore(), thresholdCritical, thresholdReview, thresholdMonitor),
                    ...mono,
                  }}>
                    {computePreviewScore()}
                  </div>
                  <div style={{ fontSize: '13px', color: '#3a4f6a', marginTop: '8px', ...mono }}>
                    preview score
                  </div>
                </div>

                {/* Sliders */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '700px', margin: '0 auto' }}>
                  {[...numerator, ...denominator].map(item => {
                    const isNum = numerator.some(n => n.variable_key === item.variable_key)
                    const val = previewValues[item.variable_key] ?? 50
                    return (
                      <div key={item.variable_key} style={{
                        padding: '12px 14px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13px', color: '#e4efff', fontWeight: 500 }}>
                            {item.label}
                          </span>
                          <span style={{
                            fontSize: '12px', fontWeight: 600, ...mono,
                            color: isNum ? '#6EE05A' : '#ef4444',
                          }}>
                            {val}
                          </span>
                        </div>
                        <input
                          type="range" min="0" max="100" value={val}
                          onChange={e => setPreviewValues({ ...previewValues, [item.variable_key]: parseInt(e.target.value) })}
                          style={{ width: '100%', accentColor: isNum ? '#6EE05A' : '#ef4444' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                          <span style={{ fontSize: '10px', color: '#3a4f6a', ...mono }}>0</span>
                          <span style={{
                            fontSize: '10px', ...mono,
                            color: isNum ? 'rgba(110,224,90,0.5)' : 'rgba(239,68,68,0.5)',
                          }}>
                            {isNum ? 'numerator' : 'denominator'} w:{item.weight.toFixed(1)}
                          </span>
                          <span style={{ fontSize: '10px', color: '#3a4f6a', ...mono }}>100</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Save */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', gap: '12px' }}>
          <button
            onClick={() => router.push('/console/exec/formulas')}
            style={{
              padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              color: '#b8cce0', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            style={{
              padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
              background: name.trim() ? '#6EE05A' : 'rgba(110,224,90,0.3)',
              color: '#04060d', border: 'none', cursor: name.trim() ? 'pointer' : 'not-allowed',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Formula'}
          </button>
        </div>
      </div>
    </div>
  )
}
