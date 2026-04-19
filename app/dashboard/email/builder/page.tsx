'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

const EmailEditor = dynamic(
  () => import('react-email-editor').then((mod) => mod.default),
  { ssr: false }
)

interface Template {
  id: string
  name: string
  subject?: string
  preheader?: string
  html?: string
  design?: Record<string, unknown>
  lastUpdated?: string
  category?: string
}

type SidebarTab = 'templates' | 'ai' | 'design'
type Tone = 'professional' | 'casual' | 'urgent' | 'friendly'
type Industry = 'saas' | 'ecommerce' | 'agency' | 'realestate' | 'general'

export default function EmailBuilderPage() {
  const searchParams = useSearchParams()
  const templateId = searchParams.get('template')

  // Editor
  const editorRef = useRef<any>(null)
  const [editorReady, setEditorReady] = useState(false)

  // Top toolbar
  const [templateName, setTemplateName] = useState('')
  const [subjectLine, setSubjectLine] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Sidebar
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('templates')

  // Templates panel
  const [templates, setTemplates] = useState<Template[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)

  // AI panel
  const [aiDescription, setAiDescription] = useState('')
  const [aiTone, setAiTone] = useState<Tone>('professional')
  const [aiIndustry, setAiIndustry] = useState<Industry>('general')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiPreviewHtml, setAiPreviewHtml] = useState('')
  const [aiDesign, setAiDesign] = useState<Record<string, unknown> | null>(null)
  const [aiSubject, setAiSubject] = useState('')

  // Design tools panel
  const [canvaPrompt, setCanvaPrompt] = useState('')
  const [figmaUrl, setFigmaUrl] = useState('')
  const [gammaPrompt, setGammaPrompt] = useState('')
  const [designResult, setDesignResult] = useState<{ tool: string; message: string; html?: string } | null>(null)

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true)
    try {
      const res = await fetch('/api/email/templates')
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch {
      // silently fail
    } finally {
      setTemplatesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // Load template from URL param
  useEffect(() => {
    if (templateId && templates.length > 0 && editorReady) {
      const tmpl = templates.find((t) => t.id === templateId)
      if (tmpl) {
        setTemplateName(tmpl.name || '')
        setSubjectLine(tmpl.subject || '')
        if (tmpl.design) {
          editorRef.current?.loadDesign(tmpl.design)
        }
      }
    }
  }, [templateId, templates, editorReady])

  const onEditorReady = (editor: any) => {
    editorRef.current = editor
    setEditorReady(true)
  }

  // Save template
  const handleSave = async () => {
    if (!editorRef.current) return
    setSaving(true)
    setSaveMsg('')
    editorRef.current.exportHtml((data: { html: string; design: any }) => {
      fetch('/api/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName || 'Untitled Template',
          subject: subjectLine,
          html: data.html,
          design: data.design,
        }),
      })
        .then(async (res) => {
          if (res.ok) {
            setSaveMsg('Saved!')
            fetchTemplates()
          } else {
            const d = await res.json().catch(() => ({}))
            setSaveMsg(d.error || 'Save failed')
          }
        })
        .catch(() => setSaveMsg('Save failed'))
        .finally(() => {
          setSaving(false)
          setTimeout(() => setSaveMsg(''), 3000)
        })
    })
  }

  // Load a template into the editor
  const loadTemplate = (tmpl: Template) => {
    if (!editorRef.current) return
    setTemplateName(tmpl.name || '')
    setSubjectLine(tmpl.subject || '')
    if (tmpl.design) {
      editorRef.current.loadDesign(tmpl.design)
    }
  }

  // AI generate
  const handleAiGenerate = async () => {
    if (!aiDescription.trim()) return
    setAiGenerating(true)
    setAiPreviewHtml('')
    setAiDesign(null)
    try {
      const res = await fetch('/api/email/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: aiDescription,
          tone: aiTone,
          industry: aiIndustry,
        }),
      })
      const data = await res.json()
      if (data.html) {
        setAiPreviewHtml(data.html)
        setAiDesign(data.design || null)
        setAiSubject(data.subject || '')
      }
    } catch {
      // handle error silently
    } finally {
      setAiGenerating(false)
    }
  }

  const useAiResult = () => {
    if (!editorRef.current) return
    if (aiDesign) {
      editorRef.current.loadDesign(aiDesign)
    }
    if (aiSubject) setSubjectLine(aiSubject)
  }

  // Design tool
  const handleDesignTool = async (tool: string, input: string) => {
    setDesignResult(null)
    try {
      const res = await fetch('/api/email/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, input }),
      })
      const data = await res.json()
      setDesignResult({ tool, message: data.message || '', html: data.html })
    } catch {
      setDesignResult({ tool, message: 'Failed to connect to design service.' })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)', margin: '-24px -24px 0', overflow: 'hidden' }}>
      {/* Top Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: 'var(--jp-surface)',
        borderBottom: '1px solid var(--jp-border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="20" height="20" fill="none" stroke="var(--jp-green)" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--jp-text)' }}>Email Builder</span>
          <span style={{
            fontSize: '0.6rem',
            fontWeight: 800,
            background: 'var(--jp-green)',
            color: '#000',
            padding: '2px 8px',
            borderRadius: 20,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            UNLIMITED
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Template name..."
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            style={{
              flex: 1,
              maxWidth: 240,
              padding: '8px 12px',
              background: 'var(--jp-bg-input)',
              border: '1px solid var(--jp-border)',
              borderRadius: 'var(--jp-radius-xs)',
              color: 'var(--jp-text)',
              fontSize: '0.8125rem',
              outline: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Subject line..."
            value={subjectLine}
            onChange={(e) => setSubjectLine(e.target.value)}
            style={{
              flex: 1,
              maxWidth: 320,
              padding: '8px 12px',
              background: 'var(--jp-bg-input)',
              border: '1px solid var(--jp-border)',
              borderRadius: 'var(--jp-radius-xs)',
              color: 'var(--jp-text)',
              fontSize: '0.8125rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saveMsg && (
            <span style={{
              fontSize: '0.75rem',
              color: saveMsg === 'Saved!' ? 'var(--jp-green)' : 'var(--jp-red)',
              fontWeight: 600,
            }}>
              {saveMsg}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 20px',
              background: 'transparent',
              color: 'var(--jp-text-secondary)',
              border: '1px solid var(--jp-border)',
              borderRadius: 'var(--jp-radius-xs)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            style={{
              padding: '8px 20px',
              background: 'var(--jp-green)',
              color: '#000',
              border: 'none',
              borderRadius: 'var(--jp-radius-xs)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Send
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Unlayer Editor */}
        <div style={{ flex: 1, position: 'relative' }}>
          <EmailEditor
            onReady={onEditorReady}
            appearance={{
              theme: 'dark',
              panels: {
                tools: { dock: 'left' },
              },
            }}
            options={{
              features: {
                textEditor: {
                  spellChecker: true,
                },
              },
            }}
            style={{ height: '100%' }}
          />
          {!editorReady && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--jp-bg)',
              zIndex: 10,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 32,
                  height: 32,
                  border: '2px solid var(--jp-green)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 12px',
                }} />
                <span style={{ color: 'var(--jp-text-muted)', fontSize: '0.8125rem' }}>Loading editor...</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div style={{
          width: 340,
          flexShrink: 0,
          background: 'var(--jp-surface)',
          borderLeft: '1px solid var(--jp-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Sidebar Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--jp-border)',
            flexShrink: 0,
          }}>
            {([
              { key: 'templates' as SidebarTab, label: 'Templates' },
              { key: 'ai' as SidebarTab, label: 'AI Generate' },
              { key: 'design' as SidebarTab, label: 'Design Tools' },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSidebarTab(tab.key)}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: sidebarTab === tab.key ? '2px solid var(--jp-green)' : '2px solid transparent',
                  color: sidebarTab === tab.key ? 'var(--jp-green)' : 'var(--jp-text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sidebar Content */}
          <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            {/* Templates Panel */}
            {sidebarTab === 'templates' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={handleSave}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--jp-green-glow)',
                    border: '1px solid rgba(126, 217, 87, 0.3)',
                    borderRadius: 'var(--jp-radius-xs)',
                    color: 'var(--jp-green)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Save as Template
                </button>

                {templatesLoading ? (
                  <div style={{ padding: 20, textAlign: 'center' }}>
                    <div style={{
                      width: 24,
                      height: 24,
                      border: '2px solid var(--jp-green)',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto',
                    }} />
                  </div>
                ) : templates.length === 0 ? (
                  <div style={{
                    padding: '20px 12px',
                    textAlign: 'center',
                    color: 'var(--jp-text-muted)',
                    fontSize: '0.75rem',
                  }}>
                    No templates found. Create your first one!
                  </div>
                ) : (
                  templates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      onClick={() => loadTemplate(tmpl)}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--jp-bg-card)',
                        border: '1px solid var(--jp-border)',
                        borderRadius: 'var(--jp-radius-xs)',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--jp-green)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--jp-border)')}
                    >
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)', marginBottom: 2 }}>
                        {tmpl.name || 'Untitled'}
                      </div>
                      {tmpl.subject && (
                        <div style={{ fontSize: '0.6875rem', color: 'var(--jp-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tmpl.subject}
                        </div>
                      )}
                      {tmpl.lastUpdated && (
                        <div style={{ fontSize: '0.625rem', color: 'var(--jp-text-muted)', marginTop: 4 }}>
                          {new Date(tmpl.lastUpdated).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* AI Generate Panel */}
            {sidebarTab === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)', marginBottom: 4 }}>
                  Describe the email you want and AI will generate it.
                </div>
                <textarea
                  placeholder="E.g. A welcome email for new SaaS signups with a CTA to start their trial..."
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: 10,
                    background: 'var(--jp-bg-input)',
                    border: '1px solid var(--jp-border)',
                    borderRadius: 'var(--jp-radius-xs)',
                    color: 'var(--jp-text)',
                    fontSize: '0.8125rem',
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />

                {/* Tone selector */}
                <div>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--jp-text-secondary)', display: 'block', marginBottom: 4 }}>Tone</label>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(['professional', 'casual', 'urgent', 'friendly'] as Tone[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setAiTone(t)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          borderRadius: 20,
                          border: aiTone === t ? '1px solid var(--jp-green)' : '1px solid var(--jp-border)',
                          background: aiTone === t ? 'var(--jp-green-glow)' : 'transparent',
                          color: aiTone === t ? 'var(--jp-green)' : 'var(--jp-text-muted)',
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Industry selector */}
                <div>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--jp-text-secondary)', display: 'block', marginBottom: 4 }}>Industry</label>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(['saas', 'ecommerce', 'agency', 'realestate', 'general'] as Industry[]).map((ind) => (
                      <button
                        key={ind}
                        onClick={() => setAiIndustry(ind)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          borderRadius: 20,
                          border: aiIndustry === ind ? '1px solid var(--jp-green)' : '1px solid var(--jp-border)',
                          background: aiIndustry === ind ? 'var(--jp-green-glow)' : 'transparent',
                          color: aiIndustry === ind ? 'var(--jp-green)' : 'var(--jp-text-muted)',
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                        }}
                      >
                        {ind === 'realestate' ? 'Real Estate' : ind === 'saas' ? 'SaaS' : ind === 'ecommerce' ? 'E-commerce' : ind}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleAiGenerate}
                  disabled={aiGenerating || !aiDescription.trim()}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: aiGenerating || !aiDescription.trim() ? 'var(--jp-border)' : 'var(--jp-green)',
                    color: aiGenerating || !aiDescription.trim() ? 'var(--jp-text-muted)' : '#000',
                    border: 'none',
                    borderRadius: 'var(--jp-radius-xs)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: aiGenerating || !aiDescription.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  {aiGenerating ? (
                    <>
                      <div style={{
                        width: 14,
                        height: 14,
                        border: '2px solid #000',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate
                    </>
                  )}
                </button>

                {/* AI Preview */}
                {aiPreviewHtml && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--jp-green)' }}>
                      Generated Preview
                    </div>
                    {aiSubject && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--jp-text-secondary)' }}>
                        Subject: {aiSubject}
                      </div>
                    )}
                    <div
                      style={{
                        background: '#fff',
                        borderRadius: 'var(--jp-radius-xs)',
                        overflow: 'hidden',
                        maxHeight: 200,
                        overflowY: 'auto',
                      }}
                      dangerouslySetInnerHTML={{ __html: aiPreviewHtml }}
                    />
                    <button
                      onClick={useAiResult}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'var(--jp-green)',
                        color: '#000',
                        border: 'none',
                        borderRadius: 'var(--jp-radius-xs)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Use This
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Design Tools Panel */}
            {sidebarTab === 'design' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Canva Card */}
                <div style={{
                  padding: 12,
                  background: 'var(--jp-bg-card)',
                  border: '1px solid var(--jp-border)',
                  borderRadius: 'var(--jp-radius-xs)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'linear-gradient(135deg, #00C4CC, #7B2FF7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                      color: '#fff',
                    }}>
                      C
                    </div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)' }}>Canva</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Describe header image..."
                    value={canvaPrompt}
                    onChange={(e) => setCanvaPrompt(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: 'var(--jp-bg-input)',
                      border: '1px solid var(--jp-border)',
                      borderRadius: 'var(--jp-radius-xs)',
                      color: 'var(--jp-text)',
                      fontSize: '0.75rem',
                      outline: 'none',
                      marginBottom: 6,
                    }}
                  />
                  <button
                    onClick={() => handleDesignTool('canva', canvaPrompt)}
                    disabled={!canvaPrompt.trim()}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: canvaPrompt.trim() ? 'linear-gradient(135deg, #00C4CC, #7B2FF7)' : 'var(--jp-border)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--jp-radius-xs)',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      cursor: canvaPrompt.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Generate Header Image
                  </button>
                </div>

                {/* Figma Card */}
                <div style={{
                  padding: 12,
                  background: 'var(--jp-bg-card)',
                  border: '1px solid var(--jp-border)',
                  borderRadius: 'var(--jp-radius-xs)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'linear-gradient(135deg, #F24E1E, #A259FF)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                      color: '#fff',
                    }}>
                      F
                    </div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)' }}>Figma</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Paste Figma URL..."
                    value={figmaUrl}
                    onChange={(e) => setFigmaUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: 'var(--jp-bg-input)',
                      border: '1px solid var(--jp-border)',
                      borderRadius: 'var(--jp-radius-xs)',
                      color: 'var(--jp-text)',
                      fontSize: '0.75rem',
                      outline: 'none',
                      marginBottom: 6,
                    }}
                  />
                  <button
                    onClick={() => handleDesignTool('figma', figmaUrl)}
                    disabled={!figmaUrl.trim()}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: figmaUrl.trim() ? 'linear-gradient(135deg, #F24E1E, #A259FF)' : 'var(--jp-border)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--jp-radius-xs)',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      cursor: figmaUrl.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Import from Figma
                  </button>
                </div>

                {/* Gamma Card */}
                <div style={{
                  padding: 12,
                  background: 'var(--jp-bg-card)',
                  border: '1px solid var(--jp-border)',
                  borderRadius: 'var(--jp-radius-xs)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'linear-gradient(135deg, #FFB800, #FF6B00)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                      color: '#fff',
                    }}>
                      G
                    </div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)' }}>Gamma</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Describe email layout..."
                    value={gammaPrompt}
                    onChange={(e) => setGammaPrompt(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: 'var(--jp-bg-input)',
                      border: '1px solid var(--jp-border)',
                      borderRadius: 'var(--jp-radius-xs)',
                      color: 'var(--jp-text)',
                      fontSize: '0.75rem',
                      outline: 'none',
                      marginBottom: 6,
                    }}
                  />
                  <button
                    onClick={() => handleDesignTool('gamma', gammaPrompt)}
                    disabled={!gammaPrompt.trim()}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: gammaPrompt.trim() ? 'linear-gradient(135deg, #FFB800, #FF6B00)' : 'var(--jp-border)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--jp-radius-xs)',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      cursor: gammaPrompt.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Generate Layout
                  </button>
                </div>

                {/* Design Result */}
                {designResult && (
                  <div style={{
                    padding: 12,
                    background: 'var(--jp-green-glow)',
                    border: '1px solid rgba(126, 217, 87, 0.3)',
                    borderRadius: 'var(--jp-radius-xs)',
                  }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--jp-green)', marginBottom: 6 }}>
                      {designResult.tool.charAt(0).toUpperCase() + designResult.tool.slice(1)} Response
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--jp-text-secondary)', lineHeight: 1.5 }}>
                      {designResult.message}
                    </div>
                    {designResult.html && (
                      <button
                        onClick={() => {
                          // Insert HTML snippet placeholder
                        }}
                        style={{
                          marginTop: 8,
                          width: '100%',
                          padding: '6px 10px',
                          background: 'var(--jp-green)',
                          color: '#000',
                          border: 'none',
                          borderRadius: 'var(--jp-radius-xs)',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Insert into Email
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
