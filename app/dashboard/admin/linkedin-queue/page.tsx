'use client'

/**
 * Dashboard → Admin → LinkedIn Queue.
 * Review AI-generated LinkedIn posts: approve, reject, or publish (needs a
 * connected LinkedIn account). Shows VPIS score + hook archetype per post.
 */

import { useEffect, useState, useCallback } from 'react'

interface Post {
  id: string
  content_text: string
  vpis_score: number | null
  hook_archetype: string | null
  status: string
  created_at: string
  posted_at: string | null
}

const STATUS_COLOR: Record<string, string> = {
  pending_approval: '#fbbf24', approved: '#60a5fa', posted: '#6EE05A', rejected: '#ef4444',
}

export default function LinkedInQueuePage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [busy, setBusy] = useState<string>('')
  const [msg, setMsg] = useState<string>('')

  const load = useCallback(async () => {
    const d = await fetch('/api/admin/linkedin-queue').then((r) => r.json()).catch(() => ({ posts: [] }))
    setPosts(d.posts || [])
  }, [])
  useEffect(() => { load() }, [load])

  async function act(id: string, action: 'approve' | 'reject' | 'publish') {
    setBusy(id + action); setMsg('')
    const r = await fetch('/api/admin/linkedin-queue', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    }).then((r) => r.json()).catch(() => ({ ok: false }))
    setBusy('')
    if (action === 'publish' && r.needsConnection) setMsg('⚠ Connect a LinkedIn account in Integrations before publishing.')
    else if (!r.ok) setMsg('Error: ' + (r.error || 'failed'))
    await load()
  }

  const pending = posts.filter((p) => p.status === 'pending_approval')

  return (
    <div style={{ padding: 32, color: '#f0f4f8', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>LinkedIn Queue</h1>
      <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 4 }}>
        {pending.length} awaiting approval · {posts.length} total. AI-generated, VPIS-scored. Approve to queue, publish to post live.
      </p>
      <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 20 }}>
        Publishing requires a connected LinkedIn account (Integrations). Until then, posts stay queued.
      </p>
      {msg && <div style={{ background: '#1f2937', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{msg}</div>}

      {posts.length === 0 && <p style={{ color: '#6b7280' }}>No posts in the queue yet. The LinkedIn cron generates them on Tue/Wed/Thu.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {posts.map((p) => (
          <div key={p.id} style={{ background: '#161b22', border: '1px solid #1f2937', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 12 }}>
              <span style={{ color: STATUS_COLOR[p.status] || '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>{p.status.replace('_', ' ')}</span>
              {p.vpis_score != null && <span style={{ color: '#6EE05A' }}>VPIS {Number(p.vpis_score).toFixed(0)}</span>}
              {p.hook_archetype && <span style={{ color: '#6b7280' }}>{p.hook_archetype.replace(/_/g, ' ')}</span>}
              <span style={{ color: '#6b7280', marginLeft: 'auto' }}>{new Date(p.created_at).toLocaleDateString()}</span>
            </div>
            <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.5, color: '#d1d5db' }}>{p.content_text}</p>
            {p.status === 'pending_approval' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => act(p.id, 'publish')} disabled={!!busy}
                  style={{ background: '#6EE05A', color: '#04121a', fontWeight: 700, border: 0, borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                  {busy === p.id + 'publish' ? 'Publishing…' : 'Publish now'}
                </button>
                <button onClick={() => act(p.id, 'approve')} disabled={!!busy}
                  style={{ background: '#1f2937', color: '#60a5fa', border: 0, borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                  Approve
                </button>
                <button onClick={() => act(p.id, 'reject')} disabled={!!busy}
                  style={{ background: '#1f2937', color: '#ef4444', border: 0, borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
