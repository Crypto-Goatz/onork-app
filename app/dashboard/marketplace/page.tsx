'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'

interface Addon {
  slug: string
  name: string
  description: string
  priceCents: number
  priceLabel: string
  capabilities: string[]
  sdkModules: string[]
  badge?: string
  icon: string
}

const ADDONS: Addon[] = [
  { slug: 'ai-course-builder', name: 'AI Course Builder', description: 'Generate full courses with AI — lessons, categories, materials. Auto-imported into your CRM.', priceCents: 4900, priceLabel: '$49', capabilities: ['course_create', 'course_import', 'lesson_generate'], sdkModules: ['courses'], icon: '📚', badge: 'Popular' },
  { slug: 'voice-ai-agent', name: 'Voice AI Agent', description: 'Deploy AI phone agents with knowledge bases, call routing, and custom actions.', priceCents: 9900, priceLabel: '$99', capabilities: ['voice_agent_create', 'voice_agent_configure'], sdkModules: ['voiceAi'], icon: '🎙️' },
  { slug: 'conversation-ai', name: 'Conversation AI', description: 'Configure AI chatbots for messaging channels with custom personas and knowledge.', priceCents: 4900, priceLabel: '$49', capabilities: ['convo_ai_configure', 'convo_message_send'], sdkModules: ['conversations'], icon: '💬' },
  { slug: 'social-planner', name: 'Social Media Planner', description: 'Connect social accounts, schedule posts, and publish AI-generated content.', priceCents: 2900, priceLabel: '$29', capabilities: ['social_post_create', 'social_post_schedule'], sdkModules: ['socialMediaPosting'], icon: '📱' },
  { slug: 'blog-engine', name: 'Blog Engine', description: 'AI-generated blog posts published directly to your CRM. SEO-optimized.', priceCents: 1900, priceLabel: '$19', capabilities: ['blog_post_create', 'blog_post_update'], sdkModules: ['blogs'], icon: '✍️' },
  { slug: 'snapshot-manager', name: 'Snapshot Manager', description: 'Generate, deploy, and clone CRM snapshots between locations.', priceCents: 9900, priceLabel: '$99', capabilities: ['snapshot_create', 'snapshot_deploy'], sdkModules: ['snapshots'], icon: '📦' },
  { slug: 'affiliate-manager', name: 'Affiliate Manager', description: 'Create affiliate programs with tracking, campaigns, and commission management.', priceCents: 4900, priceLabel: '$49', capabilities: ['affiliate_create', 'affiliate_campaign'], sdkModules: ['affiliates'], icon: '🤝' },
  { slug: 'invoice-automation', name: 'Invoice Automation', description: 'AI-generated invoices, estimates, and recurring billing.', priceCents: 2900, priceLabel: '$29', capabilities: ['invoice_create', 'invoice_send'], sdkModules: ['invoices'], icon: '💰' },
  { slug: 'email-builder', name: 'Email Builder', description: 'AI-generated email campaigns and templates. Schedule and send.', priceCents: 1900, priceLabel: '$19', capabilities: ['email_template_create', 'email_send'], sdkModules: ['emails'], icon: '📧' },
  { slug: 'knowledge-base', name: 'Knowledge Base Manager', description: 'Create and manage AI knowledge bases. Feed data to agents and bots.', priceCents: 2900, priceLabel: '$29', capabilities: ['kb_create', 'kb_source_add'], sdkModules: ['knowledgeBases'], icon: '🧠' },
  { slug: 'workflow-reader', name: 'Workflow Intelligence', description: 'Read workflow definitions and export as .0n SWITCH files.', priceCents: 1900, priceLabel: '$19', capabilities: ['workflow_list', 'workflow_export_0n'], sdkModules: ['workflows'], icon: '⚡' },
  { slug: 'agent-studio', name: 'Agent Studio Pro', description: 'Build, deploy, and manage AI agents with MCP tool access and KB connections.', priceCents: 9900, priceLabel: '$99', capabilities: ['agent_create', 'agent_execute', 'agent_configure_mcp'], sdkModules: ['agentStudio'], icon: '🤖', badge: 'Pro' },
]

interface OwnedKey {
  product_slug: string
  status: string
}

export default function MarketplacePage() {
  const supabase = createClient()
  const [ownedKeys, setOwnedKeys] = useState<OwnedKey[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [tab, setTab] = useState('all')

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const res = await fetch('/api/marketplace/keys', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setOwnedKeys(data.keys || [])
        }
      }
      setLoading(false)
    })()
  }, [supabase])

  function isOwned(slug: string) {
    return ownedKeys.some(k => k.product_slug === slug && k.status === 'active')
  }

  async function purchase(addon: Addon) {
    setPurchasing(addon.slug)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setPurchasing(null); return }

    const res = await fetch('/api/marketplace/addon-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ productSlug: addon.slug }),
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else if (data.activated) {
      setOwnedKeys(prev => [...prev, { product_slug: addon.slug, status: 'active' }])
    }
    setPurchasing(null)
  }

  const filtered = tab === 'all' ? ADDONS : tab === 'owned' ? ADDONS.filter(a => isOwned(a.slug)) : ADDONS.filter(a => !isOwned(a.slug))
  const ownedCount = ADDONS.filter(a => isOwned(a.slug)).length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add-on Marketplace</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Unlock CRM capabilities. Each add-on connects to a specific SDK module via your marketplace app.
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{ownedCount}/{ADDONS.length}</div>
          <div className="text-xs text-muted-foreground">Unlocked</div>
        </div>
      </div>

      <Progress value={(ownedCount / ADDONS.length) * 100} className="h-2" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({ADDONS.length})</TabsTrigger>
          <TabsTrigger value="owned">Owned ({ownedCount})</TabsTrigger>
          <TabsTrigger value="available">Available ({ADDONS.length - ownedCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(addon => {
          const owned = isOwned(addon.slug)
          return (
            <Card key={addon.slug} className={`flex flex-col transition-all ${owned ? 'border-primary/30' : 'hover:border-primary/20'}`}>
              <CardHeader className="flex-1">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-2xl">{addon.icon}</span>
                  <div className="flex gap-1.5">
                    {addon.badge && <Badge variant="secondary" className="text-[10px]">{addon.badge}</Badge>}
                    {owned && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/30">Active</Badge>}
                  </div>
                </div>
                <CardTitle className="text-base">{addon.name}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{addon.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <Separator />
                <div className="flex flex-wrap gap-1">
                  {addon.capabilities.slice(0, 3).map(c => (
                    <Badge key={c} variant="outline" className="text-[10px] font-mono">{c}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">{addon.priceLabel}<span className="text-xs text-muted-foreground font-normal">/mo</span></span>
                  {owned ? (
                    <Button size="sm" variant="outline" disabled>Installed</Button>
                  ) : (
                    <Button size="sm" onClick={() => purchase(addon)} disabled={purchasing === addon.slug}>
                      {purchasing === addon.slug ? 'Processing...' : 'Get Add-on'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          {tab === 'owned' ? 'No add-ons purchased yet.' : 'All add-ons are unlocked.'}
        </div>
      )}

      <Separator />

      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>Add-ons connect to the CRM via the 0nCORE marketplace app (140+ OAuth scopes).</p>
        <p>Each purchase unlocks SDK modules and MCP tool capabilities for your location.</p>
      </div>
    </div>
  )
}
