import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '0nCore Connections — 96+ Integrated Services',
  description: 'See every platform 0nCore connects to. CRM, Stripe, GitHub, Slack, and 92 more services through the 0nMCP orchestration engine.',
}

const CONNECTIONS: { name: string; category: string; description: string; color: string }[] = [
  // CRM & Sales
  { name: 'CRM (GoHighLevel)', category: 'CRM & Sales', description: 'Full CRM integration with 289 tools — contacts, pipelines, workflows, social posting, email, phone, invoices, and more. Direct API connection with rebilling.', color: '#FF6B35' },
  { name: 'HubSpot', category: 'CRM & Sales', description: 'Contact sync, deal management, and marketing automation.', color: '#FF7A59' },
  { name: 'Pipedrive', category: 'CRM & Sales', description: 'Pipeline and deal management integration.', color: '#28B767' },
  { name: 'Salesforce', category: 'CRM & Sales', description: 'Enterprise CRM sync and automation.', color: '#00A1E0' },
  // Communication
  { name: 'Slack', category: 'Communication', description: 'Channel messaging, bot commands, and workflow notifications.', color: '#4A154B' },
  { name: 'Discord', category: 'Communication', description: 'Server management, bot integration, and community tools.', color: '#5865F2' },
  { name: 'Twilio', category: 'Communication', description: 'SMS, voice calls, and phone number management.', color: '#F22F46' },
  { name: 'SendGrid', category: 'Communication', description: 'Transactional and marketing email delivery.', color: '#1A82E2' },
  // Development
  { name: 'GitHub', category: 'Development', description: 'Repository management, issues, PRs, and CI/CD integration.', color: '#24292E' },
  { name: 'Linear', category: 'Development', description: 'Project management and issue tracking.', color: '#5E6AD2' },
  { name: 'Jira', category: 'Development', description: 'Agile project management and sprint planning.', color: '#0052CC' },
  { name: 'Vercel', category: 'Development', description: 'Deployment management and serverless functions.', color: '#000000' },
  // AI & Data
  { name: 'OpenAI', category: 'AI & Data', description: 'GPT models for text generation, analysis, and embeddings.', color: '#10A37F' },
  { name: 'Anthropic', category: 'AI & Data', description: 'Claude models for advanced reasoning and code generation.', color: '#D4A574' },
  { name: 'Groq', category: 'AI & Data', description: 'Ultra-fast inference for Llama and Mixtral models.', color: '#F55036' },
  { name: 'Supabase', category: 'AI & Data', description: 'PostgreSQL database, auth, storage, and realtime subscriptions.', color: '#3ECF8E' },
  // Payments
  { name: 'Stripe', category: 'Payments', description: 'Payment processing, subscriptions, invoicing, and billing portal.', color: '#6772E5' },
  { name: 'Square', category: 'Payments', description: 'Point-of-sale and payment processing.', color: '#3E4348' },
  { name: 'QuickBooks', category: 'Payments', description: 'Accounting, invoicing, and financial reporting.', color: '#2CA01C' },
  // Marketing
  { name: 'Mailchimp', category: 'Marketing', description: 'Email marketing campaigns and audience management.', color: '#FFE01B' },
  { name: 'Google Analytics', category: 'Marketing', description: 'Website analytics, conversion tracking, and audience insights.', color: '#E37400' },
  { name: 'Google Ads', category: 'Marketing', description: 'Ad campaign management and performance tracking.', color: '#4285F4' },
  // Productivity
  { name: 'Notion', category: 'Productivity', description: 'Document management, wikis, and team databases.', color: '#000000' },
  { name: 'Airtable', category: 'Productivity', description: 'Flexible database and project management.', color: '#18BFFF' },
  { name: 'Google Sheets', category: 'Productivity', description: 'Spreadsheet data sync and automation.', color: '#34A853' },
  { name: 'Google Calendar', category: 'Productivity', description: 'Event scheduling and calendar management.', color: '#4285F4' },
  // E-commerce
  { name: 'Shopify', category: 'E-commerce', description: 'Store management, orders, products, and inventory.', color: '#96BF48' },
  { name: 'WooCommerce', category: 'E-commerce', description: 'WordPress e-commerce integration.', color: '#96588A' },
  // Infrastructure
  { name: 'Cloudflare', category: 'Infrastructure', description: 'DNS, CDN, security, and edge computing.', color: '#F48120' },
  { name: 'GoDaddy', category: 'Infrastructure', description: 'Domain registration and DNS management.', color: '#1BDBDB' },
  { name: 'AWS', category: 'Infrastructure', description: 'Cloud computing, S3 storage, and Lambda functions.', color: '#FF9900' },
]

const CATEGORIES = [...new Set(CONNECTIONS.map(c => c.category))]

export default function ConnectionsPage() {
  return (
    <div style={{ background: '#020810', color: '#fff', minHeight: '100vh' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px', background: 'rgba(2,8,16,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <img src="/brand/0n-anim-logo.svg" alt="0nCore" style={{ height: 28 }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}><span style={{ color: '#7ed957' }}>0n</span>CORE</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/request" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Request Access</Link>
          <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: '#020810', background: '#7ed957', padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>VIP Access</Link>
        </div>
      </nav>

      <section style={{ textAlign: 'center', padding: '80px 24px 48px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(126,217,87,0.05) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12 }}>Connected to <span style={{ color: '#7ed957' }}>96+</span> Services</h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
            Every integration is powered by 0nMCP — the universal AI orchestration engine. 1,554 tools, one API.
          </p>
        </div>
      </section>

      <section style={{ padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
        {CATEGORIES.map(cat => (
          <div key={cat} style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'rgba(255,255,255,0.8)' }}>{cat}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
              {CONNECTIONS.filter(c => c.category === cat).map(c => (
                <div key={c.name} style={{
                  padding: '18px 20px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: c.color, opacity: 0.85,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 700, color: '#fff',
                  }}>
                    {c.name.slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{c.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <footer style={{ padding: '24px 32px', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>© 2026 RocketOpp LLC. Powered by 0nMCP.</span>
      </footer>
    </div>
  )
}
