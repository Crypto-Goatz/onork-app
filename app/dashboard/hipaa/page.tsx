'use client'

import { useState, useEffect } from 'react'
import { useRole } from '@/lib/use-role'
import { createClient } from '@/lib/supabase/client'
import type { HIPAAResult, HIPAACheck } from '@/lib/hipaa/scanner'

type Tab = 'public' | 'dashboard' | 'universal'

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pass: { bg: 'rgba(126,217,87,0.15)', text: '#7ed957', label: 'PASS' },
  fail: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', label: 'FAIL' },
  warning: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', label: 'WARN' },
  'attestation-required': { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6', label: 'ATTEST' },
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#8b95a5',
}

const GRADE_COLORS: Record<string, string> = {
  A: '#7ed957',
  B: '#3b82f6',
  C: '#f59e0b',
  D: '#f97316',
  F: '#ef4444',
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
]

export default function HIPAAPage() {
  const role = useRole()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<HIPAAResult | null>(null)
  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('public')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [history, setHistory] = useState<Array<{ id: string; company_name: string; current_grade: string; nprm_grade: string; created_at: string }>>([])
  const [sendingReport, setSendingReport] = useState(false)
  const [reportSent, setReportSent] = useState(false)

  // Form state
  const [publicUrl, setPublicUrl] = useState('')
  const [dashboardUrl, setDashboardUrl] = useState('')
  const [entityType, setEntityType] = useState<'covered-entity' | 'business-associate' | 'both' | 'unsure'>('unsure')
  const [employeeCount, setEmployeeCount] = useState('')
  const [primaryState, setPrimaryState] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  // Guard: admin only
  if (!role.loading && !role.isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#8b95a5' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>403</div>
        <div>This tool is restricted to administrators.</div>
      </div>
    )
  }

  // Load history on mount
  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const res = await fetch('/api/hipaa/report?assessmentId=history', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      // This will 404 for "history" — we load from supabase directly
    } catch {}

    // Use admin client via supabase
    const { data } = await supabase
      .from('hipaa_assessments')
      .select('id, company_name, current_grade, nprm_grade, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) setHistory(data)
  }

  async function runScan() {
    setLoading(true)
    setError('')
    setResult(null)
    setAssessmentId(null)
    setReportSent(false)

    setProgress('Initializing scanner...')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    setProgress('Running 51 HIPAA compliance checks...')
    try {
      const res = await fetch('/api/hipaa/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          publicUrl,
          dashboardUrl,
          entityType,
          employeeCount,
          primaryState,
          companyName,
          contactEmail,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || `Scan failed (${res.status})`)
        setLoading(false)
        setProgress('')
        return
      }

      const data = await res.json()
      setResult(data.result)
      setAssessmentId(data.assessmentId)
      setProgress('')
      loadHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
      setProgress('')
    }
    setLoading(false)
  }

  async function sendReport() {
    if (!assessmentId || !contactEmail) return
    setSendingReport(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSendingReport(false); return }

    try {
      const res = await fetch('/api/hipaa/voice-trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          assessmentId,
          contactEmail,
          companyName,
          contactName: companyName,
        }),
      })
      if (res.ok) setReportSent(true)
    } catch {}
    setSendingReport(false)
  }

  function loadAssessment(id: string) {
    // Fetch from Supabase directly
    supabase
      .from('hipaa_assessments')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!data) return
        const r = data.results as Record<string, unknown>
        setResult({
          companyName: data.company_name,
          publicUrl: data.public_url,
          dashboardUrl: data.dashboard_url,
          scanDate: data.created_at,
          auditor: '0nCore HIPAA Scanner v1.0',
          currentRuleScore: data.current_rule_score,
          nprm2026Score: data.nprm_2026_score,
          currentGrade: data.current_grade,
          nprmGrade: data.nprm_grade,
          publicChecks: (r.publicChecks || []) as HIPAACheck[],
          dashboardChecks: (r.dashboardChecks || []) as HIPAACheck[],
          universalChecks: (r.universalChecks || []) as HIPAACheck[],
          criticalFindings: (r.criticalFindings || 0) as number,
          highFindings: (r.highFindings || 0) as number,
          mediumFindings: (r.mediumFindings || 0) as number,
          lowFindings: (r.lowFindings || 0) as number,
          passCount: (r.passCount || 0) as number,
          failCount: (r.failCount || 0) as number,
          stateOverlay: r.stateOverlay as HIPAAResult['stateOverlay'],
          remediationPriority: (data.remediation || []) as HIPAAResult['remediationPriority'],
        })
        setAssessmentId(id)
        setCompanyName(data.company_name)
        setContactEmail(data.contact_email || '')
        setPublicUrl(data.public_url)
        setDashboardUrl(data.dashboard_url)
      })
  }

  function renderChecks(checks: HIPAACheck[]) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {checks.map(c => {
          const st = STATUS_COLORS[c.status] || STATUS_COLORS.fail
          return (
            <div key={c.id} style={{
              background: 'var(--bg-card, #161b22)',
              border: '1px solid var(--border, #1e293b)',
              borderRadius: 8,
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#8b95a5',
                    minWidth: 60,
                  }}>{c.id}</span>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary, #f0f4f8)' }}>{c.name}</span>
                  <span style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: `${SEVERITY_COLORS[c.severity]}20`,
                    color: SEVERITY_COLORS[c.severity],
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}>{c.severity}</span>
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 4,
                  background: st.bg,
                  color: st.text,
                }}>{st.label}</span>
              </div>
              <div style={{ fontSize: 12, color: '#8b95a5', paddingLeft: 70 }}>
                <span style={{ color: '#6b7280' }}>{c.ruleSection}</span> &middot; {c.detail}
              </div>
              {c.remediation && c.status !== 'pass' && (
                <div style={{ fontSize: 11, color: '#f59e0b', paddingLeft: 70, fontStyle: 'italic' }}>
                  Remediation: {c.remediation}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--bg-card, #161b22)',
    border: '1px solid var(--border, #1e293b)',
    borderRadius: 8,
    color: 'var(--text-primary, #f0f4f8)',
    fontSize: 14,
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: '#8b95a5',
    marginBottom: 4,
    display: 'block',
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #ef4444, #f97316)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="22" height="22" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary, #f0f4f8)', margin: 0 }}>
              HIPAA 2026 Readiness Scanner
            </h1>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: 4,
              background: 'rgba(239,68,68,0.15)',
              color: '#ef4444',
              letterSpacing: 1,
            }}>PRIVATE</span>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: 4,
              background: 'rgba(168,85,247,0.15)',
              color: '#a855f7',
              letterSpacing: 1,
            }}>UNLIMITED</span>
          </div>
          <div style={{ fontSize: 12, color: '#8b95a5', marginTop: 2 }}>
            51 checks &middot; Current Rule + NPRM 2026 scoring &middot; Passive scan only
          </div>
        </div>
      </div>

      {/* Input form */}
      {!result && (
        <div style={{
          background: 'var(--bg-card, #161b22)',
          border: '1px solid var(--border, #1e293b)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Company Name *</label>
              <input style={inputStyle} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Healthcare" />
            </div>
            <div>
              <label style={labelStyle}>Contact Email</label>
              <input style={inputStyle} type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="compliance@acme.com" />
            </div>
            <div>
              <label style={labelStyle}>Public Website URL *</label>
              <input style={inputStyle} value={publicUrl} onChange={e => setPublicUrl(e.target.value)} placeholder="https://acme-health.com" />
            </div>
            <div>
              <label style={labelStyle}>Dashboard / Portal URL *</label>
              <input style={inputStyle} value={dashboardUrl} onChange={e => setDashboardUrl(e.target.value)} placeholder="https://portal.acme-health.com" />
            </div>
            <div>
              <label style={labelStyle}>Entity Type</label>
              <select style={inputStyle} value={entityType} onChange={e => setEntityType(e.target.value as typeof entityType)}>
                <option value="unsure">Not Sure</option>
                <option value="covered-entity">Covered Entity</option>
                <option value="business-associate">Business Associate</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Employee Count</label>
              <select style={inputStyle} value={employeeCount} onChange={e => setEmployeeCount(e.target.value)}>
                <option value="">Select...</option>
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="51-200">51-200</option>
                <option value="201-500">201-500</option>
                <option value="500+">500+</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Primary State</label>
              <select style={inputStyle} value={primaryState} onChange={e => setPrimaryState(e.target.value)}>
                <option value="">Select state...</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 16, padding: '10px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={runScan}
              disabled={loading || !publicUrl || !dashboardUrl || !companyName}
              style={{
                padding: '12px 28px',
                borderRadius: 8,
                border: 'none',
                background: loading ? '#333' : 'linear-gradient(135deg, #ef4444, #f97316)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: (!publicUrl || !dashboardUrl || !companyName) ? 0.5 : 1,
              }}
            >
              {loading ? 'Scanning...' : 'Run Assessment'}
            </button>
            {progress && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 16, height: 16, border: '2px solid #f97316', borderTopColor: 'transparent',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                }} />
                <span style={{ fontSize: 13, color: '#f59e0b' }}>{progress}</span>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div>
          {/* Back / Actions bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button
              onClick={() => setResult(null)}
              style={{
                padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border, #1e293b)',
                background: 'transparent', color: '#8b95a5', fontSize: 13, cursor: 'pointer',
              }}
            >
              &larr; New Scan
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              {contactEmail && (
                <button
                  onClick={sendReport}
                  disabled={sendingReport || reportSent}
                  style={{
                    padding: '8px 16px', borderRadius: 6, border: 'none',
                    background: reportSent ? 'rgba(126,217,87,0.15)' : '#7ed957',
                    color: reportSent ? '#7ed957' : '#000',
                    fontSize: 13, fontWeight: 700, cursor: reportSent ? 'default' : 'pointer',
                  }}
                >
                  {reportSent ? 'Report Sent' : sendingReport ? 'Sending...' : 'Send Report to Prospect'}
                </button>
              )}
            </div>
          </div>

          {/* Score rings */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            marginBottom: 24,
          }}>
            {[
              { label: 'Current HIPAA Rule', score: result.currentRuleScore, gradeVal: result.currentGrade },
              { label: '2026 NPRM Projected', score: result.nprm2026Score, gradeVal: result.nprmGrade },
            ].map(({ label, score, gradeVal }) => (
              <div key={label} style={{
                background: 'var(--bg-card, #161b22)',
                border: '1px solid var(--border, #1e293b)',
                borderRadius: 12,
                padding: 24,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, color: '#8b95a5', marginBottom: 12, fontWeight: 600 }}>{label}</div>
                <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto' }}>
                  <svg viewBox="0 0 120 120" width={120} height={120}>
                    <circle cx={60} cy={60} r={52} fill="none" stroke="#1e293b" strokeWidth={8} />
                    <circle
                      cx={60} cy={60} r={52} fill="none"
                      stroke={GRADE_COLORS[gradeVal] || '#8b95a5'}
                      strokeWidth={8}
                      strokeLinecap="round"
                      strokeDasharray={`${(score / 100) * 327} 327`}
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: GRADE_COLORS[gradeVal] || '#8b95a5' }}>{score}</div>
                    <div style={{ fontSize: 11, color: '#8b95a5' }}>/100</div>
                  </div>
                </div>
                <div style={{
                  marginTop: 12,
                  display: 'inline-block',
                  padding: '4px 16px',
                  borderRadius: 6,
                  background: `${GRADE_COLORS[gradeVal] || '#8b95a5'}20`,
                  color: GRADE_COLORS[gradeVal] || '#8b95a5',
                  fontSize: 18,
                  fontWeight: 800,
                }}>
                  Grade: {gradeVal}
                </div>
              </div>
            ))}
          </div>

          {/* Summary stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            marginBottom: 24,
          }}>
            {[
              { label: 'Critical', count: result.criticalFindings, color: '#ef4444' },
              { label: 'High', count: result.highFindings, color: '#f97316' },
              { label: 'Medium', count: result.mediumFindings, color: '#f59e0b' },
              { label: 'Passed', count: result.passCount, color: '#7ed957' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--bg-card, #161b22)',
                border: '1px solid var(--border, #1e293b)',
                borderRadius: 8,
                padding: '14px 16px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.count}</div>
                <div style={{ fontSize: 11, color: '#8b95a5', fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Company + scan info */}
          <div style={{
            background: 'var(--bg-card, #161b22)',
            border: '1px solid var(--border, #1e293b)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 24,
            fontSize: 12,
            color: '#8b95a5',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 24px',
          }}>
            <span><strong style={{ color: 'var(--text-primary, #f0f4f8)' }}>{result.companyName}</strong></span>
            <span>Public: {result.publicUrl}</span>
            <span>Dashboard: {result.dashboardUrl}</span>
            <span>Scanned: {new Date(result.scanDate).toLocaleString()}</span>
            {result.stateOverlay && (
              <span style={{ color: '#f59e0b' }}>
                State: {result.stateOverlay.state} ({result.stateOverlay.law})
              </span>
            )}
          </div>

          {/* State overlay detail */}
          {result.stateOverlay && (
            <div style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 24,
              fontSize: 12,
              color: '#f59e0b',
            }}>
              <strong>State Overlay: {result.stateOverlay.state} - {result.stateOverlay.law}</strong>
              <div style={{ marginTop: 4, color: '#d4a' }}>{result.stateOverlay.relevance}</div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
            {([
              { key: 'public' as Tab, label: `Public URL (${result.publicChecks.length})` },
              { key: 'dashboard' as Tab, label: `Dashboard URL (${result.dashboardChecks.length})` },
              { key: 'universal' as Tab, label: `Universal (${result.universalChecks.length})` },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: tab === t.key ? '1px solid var(--border, #1e293b)' : '1px solid transparent',
                  background: tab === t.key ? 'var(--bg-card, #161b22)' : 'transparent',
                  color: tab === t.key ? 'var(--text-primary, #f0f4f8)' : '#8b95a5',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Check results */}
          {tab === 'public' && renderChecks(result.publicChecks)}
          {tab === 'dashboard' && renderChecks(result.dashboardChecks)}
          {tab === 'universal' && renderChecks(result.universalChecks)}

          {/* Remediation roadmap */}
          {result.remediationPriority.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', marginBottom: 12 }}>
                Remediation Roadmap
              </h2>
              <div style={{
                background: 'var(--bg-card, #161b22)',
                border: '1px solid var(--border, #1e293b)',
                borderRadius: 12,
                overflow: 'hidden',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border, #1e293b)' }}>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: '#8b95a5', fontWeight: 600, fontSize: 11 }}>#</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: '#8b95a5', fontWeight: 600, fontSize: 11 }}>Check</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: '#8b95a5', fontWeight: 600, fontSize: 11 }}>Name</th>
                      <th style={{ textAlign: 'center', padding: '10px 14px', color: '#8b95a5', fontWeight: 600, fontSize: 11 }}>Effort</th>
                      <th style={{ textAlign: 'center', padding: '10px 14px', color: '#8b95a5', fontWeight: 600, fontSize: 11 }}>Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.remediationPriority.map(r => (
                      <tr key={r.checkId} style={{ borderBottom: '1px solid rgba(30,41,59,0.5)' }}>
                        <td style={{ padding: '8px 14px', color: '#f59e0b', fontWeight: 700 }}>{r.priority}</td>
                        <td style={{ padding: '8px 14px', fontFamily: 'monospace', color: '#8b95a5' }}>{r.checkId}</td>
                        <td style={{ padding: '8px 14px', color: 'var(--text-primary, #f0f4f8)' }}>{r.name}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                            background: r.effort === 'low' ? 'rgba(126,217,87,0.15)' : r.effort === 'medium' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                            color: r.effort === 'low' ? '#7ed957' : r.effort === 'medium' ? '#f59e0b' : '#ef4444',
                          }}>{r.effort.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                            background: r.impact === 'critical' ? 'rgba(239,68,68,0.15)' : r.impact === 'high' ? 'rgba(249,115,22,0.15)' : 'rgba(245,158,11,0.15)',
                            color: r.impact === 'critical' ? '#ef4444' : r.impact === 'high' ? '#f97316' : '#f59e0b',
                          }}>{r.impact.toUpperCase()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assessment history */}
      {history.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', marginBottom: 12 }}>
            Assessment History
          </h2>
          <div style={{
            background: 'var(--bg-card, #161b22)',
            border: '1px solid var(--border, #1e293b)',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            {history.map(h => (
              <button
                key={h.id}
                onClick={() => loadAssessment(h.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(30,41,59,0.5)',
                  background: 'transparent',
                  border: 'none',
                  borderBottomWidth: 1,
                  borderBottomStyle: 'solid',
                  borderBottomColor: 'rgba(30,41,59,0.5)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--text-primary, #f0f4f8)',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13 }}>{h.company_name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    background: `${GRADE_COLORS[h.current_grade] || '#8b95a5'}20`,
                    color: GRADE_COLORS[h.current_grade] || '#8b95a5',
                  }}>{h.current_grade}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    background: `${GRADE_COLORS[h.nprm_grade] || '#8b95a5'}20`,
                    color: GRADE_COLORS[h.nprm_grade] || '#8b95a5',
                  }}>NPRM: {h.nprm_grade}</span>
                  <span style={{ fontSize: 11, color: '#8b95a5' }}>
                    {new Date(h.created_at).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
