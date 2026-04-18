'use client'

import { useState, useEffect } from 'react'

interface Blog {
  id: string
  name: string
  description?: string
  url?: string
  postCount?: number
}

interface BlogPost {
  id: string
  title: string
  status: string
  author?: string
  createdAt?: string
  updatedAt?: string
  slug?: string
  blogId?: string
}

export default function BlogPage() {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'blogs' | 'posts'>('posts')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', status: 'draft' })

  useEffect(() => { fetchData() }, [tab])

  async function fetchData() {
    setLoading(true)
    setError('')
    try {
      if (tab === 'blogs') {
        const res = await fetch('/api/crm/blog?type=blogs')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to fetch')
        setBlogs(data.blogs || [])
      } else {
        const res = await fetch('/api/crm/blog?type=posts')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to fetch')
        setPosts(data.posts || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title) return
    setCreating(true)
    try {
      const res = await fetch('/api/crm/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to create')
      setShowCreate(false)
      setForm({ title: '', content: '', status: 'draft' })
      setTab('posts')
      await fetchData()
    } catch {
      // handled silently
    } finally {
      setCreating(false)
    }
  }

  const filteredPosts = posts.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()))
  const filteredBlogs = blogs.filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()))

  const statusColor = (s: string) => {
    if (s === 'published') return '#7ed957'
    if (s === 'draft') return 'var(--text-muted, #6b7280)'
    return '#fbbf24'
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>
      {/* Create Post Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => !creating && setShowCreate(false)}>
          <div style={{
            background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
            borderRadius: 16, padding: 28, maxWidth: 520, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: '0 0 20px' }}>
              New Blog Post
            </h2>
            <form onSubmit={handleCreate}>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title</span>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Post title"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </label>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Content</span>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Write your post..."
                  rows={6} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
              </label>
              <label style={{ display: 'block', marginBottom: 20 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1c2b42', background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f0f4f8)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={creating || !form.title} style={{
                  flex: 1, padding: 12, background: creating ? '#374151' : 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
                  color: creating ? '#9CA3AF' : '#0c1220', fontWeight: 700, fontSize: 14, borderRadius: 10, border: 'none', cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                }}>{creating ? 'Creating...' : 'Create Post'}</button>
                <button type="button" onClick={() => setShowCreate(false)} style={{
                  padding: '12px 20px', borderRadius: 10, border: '1px solid #1c2b42', background: 'transparent', color: 'var(--text-muted, #6b7280)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f0f4f8)', margin: 0, display: 'flex', alignItems: 'center' }}>
            Blog Engine
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(126,217,87,0.12)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)', marginLeft: 8 }}>UNLIMITED</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>Manage blogs and blog posts</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#7ed957' }}>Activated</span>
          <button onClick={() => setShowCreate(true)} style={{
            padding: '10px 20px', background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
            color: '#0c1220', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
          }}>+ New Post</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['posts', 'blogs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: tab === t ? 'rgba(45,212,191,0.15)' : 'transparent',
            color: tab === t ? 'var(--color-cyan, #14b8a6)' : 'var(--text-muted, #6b7280)',
          }}>{t === 'posts' ? 'Posts' : 'Blogs'}</button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input type="text" placeholder={`Search ${tab}...`} value={search} onChange={e => setSearch(e.target.value)}
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
          <button onClick={fetchData} style={{ color: 'var(--color-cyan, #14b8a6)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Try again</button>
        </div>
      ) : tab === 'posts' ? (
        filteredPosts.length === 0 ? (
          <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, padding: '60px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>&#9997;</div>
            <p style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: 14, marginBottom: 16 }}>No blog posts yet. Create your first one.</p>
            <button onClick={() => setShowCreate(true)} style={{
              padding: '10px 20px', background: 'linear-gradient(135deg, #2dd4bf, #14b8a6)',
              color: '#0c1220', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
            }}>+ New Post</button>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1c2b42' }}>
                  {['Title', 'Status', 'Author', 'Created'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(28,43,66,0.5)' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1a2740'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)' }}>{p.title}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: statusColor(p.status) }}>{p.status}</span>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary, #9ca3af)' }}>{p.author || '—'}</td>
                    <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        filteredBlogs.length === 0 ? (
          <div style={{ background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42', borderRadius: 14, padding: '60px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>&#128218;</div>
            <p style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: 14 }}>No blogs found. Create a blog in your CRM first.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filteredBlogs.map(b => (
              <div key={b.id} style={{
                background: 'var(--bg-card, #1f2937)', border: '1px solid #1c2b42',
                borderRadius: 12, padding: 20,
              }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #f0f4f8)', marginBottom: 8 }}>{b.name}</div>
                {b.description && <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginBottom: 12 }}>{b.description}</p>}
                <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{b.postCount || 0} posts</div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
