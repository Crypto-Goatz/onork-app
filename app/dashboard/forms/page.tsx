'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, FileText, ExternalLink, Copy, CheckCircle2, Loader2, BarChart3, Code } from 'lucide-react'

interface LocalForm {
  id: string
  name: string
  fields: unknown[]
  settings: Record<string, unknown>
  submission_count: number
  status: string
  embed_url: string
  created_at: string
  location_id?: string
}

interface CrmForm {
  id: string
  name: string
  type?: string
  submissionCount?: number
}

export default function FormsPage() {
  const router = useRouter()
  const [localForms, setLocalForms] = useState<LocalForm[]>([])
  const [crmForms, setCrmForms] = useState<CrmForm[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [tab, setTab] = useState<'local' | 'crm'>('local')

  useEffect(() => {
    Promise.all([
      fetch('/api/forms/create').then(r => r.json()).then(d => setLocalForms(d.forms || [])).catch(() => {}),
      fetch('/api/crm/forms').then(r => r.json()).then(d => setCrmForms(d.forms || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  function copyEmbed(formId: string) {
    const script = `<script src="https://0ncore.com/embed/form-widget.js" data-form-id="${formId}" async></script>`
    navigator.clipboard.writeText(script)
    setCopiedId(formId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredLocal = localForms.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()))
  const filteredCrm = crmForms.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="max-w-[1000px] mx-auto px-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Forms</h1>
          <p className="text-xs text-muted-foreground mt-1">Build forms, embed on any site, collect submissions into your CRM</p>
        </div>
        <button onClick={() => router.push('/dashboard/forms/builder')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="size-4" /> Create Form
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input type="text" placeholder="Search forms..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-border">
        <button onClick={() => setTab('local')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'local' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          Built Forms ({localForms.length})
        </button>
        <button onClick={() => setTab('crm')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'crm' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          CRM Forms ({crmForms.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : tab === 'local' ? (
        /* ── Local Forms (built in 0nCore) ── */
        filteredLocal.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <FileText className="size-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-2">{search ? 'No forms match your search' : 'No forms yet'}</p>
            <button onClick={() => router.push('/dashboard/forms/builder')}
              className="text-sm font-semibold text-primary hover:underline">Create your first form</button>
          </div>
        ) : (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
            {filteredLocal.map(f => (
              <div key={f.id} className="rounded-xl border border-border bg-card p-5 group hover:border-primary/20 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{f.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{(f.fields as unknown[]).length} fields</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.status === 'active' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground'}`}>
                    {f.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><BarChart3 className="size-3" /> {f.submission_count} submissions</span>
                  <span>{new Date(f.created_at).toLocaleDateString()}</span>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => copyEmbed(f.id)}
                    className="flex items-center gap-1.5 flex-1 justify-center px-3 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors">
                    {copiedId === f.id ? <><CheckCircle2 className="size-3 text-primary" /> Copied</> : <><Code className="size-3" /> Embed Code</>}
                  </button>
                  <button onClick={() => router.push(`/dashboard/forms/builder?edit=${f.id}`)}
                    className="px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── CRM Forms ── */
        filteredCrm.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <FileText className="size-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No CRM forms found for this location</p>
          </div>
        ) : (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
            {filteredCrm.map(f => (
              <div key={f.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">{f.name}</h3>
                  {f.type && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{f.type}</span>}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{f.submissionCount || 0} submissions</span>
                  <span className="flex items-center gap-1 text-primary"><ExternalLink className="size-3" /> CRM</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
