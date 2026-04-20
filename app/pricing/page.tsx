import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '0nCore Pricing — AI Add-ons for CRM Automation',
  description: '31 AI-powered add-ons for CRM automation. Courses, Voice AI, Social Planner, Agent Studio, and more. From $9/mo.',
  openGraph: {
    title: '0nCore Pricing — AI Add-ons',
    description: '31 add-ons. 335 tools. 96 services. From $9/mo.',
    url: 'https://0ncore.com/pricing',
  },
}

const ADDONS = [
  { slug: 'ai-course-builder', name: 'AI Course Builder', price: 49, category: 'AI', desc: 'Generate full courses with AI and import directly into your CRM.', features: ['AI lesson generation', 'Auto-import to CRM', 'Instructor profiles'] },
  { slug: 'voice-ai-agent', name: 'Voice AI Agent', price: 99, category: 'AI', desc: 'Deploy AI phone agents with knowledge bases and call routing.', features: ['Inbound & outbound', 'KB integration', 'Call analytics'], badge: 'Pro' },
  { slug: 'conversation-ai', name: 'Conversation AI', price: 49, category: 'AI', desc: 'AI chatbots for messaging with custom personas.', features: ['Multi-channel', 'Custom personas', 'Handoff to human'] },
  { slug: 'agent-studio', name: 'Agent Studio Pro', price: 99, category: 'AI', desc: 'Build and deploy AI agents with MCP tool access.', features: ['Agent creation', '335+ tool access', 'KB wiring'], badge: 'Pro' },
  { slug: 'knowledge-base', name: 'Knowledge Base', price: 29, category: 'AI', desc: 'Create AI knowledge bases for agents and bots.', features: ['Document upload', 'Agent integration', 'Auto-training'] },
  { slug: 'social-planner', name: 'Social Planner', price: 29, category: 'Marketing', desc: 'Connect social accounts and publish AI content.', features: ['Google, FB, IG, LinkedIn', 'Post scheduling', 'Analytics'] },
  { slug: 'blog-engine', name: 'Blog Engine', price: 19, category: 'Marketing', desc: 'AI blog posts published to your CRM blog.', features: ['AI writing', 'SEO optimization', 'Categories'] },
  { slug: 'email-builder', name: 'Email Builder', price: 19, category: 'Marketing', desc: 'AI email campaigns and templates.', features: ['AI content', 'Template builder', 'Scheduling'] },
  { slug: 'campaign-manager', name: 'Campaign Manager', price: 29, category: 'Marketing', desc: 'Manage email and SMS campaigns.', features: ['Campaign stats', 'Audience targeting', 'A/B ready'] },
  { slug: 'funnel-builder', name: 'Funnel Builder', price: 29, category: 'Marketing', desc: 'Manage funnels, pages, and redirects.', features: ['Funnel management', 'Page content', 'Analytics'] },
  { slug: 'phone-system', name: 'Phone System', price: 49, category: 'Comms', desc: 'Purchase phone numbers and manage lines.', features: ['Number purchasing', 'Call forwarding', 'Recording'] },
  { slug: 'calendar-booking', name: 'Calendar & Booking', price: 29, category: 'CRM', desc: 'Calendars, events, and booking links.', features: ['Event management', 'Booking links', 'Resources'] },
  { slug: 'contact-manager', name: 'Contact Manager', price: 19, category: 'CRM', desc: 'Full contact CRUD with tagging and bulk ops.', features: ['Contact CRUD', 'Tagging', 'Bulk operations'] },
  { slug: 'opportunity-pipeline', name: 'Pipeline', price: 29, category: 'CRM', desc: 'Sales pipelines, stages, and deals.', features: ['Pipeline creation', 'Deal tracking', 'Custom fields'] },
  { slug: 'payment-processing', name: 'Payments', price: 49, category: 'Finance', desc: 'Process payments, orders, and subscriptions.', features: ['Payment collection', 'Subscriptions', 'Coupons'] },
  { slug: 'invoice-automation', name: 'Invoice Automation', price: 29, category: 'Finance', desc: 'AI invoices, estimates, and recurring billing.', features: ['AI generation', 'Recurring', 'Auto-reminders'] },
  { slug: 'snapshot-manager', name: 'Snapshot Manager', price: 99, category: 'Admin', desc: 'Generate, deploy, and clone CRM snapshots.', features: ['Full backup', 'Cross-location clone', 'One-click deploy'], badge: 'Pro' },
  { slug: 'workflow-reader', name: 'Workflow Intelligence', price: 19, category: 'Admin', desc: 'Read workflows and export as .0n files.', features: ['Workflow analysis', '.0n export', 'Portability'] },
  { slug: 'affiliate-manager', name: 'Affiliate Manager', price: 49, category: 'Sales', desc: 'Affiliate programs with tracking.', features: ['Affiliate onboarding', 'Commission tracking', 'Referral links'] },
  { slug: 'product-catalog', name: 'Product Catalog', price: 19, category: 'Sales', desc: 'Products, pricing, and collections.', features: ['Product CRUD', 'Price management', 'Collections'] },
  { slug: 'form-builder', name: 'Form Builder', price: 19, category: 'Content', desc: 'Forms, surveys, and submission tracking.', features: ['Form creation', 'Survey builder', 'Submissions'] },
  { slug: 'media-manager', name: 'Media Manager', price: 9, category: 'Content', desc: 'Upload and organize media assets.', features: ['File upload', 'Folder management', 'Asset organization'] },
  { slug: 'custom-objects', name: 'Custom Objects', price: 49, category: 'Admin', desc: 'Custom schemas, records, and associations.', features: ['Schema creation', 'Record CRUD', 'Associations'] },
  { slug: 'document-contracts', name: 'Documents', price: 29, category: 'Sales', desc: 'Contracts and proposals with e-signature.', features: ['Contract send', 'Templates', 'E-signature'] },
  { slug: 'ecommerce-store', name: 'E-Commerce', price: 49, category: 'Sales', desc: 'Store settings, shipping, and fulfillment.', features: ['Store config', 'Shipping', 'Fulfillment'] },
  { slug: 'link-triggers', name: 'Link Triggers', price: 9, category: 'Admin', desc: 'Trigger links for workflow automation.', features: ['Link creation', 'Trigger automation', 'Tracking'] },
  { slug: 'user-management', name: 'User Management', price: 19, category: 'Admin', desc: 'Team members, roles, and permissions.', features: ['User CRUD', 'Roles', 'Permissions'] },
  { slug: 'wordpress-manager', name: 'WordPress', price: 19, category: 'Content', desc: 'Manage connected WordPress sites.', features: ['Site management', 'Status monitoring'] },
  { slug: 'saas-manager', name: 'SaaS Manager', price: 99, category: 'Admin', desc: 'Manage SaaS locations and white-label.', features: ['Location provisioning', 'Company settings', 'White-label'], badge: 'Pro' },
  { slug: 'location-settings', name: 'Location Settings', price: 19, category: 'Admin', desc: 'Custom fields, values, tags, and templates.', features: ['Custom fields', 'Tags', 'Templates'] },
  { slug: 'brand-board', name: 'Brand Board', price: 9, category: 'Content', desc: 'Brand design kits and assets.', features: ['Brand kit', 'Colors & fonts', 'Logo management'] },
]

const CATEGORIES = ['AI', 'Marketing', 'CRM', 'Sales', 'Finance', 'Comms', 'Content', 'Admin']

const CAT_COLORS: Record<string, string> = {
  AI: '#7ed957', Marketing: '#00d4ff', CRM: '#a78bfa', Sales: '#f97316',
  Finance: '#fbbf24', Comms: '#14b8a6', Content: '#ec4899', Admin: '#6b7280',
}

export default function PricingPage() {
  return (
    <div style={{ background: '#020810', color: '#fff', minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(12px, 2vw, 16px) clamp(16px, 4vw, 32px)', background: 'rgba(2,8,16,0.8)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <img src="/brand/0ncore-icon.png" alt="0nCore" style={{ height: 28 }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}><span style={{ color: '#7ed957' }}>0n</span>Core</span>
        </a>
        <div className="pricing-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="https://0nmcp.com" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Integrations</a>
          <a href="https://0nmcp.com/docs" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Documentation</a>
          <a href="/login" style={{ fontSize: 13, fontWeight: 600, color: '#020810', background: '#7ed957', padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>Get Started</a>
        </div>
        <a href="/login" className="pricing-mobile-cta" style={{ display: 'none', fontSize: 13, fontWeight: 600, color: '#020810', background: '#7ed957', padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>Get Started</a>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: 'clamp(48px, 8vw, 80px) clamp(16px, 4vw, 24px) clamp(36px, 5vw, 60px)', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: '#7ed957', background: 'rgba(126,217,87,0.08)', padding: '4px 14px', borderRadius: 20, border: '1px solid rgba(126,217,87,0.15)', marginBottom: 20, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          335 Tools · 96 Services · 31 Add-ons
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 16px' }}>
          Pay for what you <span style={{ color: '#7ed957' }}>use</span>.
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 32px' }}>
          Each add-on unlocks a CRM capability powered by the 0nMCP SDK. Install what you need. Cancel anytime. No contracts.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/login" style={{ padding: '12px 28px', background: '#7ed957', color: '#020810', fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontSize: 15 }}>Start Free</a>
          <a href="https://0nmcp.com" style={{ padding: '12px 28px', background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 600, borderRadius: 10, textDecoration: 'none', fontSize: 15, border: '1px solid rgba(255,255,255,0.08)' }}>View Integrations</a>
        </div>
      </section>

      {/* Category pills */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 clamp(16px, 4vw, 24px) 32px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {CATEGORIES.map(cat => (
            <span key={cat} style={{ fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 20, background: `${CAT_COLORS[cat]}10`, color: CAT_COLORS[cat], border: `1px solid ${CAT_COLORS[cat]}20`, letterSpacing: '0.04em' }}>
              {cat} ({ADDONS.filter(a => a.category === cat).length})
            </span>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 clamp(16px, 4vw, 24px) clamp(40px, 6vw, 80px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {ADDONS.map(addon => (
            <div key={addon.slug} style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', padding: 24, display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: CAT_COLORS[addon.category], textTransform: 'uppercase', letterSpacing: '0.08em' }}>{addon.category}</span>
                {addon.badge && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(126,217,87,0.1)', color: '#7ed957' }}>{addon.badge}</span>}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: '#fff' }}>{addon.name}</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: '0 0 12px', flex: 1 }}>{addon.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
                {addon.features.map(f => (
                  <li key={f} style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#7ed957', fontSize: 10 }}>&#10003;</span> {f}
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 20, fontWeight: 700 }}>${addon.price}<span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>/mo</span></span>
                <Link href="/login" style={{ fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 8, background: 'rgba(126,217,87,0.1)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)', textDecoration: 'none' }}>
                  Get Add-on
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ textAlign: 'center', padding: 'clamp(36px, 5vw, 60px) clamp(16px, 4vw, 24px) clamp(40px, 6vw, 80px)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, marginBottom: 12 }}>Need everything?</h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
          All 31 add-ons. $1,169/mo. Or contact us for custom enterprise pricing.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/login" style={{ padding: '12px 28px', background: '#7ed957', color: '#020810', fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontSize: 15 }}>Start Free</a>
          <a href="mailto:mike@rocketopp.com" style={{ padding: '12px 28px', background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 600, borderRadius: 10, textDecoration: 'none', fontSize: 15, border: '1px solid rgba(255,255,255,0.08)' }}>Contact Sales</a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: 'clamp(16px, 3vw, 24px)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>© 2026 RocketOpp LLC. All rights reserved. 0nCore is powered by 0nMCP.</p>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .pricing-nav-links { display: none !important; }
          .pricing-mobile-cta { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
