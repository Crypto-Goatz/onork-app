'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Download,
  Save,
  Briefcase,
  ShoppingBag,
  Globe,
  Server,
  Package as PackageIcon,
  MessageCircle,
  FileText,
  ImageIcon,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import type {
  FiverrGig,
  PortfolioItem,
  UpworkListing,
  OnApp,
  UCPProduct,
  CRMService,
  LandingPage,
  SocialPosts,
} from '@/lib/service-packager/types'

interface FullPackage {
  id: string
  service_name: string
  service_description: string | null
  category: string | null
  status: string
  vpis_score: number | null
  source_type: string
  source_url: string | null
  primary_deliverable: string | null
  delivery_time: string | null
  price_anchor_cents: number | null
  keywords: string[] | null
  images: string[] | null
  published_platforms: string[] | null
  fiverr_gig: FiverrGig | null
  portfolio_item: PortfolioItem | null
  upwork_listing: UpworkListing | null
  on_marketplace_app: OnApp | null
  ucp_product: UCPProduct | null
  crm_service: CRMService | null
  landing_page: LandingPage | null
  social_posts: SocialPosts | null
  created_at: string
}

const PLATFORMS = [
  { key: 'fiverr', label: 'Fiverr', format: 'fiverr', icon: ShoppingBag },
  { key: 'upwork', label: 'Upwork', format: 'upwork', icon: Briefcase },
  { key: 'portfolio', label: 'Portfolio', format: 'portfolio', icon: Briefcase },
  { key: 'landing', label: 'Landing page', format: 'landing', icon: Globe },
  { key: 'on', label: '.0n app', format: 'on', icon: Server },
  { key: 'crm', label: 'CRM', format: 'crm', icon: PackageIcon },
  { key: 'social', label: 'Social', format: 'social', icon: MessageCircle },
] as const

export default function PackageDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [pkg, setPkg] = useState<FullPackage | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<string>('fiverr')

  useEffect(() => {
    if (!id) return
    void load()
  }, [id])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/service-packager/packages/${id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'load failed')
      setPkg(json.package)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function patch(field: keyof FullPackage, value: unknown) {
    setSaving(true)
    try {
      const res = await fetch(`/api/service-packager/packages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'save failed')
      setPkg(json.package)
      toast.success('Saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'save failed')
    } finally {
      setSaving(false)
    }
  }

  async function publish(platform: string) {
    try {
      const res = await fetch(`/api/service-packager/packages/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', platform }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'publish failed')
      setPkg((p) => (p ? { ...p, status: json.package.status, published_platforms: json.package.published_platforms } : p))
      toast.success(`Marked as published on ${platform}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'publish failed')
    }
  }

  function exportFile(format: string) {
    window.location.href = `/api/service-packager/packages/${id}/export?format=${format}`
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    )
  }

  if (!pkg) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <p className="text-sm text-white/60">Package not found</p>
          <Button className="mt-4" onClick={() => router.push('/dashboard/service-packager')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => router.push('/dashboard/service-packager')}
            className="mb-2 inline-flex items-center gap-1 text-xs text-white/50 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All packages
          </button>
          <h1 className="truncate text-2xl font-semibold">{pkg.service_name}</h1>
          {pkg.service_description && (
            <p className="mt-1 line-clamp-2 text-sm text-white/60">{pkg.service_description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="outline">{pkg.status}</Badge>
            {pkg.category && <Badge variant="outline">{pkg.category}</Badge>}
            {pkg.delivery_time && <Badge variant="outline">{pkg.delivery_time}</Badge>}
            {pkg.price_anchor_cents !== null && (
              <Badge variant="outline">${(pkg.price_anchor_cents / 100).toFixed(0)}</Badge>
            )}
            {pkg.vpis_score !== null && (
              <Badge variant="outline" className="border-[var(--accent)]/40 text-[var(--accent)]">
                VPIS {pkg.vpis_score}
              </Badge>
            )}
            {(pkg.published_platforms ?? []).map((pl) => (
              <Badge key={pl} className="bg-[var(--accent)]/15 text-[var(--accent)]">
                ✓ {pl}
              </Badge>
            ))}
          </div>
        </div>
        {saving && (
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> saving
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          {PLATFORMS.map((p) => {
            const has = (pkg as unknown as Record<string, unknown>)[
              p.key === 'fiverr' ? 'fiverr_gig'
              : p.key === 'upwork' ? 'upwork_listing'
              : p.key === 'portfolio' ? 'portfolio_item'
              : p.key === 'landing' ? 'landing_page'
              : p.key === 'on' ? 'on_marketplace_app'
              : p.key === 'crm' ? 'crm_service'
              : 'social_posts'
            ]
            return (
              <TabsTrigger key={p.key} value={p.key} disabled={!has}>
                <p.icon className="mr-2 h-4 w-4" /> {p.label}
              </TabsTrigger>
            )
          })}
          <TabsTrigger value="images"><ImageIcon className="mr-2 h-4 w-4" /> Images</TabsTrigger>
        </TabsList>

        <TabsContent value="fiverr" className="mt-6">
          <FiverrPanel gig={pkg.fiverr_gig} onSave={(v) => patch('fiverr_gig', v)} onExport={() => exportFile('fiverr')} onPublish={() => publish('fiverr')} />
        </TabsContent>

        <TabsContent value="upwork" className="mt-6">
          <SimpleJsonPanel
            label="Upwork listing"
            value={pkg.upwork_listing}
            onSave={(v) => patch('upwork_listing', v)}
            onExport={() => exportFile('upwork')}
            onPublish={() => publish('upwork')}
          />
        </TabsContent>

        <TabsContent value="portfolio" className="mt-6">
          <SimpleJsonPanel
            label="Portfolio item"
            value={pkg.portfolio_item}
            onSave={(v) => patch('portfolio_item', v)}
            onExport={() => exportFile('portfolio')}
          />
        </TabsContent>

        <TabsContent value="landing" className="mt-6">
          <SimpleJsonPanel
            label="Landing page"
            value={pkg.landing_page}
            onSave={(v) => patch('landing_page', v)}
            onExport={() => exportFile('landing')}
            exportLabel="Download HTML"
          />
        </TabsContent>

        <TabsContent value="on" className="mt-6">
          <SimpleJsonPanel
            label=".0n marketplace app + UCP product"
            value={{ on_app: pkg.on_marketplace_app, ucp_product: pkg.ucp_product }}
            onSave={(v) => {
              const parsed = v as { on_app: OnApp; ucp_product: UCPProduct }
              void patch('on_marketplace_app', parsed.on_app)
              void patch('ucp_product', parsed.ucp_product)
            }}
            onExport={() => exportFile('on')}
          />
        </TabsContent>

        <TabsContent value="crm" className="mt-6">
          <SimpleJsonPanel
            label="CRM productized service"
            value={pkg.crm_service}
            onSave={(v) => patch('crm_service', v)}
            onExport={() => exportFile('crm')}
          />
        </TabsContent>

        <TabsContent value="social" className="mt-6">
          <SimpleJsonPanel
            label="Social posts"
            value={pkg.social_posts}
            onSave={(v) => patch('social_posts', v)}
            onExport={() => exportFile('social')}
          />
        </TabsContent>

        <TabsContent value="images" className="mt-6">
          <ImagesPanel packageId={pkg.id} images={pkg.images ?? []} onChange={() => load()} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Fiverr panel ───────────────────────────────────────────────────────

function FiverrPanel({
  gig,
  onSave,
  onExport,
  onPublish,
}: {
  gig: FiverrGig | null
  onSave: (v: FiverrGig) => void
  onExport: () => void
  onPublish: () => void
}) {
  const [text, setText] = useState(() => JSON.stringify(gig, null, 2))
  const [err, setErr] = useState<string | null>(null)

  if (!gig) {
    return <Card className="p-6 text-sm text-white/60">No Fiverr gig was generated.</Card>
  }

  function save() {
    try {
      const parsed = JSON.parse(text) as FiverrGig
      setErr(null)
      onSave(parsed)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'invalid JSON')
    }
  }

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Fiverr gig</h2>
          <p className="text-xs text-white/60">Title: {gig.title} · {gig.tags.length} tags · 3 packages · {gig.faq.length} FAQ</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={onPublish}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Mark published
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(['basic', 'standard', 'premium'] as const).map((t) => (
          <div key={t} className="rounded-lg border border-white/10 p-3 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-white/60 uppercase tracking-wider text-xs">{t}</span>
              <span className="text-lg font-semibold text-[var(--accent)]">${gig.packages[t].price_usd}</span>
            </div>
            <p className="mt-1 text-xs text-white/60">{gig.packages[t].title}</p>
            <p className="mt-1 text-xs text-white/40">{gig.packages[t].delivery_days}d · {gig.packages[t].revisions} revisions</p>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-white/70">Edit JSON</label>
          {err && <span className="text-xs text-red-400">{err}</span>}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={20}
          className="w-full rounded border border-white/10 bg-black/30 p-3 font-mono text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
      </div>

      <Button onClick={save} className="w-full">
        <Save className="mr-2 h-4 w-4" /> Save changes
      </Button>
    </Card>
  )
}

// ── Generic JSON panel (other 6 outputs) ──────────────────────────────

function SimpleJsonPanel({
  label,
  value,
  onSave,
  onExport,
  onPublish,
  exportLabel = 'Export',
}: {
  label: string
  value: unknown
  onSave: (v: unknown) => void
  onExport: () => void
  onPublish?: () => void
  exportLabel?: string
}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2))
  const [err, setErr] = useState<string | null>(null)

  if (!value) {
    return <Card className="p-6 text-sm text-white/60">Not generated.</Card>
  }

  function save() {
    try {
      const parsed = JSON.parse(text)
      setErr(null)
      onSave(parsed)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'invalid JSON')
    }
  }

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold">{label}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" /> {exportLabel}
          </Button>
          {onPublish && (
            <Button size="sm" onClick={onPublish}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark published
            </Button>
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-white/70">Edit JSON</label>
          {err && <span className="text-xs text-red-400">{err}</span>}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={18}
          className="w-full rounded border border-white/10 bg-black/30 p-3 font-mono text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
      </div>

      <Button onClick={save} className="w-full">
        <Save className="mr-2 h-4 w-4" /> Save changes
      </Button>
    </Card>
  )
}

// ── Images panel ──────────────────────────────────────────────────────

function ImagesPanel({
  packageId,
  images,
  onChange,
}: {
  packageId: string
  images: string[]
  onChange: () => void
}) {
  const [uploading, setUploading] = useState<string | null>(null)

  async function upload(file: File, kind: 'cover' | 'gallery' | 'fiverr') {
    setUploading(kind)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('package_id', packageId)
      fd.append('kind', kind)
      const res = await fetch('/api/service-packager/image', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'upload failed')
      toast.success('Uploaded')
      onChange()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'upload failed')
    } finally {
      setUploading(null)
    }
  }

  return (
    <Card className="space-y-4 p-6">
      <h2 className="font-semibold">Images</h2>
      <p className="text-xs text-white/60">
        First image is the Fiverr cover & portfolio thumbnail. PNG / JPEG / WebP / GIF, up to 8 MB.
      </p>

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {images.map((url, i) => (
            <div key={i} className="overflow-hidden rounded border border-white/10">
              <img src={url} alt="" className="aspect-square w-full object-cover" />
              {i === 0 && (
                <div className="border-t border-white/10 bg-[var(--accent)]/10 px-2 py-1 text-center text-[10px] uppercase tracking-wider text-[var(--accent)]">
                  Cover
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <UploadButton kind="cover" disabled={uploading === 'cover'} onPick={(f) => upload(f, 'cover')}>
          {uploading === 'cover' ? 'Uploading…' : 'Replace cover'}
        </UploadButton>
        <UploadButton kind="gallery" disabled={uploading === 'gallery'} onPick={(f) => upload(f, 'gallery')}>
          {uploading === 'gallery' ? 'Uploading…' : 'Add gallery image'}
        </UploadButton>
      </div>
    </Card>
  )
}

function UploadButton({
  kind,
  disabled,
  onPick,
  children,
}: {
  kind: string
  disabled: boolean
  onPick: (f: File) => void
  children: React.ReactNode
}) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 px-3 py-2 text-sm hover:border-white/20 ${disabled ? 'opacity-50' : ''}`}>
      <ImageIcon className="h-4 w-4" />
      {children}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(f)
          e.currentTarget.value = ''
        }}
      />
    </label>
  )
}
