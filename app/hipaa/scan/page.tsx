'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface ScanResult {
  currentRuleScore: number
  nprm2026Score: number
  currentGrade: string
  nprmGrade: string
  criticalFindings: number
  highFindings: number
  topFindings: { name: string; severity: string; detail: string }[]
}

const SCAN_STEPS = [
  'Resolving DNS and checking connectivity...',
  'Analyzing TLS configuration and certificates...',
  'Scanning HTTP security headers...',
  'Checking privacy disclosures and NPP...',
  'Testing authentication endpoint security...',
  'Scanning for data exposure risks...',
  'Evaluating against 2026 NPRM requirements...',
  'Generating dual compliance scores...',
]

function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return '#7ed957'
  if (grade.startsWith('B')) return '#a8e063'
  if (grade.startsWith('C')) return '#ffd93d'
  if (grade.startsWith('D')) return '#ff8c42'
  return '#ff6b6b'
}

function severityColor(severity: string): string {
  if (severity === 'critical') return '#ff4444'
  if (severity === 'high') return '#ff8c42'
  if (severity === 'medium') return '#ffd93d'
  return '#7ed957'
}

function ScoreCircle({ score, grade, label, color }: { score: number; grade: string; label: string; color: string }) {
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="140" height="140" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
        />
        <text x="60" y="52" textAnchor="middle" fill="#fff" fontSize="28" fontWeight="800">{score}</text>
        <text x="60" y="72" textAnchor="middle" fill={color} fontSize="16" fontWeight="700">{grade}</text>
      </svg>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8, fontWeight: 600 }}>{label}</div>
    </div>
  )
}

function ScanContent() {
  const params = useSearchParams()
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(true)

  const runScan = useCallback(async () => {
    const url = params.get('url')
    const dashboardUrl = params.get('dashboardUrl')
    const email = params.get('email')
    const entityType = params.get('entityType') || 'unsure'
    const state = params.get('state') || ''

    if (!url || !dashboardUrl || !email) {
      setError('Missing required fields. Please go back and fill in the form.')
      setScanning(false)
      return
    }

    // Animate steps
    const stepInterval = setInterval(() => {
      setStep(s => {
        if (s < SCAN_STEPS.length - 1) return s + 1
        return s
      })
    }, 2200)

    try {
      const res = await fetch('/api/hipaa/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public: true,
          publicUrl: url,
          dashboardUrl,
          contactEmail: email,
          entityType,
          primaryState: state,
          companyName: new URL(url).hostname.replace('www.', ''),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Scan failed')
      }

      clearInterval(stepInterval)
      setStep(SCAN_STEPS.length)

      // Map response to our limited public result
      const r = data.result
      setResult({
        currentRuleScore: r.currentRuleScore,
        nprm2026Score: r.nprm2026Score,
        currentGrade: r.currentGrade,
        nprmGrade: r.nprmGrade,
        criticalFindings: r.criticalFindings,
        highFindings: r.highFindings,
        topFindings: data.topFindings || [],
      })
    } catch (err) {
      clearInterval(stepInterval)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setScanning(false)
    }
  }, [params])

  useEffect(() => {
    runScan()
  }, [runScan])

  return (
    <div style={{ background: '#020810', color: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'clamp(10px, 2vw, 12px) clamp(16px, 4vw, 32px)',
        background: 'rgba(2,8,16,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/brand/0ncore-logo.png" alt="0nCore" style={{ height: 32, objectFit: 'contain' }} />
        </Link>
        <Link href="/hipaa" style={{ fontSize: 13, color: '#7ed957', textDecoration: 'none', fontWeight: 600 }}>
          &larr; Back to Assessment
        </Link>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(100px, 15vw, 140px) clamp(16px, 4vw, 24px) 60px' }}>

        {/* SCANNING STATE */}
        {scanning && !error && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: 8 }}>
              Scanning Your Website...
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 48 }}>
              Running 51 HIPAA compliance checks. This takes about 30 seconds.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', maxWidth: 480, margin: '0 auto' }}>
              {SCAN_STEPS.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  opacity: i <= step ? 1 : 0.2,
                  transition: 'opacity 0.5s ease',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i < step ? 'rgba(126,217,87,0.15)' : i === step ? 'rgba(126,217,87,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${i < step ? 'rgba(126,217,87,0.3)' : i === step ? 'rgba(126,217,87,0.15)' : 'rgba(255,255,255,0.06)'}`,
                    fontSize: 11, fontWeight: 700,
                    color: i <= step ? '#7ed957' : 'rgba(255,255,255,0.2)',
                  }}>
                    {i < step ? '\u2713' : i === step ? '\u2022' : (i + 1)}
                  </div>
                  <span style={{ fontSize: 13, color: i <= step ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)' }}>{s}</span>
                </div>
              ))}
            </div>
            {/* Pulsing bar */}
            <div style={{
              marginTop: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.04)',
              overflow: 'hidden', maxWidth: 480, margin: '40px auto 0',
            }}>
              <div style={{
                height: '100%', borderRadius: 2, background: '#7ed957',
                width: `${Math.min(((step + 1) / SCAN_STEPS.length) * 100, 100)}%`,
                transition: 'width 0.8s ease',
              }} />
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {error && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: 12 }}>Scan Error</h1>
            <p style={{ fontSize: 15, color: '#ff6b6b', marginBottom: 32 }}>{error}</p>
            <Link href="/hipaa" style={{
              padding: '14px 32px', background: '#7ed957', color: '#020810',
              fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontSize: 15,
            }}>Try Again</Link>
          </div>
        )}

        {/* RESULTS */}
        {result && !scanning && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h1 style={{
                fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: 8,
                background: 'linear-gradient(135deg, #7ed957 0%, #00d4ff 50%, #a78bfa 100%)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent',
                display: 'inline-block',
              }}>
                Your HIPAA Readiness Scores
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
                Scanned {params.get('url')} on {new Date().toLocaleDateString()}
              </p>
            </div>

            {/* Score Circles */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(32px, 6vw, 80px)', marginBottom: 48, flexWrap: 'wrap' }}>
              <ScoreCircle
                score={result.currentRuleScore}
                grade={result.currentGrade}
                label="Current HIPAA Rule"
                color={gradeColor(result.currentGrade)}
              />
              <ScoreCircle
                score={result.nprm2026Score}
                grade={result.nprmGrade}
                label="2026 NPRM Readiness"
                color={gradeColor(result.nprmGrade)}
              />
            </div>

            {/* Critical Findings Badge */}
            {(result.criticalFindings > 0 || result.highFindings > 0) && (
              <div style={{
                display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 40, flexWrap: 'wrap',
              }}>
                {result.criticalFindings > 0 && (
                  <div style={{
                    padding: '10px 20px', borderRadius: 10,
                    background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)',
                    fontSize: 14, fontWeight: 700, color: '#ff4444',
                  }}>
                    {result.criticalFindings} Critical Finding{result.criticalFindings !== 1 ? 's' : ''}
                  </div>
                )}
                {result.highFindings > 0 && (
                  <div style={{
                    padding: '10px 20px', borderRadius: 10,
                    background: 'rgba(255,140,66,0.08)', border: '1px solid rgba(255,140,66,0.2)',
                    fontSize: 14, fontWeight: 700, color: '#ff8c42',
                  }}>
                    {result.highFindings} High Finding{result.highFindings !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}

            {/* Top 5 Findings */}
            {result.topFindings.length > 0 && (
              <div style={{ marginBottom: 48 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Top Critical Findings</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {result.topFindings.map((f, i) => (
                    <div key={i} style={{
                      padding: '16px 20px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${severityColor(f.severity)}22`,
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                        background: severityColor(f.severity),
                      }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{f.name}</div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{f.detail}</div>
                      </div>
                      <div style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        color: severityColor(f.severity), flexShrink: 0,
                        padding: '3px 8px', borderRadius: 6,
                        background: `${severityColor(f.severity)}15`,
                      }}>{f.severity}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gate: Full Report CTA */}
            <div style={{
              padding: 'clamp(24px, 4vw, 40px)', borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(126,217,87,0.06) 0%, rgba(126,217,87,0.02) 100%)',
              border: '1px solid rgba(126,217,87,0.15)',
              textAlign: 'center',
            }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
                Get Your Full Report
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 500, margin: '0 auto 24px' }}>
                The full report includes all 51 check results, detailed remediation steps, state-specific guidance,
                and a prioritized action plan. Book a free consultation and our team will walk you through every finding.
              </p>
              <a
                href="https://api.leadconnectorhq.com/widget/booking/cKgZH39iPMdbXN7hk81A"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block', padding: '16px 40px', borderRadius: 10,
                  background: '#7ed957', color: '#020810', fontSize: 16, fontWeight: 700,
                  textDecoration: 'none', boxShadow: '0 0 30px rgba(126,217,87,0.3)',
                }}
              >
                Book Free Consultation
              </a>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 16 }}>
                Free 30-minute consultation. No obligation. We will build your remediation plan together.
              </p>
            </div>

            {/* Back link */}
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <Link href="/hipaa" style={{ fontSize: 13, color: '#7ed957', textDecoration: 'none', fontWeight: 600 }}>
                &larr; Scan Another Website
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function HIPAAScanPage() {
  return (
    <Suspense fallback={
      <div style={{ background: '#020810', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading scanner...</p>
      </div>
    }>
      <ScanContent />
    </Suspense>
  )
}
