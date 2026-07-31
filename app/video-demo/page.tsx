'use client'

import { useState, useRef, useCallback } from 'react'

// ── Types ────────────────────────────────────────────────────────

interface LogEntry {
  timestamp: string
  layer: string
  message: string
  status: 'pending' | 'active' | 'done' | 'error'
}

interface PipelineResult {
  success: boolean
  executionId?: string
  videoId?: string
  status?: string
  variant?: { id: string; label: string; durationSeconds: number }
  seniorityTier?: string
  orgSizeTier?: string
  activatedLayers?: string[]
  personalizedScript?: string
  pipelineMs?: number
  error?: string
  message?: string
}

// ── K-Layer Definitions ──────────────────────────────────────────

const K_LAYERS = [
  { id: 'K1', label: 'Identity', color: '#7ed957', icon: 'ID' },
  { id: 'K2', label: 'Context', color: '#4ECDC4', icon: 'CTX' },
  { id: 'K3', label: 'Pain Points', color: '#FF6B6B', icon: 'PAIN' },
  { id: 'K4', label: 'Tech Stack', color: '#45B7D1', icon: 'TECH' },
  { id: 'K5', label: 'Social', color: '#A78BFA', icon: 'SOC' },
  { id: 'K6', label: 'Timing', color: '#F59E0B', icon: 'TIME' },
  { id: 'K7', label: 'History', color: '#EC4899', icon: 'HIST' },
]

// ── Component ───────────────────────────────────────────────────

export default function VideoDemoPage() {
  // Form state
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [industry, setIndustry] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [painPoints, setPainPoints] = useState('')
  const [techStack, setTechStack] = useState('')
  const [testMode, setTestMode] = useState(true)

  // Pipeline state
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<PipelineResult | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [activeLayers, setActiveLayers] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [pollStatus, setPollStatus] = useState<string | null>(null)

  const logRef = useRef<HTMLDivElement>(null)

  const addLog = useCallback(
    (layer: string, message: string, status: LogEntry['status'] = 'done') => {
      const entry: LogEntry = {
        timestamp: new Date().toISOString().split('T')[1].split('.')[0],
        layer,
        message,
        status,
      }
      setLogs((prev) => [...prev, entry])
      setTimeout(() => {
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
      }, 50)
    },
    []
  )

  // ── Run pipeline ──────────────────────────────────────────────

  const runPipeline = async () => {
    setRunning(true)
    setResult(null)
    setLogs([])
    setActiveLayers([])
    setVideoUrl(null)
    setPollStatus(null)

    addLog('SYS', 'Initializing PACG Video Pipeline...', 'active')

    // Simulate K-layer activation with timing
    const profile = {
      name,
      title,
      company,
      industry,
      companySize: companySize ? parseInt(companySize, 10) : undefined,
      yearsExperience: yearsExperience ? parseInt(yearsExperience, 10) : undefined,
      painPoints: painPoints ? painPoints.split(',').map((s) => s.trim()) : [],
      techStack: techStack ? techStack.split(',').map((s) => s.trim()) : [],
    }

    // Activate layers visually
    if (profile.name) {
      setActiveLayers((p) => [...p, 'K1'])
      addLog('K1', `Identity layer: ${profile.name}, ${profile.title} @ ${profile.company}`)
    }
    if (profile.industry) {
      setActiveLayers((p) => [...p, 'K2'])
      addLog('K2', `Context layer: ${profile.industry}, ${profile.companySize ?? '?'} employees`)
    }
    if (profile.painPoints.length > 0) {
      setActiveLayers((p) => [...p, 'K3'])
      addLog('K3', `Pain points: ${profile.painPoints.join(', ')}`)
    }
    if (profile.techStack.length > 0) {
      setActiveLayers((p) => [...p, 'K4'])
      addLog('K4', `Tech stack: ${profile.techStack.join(', ')}`)
    }
    setActiveLayers((p) => [...p, 'K6'])
    addLog('K6', `Timing layer: ${new Date().toLocaleTimeString()}`)

    addLog('LVOS', 'Running Thompson Sampling variant selection...', 'active')

    try {
      const res = await fetch('/api/heygen/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, testMode }),
      })

      const data: PipelineResult = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Pipeline failed')
      }

      setResult(data)

      if (data.activatedLayers) {
        setActiveLayers(data.activatedLayers.map((l) => l.replace('_', '').substring(0, 2).toUpperCase()))
      }

      addLog('LVOS', `Selected variant: ${data.variant?.label} (${data.variant?.durationSeconds}s)`)
      addLog('SYS', `Pipeline complete in ${data.pipelineMs}ms`)
      addLog('HYGEN', `Video ID: ${data.videoId} — Status: ${data.status}`, 'active')

      // Start polling for video completion
      if (data.videoId) {
        pollForVideo(data.videoId)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      addLog('ERR', message, 'error')
      setResult({ success: false, error: message })
    } finally {
      setRunning(false)
    }
  }

  // ── Poll for video ────────────────────────────────────────────

  const pollForVideo = async (videoId: string) => {
    setPollStatus('polling')
    let attempts = 0
    const maxAttempts = 60

    const poll = async () => {
      attempts++
      try {
        const res = await fetch(`/api/heygen/status/${videoId}`)
        const data = await res.json()

        if (data.status === 'completed' && data.videoUrl) {
          setVideoUrl(data.videoUrl)
          setPollStatus('completed')
          addLog('HYGEN', `Video ready: ${data.videoUrl}`)
          return
        }

        if (data.status === 'failed') {
          setPollStatus('failed')
          addLog('HYGEN', `Video generation failed: ${data.error?.message ?? 'Unknown'}`, 'error')
          return
        }

        addLog('POLL', `Attempt ${attempts}/${maxAttempts} — status: ${data.status}`, 'pending')

        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        } else {
          setPollStatus('timeout')
          addLog('POLL', 'Polling timed out after 5 minutes', 'error')
        }
      } catch {
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        }
      }
    }

    poll()
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#020810',
        color: '#E2E8F0',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid rgba(126, 217, 87, 0.15)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: 'rgba(126, 217, 87, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            color: '#7ed957',
          }}
        >
          0n
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
          PACG Video Pipeline
        </h1>
        <span
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 9999,
            backgroundColor: 'rgba(126, 217, 87, 0.12)',
            color: '#7ed957',
            fontWeight: 600,
          }}
        >
          DEMO
        </span>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          padding: 24,
          maxWidth: 1400,
          margin: '0 auto',
        }}
      >
        {/* Left Column: Form + K-Layer Viz */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Profile Form */}
          <div
            style={{
              backgroundColor: '#0F1318',
              borderRadius: 12,
              border: '1px solid rgba(126, 217, 87, 0.1)',
              padding: 24,
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#7ed957',
                marginBottom: 16,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Professional Profile
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <InputField label="Name" value={name} onChange={setName} placeholder="Jane Smith" required />
              <InputField label="Title" value={title} onChange={setTitle} placeholder="VP Engineering" required />
              <InputField label="Company" value={company} onChange={setCompany} placeholder="Acme Corp" required />
              <InputField label="Industry" value={industry} onChange={setIndustry} placeholder="SaaS" required />
              <InputField label="Company Size" value={companySize} onChange={setCompanySize} placeholder="250" type="number" />
              <InputField label="Years Experience" value={yearsExperience} onChange={setYearsExperience} placeholder="12" type="number" />
              <InputField label="Pain Points" value={painPoints} onChange={setPainPoints} placeholder="manual processes, slow deploys" full />
              <InputField label="Tech Stack" value={techStack} onChange={setTechStack} placeholder="React, Node, AWS" full />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94A3B8', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  style={{ accentColor: '#7ed957' }}
                />
                Test Mode (no actual video generation)
              </label>
            </div>

            <button
              onClick={runPipeline}
              disabled={running || !name || !title || !company || !industry}
              style={{
                marginTop: 16,
                width: '100%',
                padding: '12px 24px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: running ? '#1E293B' : '#7ed957',
                color: running ? '#64748B' : '#020810',
                fontSize: 14,
                fontWeight: 700,
                cursor: running ? 'not-allowed' : 'pointer',
                transition: 'all 150ms',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {running ? 'Running Pipeline...' : 'Generate Video'}
            </button>
          </div>

          {/* K-Layer Visualization */}
          <div
            style={{
              backgroundColor: '#0F1318',
              borderRadius: 12,
              border: '1px solid rgba(126, 217, 87, 0.1)',
              padding: 24,
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#7ed957',
                marginBottom: 16,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Knowledge Layers
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {K_LAYERS.map((layer) => {
                const active = activeLayers.includes(layer.id)
                return (
                  <div
                    key={layer.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      borderRadius: 8,
                      backgroundColor: active
                        ? `${layer.color}12`
                        : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${active ? `${layer.color}40` : 'rgba(255,255,255,0.05)'}`,
                      transition: 'all 300ms',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: active ? `${layer.color}25` : 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        color: active ? layer.color : '#475569',
                        fontFamily: 'monospace',
                        transition: 'all 300ms',
                      }}
                    >
                      {layer.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: active ? '#E2E8F0' : '#64748B',
                        }}
                      >
                        {layer.id}: {layer.label}
                      </div>
                    </div>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 9999,
                        backgroundColor: active ? layer.color : '#1E293B',
                        boxShadow: active ? `0 0 8px ${layer.color}60` : 'none',
                        transition: 'all 300ms',
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Result Summary */}
          {result && (
            <div
              style={{
                backgroundColor: '#0F1318',
                borderRadius: 12,
                border: `1px solid ${result.success ? 'rgba(126, 217, 87, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                padding: 24,
              }}
            >
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: result.success ? '#7ed957' : '#EF4444',
                  marginBottom: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {result.success ? 'Pipeline Result' : 'Pipeline Error'}
              </h2>

              {result.success ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                  <InfoRow label="Execution ID" value={result.executionId?.slice(0, 8) ?? ''} />
                  <InfoRow label="Video ID" value={result.videoId?.slice(0, 12) ?? ''} />
                  <InfoRow label="Variant" value={result.variant?.label ?? ''} />
                  <InfoRow label="Duration" value={`${result.variant?.durationSeconds ?? 0}s`} />
                  <InfoRow label="Seniority" value={result.seniorityTier ?? ''} />
                  <InfoRow label="Org Size" value={result.orgSizeTier ?? ''} />
                  <InfoRow label="Pipeline" value={`${result.pipelineMs ?? 0}ms`} />
                  <InfoRow label="Layers" value={`${result.activatedLayers?.length ?? 0}/7`} />
                </div>
              ) : (
                <p style={{ color: '#EF4444', fontSize: 13 }}>{result.error}</p>
              )}

              {result.personalizedScript && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Personalized Script
                  </div>
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      backgroundColor: 'rgba(126, 217, 87, 0.05)',
                      border: '1px solid rgba(126, 217, 87, 0.1)',
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: '#CBD5E1',
                    }}
                  >
                    {result.personalizedScript}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Execution Log + Video Player */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Execution Log */}
          <div
            style={{
              backgroundColor: '#0F1318',
              borderRadius: 12,
              border: '1px solid rgba(126, 217, 87, 0.1)',
              padding: 24,
              flex: 1,
              minHeight: 400,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#7ed957',
                marginBottom: 16,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Execution Log
            </h2>

            <div
              ref={logRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: 12,
                lineHeight: 1.8,
              }}
            >
              {logs.length === 0 ? (
                <div style={{ color: '#334155', textAlign: 'center', paddingTop: 40 }}>
                  Waiting for pipeline execution...
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: '#475569', flexShrink: 0 }}>{log.timestamp}</span>
                    <span
                      style={{
                        color:
                          log.status === 'error'
                            ? '#EF4444'
                            : log.status === 'active'
                            ? '#F59E0B'
                            : '#7ed957',
                        fontWeight: 600,
                        flexShrink: 0,
                        minWidth: 40,
                      }}
                    >
                      [{log.layer}]
                    </span>
                    <span style={{ color: '#94A3B8' }}>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Video Player */}
          <div
            style={{
              backgroundColor: '#0F1318',
              borderRadius: 12,
              border: '1px solid rgba(126, 217, 87, 0.1)',
              padding: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#7ed957',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Video Output
              </h2>
              {pollStatus && (
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    backgroundColor:
                      pollStatus === 'completed'
                        ? 'rgba(126, 217, 87, 0.12)'
                        : pollStatus === 'failed' || pollStatus === 'timeout'
                        ? 'rgba(239, 68, 68, 0.12)'
                        : 'rgba(245, 158, 11, 0.12)',
                    color:
                      pollStatus === 'completed'
                        ? '#7ed957'
                        : pollStatus === 'failed' || pollStatus === 'timeout'
                        ? '#EF4444'
                        : '#F59E0B',
                    fontWeight: 600,
                  }}
                >
                  {pollStatus === 'polling'
                    ? 'Rendering...'
                    : pollStatus === 'completed'
                    ? 'Ready'
                    : pollStatus === 'failed'
                    ? 'Failed'
                    : 'Timed Out'}
                </span>
              )}
            </div>

            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                autoPlay
                style={{
                  width: '100%',
                  borderRadius: 8,
                  backgroundColor: '#000',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  borderRadius: 8,
                  backgroundColor: '#0A0D12',
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#334155',
                  fontSize: 13,
                }}
              >
                {running
                  ? 'Pipeline running...'
                  : pollStatus === 'polling'
                  ? 'Video rendering on HeyGen...'
                  : 'No video yet'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  full,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  full?: boolean
}) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          color: '#64748B',
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
        {required && <span style={{ color: '#7ed957', marginLeft: 2 }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(255,255,255,0.03)',
          color: '#E2E8F0',
          fontSize: 13,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ color: '#64748B', fontSize: 12 }}>{label}</span>
      <span style={{ color: '#E2E8F0', fontSize: 12, fontFamily: 'monospace' }}>{value}</span>
    </div>
  )
}
