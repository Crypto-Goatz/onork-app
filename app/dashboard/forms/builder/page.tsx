'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, GripVertical, Copy, CheckCircle2, ArrowLeft, Code, Eye } from 'lucide-react'

interface FormField {
  id: string
  name: string
  label: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'url'
  placeholder: string
  required: boolean
  options?: string[]
}

const FIELD_TYPES = [
  { type: 'text', label: 'Text', icon: 'Aa' },
  { type: 'email', label: 'Email', icon: '@' },
  { type: 'phone', label: 'Phone', icon: '#' },
  { type: 'textarea', label: 'Long Text', icon: '¶' },
  { type: 'select', label: 'Dropdown', icon: '▼' },
  { type: 'number', label: 'Number', icon: '1' },
  { type: 'url', label: 'URL', icon: 'URL' },
]

const DEFAULT_FIELDS: FormField[] = [
  { id: '1', name: 'name', label: 'Full Name', type: 'text', placeholder: 'Your name', required: true },
  { id: '2', name: 'email', label: 'Email', type: 'email', placeholder: 'your@email.com', required: true },
  { id: '3', name: 'phone', label: 'Phone', type: 'phone', placeholder: '+1 (555) 000-0000', required: false },
]

const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none'

export default function FormBuilderPage() {
  const router = useRouter()
  const [formName, setFormName] = useState('Contact Form')
  const [fields, setFields] = useState<FormField[]>(DEFAULT_FIELDS)
  const [settings, setSettings] = useState({
    description: '',
    submitText: 'Submit',
    successMessage: 'Thank you! We\'ll be in touch soon.',
    primaryColor: '#6EE05A',
    showBranding: true,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<{ embedScript: string; formId: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [error, setError] = useState('')

  function addField(type: string) {
    const id = Date.now().toString()
    const f: FormField = {
      id,
      name: `field_${id}`,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      type: type as FormField['type'],
      placeholder: '',
      required: false,
      ...(type === 'select' ? { options: ['Option 1', 'Option 2'] } : {}),
    }
    setFields([...fields, f])
  }

  function updateField(id: string, updates: Partial<FormField>) {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  function removeField(id: string) {
    setFields(fields.filter(f => f.id !== id))
  }

  async function handleSave() {
    if (!formName.trim() || fields.length === 0) {
      setError('Form needs a name and at least one field')
      return
    }
    setError('')
    setSaving(true)

    try {
      const res = await fetch('/api/forms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          fields: fields.map(f => ({
            name: f.name,
            label: f.label,
            type: f.type,
            placeholder: f.placeholder,
            required: f.required,
            ...(f.options ? { options: f.options } : {}),
          })),
          settings,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create form')

      setSaved({ embedScript: data.embedScript, formId: data.form.id })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
    setSaving(false)
  }

  function copyEmbed() {
    if (saved) {
      navigator.clipboard.writeText(saved.embedScript)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // ── Saved state — show embed code ──
  if (saved) {
    return (
      <div className="max-w-[700px] mx-auto px-2">
        <div className="flex items-center gap-3 mb-6">
          <CheckCircle2 className="size-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">{formName} — Created</h1>
            <p className="text-sm text-muted-foreground">Copy the embed code below to add this form to any website</p>
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-card p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Code className="size-4" /> Embed Code
            </div>
            <button onClick={copyEmbed} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
              {copied ? <><CheckCircle2 className="size-3" /> Copied</> : <><Copy className="size-3" /> Copy</>}
            </button>
          </div>
          <pre className="p-4 rounded-lg bg-background border border-border text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-all">
            {saved.embedScript}
          </pre>
          <p className="text-xs text-muted-foreground mt-3">
            Paste this in your website&apos;s HTML where you want the form to appear. It works on any site — WordPress, Wix, Squarespace, custom HTML.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">Submission Endpoint</h3>
          <code className="text-xs font-mono text-primary break-all">POST https://0ncore.com/api/forms/submit</code>
          <p className="text-xs text-muted-foreground mt-2">
            Submissions automatically create a CRM contact and appear in your dashboard.
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={() => router.push('/dashboard/forms')} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            View All Forms
          </button>
          <button onClick={() => { setSaved(null); setFields(DEFAULT_FIELDS); setFormName('Contact Form') }} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            Create Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[900px] mx-auto px-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/forms')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Form Builder</h1>
            <p className="text-xs text-muted-foreground">Design your form, save it, and embed on any site</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPreviewMode(!previewMode)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <Eye className="size-3.5" /> {previewMode ? 'Edit' : 'Preview'}
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save & Get Embed Code'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">{error}</div>}

      <div className={`grid gap-6 ${previewMode ? 'grid-cols-1' : '[grid-template-columns:1fr_300px]'}`}>
        {/* ── Main: Field Editor ── */}
        <div className="space-y-4">
          {/* Form name */}
          <div className="rounded-xl border border-border bg-card p-4">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Form Name</label>
            <input value={formName} onChange={e => setFormName(e.target.value)} className={inputClass} placeholder="Contact Form" />
            <div className="mt-3">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Description (optional)</label>
              <input value={settings.description} onChange={e => setSettings({ ...settings, description: e.target.value })} className={inputClass} placeholder="Fill out the form below..." />
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-2">
            {fields.map((field, i) => (
              <div key={field.id} className="rounded-xl border border-border bg-card p-4 group">
                <div className="flex items-center gap-3 mb-3">
                  <GripVertical className="size-4 text-muted-foreground/30 cursor-grab" />
                  <span className="text-xs font-mono text-muted-foreground w-6">{i + 1}</span>
                  <input value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} className="flex-1 bg-transparent border-none text-sm font-semibold text-foreground outline-none" placeholder="Field Label" />
                  <select value={field.type} onChange={e => updateField(field.id, { type: e.target.value as FormField['type'] })} className="text-xs rounded-md border border-border bg-background px-2 py-1 text-foreground">
                    {FIELD_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <input type="checkbox" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} className="rounded" /> Req
                  </label>
                  <button onClick={() => removeField(field.id)} className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 pl-10">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Field Name (API)</label>
                    <input value={field.name} onChange={e => updateField(field.id, { name: e.target.value.replace(/\s/g, '_').toLowerCase() })} className={inputClass + ' text-xs font-mono'} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Placeholder</label>
                    <input value={field.placeholder} onChange={e => updateField(field.id, { placeholder: e.target.value })} className={inputClass + ' text-xs'} />
                  </div>
                </div>
                {field.type === 'select' && (
                  <div className="mt-2 pl-10">
                    <label className="text-[10px] text-muted-foreground">Options (comma separated)</label>
                    <input value={field.options?.join(', ') || ''} onChange={e => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className={inputClass + ' text-xs'} placeholder="Option 1, Option 2, Option 3" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add field */}
          <div className="flex flex-wrap gap-2">
            {FIELD_TYPES.map(t => (
              <button key={t.type} onClick={() => addField(t.type)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                <Plus className="size-3" /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Sidebar: Settings ── */}
        {!previewMode && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Settings</h3>
              <div>
                <label className="text-[10px] text-muted-foreground">Submit Button Text</label>
                <input value={settings.submitText} onChange={e => setSettings({ ...settings, submitText: e.target.value })} className={inputClass + ' text-xs'} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Success Message</label>
                <input value={settings.successMessage} onChange={e => setSettings({ ...settings, successMessage: e.target.value })} className={inputClass + ' text-xs'} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Button Color</label>
                <div className="flex gap-2">
                  <input type="color" value={settings.primaryColor} onChange={e => setSettings({ ...settings, primaryColor: e.target.value })} className="w-8 h-8 rounded border border-border cursor-pointer" />
                  <input value={settings.primaryColor} onChange={e => setSettings({ ...settings, primaryColor: e.target.value })} className={inputClass + ' text-xs font-mono flex-1'} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={settings.showBranding} onChange={e => setSettings({ ...settings, showBranding: e.target.checked })} /> Show 0nCore branding
              </label>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">How It Works</h3>
              <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal pl-4">
                <li>Design your form fields above</li>
                <li>Click &quot;Save &amp; Get Embed Code&quot;</li>
                <li>Paste the script tag on any website</li>
                <li>Submissions create CRM contacts automatically</li>
                <li>View all submissions in your dashboard</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
