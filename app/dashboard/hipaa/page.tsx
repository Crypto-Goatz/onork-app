'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, ArrowLeft, Send, CheckCircle, Loader2 } from 'lucide-react'
import { useRole } from '@/lib/use-role'
import { createClient } from '@/lib/supabase/client'
import type { HIPAAResult, HIPAACheck } from '@/lib/hipaa/scanner'

type Tab = 'public' | 'dashboard' | 'universal'

// Tailwind class maps — keyed by status / severity / grade
const STATUS_CLASSES: Record<string, { bg: string; text: string; label: string }> = {
  pass:                   { bg: 'bg-core-green/15',  text: 'text-core-green',  label: 'PASS'   },
  fail:                   { bg: 'bg-core-red/15',    text: 'text-core-red',    label: 'FAIL'   },
  warning:                { bg: 'bg-core-amber/15',  text: 'text-core-amber',  label: 'WARN'   },
  'attestation-required': { bg: 'bg-core-cyan/15',   text: 'text-core-cyan',   label: 'ATTEST' },
}

const SEVERITY_TEXT: Record<string, string> = {
  critical: 'text-core-red',
  high:     'text-orange-500',
  medium:   'text-core-amber',
  low:      'text-core-text-muted',
}

const SEVERITY_BG: Record<string, string> = {
  critical: 'bg-core-red/10',
  high:     'bg-orange-500/10',
  medium:   'bg-core-amber/10',
  low:      'bg-core-text-muted/10',
}

const GRADE_TEXT: Record<string, string> = {
  A: 'text-core-green',
  B: 'text-core-cyan',
  C: 'text-core-amber',
  D: 'text-orange-500',
  F: 'text-core-red',
}

const GRADE_BG: Record<string, string> = {
  A: 'bg-core-green/15',
  B: 'bg-core-cyan/15',
  C: 'bg-core-amber/15',
  D: 'bg-orange-500/15',
  F: 'bg-core-red/15',
}

// SVG stroke colors for the score ring (must be inline — SVG attribute, not CSS class)
const GRADE_STROKE: Record<string, string> = {
  A: '#7ed957',
  B: '#22d3ee',
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
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl font-black text-core-text mb-4">403</div>
        <div className="text-core-text-muted">This tool is restricted to administrators.</div>
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
      await fetch('/api/hipaa/report?assessmentId=history', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
    } catch {}

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
      <div className="flex flex-col gap-2">
        {checks.map(c => {
          const st = STATUS_CLASSES[c.status] || STATUS_CLASSES.fail
          return (
            <div
              key={c.id}
              className="bg-core-card border border-core-border rounded-lg px-4 py-3 flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="font-mono text-[11px] font-bold text-core-text-muted min-w-[60px] shrink-0">
                    {c.id}
                  </span>
                  <span className="font-semibold text-[13px] text-core-text truncate">
                    {c.name}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${SEVERITY_BG[c.severity]} ${SEVERITY_TEXT[c.severity]}`}>
                    {c.severity}
                  </span>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded shrink-0 ${st.bg} ${st.text}`}>
                  {st.label}
                </span>
              </div>
              <div className="text-[12px] text-core-text-muted pl-[70px]">
                <span className="text-core-text-muted/60">{c.ruleSection}</span>
                {' · '}
                {c.detail}
              </div>
              {c.remediation && c.status !== 'pass' && (
                <div className="text-[11px] text-core-amber pl-[70px] italic">
                  Remediation: {c.remediation}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const fieldClass = 'w-full px-3.5 py-2.5 bg-core-card border border-core-border rounded-lg text-core-text text-sm outline-none focus:border-core-border-hi transition-colors'
  const labelClass = 'block text-[12px] font-semibold text-core-text-muted mb-1'

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-core-red to-orange-500 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[22px] font-black text-core-text m-0">
              HIPAA 2026 Readiness Scanner
            </h1>
            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-core-red/15 text-core-red tracking-widest">
              PRIVATE
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-core-purple/15 text-core-purple tracking-widest">
              UNLIMITED
            </span>
          </div>
          <div className="text-[12px] text-core-text-muted mt-0.5">
            51 checks &middot; Current Rule + NPRM 2026 scoring &middot; Passive scan only
          </div>
        </div>
      </div>

      {/* Input form */}
      {!result && (
        <div className="bg-core-card border border-core-border rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Company Name *</label>
              <input
                className={fieldClass}
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Acme Healthcare"
              />
            </div>
            <div>
              <label className={labelClass}>Contact Email</label>
              <input
                className={fieldClass}
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="compliance@acme.com"
              />
            </div>
            <div>
              <label className={labelClass}>Public Website URL *</label>
              <input
                className={fieldClass}
                value={publicUrl}
                onChange={e => setPublicUrl(e.target.value)}
                placeholder="https://acme-health.com"
              />
            </div>
            <div>
              <label className={labelClass}>Dashboard / Portal URL *</label>
              <input
                className={fieldClass}
                value={dashboardUrl}
                onChange={e => setDashboardUrl(e.target.value)}
                placeholder="https://portal.acme-health.com"
              />
            </div>
            <div>
              <label className={labelClass}>Entity Type</label>
              <select
                className={fieldClass}
                value={entityType}
                onChange={e => setEntityType(e.target.value as typeof entityType)}
              >
                <option value="unsure">Not Sure</option>
                <option value="covered-entity">Covered Entity</option>
                <option value="business-associate">Business Associate</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Employee Count</label>
              <select
                className={fieldClass}
                value={employeeCount}
                onChange={e => setEmployeeCount(e.target.value)}
              >
                <option value="">Select...</option>
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="51-200">51-200</option>
                <option value="201-500">201-500</option>
                <option value="500+">500+</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Primary State</label>
              <select
                className={fieldClass}
                value={primaryState}
                onChange={e => setPrimaryState(e.target.value)}
              >
                <option value="">Select state...</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-4 px-4 py-2.5 rounded-lg bg-core-red/10 text-core-red text-[13px]">
              {error}
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={runScan}
              disabled={loading || !publicUrl || !dashboardUrl || !companyName}
              className={[
                'px-7 py-3 rounded-lg border-none text-white text-[14px] font-bold transition-opacity',
                loading
                  ? 'bg-core-surface cursor-not-allowed'
                  : 'bg-gradient-to-br from-core-red to-orange-500 cursor-pointer',
                (!publicUrl || !dashboardUrl || !companyName) ? 'opacity-50' : 'opacity-100',
              ].join(' ')}
            >
              {loading ? 'Scanning...' : 'Run Assessment'}
            </button>

            {progress && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                <span className="text-[13px] text-core-amber">{progress}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div>
          {/* Back / Actions bar */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setResult(null)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-core-border bg-transparent text-core-text-muted text-[13px] cursor-pointer hover:text-core-text transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              New Scan
            </button>

            <div className="flex gap-2">
              {contactEmail && (
                <button
                  onClick={sendReport}
                  disabled={sendingReport || reportSent}
                  className={[
                    'flex items-center gap-1.5 px-4 py-2 rounded-md border-none text-[13px] font-bold transition-all',
                    reportSent
                      ? 'bg-core-green/15 text-core-green cursor-default'
                      : 'bg-core-green text-black cursor-pointer hover:opacity-90',
                  ].join(' ')}
                >
                  {reportSent
                    ? <><CheckCircle className="w-4 h-4" /> Report Sent</>
                    : sendingReport
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                      : <><Send className="w-4 h-4" /> Send Report to Prospect</>
                  }
                </button>
              )}
            </div>
          </div>

          {/* Score rings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {[
              { label: 'Current HIPAA Rule',   score: result.currentRuleScore, gradeVal: result.currentGrade },
              { label: '2026 NPRM Projected',  score: result.nprm2026Score,    gradeVal: result.nprmGrade    },
            ].map(({ label, score, gradeVal }) => {
              const strokeColor = GRADE_STROKE[gradeVal] ?? '#8b95a5'
              return (
                <div
                  key={label}
                  className="bg-core-card border border-core-border rounded-xl p-6 text-center"
                >
                  <div className="text-[12px] text-core-text-muted mb-3 font-semibold">{label}</div>
                  <div className="relative w-[120px] h-[120px] mx-auto">
                    <svg viewBox="0 0 120 120" width={120} height={120}>
                      <circle cx={60} cy={60} r={52} fill="none" stroke="#1e293b" strokeWidth={8} />
                      <circle
                        cx={60} cy={60} r={52} fill="none"
                        stroke={strokeColor}
                        strokeWidth={8}
                        strokeLinecap="round"
                        strokeDasharray={`${(score / 100) * 327} 327`}
                        transform="rotate(-90 60 60)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div
                        className={`text-[28px] font-black ${GRADE_TEXT[gradeVal] ?? 'text-core-text-muted'}`}
                      >
                        {score}
                      </div>
                      <div className="text-[11px] text-core-text-muted">/100</div>
                    </div>
                  </div>
                  <div
                    className={`mt-3 inline-block px-4 py-1 rounded-md text-[18px] font-black ${GRADE_BG[gradeVal] ?? 'bg-core-text-muted/15'} ${GRADE_TEXT[gradeVal] ?? 'text-core-text-muted'}`}
                  >
                    Grade: {gradeVal}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Critical', count: result.criticalFindings, colorClass: 'text-core-red'   },
              { label: 'High',     count: result.highFindings,    colorClass: 'text-orange-500'  },
              { label: 'Medium',   count: result.mediumFindings,  colorClass: 'text-core-amber'  },
              { label: 'Passed',   count: result.passCount,       colorClass: 'text-core-green'  },
            ].map(s => (
              <div
                key={s.label}
                className="bg-core-card border border-core-border rounded-lg px-4 py-3.5 text-center"
              >
                <div className={`text-[24px] font-black ${s.colorClass}`}>{s.count}</div>
                <div className="text-[11px] text-core-text-muted font-semibold">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Company + scan info */}
          <div className="bg-core-card border border-core-border rounded-lg px-4 py-3 mb-6 text-[12px] text-core-text-muted flex flex-wrap gap-x-6 gap-y-2">
            <span>
              <strong className="text-core-text">{result.companyName}</strong>
            </span>
            <span>Public: {result.publicUrl}</span>
            <span>Dashboard: {result.dashboardUrl}</span>
            <span>Scanned: {new Date(result.scanDate).toLocaleString()}</span>
            {result.stateOverlay && (
              <span className="text-core-amber">
                State: {result.stateOverlay.state} ({result.stateOverlay.law})
              </span>
            )}
          </div>

          {/* State overlay detail */}
          {result.stateOverlay && (
            <div className="bg-core-amber/[0.08] border border-core-amber/20 rounded-lg px-4 py-3 mb-6 text-[12px] text-core-amber">
              <strong>
                State Overlay: {result.stateOverlay.state} - {result.stateOverlay.law}
              </strong>
              <div className="mt-1 text-core-amber/70">{result.stateOverlay.relevance}</div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-4">
            {([
              { key: 'public'    as Tab, label: `Public URL (${result.publicChecks.length})`     },
              { key: 'dashboard' as Tab, label: `Dashboard URL (${result.dashboardChecks.length})` },
              { key: 'universal' as Tab, label: `Universal (${result.universalChecks.length})`   },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={[
                  'px-4 py-2 rounded-md text-[13px] font-semibold cursor-pointer transition-colors',
                  tab === t.key
                    ? 'bg-core-card border border-core-border text-core-text'
                    : 'bg-transparent border border-transparent text-core-text-muted hover:text-core-text',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Check results */}
          {tab === 'public'    && renderChecks(result.publicChecks)}
          {tab === 'dashboard' && renderChecks(result.dashboardChecks)}
          {tab === 'universal' && renderChecks(result.universalChecks)}

          {/* Remediation roadmap */}
          {result.remediationPriority.length > 0 && (
            <div className="mt-8">
              <h2 className="text-[16px] font-bold text-core-text mb-3">
                Remediation Roadmap
              </h2>
              <div className="bg-core-card border border-core-border rounded-xl overflow-hidden">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-core-border">
                      <th className="text-left px-3.5 py-2.5 text-core-text-muted font-semibold text-[11px]">#</th>
                      <th className="text-left px-3.5 py-2.5 text-core-text-muted font-semibold text-[11px]">Check</th>
                      <th className="text-left px-3.5 py-2.5 text-core-text-muted font-semibold text-[11px]">Name</th>
                      <th className="text-center px-3.5 py-2.5 text-core-text-muted font-semibold text-[11px]">Effort</th>
                      <th className="text-center px-3.5 py-2.5 text-core-text-muted font-semibold text-[11px]">Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.remediationPriority.map(r => (
                      <tr key={r.checkId} className="border-b border-core-border/50">
                        <td className="px-3.5 py-2 text-core-amber font-bold">{r.priority}</td>
                        <td className="px-3.5 py-2 font-mono text-core-text-muted">{r.checkId}</td>
                        <td className="px-3.5 py-2 text-core-text">{r.name}</td>
                        <td className="px-3.5 py-2 text-center">
                          <span className={[
                            'text-[10px] font-bold px-2 py-0.5 rounded',
                            r.effort === 'low'    ? 'bg-core-green/15 text-core-green'   :
                            r.effort === 'medium' ? 'bg-core-amber/15 text-core-amber'   :
                                                    'bg-core-red/15   text-core-red',
                          ].join(' ')}>
                            {r.effort.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3.5 py-2 text-center">
                          <span className={[
                            'text-[10px] font-bold px-2 py-0.5 rounded',
                            r.impact === 'critical' ? 'bg-core-red/15    text-core-red'    :
                            r.impact === 'high'     ? 'bg-orange-500/15  text-orange-500'  :
                                                      'bg-core-amber/15  text-core-amber',
                          ].join(' ')}>
                            {r.impact.toUpperCase()}
                          </span>
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
        <div className="mt-8">
          <h2 className="text-[16px] font-bold text-core-text mb-3">
            Assessment History
          </h2>
          <div className="bg-core-card border border-core-border rounded-xl overflow-hidden">
            {history.map(h => (
              <button
                key={h.id}
                onClick={() => loadAssessment(h.id)}
                className="flex items-center justify-between w-full px-4 py-3 border-b border-core-border/50 last:border-b-0 bg-transparent cursor-pointer text-left hover:bg-core-card-hover transition-colors"
              >
                <span className="font-semibold text-[13px] text-core-text">{h.company_name}</span>
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${GRADE_BG[h.current_grade] ?? 'bg-core-text-muted/15'} ${GRADE_TEXT[h.current_grade] ?? 'text-core-text-muted'}`}>
                    {h.current_grade}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${GRADE_BG[h.nprm_grade] ?? 'bg-core-text-muted/15'} ${GRADE_TEXT[h.nprm_grade] ?? 'text-core-text-muted'}`}>
                    NPRM: {h.nprm_grade}
                  </span>
                  <span className="text-[11px] text-core-text-muted">
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
