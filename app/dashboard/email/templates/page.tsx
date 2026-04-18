'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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

const CATEGORY_COLORS: Record<string, string> = {
  Onboarding: 'var(--jp-green)',
  Sales: 'var(--jp-cyan)',
  Billing: 'var(--jp-amber)',
  Retention: 'var(--jp-red)',
  Marketing: 'var(--jp-purple)',
  General: 'var(--jp-text-muted)',
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || 'var(--jp-text-muted)'
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

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category || 'General').filter(Boolean)))]

  // Filter templates
  const filtered = templates.filter(t => {
    const matchesSearch = !search ||
      (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.subject || '').toLowerCase().includes(search.toLowerCase())
    const matchesCategory = filterCategory === 'all' || (t.category || 'General') === filterCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div>
      <div className="jp-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <h1 className="jp-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              Email Templates
              <span style={{
                fontSize: '0.6rem',
                fontWeight: 800,
                background: 'var(--jp-green)',
                color: '#000',
                padding: '2px 8px',
                borderRadius: 20,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                verticalAlign: 'middle',
              }}>
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
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 20px',
            background: 'var(--jp-green)',
            color: '#000',
            border: 'none',
            borderRadius: 'var(--jp-radius-sm)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create New
        </Link>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '8px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', fontSize: '0.8125rem', color: 'var(--jp-red)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={fetchTemplates} style={{ background: 'none', border: 'none', color: 'var(--jp-cyan)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>Retry</button>
        </div>
      )}

      {/* Search and Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div className="jp-search" style={{ flex: 1, maxWidth: 400 }}>
          <span className="jp-search-icon">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            className="jp-search-input"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              style={{
                padding: '5px 12px',
                fontSize: '0.6875rem',
                fontWeight: 600,
                borderRadius: 20,
                border: filterCategory === cat ? '1px solid var(--jp-green)' : '1px solid var(--jp-border)',
                background: filterCategory === cat ? 'var(--jp-green-glow)' : 'transparent',
                color: filterCategory === cat ? 'var(--jp-green)' : 'var(--jp-text-muted)',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 32, height: 32, border: '2px solid var(--jp-green)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 16,
        }}>
          {filtered.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--jp-text-muted)' }}>
              <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div style={{ fontSize: '0.875rem', marginBottom: 8 }}>
                {search ? 'No templates match your search' : 'No templates yet'}
              </div>
              <Link
                href="/dashboard/email/builder"
                style={{ color: 'var(--jp-green)', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}
              >
                Create your first template
              </Link>
            </div>
          ) : (
            filtered.map(template => {
              const category = template.category || 'General'
              const color = getCategoryColor(category)
              return (
                <div key={template.id} className="jp-card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                  <div className="jp-card-body" style={{ flex: 1 }}>
                    {/* Category badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <span style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        padding: '3px 10px',
                        borderRadius: 20,
                        background: `color-mix(in srgb, ${color} 12%, transparent)`,
                        color: color,
                      }}>
                        {category}
                      </span>
                      {template.type && (
                        <span style={{ fontSize: '0.6875rem', color: 'var(--jp-text-muted)' }}>
                          {template.type}
                        </span>
                      )}
                    </div>

                    {/* Template name */}
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: 'var(--jp-text)',
                      marginBottom: 6,
                    }}>
                      {template.name || 'Untitled'}
                    </h3>

                    {/* Subject line */}
                    {template.subject && (
                      <div style={{
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        color: 'var(--jp-text-secondary)',
                        marginBottom: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8" />
                        </svg>
                        {template.subject}
                      </div>
                    )}
                  </div>

                  <div className="jp-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)' }}>
                      {template.lastUpdated ? new Date(template.lastUpdated).toLocaleDateString() : template.dateAdded ? new Date(template.dateAdded).toLocaleDateString() : ''}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link
                        href={`/dashboard/email/builder?template=${template.id}`}
                        className="jp-btn jp-btn-outline"
                        style={{ padding: '5px 12px', fontSize: '0.75rem', textDecoration: 'none' }}
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
