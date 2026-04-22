'use client'

import { useState, useEffect } from 'react'
import { Search, BookOpen, PenLine } from 'lucide-react'

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

function statusClass(s: string) {
  if (s === 'published') return 'text-[#6EE05A]'
  if (s === 'draft') return 'text-[#6b7280]'
  return 'text-[#f59e0b]'
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

  return (
    <div className="max-w-[1100px] mx-auto px-2">

      {/* Create Post Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => !creating && setShowCreate(false)}
        >
          <div
            className="bg-[#161b22] border border-[#1c2b42] rounded-2xl p-7 max-w-[520px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-[#f0f4f8] mb-5">
              New Blog Post
            </h2>
            <form onSubmit={handleCreate}>
              <label className="block mb-3">
                <span className="block text-[11px] font-semibold text-[#6b7280] mb-1 uppercase tracking-[0.05em]">Title</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Post title"
                  className="w-full px-3 py-2.5 rounded-lg border border-[#1c2b42] bg-[#0d1117] text-[#f0f4f8] text-sm outline-none"
                />
              </label>
              <label className="block mb-3">
                <span className="block text-[11px] font-semibold text-[#6b7280] mb-1 uppercase tracking-[0.05em]">Content</span>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Write your post..."
                  rows={6}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#1c2b42] bg-[#0d1117] text-[#f0f4f8] text-sm outline-none resize-y font-[inherit]"
                />
              </label>
              <label className="block mb-5">
                <span className="block text-[11px] font-semibold text-[#6b7280] mb-1 uppercase tracking-[0.05em]">Status</span>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#1c2b42] bg-[#0d1117] text-[#f0f4f8] text-sm outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>
              <div className="flex gap-2.5">
                <button
                  type="submit"
                  disabled={creating || !form.title}
                  className={`flex-1 py-3 font-bold text-sm rounded-[10px] border-none font-[inherit] transition-colors ${
                    creating
                      ? 'bg-[#374151] text-[#9CA3AF] cursor-not-allowed'
                      : 'bg-gradient-to-br from-[#2dd4bf] to-[#14b8a6] text-[#0c1220] cursor-pointer'
                  }`}
                >
                  {creating ? 'Creating...' : 'Create Post'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-5 py-3 rounded-[10px] border border-[#1c2b42] bg-transparent text-[#6b7280] text-sm cursor-pointer font-[inherit]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#f0f4f8] m-0 flex items-center gap-2">
            Blog Engine
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-[10px] bg-[#6EE05A]/[0.12] text-[#6EE05A] border border-[#6EE05A]/20">
              UNLIMITED
            </span>
          </h1>
          <p className="text-[13px] text-[#6b7280] mt-1">Manage blogs and blog posts</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-[11px] font-semibold text-[#6EE05A]">Activated</span>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-gradient-to-br from-[#2dd4bf] to-[#14b8a6] text-[#0c1220] font-bold text-[13px] rounded-[10px] border-none cursor-pointer"
          >
            + New Post
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        {(['posts', 'blogs'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold border-none cursor-pointer transition-colors ${
              tab === t
                ? 'bg-[#14b8a6]/15 text-[#14b8a6]'
                : 'bg-transparent text-[#6b7280]'
            }`}
          >
            {t === 'posts' ? 'Posts' : 'Blogs'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] pointer-events-none" />
        <input
          type="text"
          placeholder={`Search ${tab}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-[#161b22] border border-[#1c2b42] rounded-[10px] text-[#f0f4f8] text-sm outline-none"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-[3px] border-[#1c2b42] border-t-[#14b8a6] rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-[#161b22] border border-[#1c2b42] rounded-2xl p-10 text-center">
          <p className="text-[#ef4444] text-sm mb-3">{error}</p>
          <button
            onClick={fetchData}
            className="text-[#14b8a6] bg-none border-none cursor-pointer text-[13px] font-semibold"
          >
            Try again
          </button>
        </div>
      ) : tab === 'posts' ? (
        filteredPosts.length === 0 ? (
          <div className="bg-[#161b22] border border-[#1c2b42] rounded-2xl px-10 py-16 text-center">
            <div className="flex justify-center mb-4 opacity-30">
              <PenLine className="w-10 h-10 text-[#9ca3af]" />
            </div>
            <p className="text-[#9ca3af] text-sm mb-4">No blog posts yet. Create your first one.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-gradient-to-br from-[#2dd4bf] to-[#14b8a6] text-[#0c1220] font-bold text-[13px] rounded-[10px] border-none cursor-pointer"
            >
              + New Post
            </button>
          </div>
        ) : (
          <div className="bg-[#161b22] border border-[#1c2b42] rounded-2xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#1c2b42]">
                  {['Title', 'Status', 'Author', 'Created'].map(h => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.06em]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map(p => (
                  <tr
                    key={p.id}
                    className="border-b border-[#1c2b42]/50 hover:bg-[#1c2333] transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm font-semibold text-[#f0f4f8]">{p.title}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${statusClass(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-[#9ca3af]">{p.author || '—'}</td>
                    <td className="px-5 py-3.5 text-xs text-[#6b7280]">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        filteredBlogs.length === 0 ? (
          <div className="bg-[#161b22] border border-[#1c2b42] rounded-2xl px-10 py-16 text-center">
            <div className="flex justify-center mb-4 opacity-30">
              <BookOpen className="w-10 h-10 text-[#9ca3af]" />
            </div>
            <p className="text-[#9ca3af] text-sm">No blogs found. Create a blog in your CRM first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {filteredBlogs.map(b => (
              <div
                key={b.id}
                className="bg-[#161b22] border border-[#1c2b42] rounded-xl p-5"
              >
                <div className="text-[15px] font-semibold text-[#f0f4f8] mb-2">{b.name}</div>
                {b.description && (
                  <p className="text-[13px] text-[#6b7280] mb-3">{b.description}</p>
                )}
                <div className="text-xs text-[#6b7280]">{b.postCount || 0} posts</div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
