'use client'

/**
 * /tools/email-paste — Email Copy-Paste Generator (AI-first)
 *
 * Type a prompt like "Write an email to promote our HIPAA service" — the
 * brain (Groq via app_briefs.email_paste) generates the full email, fills
 * To/CC/BCC/Subject/Body, then the tap-to-copy UI lets the user paste
 * each field into Spark/Gmail/Outlook on mobile. Optimized for iOS.
 *
 * Sale: $7 flat (one-time). Stripe price_1TS5kYHThmAuKVQMTnnXPyA6.
 * Templates persist in localStorage; the AI generation requires sign-in
 * (the brain pattern routes through handleThink which auth-gates).
 */

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Mail, Trash2, Save, Plus, ListChecks, Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface Template {
  id: string
  name: string
  to: string
  cc: string
  bcc: string
  subject: string
  body: string
  createdAt: number
}

const STORAGE_KEY = '0n_email_paste_templates_v1'
const ACTIVE_KEY = '0n_email_paste_active_v1'

const NEW_TEMPLATE: Template = {
  id: '',
  name: 'Untitled',
  to: '',
  cc: '',
  bcc: '',
  subject: '',
  body: '',
  createdAt: 0,
}

export default function EmailPastePage() {
  const [mode, setMode] = useState<'compose' | 'copy'>('compose')
  const [templates, setTemplates] = useState<Template[]>([])
  const [active, setActive] = useState<Template>(NEW_TEMPLATE)
  const [showLibrary, setShowLibrary] = useState(false)

  // Load on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setTemplates(JSON.parse(stored))
      const activeId = localStorage.getItem(ACTIVE_KEY)
      if (activeId) {
        const all = stored ? JSON.parse(stored) : []
        const found = all.find((t: Template) => t.id === activeId)
        if (found) setActive(found)
      }
    } catch {}
  }, [])

  // Persist templates whenever they change
  useEffect(() => {
    if (templates.length === 0) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(templates)) } catch {}
  }, [templates])

  function saveTemplate() {
    if (!active.subject && !active.body) return
    const id = active.id || `t_${Date.now()}`
    const next: Template = { ...active, id, createdAt: active.createdAt || Date.now() }
    setActive(next)
    setTemplates((prev) => {
      const exists = prev.some((t) => t.id === id)
      const list = exists ? prev.map((t) => (t.id === id ? next : t)) : [next, ...prev]
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
        localStorage.setItem(ACTIVE_KEY, id)
      } catch {}
      return list
    })
  }

  function loadTemplate(t: Template) {
    setActive(t)
    try { localStorage.setItem(ACTIVE_KEY, t.id) } catch {}
    setShowLibrary(false)
    setMode('compose')
  }

  function deleteTemplate(id: string) {
    if (!confirm('Delete this template?')) return
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
    if (active.id === id) setActive(NEW_TEMPLATE)
  }

  function newTemplate() {
    setActive({ ...NEW_TEMPLATE, name: 'Untitled' })
    try { localStorage.removeItem(ACTIVE_KEY) } catch {}
    setShowLibrary(false)
    setMode('compose')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020810', color: '#d0d0d0' }}>
      <Header
        templateCount={templates.length}
        onLibraryClick={() => setShowLibrary(true)}
        onNewClick={newTemplate}
      />

      {showLibrary && (
        <Library
          templates={templates}
          activeId={active.id}
          onSelect={loadTemplate}
          onDelete={deleteTemplate}
          onClose={() => setShowLibrary(false)}
        />
      )}

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '12px 14px 80px' }}>
        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, padding: 4, background: '#161b22', borderRadius: 10, border: '1px solid #2a2a2a' }}>
          <ModeBtn active={mode === 'compose'} onClick={() => setMode('compose')} icon={<Mail size={14} />} label="Compose" />
          <ModeBtn active={mode === 'copy'} onClick={() => setMode('copy')} icon={<Copy size={14} />} label="Copy" />
        </div>

        {mode === 'compose'
          ? <Compose active={active} setActive={setActive} onSave={saveTemplate} hasContent={!!(active.subject || active.body)} />
          : <CopyView fields={active} />
        }
      </div>
    </div>
  )
}

// ── Header ─────────────────────────────────────────────────────────

function Header({ templateCount, onLibraryClick, onNewClick }: { templateCount: number; onLibraryClick: () => void; onNewClick: () => void }) {
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(2,8,16,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #2a2a2a' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Mail size={18} color="#7ed957" />
        <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#fff' }}>Email Copy-Paste</div>
        <button
          onClick={onLibraryClick}
          style={{ background: '#161b22', border: '1px solid #2a2a2a', color: '#d0d0d0', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <ListChecks size={12} /> {templateCount}
        </button>
        <button
          onClick={onNewClick}
          style={{ background: '#7ed957', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={12} /> New
        </button>
      </div>
    </div>
  )
}

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: active ? '#7ed957' : 'transparent',
        color: active ? '#fff' : '#888',
        border: 'none',
        padding: '8px 10px',
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      {icon} {label}
    </button>
  )
}

// ── Compose ────────────────────────────────────────────────────────

function Compose({ active, setActive, onSave, hasContent }: { active: Template; setActive: (t: Template) => void; onSave: () => void; hasContent: boolean }) {
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFields, setShowFields] = useState(false)

  async function generate() {
    const text = prompt.trim()
    if (!text || generating) return
    setGenerating(true)
    setError(null)
    try {
      const r = await fetch('/api/tools/email-paste/think', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text }),
      })
      const data = await r.json()
      if (r.status === 401) {
        setError('Sign in to generate emails. Free preview coming soon.')
        return
      }
      if (!r.ok || !data.success) {
        setError(data?.output?.error || data?.error || 'Generation failed. Try a different prompt.')
        return
      }
      const e = data.output?.email
      if (!e) {
        setError('No email returned. Try again.')
        return
      }
      setActive({
        ...active,
        name: active.name === 'Untitled' || !active.name ? text.slice(0, 48) : active.name,
        to:      e.to ?? active.to,
        cc:      e.cc ?? active.cc,
        bcc:     e.bcc ?? active.bcc,
        subject: e.subject ?? active.subject,
        body:    e.body ?? active.body,
      })
      setShowFields(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setGenerating(false)
    }
  }

  function onPromptKeyDown(ev: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey) && !generating) {
      ev.preventDefault()
      void generate()
    }
  }

  return (
    <div>
      {/* AI prompt — the primary input */}
      <div style={{ marginBottom: 14, padding: 14, background: 'linear-gradient(135deg, #1a1530 0%, #161b22 100%)', border: '1px solid #7ed95744', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Sparkles size={12} color="#7ed957" />
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#7ed957', textTransform: 'uppercase' }}>Describe the email</div>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={onPromptKeyDown}
          placeholder="Write an email to promote our HIPAA service..."
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: '#020810',
            border: '1px solid #2a2a2a',
            borderRadius: 8,
            color: '#d0d0d0',
            fontSize: 14,
            fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            outline: 'none',
            resize: 'vertical',
            lineHeight: 1.5,
            marginBottom: 10,
          }}
        />
        {error && (
          <div style={{ marginBottom: 10, padding: '8px 10px', background: '#1a0d0d', border: '1px solid #7f1d1d', borderRadius: 8, color: '#fca5a5', fontSize: 12 }}>
            {error}
          </div>
        )}
        <button
          onClick={generate}
          disabled={!prompt.trim() || generating}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: prompt.trim() && !generating ? '#7ed957' : '#1a1a1a',
            color: prompt.trim() && !generating ? '#fff' : '#555',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: prompt.trim() && !generating ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {generating ? <><Loader2 size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> Generating…</> : <><Sparkles size={14} /> Generate Email</>}
        </button>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ marginTop: 6, fontSize: 10, color: '#666', textAlign: 'center' }}>
          ⌘+Enter to send · Powered by Groq
        </div>
      </div>

      {/* Generated preview — collapsible field editor */}
      {(active.subject || active.body) && (
        <>
          <button
            onClick={() => setShowFields((s) => !s)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#161b22',
              border: '1px solid #2a2a2a',
              borderRadius: 10,
              color: '#888',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <span>{showFields ? 'Hide fields' : 'Edit fields manually'}</span>
            {showFields ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showFields && (
            <>
              <Field label="Template name" value={active.name} onChange={(v) => setActive({ ...active, name: v })} placeholder="e.g. HIPAA promo" />
              <Field label="To" value={active.to} onChange={(v) => setActive({ ...active, to: v })} placeholder="recipient@domain.com" mono />
              <Field label="CC" value={active.cc} onChange={(v) => setActive({ ...active, cc: v })} placeholder="cc@domain.com" mono />
              <Field label="BCC" value={active.bcc} onChange={(v) => setActive({ ...active, bcc: v })} placeholder="bcc@domain.com" mono />
              <Field label="Subject" value={active.subject} onChange={(v) => setActive({ ...active, subject: v })} placeholder="Subject line" />
              <FieldArea label="Body" value={active.body} onChange={(v) => setActive({ ...active, body: v })} placeholder="Body — line breaks preserved." />
            </>
          )}

          {/* Quick preview when fields are collapsed */}
          {!showFields && (
            <div style={{ marginBottom: 12, padding: '12px 14px', background: '#161b22', border: '1px solid #2a2a2a', borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: '#7ed957', fontWeight: 700, marginBottom: 4 }}>{active.subject || '(no subject)'}</div>
              <div style={{ fontSize: 12, color: '#888', whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 3 as unknown as number, WebkitBoxOrient: 'vertical' as 'vertical', overflow: 'hidden' }}>
                {active.body}
              </div>
            </div>
          )}

          <button
            onClick={onSave}
            disabled={!hasContent}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: hasContent ? '#7ed957' : '#1a1a1a',
              color: hasContent ? '#fff' : '#555',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              cursor: hasContent ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Save size={14} /> Save Template
          </button>
        </>
      )}

      {!active.subject && !active.body && (
        <div style={{ padding: '24px 14px', textAlign: 'center', color: '#555', fontSize: 12 }}>
          <div style={{ fontSize: 11, marginTop: 6 }}>Or skip the AI and tap "Edit fields manually" below.</div>
          <button
            onClick={() => setShowFields(true)}
            style={{ marginTop: 14, background: 'transparent', border: '1px dashed #2a2a2a', color: '#888', padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
          >
            Compose manually
          </button>
          {showFields && (
            <div style={{ marginTop: 16 }}>
              <Field label="Template name" value={active.name} onChange={(v) => setActive({ ...active, name: v })} placeholder="e.g. HIPAA promo" />
              <Field label="To" value={active.to} onChange={(v) => setActive({ ...active, to: v })} placeholder="recipient@domain.com" mono />
              <Field label="CC" value={active.cc} onChange={(v) => setActive({ ...active, cc: v })} placeholder="cc@domain.com" mono />
              <Field label="BCC" value={active.bcc} onChange={(v) => setActive({ ...active, bcc: v })} placeholder="bcc@domain.com" mono />
              <Field label="Subject" value={active.subject} onChange={(v) => setActive({ ...active, subject: v })} placeholder="Subject line" />
              <FieldArea label="Body" value={active.body} onChange={(v) => setActive({ ...active, body: v })} placeholder="Body — line breaks preserved." />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; mono?: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#555', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '12px 14px',
          background: '#161b22',
          border: '1px solid #2a2a2a',
          borderRadius: 10,
          color: '#d0d0d0',
          fontSize: 14,
          fontFamily: mono ? "'SF Mono', 'Courier New', monospace" : '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          outline: 'none',
        }}
      />
    </div>
  )
}

function FieldArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#555', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={10}
        style={{
          width: '100%',
          padding: '12px 14px',
          background: '#161b22',
          border: '1px solid #2a2a2a',
          borderRadius: 10,
          color: '#d0d0d0',
          fontSize: 14,
          fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          outline: 'none',
          resize: 'vertical',
          lineHeight: 1.6,
        }}
      />
    </div>
  )
}

// ── Copy View ──────────────────────────────────────────────────────

function CopyView({ fields }: { fields: Template }) {
  const [copied, setCopied] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function copy(key: keyof Template, text: string) {
    if (!text) return
    const fallback = () => {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
    }
    const ok = () => {
      setCopied(key as string)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(null), 3000)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(() => { fallback(); ok() })
    } else {
      fallback(); ok()
    }
  }

  if (!fields.subject && !fields.body) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', color: '#555', fontSize: 13 }}>
        <Mail size={32} color="#2a2a2a" style={{ marginBottom: 12 }} />
        <div>Compose an email first.</div>
        <div style={{ fontSize: 11, marginTop: 6 }}>Switch to Compose tab and fill in the fields.</div>
      </div>
    )
  }

  return (
    <div>
      <Banner type="status" text="Tap any field to copy. Then paste into your email client." />
      <Row label="To" value={fields.to} copied={copied === 'to'} onCopy={() => copy('to', fields.to)} mono />
      <Row label="CC" value={fields.cc} copied={copied === 'cc'} onCopy={() => copy('cc', fields.cc)} mono />
      <Row label="BCC" value={fields.bcc} copied={copied === 'bcc'} onCopy={() => copy('bcc', fields.bcc)} mono />
      <Row label="Subject" value={fields.subject} copied={copied === 'subject'} onCopy={() => copy('subject', fields.subject)} />
      <Row label="Body (preview)" value={fields.body} copied={copied === 'body'} onCopy={() => copy('body', fields.body)} bodyPreview />

      <button
        onClick={() => copy('body', fields.body)}
        disabled={!fields.body}
        style={{
          width: '100%',
          marginTop: 14,
          padding: '14px 16px',
          background: copied === 'body' ? '#22c55e' : '#7ed957',
          color: '#fff',
          border: 'none',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 700,
          cursor: fields.body ? 'pointer' : 'not-allowed',
          opacity: fields.body ? 1 : 0.4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {copied === 'body' ? <><Check size={16} /> Copied — Paste into your email</> : <><Copy size={16} /> Copy Full Email Body</>}
      </button>

      <Steps />
    </div>
  )
}

function Banner({ type, text }: { type: 'urgent' | 'status'; text: string }) {
  const styles = type === 'urgent'
    ? { bg: '#1a0d0d', border: '#7f1d1d', color: '#fca5a5', dot: '#ef4444', dotAnim: true }
    : { bg: '#0d1f10', border: '#166534', color: '#86efac', dot: '#22c55e', dotAnim: false }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: styles.bg, border: `1px solid ${styles.border}`, borderRadius: 10, marginBottom: 14, fontSize: 12, color: styles.color }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: styles.dot, animation: styles.dotAnim ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
      <div>{text}</div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  )
}

function Row({ label, value, copied, onCopy, mono, bodyPreview }: { label: string; value: string; copied: boolean; onCopy: () => void; mono?: boolean; bodyPreview?: boolean }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#555', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      <div
        onClick={onCopy}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          background: copied ? '#0d1f10' : '#161b22',
          border: `1px solid ${copied ? '#22c55e' : '#2a2a2a'}`,
          borderRadius: 10,
          cursor: 'pointer',
          transition: 'all 0.15s',
          WebkitTapHighlightColor: 'transparent',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            flex: 1,
            color: copied ? '#86efac' : '#d0d0d0',
            fontSize: 13,
            fontFamily: mono ? "'SF Mono', 'Courier New', monospace" : '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            wordBreak: 'break-word',
            ...(bodyPreview ? { display: '-webkit-box', WebkitLineClamp: 2 as unknown as number, WebkitBoxOrient: 'vertical' as 'vertical', overflow: 'hidden', whiteSpace: 'pre-wrap' } : { whiteSpace: bodyPreview ? 'pre-wrap' : 'normal' }),
          }}
        >
          {value}
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: copied ? '#22c55e' : '#7ed957',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </div>
      </div>
    </div>
  )
}

function Steps() {
  return (
    <div style={{ marginTop: 28, padding: '14px 16px', background: '#161b22', border: '1px solid #2a2a2a', borderRadius: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>How to use</div>
      {[
        ['1', 'Open your email app → New Email'],
        ['2', 'Tap each field above → it copies'],
        ['3', 'Long-press the matching field in your email app → Paste'],
        ['4', 'Repeat for To / CC / BCC / Subject / Body'],
      ].map(([n, t]) => (
        <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#7ed957', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{n}</div>
          <div style={{ fontSize: 12, color: '#d0d0d0', paddingTop: 3 }}>{t}</div>
        </div>
      ))}
    </div>
  )
}

// ── Library ────────────────────────────────────────────────────────

function Library({ templates, activeId, onSelect, onDelete, onClose }: { templates: Template[]; activeId: string; onSelect: (t: Template) => void; onDelete: (id: string) => void; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 12 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 540, maxHeight: '70vh', background: '#161b22', border: '1px solid #2a2a2a', borderRadius: 16, padding: 16, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Templates ({templates.length})</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        {templates.length === 0 ? (
          <div style={{ padding: '40px 12px', textAlign: 'center', color: '#555', fontSize: 13 }}>
            No templates yet. Compose + save to add one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {templates.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: t.id === activeId ? '#0d1f10' : '#020810', border: `1px solid ${t.id === activeId ? '#22c55e' : '#2a2a2a'}`, borderRadius: 10 }}>
                <div onClick={() => onSelect(t)} style={{ flex: 1, cursor: 'pointer' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{t.subject || '(no subject)'}</div>
                </div>
                <button onClick={() => onDelete(t.id)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: 6 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
