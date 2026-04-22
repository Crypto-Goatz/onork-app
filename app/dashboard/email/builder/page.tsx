'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Mail,
  Send,
  Plus,
  Zap,
  Loader2,
  CheckCircle,
  AlertCircle,
  Save,
} from 'lucide-react'

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
    <div className="fixed top-0 right-0 bottom-0 flex flex-col overflow-hidden bg-core-bg z-40" style={{ left: 'var(--jp-sidebar-width, 220px)' }}>
      {/* Top Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-core-surface border-b border-core-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Mail size={20} className="text-core-green" />
          <span className="text-[1rem] font-bold text-core-text">Email Builder</span>
          <span className="text-[0.6rem] font-extrabold bg-core-green text-black px-2 py-0.5 rounded-full tracking-wide uppercase">
            UNLIMITED
          </span>
        </div>

        <div className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="Template name..."
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="flex-1 max-w-[240px] px-3 py-2 bg-core-card border border-core-border rounded text-core-text text-[0.8125rem] outline-none"
          />
          <input
            type="text"
            placeholder="Subject line..."
            value={subjectLine}
            onChange={(e) => setSubjectLine(e.target.value)}
            className="flex-1 max-w-[320px] px-3 py-2 bg-core-card border border-core-border rounded text-core-text text-[0.8125rem] outline-none"
          />
        </div>

        <div className="flex gap-2 items-center">
          {saveMsg && (
            <span className={`text-xs font-semibold flex items-center gap-1 ${saveMsg === 'Saved!' ? 'text-core-green' : 'text-core-red'}`}>
              {saveMsg === 'Saved!'
                ? <CheckCircle size={12} />
                : <AlertCircle size={12} />
              }
              {saveMsg}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 bg-transparent text-core-text-dim border border-core-border rounded text-[0.8125rem] font-semibold cursor-pointer disabled:cursor-wait hover:border-core-green transition-colors"
          >
            <Save size={13} />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button className="flex items-center gap-1.5 px-5 py-2 bg-core-green text-black border-none rounded text-[0.8125rem] font-bold cursor-pointer">
            <Send size={13} />
            Send
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Unlayer Editor */}
        <div className="flex-1 relative min-h-0">
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
            style={{ height: '100%', minHeight: '100%' }}
          />
          {!editorReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-core-bg z-10">
              <div className="text-center">
                <Loader2 size={32} className="text-core-green animate-spin mx-auto mb-3" />
                <span className="text-core-text-muted text-[0.8125rem]">Loading editor...</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-[340px] flex-shrink-0 bg-core-surface border-l border-core-border flex flex-col overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="flex border-b border-core-border flex-shrink-0">
            {([
              { key: 'templates' as SidebarTab, label: 'Templates' },
              { key: 'ai' as SidebarTab, label: 'AI Generate' },
              { key: 'design' as SidebarTab, label: 'Design Tools' },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSidebarTab(tab.key)}
                className={[
                  'flex-1 px-2 py-2.5 bg-transparent border-none text-xs font-semibold cursor-pointer transition-all border-b-2',
                  sidebarTab === tab.key
                    ? 'border-core-green text-core-green'
                    : 'border-transparent text-core-text-muted hover:text-core-text',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-auto p-3">
            {/* Templates Panel */}
            {sidebarTab === 'templates' && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSave}
                  className="w-full px-3 py-2 bg-core-green/10 border border-core-green/30 rounded text-core-green text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 hover:bg-core-green/20 transition-colors"
                >
                  <Plus size={12} />
                  Save as Template
                </button>

                {templatesLoading ? (
                  <div className="p-5 flex justify-center">
                    <Loader2 size={24} className="text-core-green animate-spin" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="px-3 py-5 text-center text-core-text-muted text-xs">
                    No templates found. Create your first one!
                  </div>
                ) : (
                  templates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      onClick={() => loadTemplate(tmpl)}
                      className="px-3 py-2.5 bg-core-card border border-core-border rounded cursor-pointer transition-colors hover:border-core-green"
                    >
                      <div className="text-[0.8125rem] font-semibold text-core-text mb-0.5">
                        {tmpl.name || 'Untitled'}
                      </div>
                      {tmpl.subject && (
                        <div className="text-[0.6875rem] text-core-text-muted overflow-hidden text-ellipsis whitespace-nowrap">
                          {tmpl.subject}
                        </div>
                      )}
                      {tmpl.lastUpdated && (
                        <div className="text-[0.625rem] text-core-text-muted mt-1">
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
              <div className="flex flex-col gap-2.5">
                <div className="text-xs text-core-text-muted mb-1">
                  Describe the email you want and AI will generate it.
                </div>
                <textarea
                  placeholder="E.g. A welcome email for new SaaS signups with a CTA to start their trial..."
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  rows={4}
                  className="w-full p-2.5 bg-core-card border border-core-border rounded text-core-text text-[0.8125rem] resize-y outline-none font-inherit"
                />

                {/* Tone selector */}
                <div>
                  <label className="text-[0.6875rem] font-semibold text-core-text-dim block mb-1">Tone</label>
                  <div className="flex gap-1 flex-wrap">
                    {(['professional', 'casual', 'urgent', 'friendly'] as Tone[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setAiTone(t)}
                        className={[
                          'px-2.5 py-1 text-[0.6875rem] font-semibold rounded-full border cursor-pointer capitalize transition-colors',
                          aiTone === t
                            ? 'border-core-green bg-core-green/10 text-core-green'
                            : 'border-core-border bg-transparent text-core-text-muted hover:border-core-green/50',
                        ].join(' ')}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Industry selector */}
                <div>
                  <label className="text-[0.6875rem] font-semibold text-core-text-dim block mb-1">Industry</label>
                  <div className="flex gap-1 flex-wrap">
                    {(['saas', 'ecommerce', 'agency', 'realestate', 'general'] as Industry[]).map((ind) => (
                      <button
                        key={ind}
                        onClick={() => setAiIndustry(ind)}
                        className={[
                          'px-2.5 py-1 text-[0.6875rem] font-semibold rounded-full border cursor-pointer capitalize transition-colors',
                          aiIndustry === ind
                            ? 'border-core-green bg-core-green/10 text-core-green'
                            : 'border-core-border bg-transparent text-core-text-muted hover:border-core-green/50',
                        ].join(' ')}
                      >
                        {ind === 'realestate' ? 'Real Estate' : ind === 'saas' ? 'SaaS' : ind === 'ecommerce' ? 'E-commerce' : ind}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleAiGenerate}
                  disabled={aiGenerating || !aiDescription.trim()}
                  className={[
                    'w-full px-4 py-2.5 rounded text-[0.8125rem] font-bold flex items-center justify-center gap-1.5 transition-colors',
                    aiGenerating || !aiDescription.trim()
                      ? 'bg-core-border text-core-text-muted cursor-not-allowed'
                      : 'bg-core-green text-black cursor-pointer hover:opacity-90',
                  ].join(' ')}
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      Generate
                    </>
                  )}
                </button>

                {/* AI Preview */}
                {aiPreviewHtml && (
                  <div className="flex flex-col gap-2">
                    <div className="text-[0.6875rem] font-semibold text-core-green">
                      Generated Preview
                    </div>
                    {aiSubject && (
                      <div className="text-xs text-core-text-dim">
                        Subject: {aiSubject}
                      </div>
                    )}
                    <div
                      className="bg-white rounded overflow-hidden max-h-[200px] overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: aiPreviewHtml }}
                    />
                    <button
                      onClick={useAiResult}
                      className="w-full px-3 py-2 bg-core-green text-black border-none rounded text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      Use This
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Design Tools Panel */}
            {sidebarTab === 'design' && (
              <div className="flex flex-col gap-3">
                {/* Canva Card */}
                <div className="p-3 bg-core-card border border-core-border rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-[6px] bg-gradient-to-br from-[#00C4CC] to-[#7B2FF7] flex items-center justify-center text-[0.6875rem] font-extrabold text-white">
                      C
                    </div>
                    <span className="text-[0.8125rem] font-semibold text-core-text">Canva</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Describe header image..."
                    value={canvaPrompt}
                    onChange={(e) => setCanvaPrompt(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-core-bg border border-core-border rounded text-core-text text-xs outline-none mb-1.5"
                  />
                  <button
                    onClick={() => handleDesignTool('canva', canvaPrompt)}
                    disabled={!canvaPrompt.trim()}
                    className={[
                      'w-full px-2.5 py-1.5 text-white border-none rounded text-[0.6875rem] font-semibold transition-opacity',
                      canvaPrompt.trim()
                        ? 'bg-gradient-to-r from-[#00C4CC] to-[#7B2FF7] cursor-pointer hover:opacity-90'
                        : 'bg-core-border cursor-not-allowed',
                    ].join(' ')}
                  >
                    Generate Header Image
                  </button>
                </div>

                {/* Figma Card */}
                <div className="p-3 bg-core-card border border-core-border rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-[6px] bg-gradient-to-br from-[#F24E1E] to-[#A259FF] flex items-center justify-center text-[0.6875rem] font-extrabold text-white">
                      F
                    </div>
                    <span className="text-[0.8125rem] font-semibold text-core-text">Figma</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Paste Figma URL..."
                    value={figmaUrl}
                    onChange={(e) => setFigmaUrl(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-core-bg border border-core-border rounded text-core-text text-xs outline-none mb-1.5"
                  />
                  <button
                    onClick={() => handleDesignTool('figma', figmaUrl)}
                    disabled={!figmaUrl.trim()}
                    className={[
                      'w-full px-2.5 py-1.5 text-white border-none rounded text-[0.6875rem] font-semibold transition-opacity',
                      figmaUrl.trim()
                        ? 'bg-gradient-to-r from-[#F24E1E] to-[#A259FF] cursor-pointer hover:opacity-90'
                        : 'bg-core-border cursor-not-allowed',
                    ].join(' ')}
                  >
                    Import from Figma
                  </button>
                </div>

                {/* Gamma Card */}
                <div className="p-3 bg-core-card border border-core-border rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-[6px] bg-gradient-to-br from-[#FFB800] to-[#FF6B00] flex items-center justify-center text-[0.6875rem] font-extrabold text-white">
                      G
                    </div>
                    <span className="text-[0.8125rem] font-semibold text-core-text">Gamma</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Describe email layout..."
                    value={gammaPrompt}
                    onChange={(e) => setGammaPrompt(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-core-bg border border-core-border rounded text-core-text text-xs outline-none mb-1.5"
                  />
                  <button
                    onClick={() => handleDesignTool('gamma', gammaPrompt)}
                    disabled={!gammaPrompt.trim()}
                    className={[
                      'w-full px-2.5 py-1.5 text-white border-none rounded text-[0.6875rem] font-semibold transition-opacity',
                      gammaPrompt.trim()
                        ? 'bg-gradient-to-r from-[#FFB800] to-[#FF6B00] cursor-pointer hover:opacity-90'
                        : 'bg-core-border cursor-not-allowed',
                    ].join(' ')}
                  >
                    Generate Layout
                  </button>
                </div>

                {/* Design Result */}
                {designResult && (
                  <div className="p-3 bg-core-green/10 border border-core-green/30 rounded">
                    <div className="text-[0.6875rem] font-semibold text-core-green mb-1.5">
                      {designResult.tool.charAt(0).toUpperCase() + designResult.tool.slice(1)} Response
                    </div>
                    <div className="text-xs text-core-text-dim leading-relaxed">
                      {designResult.message}
                    </div>
                    {designResult.html && (
                      <button
                        onClick={() => {
                          // Insert HTML snippet placeholder
                        }}
                        className="mt-2 w-full px-2.5 py-1.5 bg-core-green text-black border-none rounded text-[0.6875rem] font-bold cursor-pointer hover:opacity-90 transition-opacity"
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
