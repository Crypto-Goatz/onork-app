'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Mail, Plus, Search } from 'lucide-react'

interface Template {
  id: string
  name: string
  subject?: string
  preheader?: string
  html?: string
  design?: Record<string, unknown>
  lastUpdated?: string
  dateAdded?: string
  category?: string
  type?: string
}

const CATEGORY_CLASSES: Record<string, { badge: string; dot: string }> = {
  Onboarding: { badge: 'bg-core-green/10 text-core-green', dot: 'bg-core-green' },
  Sales: { badge: 'bg-core-cyan/10 text-core-cyan', dot: 'bg-core-cyan' },
  Billing: { badge: 'bg-core-amber/10 text-core-amber', dot: 'bg-core-amber' },
  Retention: { badge: 'bg-core-red/10 text-core-red', dot: 'bg-core-red' },
  Marketing: { badge: 'bg-core-purple/10 text-core-purple', dot: 'bg-core-purple' },
  General: { badge: 'bg-core-text-muted/10 text-core-text-muted', dot: 'bg-core-text-muted' },
}

function getCategoryClasses(category: string) {
  return CATEGORY_CLASSES[category] || CATEGORY_CLASSES.General
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/email/templates')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch templates')
      setTemplates(data.templates || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category || 'General').filter(Boolean)))]

  const filtered = templates.filter(t => {
    const matchesSearch = !search ||
      (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.subject || '').toLowerCase().includes(search.toLowerCase())
    const matchesCategory = filterCategory === 'all' || (t.category || 'General') === filterCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div>
      {/* Page header */}
      <div className="jp-page-header flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="jp-page-title flex items-center gap-2.5">
              Email Templates
              <span className="text-[0.6rem] font-extrabold bg-core-green text-core-bg px-2 py-0.5 rounded-full tracking-wide uppercase">
                UNLIMITED
              </span>
            </h1>
            <p className="jp-page-subtitle">
              {loading ? 'Loading templates...' : `${templates.length} templates available`}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/email/builder"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-core-green text-core-bg rounded-lg text-[0.8125rem] font-bold no-underline hover:bg-core-green/90 transition-colors"
        >
          <Plus className="size-3.5" />
          Create New
        </Link>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-3.5 py-2 rounded-lg bg-core-red/[0.08] border border-core-red/20 text-[0.8125rem] text-core-red flex justify-between items-center">
          <span>{error}</span>
          <button onClick={fetchTemplates} className="bg-transparent border-0 text-core-cyan cursor-pointer text-[0.8125rem] font-semibold">
            Retry
          </button>
        </div>
      )}

      {/* Search and filters */}
      <div className="flex gap-3 mb-4 items-center">
        <div className="jp-search flex-1 max-w-[400px]">
          <span className="jp-search-icon">
            <Search className="size-4" />
          </span>
          <input
            type="text"
            className="jp-search-input w-full"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={[
                'px-3 py-1 text-[0.6875rem] font-semibold rounded-full border cursor-pointer capitalize transition-colors',
                filterCategory === cat
                  ? 'border-core-green bg-core-green/10 text-core-green'
                  : 'border-core-border bg-transparent text-core-text-muted hover:text-core-text',
              ].join(' ')}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="size-8 border-2 border-core-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {filtered.length === 0 ? (
            <div className="col-span-full text-center py-10 text-core-text-muted">
              <Mail className="size-12 mx-auto mb-3 opacity-50" />
              <div className="text-sm mb-2">
                {search ? 'No templates match your search' : 'No templates yet'}
              </div>
              <Link
                href="/dashboard/email/builder"
                className="text-core-green text-[0.8125rem] font-semibold no-underline hover:underline"
              >
                Create your first template
              </Link>
            </div>
          ) : (
            filtered.map(template => {
              const category = template.category || 'General'
              const cls = getCategoryClasses(category)
              return (
                <div key={template.id} className="jp-card cursor-pointer flex flex-col">
                  <div className="jp-card-body flex-1">
                    {/* Category badge */}
                    <div className="flex justify-between items-center mb-3.5">
                      <span className={`text-[0.6875rem] font-semibold uppercase tracking-[0.04em] px-2.5 py-0.5 rounded-full ${cls.badge}`}>
                        {category}
                      </span>
                      {template.type && (
                        <span className="text-[0.6875rem] text-core-text-muted">{template.type}</span>
                      )}
                    </div>

                    {/* Template name */}
                    <h3 className="text-base font-semibold text-core-text mb-1.5">
                      {template.name || 'Untitled'}
                    </h3>

                    {/* Subject line */}
                    {template.subject && (
                      <div className="text-[0.8125rem] font-medium text-core-text-dim mb-2.5 flex items-center gap-1.5">
                        <Mail className="size-3" />
                        {template.subject}
                      </div>
                    )}
                  </div>

                  <div className="jp-card-footer flex justify-between items-center">
                    <span className="text-xs text-core-text-muted">
                      {template.lastUpdated
                        ? new Date(template.lastUpdated).toLocaleDateString()
                        : template.dateAdded
                        ? new Date(template.dateAdded).toLocaleDateString()
                        : ''}
                    </span>
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/email/builder?template=${template.id}`}
                        className="jp-btn jp-btn-outline px-3 py-1 text-xs no-underline"
                      >
                        Edit in Builder
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
