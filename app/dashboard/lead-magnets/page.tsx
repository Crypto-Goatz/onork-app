'use client'

import { useEffect, useState } from 'react'
import {
  Megaphone,
  Plus,
  ExternalLink,
  Users,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Funnel {
  funnel_id: string
  funnel_name: string
  offer_title: string
  offer_description: string | null
  offer_file_url: string | null
  is_active: boolean
  modal_theme: 'light' | 'dark'
  post_subscribe_redirect: string
  stats: { total: number; verified: number; recCount: number }
  created_at: string
}

export default function LeadMagnetsPage() {
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  // Create form
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/lead-magnet/funnels')
      if (!res.ok) {
        toast.error('Failed to load funnels')
        return
      }
      const data = await res.json()
      setFunnels(data.funnels ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function create() {
    if (!name.trim() || !title.trim()) {
      toast.error('Funnel name and offer title required')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/lead-magnet/funnels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          funnel_name: name,
          funnel_id: slug || undefined,
          offer_title: title,
          offer_description: desc || undefined,
          offer_file_url: fileUrl || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Create failed')
        return
      }
      toast.success('Funnel created')
      setShowCreate(false)
      setName('')
      setSlug('')
      setTitle('')
      setDesc('')
      setFileUrl('')
      load()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="px-6 py-5 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-[#7ed957]" />
            Lead Magnets
          </h1>
          <p className="text-sm text-white/55 mt-1">
            Run viral growth loops. Each funnel = a landing page → opt-in → ebook delivery → recommendations modal → builtwith page. Every subscriber feeds the loop.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> New funnel
          </Button>
        </div>
      </div>

      {showCreate && (
        <Card className="mb-6 p-5">
          <div className="font-semibold mb-3">New funnel</div>
          <div className="space-y-3">
            <div>
              <Label>Funnel name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My LinkedIn ebook" />
            </div>
            <div>
              <Label>URL slug (optional — auto-derived from name)</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-linkedin-ebook" />
            </div>
            <div>
              <Label>Offer title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Free Ebook: How to Automate Anything" />
            </div>
            <div>
              <Label>Offer description</Label>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="The 30-page guide every founder needs" />
            </div>
            <div>
              <Label>Ebook file URL (where to send subscribers after verification)</Label>
              <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://yourcdn.com/ebook.pdf" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={create} disabled={creating}>
              {creating ? 'Creating…' : 'Create funnel'}
            </Button>
          </div>
        </Card>
      )}

      {loading && funnels.length === 0 ? (
        <div className="text-center py-12 text-white/40">Loading…</div>
      ) : funnels.length === 0 ? (
        <Card className="p-8 text-center">
          <Megaphone className="h-10 w-10 mx-auto mb-3 text-white/20" />
          <p className="text-white/60">No funnels yet.</p>
          <p className="text-sm text-white/40 mt-1">Click &ldquo;New funnel&rdquo; to start your first viral loop.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {funnels.map((f) => (
            <FunnelRow key={f.funnel_id} funnel={f} />
          ))}
        </div>
      )}
    </div>
  )
}

function FunnelRow({ funnel }: { funnel: Funnel }) {
  const [copied, setCopied] = useState(false)
  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : 'https://0ncore.com'
  const landingUrl = `${baseUrl}/lead/${funnel.funnel_id}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${landingUrl}?utm_source=linkedin&utm_medium=social&utm_campaign=${funnel.funnel_id}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Copy failed')
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-base font-semibold truncate">{funnel.funnel_name}</h3>
            {!funnel.is_active && (
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-white/50">
                inactive
              </span>
            )}
          </div>
          <p className="text-xs text-white/55 line-clamp-1">{funnel.offer_title}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/55">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {funnel.stats.total}
          </span>
          <span className="flex items-center gap-1 text-emerald-300/80">
            <CheckCircle2 className="h-3 w-3" /> {funnel.stats.verified}
          </span>
          <span className="opacity-60">{funnel.stats.recCount} recs</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded border border-white/10 bg-white/[0.02] px-2 py-1 text-[11px] text-white/70 font-mono">
          {landingUrl}
        </code>
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
          {copied ? 'Copied' : 'Copy URL'}
        </Button>
        <a
          href={landingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center gap-1 rounded-md border border-white/15 px-3 text-xs font-medium text-white hover:border-white/30"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Preview
        </a>
        <a
          href={`/dashboard/lead-magnets/${funnel.funnel_id}`}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-white/15 px-3 text-xs font-medium text-white hover:border-white/30"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </a>
      </div>
    </Card>
  )
}
