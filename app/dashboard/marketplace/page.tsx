'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  GraduationCap, Mic, MessageSquare, Share2, FileText, Package,
  Users, Receipt, Mail, Brain, Zap, Bot, Check, ArrowRight, Sparkles,
} from 'lucide-react'

interface Addon {
  slug: string
  name: string
  description: string
  priceCents: number
  sdkModule: string
  icon: React.ReactNode
  badge?: string
}

const ADDONS: Addon[] = [
  { slug: 'ai-course-builder', name: 'AI Course Builder', description: 'Generate full courses with AI — lessons, categories, and materials imported directly into your CRM.', priceCents: 4900, sdkModule: 'courses', icon: <GraduationCap className="h-5 w-5" />, badge: 'Popular' },
  { slug: 'voice-ai-agent', name: 'Voice AI Agent', description: 'Deploy AI phone agents with knowledge bases, call routing, and custom actions.', priceCents: 9900, sdkModule: 'voiceAi', icon: <Mic className="h-5 w-5" /> },
  { slug: 'conversation-ai', name: 'Conversation AI', description: 'Configure AI chatbots for messaging channels with custom personas and knowledge.', priceCents: 4900, sdkModule: 'conversations', icon: <MessageSquare className="h-5 w-5" /> },
  { slug: 'social-planner', name: 'Social Planner', description: 'Connect social accounts, schedule posts, and publish AI-generated content.', priceCents: 2900, sdkModule: 'socialMediaPosting', icon: <Share2 className="h-5 w-5" /> },
  { slug: 'blog-engine', name: 'Blog Engine', description: 'AI-generated blog posts published directly to your CRM blog. SEO-optimized.', priceCents: 1900, sdkModule: 'blogs', icon: <FileText className="h-5 w-5" /> },
  { slug: 'snapshot-manager', name: 'Snapshot Manager', description: 'Generate, deploy, and clone CRM snapshots between locations.', priceCents: 9900, sdkModule: 'snapshots', icon: <Package className="h-5 w-5" /> },
  { slug: 'affiliate-manager', name: 'Affiliate Manager', description: 'Create affiliate programs with tracking, campaigns, and commission management.', priceCents: 4900, sdkModule: 'affiliates', icon: <Users className="h-5 w-5" /> },
  { slug: 'invoice-automation', name: 'Invoice Automation', description: 'AI-generated invoices, estimates, and recurring billing.', priceCents: 2900, sdkModule: 'invoices', icon: <Receipt className="h-5 w-5" /> },
  { slug: 'email-builder', name: 'Email Builder', description: 'AI-generated email campaigns and templates. Schedule and send.', priceCents: 1900, sdkModule: 'emails', icon: <Mail className="h-5 w-5" /> },
  { slug: 'knowledge-base', name: 'Knowledge Base', description: 'Create and manage AI knowledge bases. Feed data to agents and bots.', priceCents: 2900, sdkModule: 'knowledgeBases', icon: <Brain className="h-5 w-5" /> },
  { slug: 'workflow-reader', name: 'Workflow Intelligence', description: 'Read workflow definitions and export as .0n SWITCH files.', priceCents: 1900, sdkModule: 'workflows', icon: <Zap className="h-5 w-5" /> },
  { slug: 'agent-studio', name: 'Agent Studio Pro', description: 'Build, deploy, and manage AI agents with MCP tool access and KB connections.', priceCents: 9900, sdkModule: 'agentStudio', icon: <Bot className="h-5 w-5" />, badge: 'Pro' },
]

function MarketplaceInner() {
  const params = useSearchParams()
  const successSlug = params.get('success')
  const supabase = createClient()
  const [ownedSlugs, setOwnedSlugs] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [tab, setTab] = useState('all')
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const res = await fetch('/api/marketplace/keys', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setOwnedSlugs(new Set((data.keys || []).map((k: { product_slug: string }) => k.product_slug)))
        }
      }
      setLoading(false)
    })()
  }, [supabase])

  async function purchase(slug: string) {
    setPurchasing(slug)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Please log in first.'); setPurchasing(null); return }

      const res = await fetch('/api/marketplace/addon-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ productSlug: slug }),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Checkout failed. Please try again.')
      }
    } catch {
      setError('Connection error. Please try again.')
    }
    setPurchasing(null)
  }

  const filtered = tab === 'owned' ? ADDONS.filter(a => ownedSlugs.has(a.slug))
    : tab === 'available' ? ADDONS.filter(a => !ownedSlugs.has(a.slug))
    : ADDONS

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {successSlug && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-400">Add-on activated</p>
              <p className="text-xs text-muted-foreground">{ADDONS.find(a => a.slug === successSlug)?.name || successSlug} is now available.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Add-ons</h1>
          </div>
          <p className="text-sm text-muted-foreground">Unlock CRM capabilities powered by the 0nMCP SDK.</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{ownedSlugs.size}<span className="text-muted-foreground text-sm font-normal">/{ADDONS.length}</span></p>
          <p className="text-[11px] text-muted-foreground">Unlocked</p>
        </div>
      </div>

      <Progress value={(ownedSlugs.size / ADDONS.length) * 100} className="h-1.5" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="owned">Owned ({ownedSlugs.size})</TabsTrigger>
          <TabsTrigger value="available">Available ({ADDONS.length - ownedSlugs.size})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(addon => {
          const owned = ownedSlugs.has(addon.slug)
          return (
            <Card key={addon.slug} className={`group transition-colors ${owned ? 'border-primary/20' : 'hover:border-primary/15'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                    {addon.icon}
                  </div>
                  <div className="flex gap-1.5">
                    {addon.badge && <Badge variant="secondary" className="text-[10px] h-5">{addon.badge}</Badge>}
                    {owned && <Badge variant="outline" className="text-[10px] h-5 border-primary/30 text-primary">Active</Badge>}
                  </div>
                </div>
                <CardTitle className="text-sm">{addon.name}</CardTitle>
                <CardDescription className="text-xs leading-relaxed line-clamp-2">{addon.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Separator className="mb-3" />
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-semibold">${(addon.priceCents / 100).toFixed(0)}</span>
                    <span className="text-xs text-muted-foreground ml-0.5">/mo</span>
                  </div>
                  {owned ? (
                    <Button size="sm" variant="outline" className="h-8 text-xs" disabled>
                      <Check className="h-3 w-3 mr-1" /> Installed
                    </Button>
                  ) : (
                    <Button size="sm" className="h-8 text-xs" onClick={() => purchase(addon.slug)} disabled={purchasing === addon.slug}>
                      {purchasing === addon.slug ? 'Processing...' : <>Get Add-on <ArrowRight className="h-3 w-3 ml-1" /></>}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-muted-foreground text-sm">
          {tab === 'owned' ? 'No add-ons purchased yet.' : 'All add-ons unlocked.'}
        </div>
      )}

      <Separator />
      <p className="text-center text-[11px] text-muted-foreground">
        Each add-on connects via the 0nCORE marketplace app (140+ OAuth scopes). Purchases unlock SDK modules and MCP tools for your location.
      </p>
    </div>
  )
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-muted-foreground animate-pulse">Loading marketplace...</div>}>
      <MarketplaceInner />
    </Suspense>
  )
}
