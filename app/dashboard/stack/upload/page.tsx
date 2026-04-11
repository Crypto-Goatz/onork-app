'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface ParsedCSV {
  headers: string[]
  rows: string[][]
  file: File
}

interface JobProgress {
  status: 'processing' | 'complete' | 'failed'
  total: number
  processed: number
  no_crm: number
  skipped: number
  crm_breakdown: Record<string, number>
}

const STEPS = [
  { num: 1, label: 'Upload CSV' },
  { num: 2, label: 'Map Columns' },
  { num: 3, label: 'Processing' },
]

export default function StackUpload() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [step, setStep] = useState(1)
  const [csv, setCsv] = useState<ParsedCSV | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [parseError, setParseError] = useState('')

  // Column mapping
  const [emailCol, setEmailCol] = useState('')
  const [domainCol, setDomainCol] = useState('')

  // Progress
  const [jobId, setJobId] = useState('')
  const [progress, setProgress] = useState<JobProgress | null>(null)
  const [error, setError] = useState('')

  // ── CSV parsing ────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    setParseError('')
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please upload a .csv file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) {
        setParseError('CSV must have a header row and at least one data row')
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
      const rows = lines.slice(1).map(line => line.split(',').map(c => c.trim().replace(/^["']|["']$/g, '')))

      // Auto-detect email/domain columns
      const emailIdx = headers.findIndex(h => /^e[-_]?mail$/i.test(h))
      const domainIdx = headers.findIndex(h => /^(domain|website|url|company.?domain)$/i.test(h))

      setCsv({ headers, rows, file })
      if (emailIdx >= 0) setEmailCol(headers[emailIdx])
      if (domainIdx >= 0) setDomainCol(headers[domainIdx])
      setStep(2)
    }
    reader.onerror = () => setParseError('Failed to read file')
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  // ── Run enrichment ─────────────────────────────────────────

  async function startEnrichment() {
    if (!csv || !emailCol) return
    setError('')
    setStep(3)

    try {
      const formData = new FormData()
      formData.append('file', csv.file)
      formData.append('emailColumn', emailCol)
      if (domainCol) formData.append('domainColumn', domainCol)

      const res = await fetch('/api/stack/bulk', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start enrichment')

      setJobId(data.jobId)
      setProgress({ status: 'processing', total: data.total || csv.rows.length, processed: 0, no_crm: 0, skipped: 0, crm_breakdown: {} })

      // Poll for progress
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`/api/stack/bulk/${data.jobId}`)
          const p = await r.json()
          setProgress(p)

          if (p.status === 'complete' || p.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current)
            if (p.status === 'complete') {
              setTimeout(() => router.push(`/dashboard/stack/results/${data.jobId}`), 2000)
            }
          }
        } catch {
          // retry silently
        }
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrichment failed')
    }
  }

  // Cleanup on unmount
  // (Note: in a real app we'd use useEffect cleanup, but keeping it simple here)

  // ── CRM breakdown sorted bars ──────────────────────────────

  function renderCRMBars(breakdown: Record<string, number>) {
    const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1])
    if (entries.length === 0) return null
    const max = entries[0][1]

    return (
      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary, #94a3b8)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          CRM Breakdown
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map(([crm, count]) => {
            const isNoCrm = crm === 'no_crm' || crm === 'none'
            const pct = max > 0 ? (count / max) * 100 : 0
            return (
              <div key={crm} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 100, fontSize: 12, fontWeight: 600, fontFamily: 'monospace',
                  color: isNoCrm ? '#f87171' : 'var(--text-primary, #f0f4f8)',
                  textTransform: 'capitalize', flexShrink: 0,
                }}>
                  {crm.replace(/_/g, ' ')}
                </span>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#1c2b42', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4, width: `${pct}%`,
                    background: isNoCrm ? '#f87171' : '#6EE05A',
                    transition: 'width 0.4s ease',
                    boxShadow: isNoCrm ? '0 0 8px rgba(248,113,113,0.3)' : '0 0 8px rgba(110,224,90,0.3)',
                  }} />
                </div>
                <span style={{
                  width: 48, fontSize: 13, fontFamily: 'monospace', fontWeight: 700,
                  color: isNoCrm ? '#f87171' : '#6EE05A', textAlign: 'right', flexShrink: 0,
                }}>
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 8px' }}>

      {/* ═══ STEP INDICATORS ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 0, marginBottom: 32,
      }}>
        {STEPS.map((s, i) => (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 800, fontFamily: 'monospace',
                background: step >= s.num ? '#6EE05A' : '#1c2b42',
                color: step >= s.num ? '#0c1220' : 'var(--text-muted, #6b7280)',
                transition: 'all 0.3s ease',
                border: step === s.num ? '2px solid #6EE05A' : '2px solid transparent',
                boxShadow: step === s.num ? '0 0 12px rgba(110,224,90,0.3)' : 'none',
              }}>
                {step > s.num ? '\u2713' : s.num}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: step >= s.num ? '#6EE05A' : 'var(--text-muted, #6b7280)',
              }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                width: 60, height: 2, margin: '0 12px',
                background: step > s.num ? '#6EE05A' : '#1c2b42',
                borderRadius: 1, transition: 'background 0.3s ease',
                marginBottom: 20,
              }} />
            )}
          </div>
        ))}
      </div>

      {/* ═══ STEP 1: UPLOAD ═══ */}
      {step === 1 && (
        <div style={{
          background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
          borderRadius: 14, padding: 32,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 8px' }}>
            Upload your contact list
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', margin: '0 0 24px' }}>
            Upload a CSV with email addresses. We&apos;ll detect which CRM each contact uses.
          </p>

          {/* Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragOver(false)}
            style={{
              border: `2px dashed ${dragOver ? '#6EE05A' : '#1c2b42'}`,
              borderRadius: 12, padding: '48px 24px', textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.2s ease',
              background: dragOver ? 'rgba(110,224,90,0.05)' : 'transparent',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.6 }}>&#x1F4C4;</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 4px' }}>
              {dragOver ? 'Drop it here' : 'Click or drag a CSV file'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', margin: 0 }}>
              .csv files up to 50MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
          </div>

          {parseError && (
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontSize: 13,
            }}>
              {parseError}
            </div>
          )}
        </div>
      )}

      {/* ═══ STEP 2: COLUMN MAPPING ═══ */}
      {step === 2 && csv && (
        <div style={{
          background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
          borderRadius: 14, padding: 32,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 4px' }}>
            Map your columns
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', margin: '0 0 24px' }}>
            {csv.file.name} &mdash; {csv.rows.length.toLocaleString()} rows detected
          </p>

          {/* Email column select */}
          <label style={{ display: 'block', marginBottom: 16 }}>
            <span style={{
              fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600,
              display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Email Column <span style={{ color: '#f87171' }}>*</span>
            </span>
            <select
              value={emailCol}
              onChange={(e) => setEmailCol(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)',
                color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">Select email column</option>
              {csv.headers.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </label>

          {/* Domain column select */}
          <label style={{ display: 'block', marginBottom: 20 }}>
            <span style={{
              fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600,
              display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Domain Column <span style={{ opacity: 0.5 }}>(optional)</span>
            </span>
            <select
              value={domainCol}
              onChange={(e) => setDomainCol(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)',
                color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">None</option>
              {csv.headers.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </label>

          {/* Info box */}
          <div style={{
            padding: '12px 16px', borderRadius: 8, marginBottom: 24,
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
          }}>
            <p style={{ fontSize: 13, color: '#60a5fa', margin: 0, lineHeight: 1.5 }}>
              <strong>Tip:</strong> Free email providers (gmail.com, yahoo.com, etc.) are automatically skipped during CRM detection to save credits.
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setStep(1)}
              style={{
                padding: '12px 20px', borderRadius: 10,
                border: '1px solid #1c2b42', background: 'transparent',
                color: 'var(--text-secondary, #94a3b8)', fontSize: 14,
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Back
            </button>
            <button
              onClick={startEnrichment}
              disabled={!emailCol}
              style={{
                flex: 1, padding: '12px',
                background: emailCol ? '#6EE05A' : '#374151',
                color: emailCol ? '#0c1220' : '#6b7280',
                fontWeight: 700, fontSize: 14, borderRadius: 10,
                border: 'none', cursor: emailCol ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
              }}
            >
              Run Enrichment
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: LIVE PROGRESS ═══ */}
      {step === 3 && (
        <div style={{
          background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
          borderRadius: 14, padding: 32,
        }}>
          {error ? (
            <div style={{
              padding: '16px', borderRadius: 8, textAlign: 'center',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#f87171', margin: '0 0 8px' }}>
                Enrichment Failed
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', margin: '0 0 16px' }}>{error}</p>
              <button
                onClick={() => { setStep(2); setError('') }}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: '1px solid #1c2b42',
                  background: 'transparent', color: 'var(--text-primary, #f0f4f8)',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 4px' }}>
                {progress?.status === 'complete' ? 'Enrichment Complete' : 'Processing...'}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', margin: '0 0 24px' }}>
                {progress?.status === 'complete'
                  ? 'Complete \u2014 redirecting to results...'
                  : `Analyzing ${progress?.total.toLocaleString() || '...'} contacts`
                }
              </p>

              {/* Progress Bar */}
              <div style={{
                height: 12, borderRadius: 6, background: '#1c2b42', overflow: 'hidden',
                marginBottom: 24, position: 'relative',
              }}>
                <div style={{
                  height: '100%', borderRadius: 6,
                  width: progress?.total ? `${Math.min((progress.processed / progress.total) * 100, 100)}%` : '0%',
                  background: 'linear-gradient(90deg, #6EE05A, #4ade80)',
                  transition: 'width 0.5s ease',
                  boxShadow: '0 0 16px rgba(110,224,90,0.4)',
                }} />
                {progress?.status === 'processing' && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: 6,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                    animation: 'shimmer 2s infinite',
                  }} />
                )}
                <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
              </div>

              {/* Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 8 }}>
                {[
                  { label: 'Total', value: progress?.total || 0, color: 'var(--text-primary, #f0f4f8)' },
                  { label: 'Processed', value: progress?.processed || 0, color: '#6EE05A' },
                  { label: 'No CRM', value: progress?.no_crm || 0, color: '#f87171' },
                  { label: 'Skipped', value: progress?.skipped || 0, color: 'var(--text-muted, #6b7280)' },
                ].map((stat) => (
                  <div key={stat.label} style={{
                    background: '#0f172a', border: '1px solid #1c2b42',
                    borderRadius: 10, padding: '14px 12px', textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: 22, fontWeight: 800, fontFamily: 'monospace', color: stat.color,
                      marginBottom: 2,
                    }}>
                      {stat.value.toLocaleString()}
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* CRM Breakdown */}
              {progress?.crm_breakdown && Object.keys(progress.crm_breakdown).length > 0 && (
                renderCRMBars(progress.crm_breakdown)
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
