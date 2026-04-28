'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, Plus, Trash2, GripVertical, ExternalLink, Loader2 } from 'lucide-react'
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
  confirmation_heading: string
  confirmation_subtext: string
  from_name: string
  from_email: string
  modal_theme: 'light' | 'dark'
  post_subscribe_redirect: string
  is_active: boolean
}

interface Rec {
  id?: string
  name: string
  byline: string | null
  bio: string | null
  image_url: string | null
  profile_url: string | null
  cta_label: string
  offer_type: string
  crm_tag: string | null
  is_sponsored: boolean
  is_active: boolean
}

const EMPTY_REC: Rec = {
  name: '',
  byline: '',
  bio: '',
  image_url: '',
  profile_url: '',
  cta_label: 'Subscribe',
  offer_type: 'newsletter',
  crm_tag: '',
  is_sponsored: false,
  is_active: true,
}

export default function EditFunnelPage({ params }: { params: Promise<{ funnelId: string }> }) {
  const { funnelId } = use(params)
  const [funnel, setFunnel] = useState<Funnel | null>(null)
  const [recs, setRecs] = useState<Rec[]>([])
  const [loading, setLoading] = useState(true)
  const [savingFunnel, setSavingFunnel] = useState(false)
  const [savingRecs, setSavingRecs] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/lead-magnet/funnels/${funnelId}`)
      if (!res.ok) {
        toast.error('Failed to load funnel')
        return
      }
      const data = await res.json()
      setFunnel(data.funnel)
      setRecs(data.recommendations ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [funnelId])

  async function saveFunnel() {
    if (!funnel) return
    setSavingFunnel(true)
    try {
      const res = await fetch(`/api/lead-magnet/funnels/${funnelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(funnel),
      })
      if (!res.ok) {
        toast.error('Save failed')
        return
      }
      toast.success('Settings saved')
    } finally {
      setSavingFunnel(false)
    }
  }

  async function saveRecs() {
    setSavingRecs(true)
    try {
      const res = await fetch(`/api/lead-magnet/funnels/${funnelId}/recommendations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendations: recs }),
      })
      if (!res.ok) {
        toast.error('Save failed')
        return
      }
      toast.success('Recommendations saved')
      load()
    } finally {
      setSavingRecs(false)
    }
  }

  function patchRec(i: number, patch: Partial<Rec>) {
    setRecs((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  function moveRec(i: number, dir: -1 | 1) {
    setRecs((prev) => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      const tmp = next[i]
      next[i] = next[j]
      next[j] = tmp
      return next
    })
  }

  if (loading || !funnel) {
    return (
      <div className="flex items-center justify-center py-16 text-white/40">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : 'https://0ncore.com'
  const landingUrl = `${baseUrl}/lead/${funnelId}`

  return (
    <div className="px-6 py-5 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/lead-magnets" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to funnels
        </Link>
        <a
          href={landingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-[#7ed957] hover:underline"
        >
          Preview <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Settings */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold">Funnel settings</div>
          <Button size="sm" onClick={saveFunnel} disabled={savingFunnel}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {savingFunnel ? 'Saving…' : 'Save'}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Funnel name</Label>
            <Input value={funnel.funnel_name} onChange={(e) => setFunnel({ ...funnel, funnel_name: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Offer title</Label>
            <Input value={funnel.offer_title} onChange={(e) => setFunnel({ ...funnel, offer_title: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Offer description</Label>
            <Input value={funnel.offer_description ?? ''} onChange={(e) => setFunnel({ ...funnel, offer_description: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Ebook file URL</Label>
            <Input value={funnel.offer_file_url ?? ''} onChange={(e) => setFunnel({ ...funnel, offer_file_url: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Post-subscribe redirect (the viral loop closer)</Label>
            <Input
              value={funnel.post_subscribe_redirect}
              onChange={(e) => setFunnel({ ...funnel, post_subscribe_redirect: e.target.value })}
              placeholder="https://0ncore.com/builtwith"
            />
          </div>
          <div>
            <Label>Modal heading</Label>
            <Input value={funnel.confirmation_heading} onChange={(e) => setFunnel({ ...funnel, confirmation_heading: e.target.value })} />
          </div>
          <div>
            <Label>Modal theme</Label>
            <select
              value={funnel.modal_theme}
              onChange={(e) => setFunnel({ ...funnel, modal_theme: e.target.value as 'light' | 'dark' })}
              className="h-9 w-full rounded-md border border-white/10 bg-white/[0.02] px-3 text-sm focus:border-white/30 focus:outline-none"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div>
            <Label>From name</Label>
            <Input value={funnel.from_name} onChange={(e) => setFunnel({ ...funnel, from_name: e.target.value })} />
          </div>
          <div>
            <Label>From email</Label>
            <Input value={funnel.from_email} onChange={(e) => setFunnel({ ...funnel, from_email: e.target.value })} />
          </div>
        </div>
      </Card>

      {/* Recommendations */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-semibold">Recommendations</div>
            <p className="text-xs text-white/50 mt-0.5">
              Shown in the post-opt-in modal. Order matters — first one is the most prominent slot.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setRecs((r) => [...r, { ...EMPTY_REC }])}>
              <Plus className="mr-1 h-3 w-3" /> Add slot
            </Button>
            <Button size="sm" onClick={saveRecs} disabled={savingRecs}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {savingRecs ? 'Saving…' : 'Save list'}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {recs.length === 0 && (
            <div className="rounded-md border border-dashed border-white/10 p-4 text-center text-sm text-white/40">
              No recommendations yet. Add one to populate the modal.
            </div>
          )}
          {recs.map((r, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveRec(i, -1)}
                  disabled={i === 0}
                  className="text-white/40 hover:text-white/80 disabled:opacity-30"
                  aria-label="Move up"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <span className="text-xs font-mono text-white/40">slot {i + 1}</span>
                <div className="flex-1" />
                <label className="flex items-center gap-1.5 text-xs text-white/60">
                  <input
                    type="checkbox"
                    checked={r.is_sponsored}
                    onChange={(e) => patchRec(i, { is_sponsored: e.target.checked })}
                  />
                  Sponsored
                </label>
                <label className="flex items-center gap-1.5 text-xs text-white/60">
                  <input
                    type="checkbox"
                    checked={r.is_active}
                    onChange={(e) => patchRec(i, { is_active: e.target.checked })}
                  />
                  Active
                </label>
                <button
                  type="button"
                  onClick={() => setRecs((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-white/40 hover:text-red-400"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input value={r.name} onChange={(e) => patchRec(i, { name: e.target.value })} placeholder="Name" />
                <Input value={r.byline ?? ''} onChange={(e) => patchRec(i, { byline: e.target.value })} placeholder="Byline (tagline)" />
                <Input
                  className="sm:col-span-2"
                  value={r.bio ?? ''}
                  onChange={(e) => patchRec(i, { bio: e.target.value })}
                  placeholder="Bio (1-2 sentences shown in the modal)"
                />
                <Input value={r.image_url ?? ''} onChange={(e) => patchRec(i, { image_url: e.target.value })} placeholder="Avatar URL" />
                <Input value={r.profile_url ?? ''} onChange={(e) => patchRec(i, { profile_url: e.target.value })} placeholder="Profile / link URL" />
                <Input value={r.cta_label} onChange={(e) => patchRec(i, { cta_label: e.target.value })} placeholder="CTA label (default Subscribe)" />
                <Input value={r.crm_tag ?? ''} onChange={(e) => patchRec(i, { crm_tag: e.target.value })} placeholder="CRM tag to apply on subscribe" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
