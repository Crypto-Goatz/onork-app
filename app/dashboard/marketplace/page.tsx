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
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  GraduationCap, Mic, MessageSquare, Share2, FileText, Package,
  Users, Receipt, Mail, Brain, Zap, Bot, Check, ArrowRight, Sparkles,
  ShieldCheck, X,
} from 'lucide-react'

interface Addon {
  slug: string
  name: string
  description: string
  details: string
  priceCents: number
  sdkModule: string
  icon: React.ReactNode
  badge?: string
  features: string[]
}

const ADDONS: Addon[] = [
  {
    slug: 'ai-course-builder', name: 'AI Course Builder', sdkModule: 'courses', priceCents: 4900, badge: 'Popular',
    icon: <GraduationCap className="h-5 w-5" />,
    description: 'Generate full courses with AI and import them into your CRM.',
    details: 'Describe what you want taught, and the AI builds full course content — modules, lessons, and materials — then imports everything directly into your CRM memberships area.',
    features: ['AI-generated lesson content', 'Auto-import to CRM', 'Categories & sub-categories', 'Instructor profiles', 'Materials & attachments'],
  },
  {
    slug: 'voice-ai-agent', name: 'Voice AI Agent', sdkModule: 'voiceAi', priceCents: 9900,
    icon: <Mic className="h-5 w-5" />,
    description: 'Deploy AI phone agents with knowledge bases and call routing.',
    details: 'Create voice agents that answer calls, book appointments, transfer to humans, and query your knowledge base — all configured through natural language.',
    features: ['Inbound & outbound calls', 'Knowledge base integration', 'Call routing & transfer', 'Custom voice & persona', 'Call log analytics'],
  },
  {
    slug: 'conversation-ai', name: 'Conversation AI', sdkModule: 'conversations', priceCents: 4900,
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'AI chatbots for messaging channels with custom personas.',
    details: 'Configure AI-powered chat across SMS, web chat, Facebook Messenger, and more. Set personas, connect knowledge bases, and let AI handle the conversation.',
    features: ['Multi-channel messaging', 'Custom AI personas', 'Knowledge base powered', 'Handoff to human', 'Conversation analytics'],
  },
  {
    slug: 'social-planner', name: 'Social Planner', sdkModule: 'socialMediaPosting', priceCents: 2900,
    icon: <Share2 className="h-5 w-5" />,
    description: 'Connect social accounts and publish AI-generated content.',
    details: 'Link your Google, Facebook, Instagram, LinkedIn, and TikTok accounts. Schedule AI-generated posts, manage content calendars, and track engagement.',
    features: ['Connect Google, FB, IG, LinkedIn', 'AI content generation', 'Post scheduling', 'Content calendar', 'Engagement analytics'],
  },
  {
    slug: 'blog-engine', name: 'Blog Engine', sdkModule: 'blogs', priceCents: 1900,
    icon: <FileText className="h-5 w-5" />,
    description: 'AI blog posts published directly to your CRM blog.',
    details: 'Generate SEO-optimized blog posts with AI, assign categories and authors, and publish directly to your CRM-hosted blog.',
    features: ['AI article generation', 'SEO optimization', 'Category management', 'Author profiles', 'Draft & publish workflow'],
  },
  {
    slug: 'snapshot-manager', name: 'Snapshot Manager', sdkModule: 'snapshots', priceCents: 9900,
    icon: <Package className="h-5 w-5" />,
    description: 'Generate, deploy, and clone CRM snapshots between locations.',
    details: 'Full configuration backup and restore. Clone pipelines, tags, custom fields, workflows, and settings between locations with one command.',
    features: ['Full location backup', 'Cross-location cloning', 'Pipeline & tag migration', 'Custom field sync', 'One-click deploy'],
  },
  {
    slug: 'affiliate-manager', name: 'Affiliate Manager', sdkModule: 'affiliates', priceCents: 4900,
    icon: <Users className="h-5 w-5" />,
    description: 'Affiliate programs with tracking and commissions.',
    details: 'Create and manage affiliate programs. Track referrals, manage campaigns, and automate commission payouts.',
    features: ['Affiliate onboarding', 'Campaign management', 'Commission tracking', 'Referral links', 'Payout automation'],
  },
  {
    slug: 'invoice-automation', name: 'Invoice Automation', sdkModule: 'invoices', priceCents: 2900,
    icon: <Receipt className="h-5 w-5" />,
    description: 'AI-generated invoices, estimates, and recurring billing.',
    details: 'Generate invoices and estimates from natural language. Set up recurring billing, send reminders, and track payments.',
    features: ['AI invoice generation', 'Recurring billing', 'Estimate creation', 'Payment tracking', 'Auto-reminders'],
  },
  {
    slug: 'email-builder', name: 'Email Builder', sdkModule: 'emails', priceCents: 1900,
    icon: <Mail className="h-5 w-5" />,
    description: 'AI email campaigns and templates. Schedule and send.',
    details: 'Build email campaigns with AI-generated content. Create templates, schedule sends, and track opens and clicks.',
    features: ['AI email writing', 'Template builder', 'Schedule & send', 'Open/click tracking', 'A/B testing ready'],
  },
  {
    slug: 'knowledge-base', name: 'Knowledge Base', sdkModule: 'knowledgeBases', priceCents: 2900,
    icon: <Brain className="h-5 w-5" />,
    description: 'Create AI knowledge bases for agents and bots.',
    details: 'Build knowledge bases that power your AI agents, voice bots, and chatbots. Upload documents, add URLs, and train on your business data.',
    features: ['Document upload', 'URL scraping', 'Agent integration', 'Up to 15 per location', 'Auto-training'],
  },
  {
    slug: 'workflow-reader', name: 'Workflow Intelligence', sdkModule: 'workflows', priceCents: 1900,
    icon: <Zap className="h-5 w-5" />,
    description: 'Read workflows and export as .0n SWITCH files.',
    details: 'Analyze your existing CRM workflows, understand their logic, and export them as portable .0n SWITCH files for backup or migration.',
    features: ['Workflow analysis', '.0n file export', 'Logic visualization', 'Cross-location portability', 'Version tracking'],
  },
  {
    slug: 'agent-studio', name: 'Agent Studio Pro', sdkModule: 'agentStudio', priceCents: 9900, badge: 'Pro',
    icon: <Bot className="h-5 w-5" />,
    description: 'Build and deploy AI agents with MCP tool access.',
    details: 'Full Agent Studio control. Create agents, connect knowledge bases, add MCP server nodes for 1,554+ tool access, and deploy to production.',
    features: ['Agent creation', 'MCP tool integration', 'Knowledge base wiring', 'Production deployment', '1,554+ tools available'],
  },
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
  const [selected, setSelected] = useState<Addon | null>(null)

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
      if (!session) { setError('Please log in.'); setPurchasing(null); return }
      const res = await fetch('/api/marketplace/addon-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ productSlug: slug }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError(data.error || 'Checkout failed.')
    } catch { setError('Connection error.') }
    setPurchasing(null)
  }

  const filtered = tab === 'owned' ? ADDONS.filter(a => ownedSlugs.has(a.slug))
    : tab === 'available' ? ADDONS.filter(a => !ownedSlugs.has(a.slug))
    : ADDONS

  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">Loading marketplace...</div>

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {successSlug && (
        <Card className="border-green-500/20">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <Check className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Add-on activated</p>
              <p className="text-xs text-muted-foreground">{ADDONS.find(a => a.slug === successSlug)?.name} is ready to use.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/30">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm text-destructive">{error}</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setError('')}><X className="h-3 w-3" /></Button>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Add-ons</h1>
          <Badge variant="secondary" className="text-[10px] ml-1">{ownedSlugs.size}/{ADDONS.length}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Each add-on unlocks a CRM capability powered by the 0nMCP SDK.</p>
      </div>

      <Progress value={(ownedSlugs.size / ADDONS.length) * 100} className="h-1" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="owned">Owned</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(addon => {
          const owned = ownedSlugs.has(addon.slug)
          return (
            <Card
              key={addon.slug}
              className={`group cursor-pointer transition-all hover:shadow-md ${owned ? 'border-primary/15 bg-primary/[0.02]' : 'hover:border-border'}`}
              onClick={() => setSelected(addon)}
            >
              <CardHeader className="pb-2 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                    {addon.icon}
                  </div>
                  <div className="flex gap-1.5">
                    {addon.badge && <Badge variant="secondary" className="text-[10px] h-5">{addon.badge}</Badge>}
                    {owned && <Badge variant="outline" className="text-[10px] h-5 border-primary/30 text-primary"><Check className="h-2.5 w-2.5 mr-0.5" />Active</Badge>}
                  </div>
                </div>
                <div>
                  <CardTitle className="text-sm leading-tight">{addon.name}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed mt-1.5 line-clamp-2">{addon.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Separator className="mb-3" />
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold">${(addon.priceCents / 100).toFixed(0)}<span className="text-[11px] text-muted-foreground font-normal">/mo</span></p>
                  {owned ? (
                    <span className="text-xs text-primary flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Installed</span>
                  ) : (
                    <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={e => { e.stopPropagation(); purchase(addon.slug) }} disabled={purchasing === addon.slug}>
                      {purchasing === addon.slug ? '...' : <>Get <ArrowRight className="h-3 w-3" /></>}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center text-sm text-muted-foreground">
          {tab === 'owned' ? 'No add-ons purchased yet.' : 'All add-ons are active.'}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-foreground">
                  {selected.icon}
                </div>
                <div>
                  <DialogTitle className="text-base">{selected.name}</DialogTitle>
                  <DialogDescription className="text-xs">{selected.sdkModule} module</DialogDescription>
                </div>
                {selected.badge && <Badge variant="secondary" className="text-[10px] h-5 ml-auto">{selected.badge}</Badge>}
              </div>
            </DialogHeader>
            <p className="text-sm text-muted-foreground leading-relaxed">{selected.details}</p>
            <Separator />
            <div>
              <p className="text-xs font-medium mb-2">What&apos;s included</p>
              <ul className="space-y-1.5">
                {selected.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-2">
              <p className="text-xl font-bold">${(selected.priceCents / 100).toFixed(0)}<span className="text-sm text-muted-foreground font-normal">/mo</span></p>
              {ownedSlugs.has(selected.slug) ? (
                <Button disabled variant="outline"><ShieldCheck className="h-4 w-4 mr-1.5" /> Installed</Button>
              ) : (
                <Button onClick={() => { purchase(selected.slug); setSelected(null) }} disabled={purchasing === selected.slug}>
                  {purchasing === selected.slug ? 'Processing...' : <>Get {selected.name} <ArrowRight className="h-4 w-4 ml-1.5" /></>}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground animate-pulse">Loading...</div>}>
      <MarketplaceInner />
    </Suspense>
  )
}
