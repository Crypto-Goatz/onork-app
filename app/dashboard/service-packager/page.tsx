'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Sparkles,
  Link as LinkIcon,
  MessageSquare,
  Server,
  Loader2,
  Package,
  Briefcase,
  ExternalLink,
  Trash2,
  Plus,
  Eye,
  Globe,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

type Mode = 'url' | 'prompt' | 'mcp_registry'

interface PackageRow {
  id: string
  service_name: string
  service_description: string | null
  category: string | null
  status: string
  vpis_score: number | null
  source_type: string
  source_url: string | null
  source_mcp_server: string | null
  primary_deliverable: string | null
  delivery_time: string | null
  price_anchor_cents: number | null
  images: string[] | null
  published_platforms: string[] | null
  created_at: string
  fiverr_gig: { title?: string } | null
  portfolio_item: { title?: string } | null
}

interface PortfolioRow {
  id: string
  package_id: string | null
  title: string
  description: string | null
  category: string | null
  cover_image: string | null
  price_display: string | null
  delivery_display: string | null
  published: boolean
  sort_order: number | null
  created_at: string
}

export default function ServicePackagerPage() {
  const sp = useSearchParams()
  const initialTab = ((sp?.get('tab') ?? 'builder') as 'builder' | 'packages' | 'portfolio')
  const [tab, setTab] = useState<'builder' | 'packages' | 'portfolio'>(
    ['builder', 'packages', 'portfolio'].includes(initialTab) ? initialTab : 'builder'
  )

  // Builder state
  const [mode, setMode] = useState<Mode>('url')
  const [url, setUrl] = useState('')
  const [prompt, setPrompt] = useState('')
  const [mcpServer, setMcpServer] = useState('')
  const [generating, setGenerating] = useState(false)

  // Packages state
  const [packages, setPackages] = useState<PackageRow[]>([])
  const [pkgLoading, setPkgLoading] = useState(false)

  // Portfolio state
  const [portfolio, setPortfolio] = useState<PortfolioRow[]>([])
  const [pfLoading, setPfLoading] = useState(false)

  useEffect(() => {
    if (tab === 'packages') void loadPackages()
    if (tab === 'portfolio') void loadPortfolio()
  }, [tab])

  async function loadPackages() {
    setPkgLoading(true)
    try {
      const res = await fetch('/api/service-packager/packages')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'load failed')
      setPackages(json.packages ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'failed to load packages')
    } finally {
      setPkgLoading(false)
    }
  }

  async function loadPortfolio() {
    setPfLoading(true)
    try {
      const res = await fetch('/api/service-packager/portfolio')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'load failed')
      setPortfolio(json.items ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'failed to load portfolio')
    } finally {
      setPfLoading(false)
    }
  }

  async function generate() {
    if (mode === 'url' && !url.trim()) return toast.error('paste a URL')
    if (mode === 'prompt' && !prompt.trim()) return toast.error('describe the service')
    if (mode === 'mcp_registry' && !mcpServer.trim()) return toast.error('enter an MCP server name')

    setGenerating(true)
    const tid = toast.loading('Packaging — running 8 generators in parallel…')
    try {
      const body: Record<string, string> = { mode }
      if (mode === 'url') body.url = url.trim()
      if (mode === 'prompt') body.prompt = prompt.trim()
      if (mode === 'mcp_registry') body.mcp_server = mcpServer.trim()

      const res = await fetch('/api/service-packager/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'generation failed')

      toast.success('Packaged. Opening detail view…', { id: tid })
      window.location.href = `/dashboard/service-packager/${json.package.id}`
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'generation failed', { id: tid })
    } finally {
      setGenerating(false)
    }
  }

  async function deletePackage(id: string) {
    if (!confirm('Delete this package? Drafts can be re-generated; published packages must be archived first.')) return
    try {
      const res = await fetch(`/api/service-packager/packages?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'delete failed')
      toast.success('Deleted')
      setPackages((p) => p.filter((x) => x.id !== id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'delete failed')
    }
  }

  async function addToPortfolio(packageId: string) {
    try {
      const res = await fetch('/api/service-packager/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: packageId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'failed')
      toast.success('Added to portfolio')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'failed')
    }
  }

  async function togglePublished(id: string, published: boolean) {
    try {
      const res = await fetch(`/api/service-packager/portfolio?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'failed')
      setPortfolio((p) => p.map((x) => (x.id === id ? json.item : x)))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'failed')
    }
  }

  async function deletePortfolio(id: string) {
    if (!confirm('Remove from portfolio?')) return
    try {
      const res = await fetch(`/api/service-packager/portfolio?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'failed')
      setPortfolio((p) => p.filter((x) => x.id !== id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'failed')
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Package className="h-6 w-6 text-[var(--accent)]" />
          Service Packager
        </h1>
        <p className="text-sm text-white/60">
          One input, eight outputs — Fiverr gig, portfolio, Upwork, .0n app, UCP product, CRM service, landing page, social posts.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="builder"><Sparkles className="mr-2 h-4 w-4" />Builder</TabsTrigger>
          <TabsTrigger value="packages"><Package className="mr-2 h-4 w-4" />Packages</TabsTrigger>
          <TabsTrigger value="portfolio"><Briefcase className="mr-2 h-4 w-4" />Portfolio</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="mt-6">
          <Card className="space-y-6 p-6">
            <div>
              <Label>Source</Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <ModeButton active={mode === 'url'} onClick={() => setMode('url')} icon={<LinkIcon className="h-4 w-4" />}>
                  Existing service URL
                </ModeButton>
                <ModeButton active={mode === 'prompt'} onClick={() => setMode('prompt')} icon={<MessageSquare className="h-4 w-4" />}>
                  Free-form prompt
                </ModeButton>
                <ModeButton active={mode === 'mcp_registry'} onClick={() => setMode('mcp_registry')} icon={<Server className="h-4 w-4" />}>
                  MCP server
                </ModeButton>
              </div>
            </div>

            {mode === 'url' && (
              <div>
                <Label htmlFor="url">URL of the page describing the service</Label>
                <Input
                  id="url"
                  placeholder="https://example.com/services/website-design"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-2"
                />
                <p className="mt-2 text-xs text-white/50">
                  We scrape the title, meta, OG image, headings, and price anchors — then generate all 8 outputs.
                </p>
              </div>
            )}

            {mode === 'prompt' && (
              <div>
                <Label htmlFor="prompt">Describe the service</Label>
                <Textarea
                  id="prompt"
                  rows={6}
                  placeholder="I build $89 landing pages for local service businesses. 3-day delivery, mobile-first, includes lead form + analytics. Target audience: contractors, dentists, salons in the US."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="mt-2"
                />
                <p className="mt-2 text-xs text-white/50">
                  Include: what you build, who it's for, price, delivery time, and any specific deliverables.
                </p>
              </div>
            )}

            {mode === 'mcp_registry' && (
              <div>
                <Label htmlFor="mcp">MCP server name (e.g. <code>io.github.someone/cool-server</code>)</Label>
                <Input
                  id="mcp"
                  placeholder="io.github.firecrawl/mcp"
                  value={mcpServer}
                  onChange={(e) => setMcpServer(e.target.value)}
                  className="mt-2"
                />
                <p className="mt-2 text-xs text-white/50">
                  Connects to your registry cache. The packager builds an offering around the server's tools.
                </p>
                <Link href="/dashboard/mcp-store" className="mt-2 inline-flex text-xs text-[var(--accent)] hover:underline">
                  Browse the MCP store →
                </Link>
              </div>
            )}

            <Button onClick={generate} disabled={generating} size="lg" className="w-full">
              {generating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Packaging…</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Generate all 8 outputs</>
              )}
            </Button>
            <p className="text-center text-xs text-white/40">
              Runs 8 Groq calls in parallel — roughly 30-60 seconds. Outputs are editable after generation.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="packages" className="mt-6">
          {pkgLoading ? (
            <Card className="p-12 text-center text-sm text-white/60">
              <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
              Loading packages…
            </Card>
          ) : packages.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="mx-auto mb-3 h-8 w-8 text-white/30" />
              <p className="text-sm text-white/60">No packages yet</p>
              <Button className="mt-4" onClick={() => setTab('builder')}>
                <Plus className="mr-2 h-4 w-4" /> Create your first
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {packages.map((p) => (
                <Card key={p.id} className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold">{p.service_name}</h3>
                        <StatusBadge status={p.status} />
                      </div>
                      {p.fiverr_gig?.title && (
                        <p className="mt-1 truncate text-xs text-white/60">{p.fiverr_gig.title}</p>
                      )}
                    </div>
                    {p.images?.[0] && (
                      <img
                        src={p.images[0]}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded border border-white/10 object-cover"
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-xs text-white/60">
                    {p.category && <Badge variant="outline">{p.category}</Badge>}
                    {p.delivery_time && <Badge variant="outline">{p.delivery_time}</Badge>}
                    {p.price_anchor_cents !== null && (
                      <Badge variant="outline">${(p.price_anchor_cents / 100).toFixed(0)}</Badge>
                    )}
                    {p.vpis_score !== null && (
                      <Badge variant="outline" className="border-[var(--accent)]/40 text-[var(--accent)]">
                        VPIS {p.vpis_score}
                      </Badge>
                    )}
                  </div>

                  {p.published_platforms && p.published_platforms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {p.published_platforms.map((pl) => (
                        <Badge key={pl} className="bg-[var(--accent)]/15 text-[var(--accent)]">
                          ✓ {pl}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <Link href={`/dashboard/service-packager/${p.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="mr-2 h-4 w-4" /> Open
                      </Button>
                    </Link>
                    {p.portfolio_item && (
                      <Button variant="outline" size="sm" onClick={() => addToPortfolio(p.id)} title="Add to portfolio">
                        <Briefcase className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => deletePackage(p.id)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="portfolio" className="mt-6">
          {pfLoading ? (
            <Card className="p-12 text-center text-sm text-white/60">
              <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
              Loading portfolio…
            </Card>
          ) : portfolio.length === 0 ? (
            <Card className="p-12 text-center">
              <Briefcase className="mx-auto mb-3 h-8 w-8 text-white/30" />
              <p className="text-sm text-white/60">No portfolio items yet</p>
              <p className="mt-2 text-xs text-white/40">
                Generate a package, then click the briefcase icon to add it here.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {portfolio.map((p) => (
                <Card key={p.id} className="overflow-hidden">
                  {p.cover_image ? (
                    <img src={p.cover_image} alt="" className="aspect-video w-full object-cover" />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center bg-white/5">
                      <Briefcase className="h-8 w-8 text-white/20" />
                    </div>
                  )}
                  <div className="space-y-3 p-4">
                    <div>
                      <h3 className="font-semibold">{p.title}</h3>
                      {p.category && (
                        <p className="text-xs text-white/60">{p.category}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-xs text-white/60">
                      {p.price_display && <span>{p.price_display}</span>}
                      {p.delivery_display && <span>· {p.delivery_display}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={p.published ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => togglePublished(p.id, !p.published)}
                      >
                        {p.published ? <><Globe className="mr-2 h-3.5 w-3.5" /> Live</> : <><Star className="mr-2 h-3.5 w-3.5" /> Publish</>}
                      </Button>
                      {p.package_id && (
                        <Link href={`/dashboard/service-packager/${p.package_id}`}>
                          <Button variant="outline" size="sm" title="Open package">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      <Button variant="outline" size="sm" onClick={() => deletePortfolio(p.id)} title="Remove">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm transition ${
        active
          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
          : 'border-white/10 text-white/70 hover:border-white/20'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-white/10 text-white/60',
    generated: 'bg-blue-500/15 text-blue-300',
    published: 'bg-[var(--accent)]/15 text-[var(--accent)]',
    archived: 'bg-white/5 text-white/40',
  }
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${map[status] ?? map.draft}`}>
      {status}
    </span>
  )
}
