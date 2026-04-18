'use client'

import { useState, useEffect } from 'react'

interface Form {
  id: string
  name: string
  type?: string
  submissionCount?: number
  createdAt?: string
  status?: string
}

interface Submission {
  id: string
  formId: string
  contactId?: string
  name?: string
  email?: string
  createdAt?: string
  data?: Record<string, string>
}

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  const [loadingSubs, setLoadingSubs] = useState(false)

  useEffect(() => { fetchForms() }, [])

  async function fetchForms() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/crm/forms')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setForms(data.forms || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function viewSubmissions(form: Form) {
    setSelectedForm(form)
    setLoadingSubs(true)
    try {
      const res = await fetch(`/api/crm/forms?type=submissions&formId=${form.id}`)
      const data = await res.json()
      setSubmissions(data.submissions || [])
    } catch {
      setSubmissions([])
    } finally {
      setLoadingSubs(false)
    }
  }

  const filtered = forms.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>
      {/* Submissions Modal */}
      {selectedForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => setSelectedForm(null)}>
          <div style={{
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 16, padding: 28, maxWidth: 640, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)', maxHeight: '80vh', overflow: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: 0 }}>
                {selectedForm.name} - Submissions
              </h2>
              <button onClick={() => setSelectedForm(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted, #6b7280)', cursor: 'pointer', fontSize: 18 }}>&times;</button>
            </div>
            {loadingSubs ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div style={{ width: 24, height: 24, border: '3px solid #1c2b42', borderTopColor: 'var(--color-cyan, #14b8a6)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : submissions.length === 0 ? (
              <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, textAlign: 'center', padding: 20 }}>No submissions yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {submissions.map(s => (
                  <div key={s.id} style={{
                    padding: '12px 16px', borderRadius: 10, border: '1px solid #1c2b42',
                    background: 'var(--bg-primary, #0f172a)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>{s.name || s.email || 'Anonymous'}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}</span>
                    </div>
                    {s.email && <div style={{ fontSize: 12, color: 'var(--text-secondary, #9ca3af)' }}>{s.email}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: 0, display: 'flex', alignItems: 'center' }}>
            Form Builder
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,217,87,0.12)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)', marginLeft: 8 }}>UNLIMITED</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>
            {forms.length > 0 ? `${forms.length} forms` : 'Manage forms and view submissions'}
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#7ed957' }}>Activated</span>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input type="text" placeholder="Search forms..." value={search} onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px 12px 40px',
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 10, color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23556880' stroke-width='2' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: '14px center',
          }} />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #1c2b42', borderTopColor: 'var(--color-cyan, #14b8a6)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#f87171', fontSize: 14, marginBottom: 12 }}>{error}</p>
          <button onClick={fetchForms} style={{ color: 'var(--color-cyan, #14b8a6)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Try again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>&#128203;</div>
          <p style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: 14, marginBottom: 8 }}>
            {search ? 'No forms match your search.' : 'No forms yet.'}
          </p>
          <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13 }}>Forms created in your CRM will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(f => (
            <div key={f.id} style={{
              background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
              borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'border-color 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#2dd4bf'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1c2b42'}
              onClick={() => viewSubmissions(f)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>{f.name}</div>
                {f.type && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'rgba(45,212,191,0.1)', color: 'var(--color-cyan, #14b8a6)' }}>{f.type}</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{f.submissionCount || 0} submissions</span>
                <span style={{ fontSize: 12, color: 'var(--color-cyan, #14b8a6)', fontWeight: 600 }}>View &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
