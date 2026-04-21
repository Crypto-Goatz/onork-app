'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  GraduationCap, Mic, MessageSquare, Share2, FileText, Package,
  Users, Receipt, Mail, Brain, Zap, Bot, Check, ArrowRight, X, Phone,
  Calendar, Contact, TrendingUp, CreditCard, ShoppingBag, ClipboardList,
  Layers, Image, Database, Megaphone, FileSignature, Store, Link,
  UserCog, Globe, Building, Settings, Palette, LineChart as LineChartIcon,
} from 'lucide-react'

interface Addon {
  slug: string
  name: string
  category: string
  description: string
  details: string
  priceCents: number
  icon: React.ReactNode
  badge?: string
  features: string[]
}

const ADDONS: Addon[] = [
  { slug: 'ai-course-builder', name: 'AI Course Builder', category: 'content', priceCents: 4900, badge: 'Popular', icon: <GraduationCap className="h-5 w-5" />, description: 'Generate full courses with AI and import them into your CRM.', details: 'Describe what you want taught, and the AI builds full course content — modules, lessons, and materials — then imports everything directly into your CRM memberships area.', features: ['AI-generated lesson content', 'Auto-import to CRM', 'Categories & sub-categories', 'Instructor profiles', 'Materials & attachments'] },
  { slug: 'voice-ai-agent', name: 'Voice AI Agent', category: 'ai', priceCents: 9900, icon: <Mic className="h-5 w-5" />, description: 'Deploy AI phone agents with knowledge bases and call routing.', details: 'Create voice agents that answer calls, book appointments, transfer to humans, and query your knowledge base.', features: ['Inbound & outbound calls', 'Knowledge base integration', 'Call routing & transfer', 'Custom voice & persona', 'Call log analytics'] },
  { slug: 'conversation-ai', name: 'Conversation AI', category: 'ai', priceCents: 4900, icon: <MessageSquare className="h-5 w-5" />, description: 'AI chatbots for messaging channels with custom personas.', details: 'Configure AI-powered chat across SMS, web chat, Facebook Messenger, and more.', features: ['Multi-channel messaging', 'Custom AI personas', 'Knowledge base powered', 'Handoff to human', 'Conversation analytics'] },
  { slug: 'social-planner', name: 'Social Planner', category: 'marketing', priceCents: 2900, icon: <Share2 className="h-5 w-5" />, description: 'Connect social accounts and publish AI-generated content.', details: 'Link Google, Facebook, Instagram, LinkedIn, and TikTok. Schedule AI-generated posts and manage content calendars.', features: ['Connect Google, FB, IG, LinkedIn', 'AI content generation', 'Post scheduling', 'Content calendar', 'Engagement analytics'] },
  { slug: 'blog-engine', name: 'Blog Engine', category: 'content', priceCents: 1900, icon: <FileText className="h-5 w-5" />, description: 'AI blog posts published directly to your CRM blog.', details: 'Generate SEO-optimized blog posts with AI, assign categories and authors, publish directly.', features: ['AI article generation', 'SEO optimization', 'Category management', 'Author profiles', 'Draft & publish workflow'] },
  { slug: 'snapshot-manager', name: 'Snapshot Manager', category: 'admin', priceCents: 9900, icon: <Package className="h-5 w-5" />, description: 'Generate, deploy, and clone CRM snapshots between locations.', details: 'Full configuration backup and restore. Clone pipelines, tags, custom fields, workflows between locations.', features: ['Full location backup', 'Cross-location cloning', 'Pipeline migration', 'Custom field sync', 'One-click deploy'] },
  { slug: 'affiliate-manager', name: 'Affiliate Manager', category: 'sales', priceCents: 4900, icon: <Users className="h-5 w-5" />, description: 'Affiliate programs with tracking and commissions.', details: 'Create affiliate programs. Track referrals, manage campaigns, automate commission payouts.', features: ['Affiliate onboarding', 'Campaign management', 'Commission tracking', 'Referral links', 'Payout automation'] },
  { slug: 'invoice-automation', name: 'Invoice Automation', category: 'finance', priceCents: 2900, icon: <Receipt className="h-5 w-5" />, description: 'AI-generated invoices, estimates, and recurring billing.', details: 'Generate invoices from natural language. Set up recurring billing, send reminders, track payments.', features: ['AI invoice generation', 'Recurring billing', 'Estimate creation', 'Payment tracking', 'Auto-reminders'] },
  { slug: 'email-builder', name: 'Email Builder', category: 'marketing', priceCents: 1900, icon: <Mail className="h-5 w-5" />, description: 'AI email campaigns and templates.', details: 'Build email campaigns with AI-generated content. Create templates, schedule, track.', features: ['AI email writing', 'Template builder', 'Schedule & send', 'Open/click tracking', 'A/B testing ready'] },
  { slug: 'knowledge-base', name: 'Knowledge Base', category: 'ai', priceCents: 2900, icon: <Brain className="h-5 w-5" />, description: 'Create AI knowledge bases for agents and bots.', details: 'Build knowledge bases that power your AI agents, voice bots, and chatbots.', features: ['Document upload', 'URL scraping', 'Agent integration', 'Up to 15 per location', 'Auto-training'] },
  { slug: 'workflow-reader', name: 'Workflow Intelligence', category: 'admin', priceCents: 1900, icon: <Zap className="h-5 w-5" />, description: 'Read workflows and export as .0n SWITCH files.', details: 'Analyze existing CRM workflows and export as portable .0n SWITCH files.', features: ['Workflow analysis', '.0n file export', 'Logic visualization', 'Cross-location portability', 'Version tracking'] },
  { slug: 'agent-studio', name: 'Agent Studio Pro', category: 'ai', priceCents: 9900, badge: 'Pro', icon: <Bot className="h-5 w-5" />, description: 'Build and deploy AI agents with MCP tool access.', details: 'Full Agent Studio control. Create agents, connect knowledge bases, add MCP nodes for 1,554+ tools.', features: ['Agent creation', 'MCP tool integration', 'Knowledge base wiring', 'Production deployment', '1,554+ tools available'] },
  { slug: 'phone-system', name: 'Phone System', category: 'comms', priceCents: 4900, icon: <Phone className="h-5 w-5" />, description: 'Purchase phone numbers and manage active lines.', details: 'Search and purchase local, toll-free, or mobile numbers. Configure forwarding, call recording, voicemail, and number pools.', features: ['Number purchasing', 'Area code search', 'Call forwarding', 'Call recording', 'Number pools'] },
  { slug: 'calendar-booking', name: 'Calendar & Booking', category: 'booking', priceCents: 2900, icon: <Calendar className="h-5 w-5" />, description: 'Create calendars, manage events, and booking links.', details: 'Create calendars, manage events, booking links, appointment types, and resource scheduling.', features: ['Calendar creation', 'Event management', 'Booking links', 'Resource scheduling', 'Appointment types'] },
  { slug: 'contact-manager', name: 'Contact Manager', category: 'crm', priceCents: 1900, icon: <Contact className="h-5 w-5" />, description: 'Full contact CRUD, tagging, notes, and bulk operations.', details: 'Full contact CRUD, tagging, notes, tasks, bulk operations, and workflow enrollment.', features: ['Contact CRUD', 'Tagging & notes', 'Task management', 'Bulk operations', 'Workflow enrollment'] },
  { slug: 'opportunity-pipeline', name: 'Opportunity Pipeline', category: 'sales', priceCents: 2900, icon: <TrendingUp className="h-5 w-5" />, description: 'Manage sales pipelines, stages, and deals.', details: 'Manage sales pipelines, stages, deals, and opportunity tracking with custom fields.', features: ['Pipeline creation', 'Stage management', 'Deal tracking', 'Custom fields', 'Opportunity search'] },
  { slug: 'payment-processing', name: 'Payment Processing', category: 'finance', priceCents: 4900, icon: <CreditCard className="h-5 w-5" />, description: 'Process payments, manage orders, and subscriptions.', details: 'Process payments, manage orders, subscriptions, coupons, and transaction history.', features: ['Payment collection', 'Order management', 'Subscription handling', 'Coupon creation', 'Transaction history'] },
  { slug: 'product-catalog', name: 'Product Catalog', category: 'content', priceCents: 1900, icon: <ShoppingBag className="h-5 w-5" />, description: 'Manage products, pricing, collections, and inventory.', details: 'Manage products, pricing, collections, and inventory for your store.', features: ['Product creation', 'Price management', 'Collection management', 'Inventory updates'] },
  { slug: 'form-builder', name: 'Form Builder', category: 'content', priceCents: 1900, icon: <ClipboardList className="h-5 w-5" />, description: 'Create forms, surveys, and track submissions.', details: 'Create and manage forms, surveys, and data collection with submission tracking.', features: ['Form creation', 'Survey builder', 'Submission tracking', 'Survey results'] },
  { slug: 'funnel-builder', name: 'Funnel & Website Builder', category: 'marketing', priceCents: 2900, icon: <Layers className="h-5 w-5" />, description: 'Manage funnels, pages, and redirects.', details: 'Manage funnels, pages, redirects, and website content programmatically.', features: ['Funnel management', 'Page content', 'Redirect management', 'Funnel analytics'] },
  { slug: 'media-manager', name: 'Media Manager', category: 'content', priceCents: 900, icon: <Image className="h-5 w-5" />, description: 'Upload, organize, and manage media assets.', details: 'Upload, organize, and manage files and media assets in the CRM.', features: ['Media upload', 'File organization', 'Asset management', 'Media deletion'] },
  { slug: 'custom-objects', name: 'Custom Objects', category: 'admin', priceCents: 4900, icon: <Database className="h-5 w-5" />, description: 'Create custom schemas, records, and associations.', details: 'Create custom object schemas, records, and associations for any data model.', features: ['Schema creation', 'Record CRUD', 'Association management', 'Custom queries'] },
  { slug: 'campaign-manager', name: 'Campaign Manager', category: 'marketing', priceCents: 2900, icon: <Megaphone className="h-5 w-5" />, description: 'View and manage email and SMS campaigns.', details: 'View and manage email and SMS campaigns with audience targeting.', features: ['Campaign listing', 'Campaign stats', 'Audience targeting'] },
  { slug: 'document-contracts', name: 'Documents & Contracts', category: 'sales', priceCents: 2900, icon: <FileSignature className="h-5 w-5" />, description: 'Send contracts and proposals for e-signature.', details: 'Send contracts, proposals, and documents for e-signature.', features: ['Contract sending', 'Template management', 'Proposal creation', 'E-signature tracking'] },
  { slug: 'ecommerce-store', name: 'E-Commerce Store', category: 'sales', priceCents: 4900, icon: <Store className="h-5 w-5" />, description: 'Manage store settings, shipping, and fulfillment.', details: 'Manage online store settings, shipping, and order fulfillment.', features: ['Store settings', 'Shipping config', 'Order fulfillment', 'Store management'] },
  { slug: 'link-triggers', name: 'Link Triggers', category: 'marketing', priceCents: 900, icon: <Link className="h-5 w-5" />, description: 'Create trigger links for workflow automation.', details: 'Create and manage trigger links for workflow automation.', features: ['Link creation', 'Link management', 'Trigger automation'] },
  { slug: 'user-management', name: 'User Management', category: 'admin', priceCents: 1900, icon: <UserCog className="h-5 w-5" />, description: 'Manage team members, roles, and permissions.', details: 'Manage team members, roles, permissions, and user accounts.', features: ['User listing', 'User creation', 'Permission management', 'Role assignment'] },
  { slug: 'wordpress-manager', name: 'WordPress Manager', category: 'admin', priceCents: 1900, icon: <Globe className="h-5 w-5" />, description: 'Manage WordPress sites connected to your CRM.', details: 'Manage WordPress sites connected to your CRM location.', features: ['Site listing', 'Site status monitoring'] },
  { slug: 'saas-manager', name: 'SaaS & White-Label', category: 'admin', priceCents: 9900, badge: 'Pro', icon: <Building className="h-5 w-5" />, description: 'Manage SaaS locations and white-label config.', details: 'Manage SaaS locations, company settings, and white-label configuration.', features: ['Location management', 'Company settings', 'White-label config', 'Location provisioning'] },
  { slug: 'location-settings', name: 'Location Settings', category: 'admin', priceCents: 1900, icon: <Settings className="h-5 w-5" />, description: 'Manage location config, custom fields, tags, and templates.', details: 'Manage location configuration, custom fields, custom values, tags, and templates.', features: ['Location settings', 'Custom field CRUD', 'Custom value management', 'Tag management', 'Template listing'] },
  { slug: 'brand-board', name: 'Brand Board', category: 'content', priceCents: 900, icon: <Palette className="h-5 w-5" />, description: 'Manage brand design kits — colors, fonts, and logos.', details: 'Manage brand design kits — colors, fonts, logos, and brand assets.', features: ['Brand kit reading', 'Brand kit updates', 'Color management', 'Font management'] },
  { slug: 'blog-to-social', name: 'Blog to Social + Email', category: 'marketing', priceCents: 4900, badge: 'New', icon: <Zap className="h-5 w-5" />, description: 'AI writes a blog, posts to social, and emails contacts — one click.', details: 'Full automated content workflow: AI generates an SEO blog post, creates platform-specific social posts, publishes to connected accounts, generates an email campaign, and sends to your contact segment. Trigger from the dashboard or via CRM Agent Studio webhook.', features: ['AI blog generation (Groq)', 'Multi-platform social posting', 'Email campaign generation', 'CRM Agent Studio webhook', 'Contact segment targeting', 'Live execution tracking'] },
  { slug: 'cro9-neuro-engine', name: 'CRO9 Neuro Engine', category: 'marketing', priceCents: 2900, badge: '7-day free trial', icon: <LineChartIcon className="h-5 w-5" />, description: 'Daily AI ranking engine. GSC + SerpAPI + adaptive scoring. Learns your site.', details: 'Connect Google Search Console, drop in your SerpAPI key, and the engine runs nightly: pulls fresh GSC data, crawls your top pages, fetches competitor SERPs, scores every URL against five adaptive factors, generates a content brief, and tracks the rank delta after you apply. Weights self-tune per site.', features: ['Daily GSC + GA4 + SerpAPI pull', 'Opportunity scoring per URL', 'Competitor top-10 gap analysis', 'AI content briefs (word count, schema stack, entities)', 'Action history + adaptive weights', 'JS snippet / WordPress / briefs-only apply modes'] },
]

function MarketplaceInner() {
  const params = useSearchParams()
  const successSlug = params.get('success')
  const supabase = createClient()
  const [ownedSlugs, setOwnedSlugs] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [tab, setTab] = useState<'all' | 'owned' | 'available'>('all')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Addon | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const res = await fetch('/api/marketplace/keys', { headers: { Authorization: `Bearer ${session.access_token}` } })
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

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="text-sm text-text-muted animate-pulse">Loading...</div></div>

  return (
    <div className="space-y-8">
      {successSlug && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 px-5 py-4 flex items-center gap-3">
          <Check className="h-4 w-4 text-accent shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{ADDONS.find(a => a.slug === successSlug)?.name} activated</p>
            <p className="text-xs text-text-muted">The add-on is ready to use from your dashboard.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red/20 bg-red/5 px-5 py-3 flex items-center justify-between">
          <span className="text-sm text-red">{error}</span>
          <button onClick={() => setError('')} className="text-text-muted hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white">Add-ons</h1>
        <p className="mt-1 text-sm text-text-muted">
          Each add-on unlocks a CRM capability powered by the 0nMCP SDK.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2">
        {(['all', 'owned', 'available'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              tab === t ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-white'
            }`}
          >
            {t === 'all' ? `All (${ADDONS.length})` : t === 'owned' ? `Owned (${ownedSlugs.size})` : `Available (${ADDONS.length - ownedSlugs.size})`}
          </button>
        ))}
      </div>

      {/* Grid — 0nTask style */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(addon => {
          const owned = ownedSlugs.has(addon.slug)
          return (
            <div
              key={addon.slug}
              onClick={() => setSelected(addon)}
              className="cursor-pointer rounded-xl border border-border/50 bg-bg-card/50 p-5 transition-colors hover:border-border"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="text-text-muted">{addon.icon}</div>
                  <h3 className="text-sm font-semibold text-white">{addon.name}</h3>
                </div>
                {addon.badge && <Badge variant={addon.badge === 'Pro' ? 'default' : 'secondary'} className="text-[10px]">{addon.badge}</Badge>}
              </div>

              <p className="mb-1 text-[10px] uppercase tracking-widest text-text-muted">{addon.category}</p>
              <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{addon.description}</p>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">${(addon.priceCents / 100).toFixed(0)}<span className="text-text-muted font-normal text-[11px]">/mo</span></span>
                {owned ? (
                  <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px]">
                    <Check className="h-2.5 w-2.5 mr-1" />Active
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={e => { e.stopPropagation(); purchase(addon.slug) }}
                    disabled={purchasing === addon.slug}
                    className="h-7 bg-accent text-cta-text hover:bg-accent-action text-xs font-semibold"
                  >
                    {purchasing === addon.slug ? '...' : <>Get <ArrowRight className="h-3 w-3 ml-0.5" /></>}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center text-sm text-text-muted">
          {tab === 'owned' ? 'No add-ons purchased yet.' : 'All add-ons are active.'}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="text-text-muted">{selected.icon}</div>
                <div>
                  <DialogTitle className="text-base text-white">{selected.name}</DialogTitle>
                  <DialogDescription className="text-[11px] uppercase tracking-wider">{selected.category}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <p className="text-sm text-text-secondary leading-relaxed">{selected.details}</p>

            <div className="border-t border-border/50 pt-4">
              <ul className="space-y-2">
                {selected.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                    <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <DialogFooter className="flex-row items-center justify-between sm:justify-between border-t border-border/50 pt-4">
              <span className="text-lg font-bold text-white">${(selected.priceCents / 100).toFixed(0)}<span className="text-sm text-text-muted font-normal">/mo</span></span>
              {ownedSlugs.has(selected.slug) ? (
                <Badge className="bg-accent/10 text-accent border-accent/20">Active</Badge>
              ) : (
                <Button
                  onClick={() => { purchase(selected.slug); setSelected(null) }}
                  disabled={purchasing === selected.slug}
                  className="bg-accent text-cta-text hover:bg-accent-action font-semibold"
                >
                  Get {selected.name} <ArrowRight className="h-4 w-4 ml-1.5" />
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
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="text-sm text-text-muted animate-pulse">Loading...</div></div>}>
      <MarketplaceInner />
    </Suspense>
  )
}
