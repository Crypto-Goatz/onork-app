import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '0nCore Connections — 96+ Integrated Services',
  description: 'See every platform 0nCore connects to through 0nMCP. CRM, Stripe, Google, Slack, AI models, and 90+ more services — 1,554 tools, one API.',
  openGraph: { title: '0nCore Connections — 96+ Services', description: '1,554 tools across 96 services. Every integration you need.', url: 'https://0ncore.com/connections' },
  alternates: { canonical: 'https://0ncore.com/connections' },
}

interface Service { name: string; logo: string; desc: string; tools?: number }

const CATEGORIES: { name: string; services: Service[] }[] = [
  {
    name: 'CRM & Sales',
    services: [
      { name: 'CRM', logo: 'crm', desc: '289 tools — contacts, pipelines, workflows, social, email, invoices', tools: 289 },
      { name: 'HubSpot', logo: 'hubspot', desc: 'Contact sync, deals, and marketing automation' },
      { name: 'Pipedrive', logo: 'pipedrive', desc: 'Pipeline and deal management' },
      { name: 'Salesforce', logo: 'salesforce', desc: 'Enterprise CRM sync' },
      { name: 'Intercom', logo: 'intercom', desc: 'Customer messaging and support' },
      { name: 'Freshdesk', logo: 'freshdesk', desc: 'Helpdesk and ticket management' },
      { name: 'Zendesk', logo: 'zendesk', desc: 'Customer service platform' },
    ],
  },
  {
    name: 'Communication',
    services: [
      { name: 'Slack', logo: 'slack', desc: 'Channel messaging and bot commands' },
      { name: 'Discord', logo: 'discord', desc: 'Server management and community' },
      { name: 'Twilio', logo: 'twilio', desc: 'SMS, voice calls, and phone numbers' },
      { name: 'SendGrid', logo: 'sendgrid', desc: 'Transactional and marketing email' },
      { name: 'Resend', logo: 'resend', desc: 'Developer email API' },
      { name: 'Mailgun', logo: 'mailgun', desc: 'Email delivery infrastructure' },
      { name: 'Postmark', logo: 'postmark', desc: 'Transactional email delivery' },
      { name: 'WhatsApp', logo: 'whatsapp', desc: 'Business messaging integration' },
      { name: 'Telegram', logo: 'telegram', desc: 'Bot API and messaging' },
    ],
  },
  {
    name: 'Google Workspace',
    services: [
      { name: 'Gmail', logo: 'gmail', desc: 'Read, send, and manage email' },
      { name: 'Google Calendar', logo: 'gcal', desc: 'Events and scheduling' },
      { name: 'Google Sheets', logo: 'gsheets', desc: 'Spreadsheet data sync' },
      { name: 'Google Drive', logo: 'gdrive', desc: 'File storage and sharing' },
      { name: 'Google Docs', logo: 'gdocs', desc: 'Document creation' },
      { name: 'Google Analytics', logo: 'ga4', desc: 'Website analytics and tracking' },
      { name: 'Google Ads', logo: 'google_ads', desc: 'Ad campaign management' },
      { name: 'Search Console', logo: 'gsearch', desc: 'Search performance data' },
      { name: 'Google Tasks', logo: 'gtasks', desc: 'Task management' },
      { name: 'Tag Manager', logo: 'gtm', desc: 'Tag and tracking management' },
      { name: 'Google Business', logo: 'gbusiness', desc: 'Business profile management' },
    ],
  },
  {
    name: 'AI & Models',
    services: [
      { name: 'OpenAI', logo: 'openai', desc: 'GPT models for text and embeddings' },
      { name: 'Anthropic', logo: 'anthropic', desc: 'Claude models for reasoning' },
      { name: 'Groq', logo: 'groq', desc: 'Ultra-fast LLM inference' },
      { name: 'Gemini', logo: 'gemini', desc: 'Google multimodal AI' },
      { name: 'Mistral', logo: 'mistral', desc: 'Open-weight language models' },
      { name: 'Cohere', logo: 'cohere', desc: 'Enterprise NLP and search' },
      { name: 'Replicate', logo: 'replicate', desc: 'Run ML models in the cloud' },
      { name: 'ElevenLabs', logo: 'elevenlabs', desc: 'AI voice generation' },
      { name: 'Deepgram', logo: 'deepgram', desc: 'Speech-to-text API' },
      { name: 'Stability AI', logo: 'stability', desc: 'Image generation models' },
      { name: 'Perplexity', logo: 'perplexity', desc: 'AI-powered search' },
    ],
  },
  {
    name: 'Payments & Finance',
    services: [
      { name: 'Stripe', logo: 'stripe', desc: 'Payments, subscriptions, and billing' },
      { name: 'Square', logo: 'square', desc: 'Point-of-sale and payments' },
      { name: 'QuickBooks', logo: 'quickbooks', desc: 'Accounting and invoicing' },
      { name: 'Plaid', logo: 'plaid', desc: 'Banking data connectivity' },
      { name: 'Xero', logo: 'xero', desc: 'Cloud accounting software' },
      { name: 'FreshBooks', logo: 'freshbooks', desc: 'Invoicing and expenses' },
      { name: 'Wave', logo: 'wave', desc: 'Free accounting software' },
    ],
  },
  {
    name: 'Social Media',
    services: [
      { name: 'Instagram', logo: 'instagram', desc: 'Post scheduling and analytics' },
      { name: 'Facebook', logo: 'facebook', desc: 'Pages, ads, and messenger' },
      { name: 'LinkedIn', logo: 'linkedin', desc: 'Professional network and posts' },
      { name: 'X / Twitter', logo: 'x_twitter', desc: 'Tweets and engagement' },
      { name: 'TikTok', logo: 'tiktok', desc: 'Short-form video platform' },
      { name: 'YouTube', logo: 'youtube', desc: 'Video hosting and analytics' },
      { name: 'Pinterest', logo: 'pinterest', desc: 'Visual discovery platform' },
      { name: 'Reddit', logo: 'reddit', desc: 'Community discussions' },
    ],
  },
  {
    name: 'Development & DevOps',
    services: [
      { name: 'GitHub', logo: 'github', desc: 'Repos, issues, PRs, and CI/CD' },
      { name: 'Linear', logo: 'linear', desc: 'Project and issue tracking' },
      { name: 'Jira', logo: 'jira', desc: 'Agile project management' },
      { name: 'Vercel', logo: 'vercel', desc: 'Deployment and serverless' },
      { name: 'Cloudflare', logo: 'cloudflare', desc: 'DNS, CDN, and edge computing' },
      { name: 'Netlify', logo: 'netlify', desc: 'Web deployment platform' },
      { name: 'Railway', logo: 'railway', desc: 'Infrastructure platform' },
      { name: 'Render', logo: 'render', desc: 'Cloud application hosting' },
    ],
  },
  {
    name: 'Databases',
    services: [
      { name: 'Supabase', logo: 'supabase', desc: 'PostgreSQL, auth, and realtime' },
      { name: 'MongoDB', logo: 'mongodb', desc: 'Document database' },
      { name: 'Neon', logo: 'neon', desc: 'Serverless Postgres' },
      { name: 'PlanetScale', logo: 'planetscale', desc: 'MySQL-compatible serverless' },
      { name: 'Turso', logo: 'turso', desc: 'Edge SQLite database' },
      { name: 'CockroachDB', logo: 'cockroachdb', desc: 'Distributed SQL' },
    ],
  },
  {
    name: 'Productivity',
    services: [
      { name: 'Notion', logo: 'notion', desc: 'Docs, wikis, and databases' },
      { name: 'Airtable', logo: 'airtable', desc: 'Flexible database platform' },
      { name: 'Asana', logo: 'asana', desc: 'Work management' },
      { name: 'Monday.com', logo: 'monday', desc: 'Team collaboration' },
      { name: 'Trello', logo: 'trello', desc: 'Kanban board management' },
      { name: 'ClickUp', logo: 'clickup', desc: 'All-in-one productivity' },
      { name: 'Todoist', logo: 'todoist', desc: 'Task management' },
      { name: 'Calendly', logo: 'calendly', desc: 'Scheduling automation' },
      { name: 'Zoom', logo: 'zoom', desc: 'Video conferencing' },
      { name: 'Loom', logo: 'loom', desc: 'Video messaging' },
    ],
  },
  {
    name: 'Marketing & Email',
    services: [
      { name: 'Mailchimp', logo: 'mailchimp', desc: 'Email marketing and audiences' },
      { name: 'ActiveCampaign', logo: 'activecampaign', desc: 'Marketing automation' },
      { name: 'ConvertKit', logo: 'convertkit', desc: 'Creator email marketing' },
      { name: 'Brevo', logo: 'brevo', desc: 'Marketing platform' },
      { name: 'Lemlist', logo: 'lemlist', desc: 'Cold outreach automation' },
      { name: 'SmartLead', logo: 'smartlead', desc: 'Lead generation' },
      { name: 'Facebook Ads', logo: 'fb_ads', desc: 'Ad campaign management' },
    ],
  },
  {
    name: 'E-Commerce',
    services: [
      { name: 'Shopify', logo: 'shopify', desc: 'Store, orders, and products' },
      { name: 'WooCommerce', logo: 'woocommerce', desc: 'WordPress e-commerce' },
      { name: 'BigCommerce', logo: 'bigcommerce', desc: 'Enterprise e-commerce' },
    ],
  },
  {
    name: 'Automation & Integration',
    services: [
      { name: 'Zapier', logo: 'zapier', desc: 'Workflow automation' },
      { name: 'Make', logo: 'make', desc: 'Visual automation platform' },
      { name: 'n8n', logo: 'n8n', desc: 'Self-hosted workflow automation' },
    ],
  },
  {
    name: 'Content & Design',
    services: [
      { name: 'Figma', logo: 'figma', desc: 'Collaborative design tool' },
      { name: 'Canva', logo: 'canva', desc: 'Visual content creation' },
      { name: 'WordPress', logo: 'wordpress', desc: 'Content management' },
      { name: 'Webflow', logo: 'webflow', desc: 'Visual web development' },
      { name: 'DocuSign', logo: 'docusign', desc: 'Electronic signatures' },
      { name: 'Typeform', logo: 'typeform', desc: 'Interactive forms' },
    ],
  },
  {
    name: 'Cloud & Infrastructure',
    services: [
      { name: 'AWS', logo: 'aws', desc: 'S3, Lambda, and cloud services' },
      { name: 'Azure', logo: 'azure', desc: 'Microsoft cloud platform' },
      { name: 'Google Cloud', logo: 'gcloud', desc: 'GCP compute and storage' },
      { name: 'GoDaddy', logo: 'godaddy', desc: 'Domains and DNS' },
      { name: 'Dropbox', logo: 'dropbox', desc: 'Cloud file storage' },
      { name: 'Microsoft 365', logo: 'm365', desc: 'Office suite and email' },
    ],
  },
]

const totalServices = CATEGORIES.reduce((sum, c) => sum + c.services.length, 0)

export default function ConnectionsPage() {
  return (
    <div style={{ background: '#020810', color: '#fff', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'WebPage', name: '0nCore Connections',
        description: `${totalServices}+ integrated services through the 0nMCP orchestration engine.`,
        url: 'https://0ncore.com/connections',
      })}} />

      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(10px, 2vw, 14px) clamp(16px, 4vw, 32px)', background: 'rgba(2,8,16,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <img src="/brand/0ncore-logo.png" alt="0nCore" style={{ height: 28, objectFit: 'contain' }} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/platform" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Platform</Link>
          <Link href="/use-cases" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Use Cases</Link>
          <Link href="/blog" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Blog</Link>
          <Link href="/connections" style={{ fontSize: 13, color: '#6EE05A', textDecoration: 'none', fontWeight: 600 }}>Connections</Link>
          <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: '#020810', background: '#7ed957', padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: 'clamp(48px, 8vw, 80px) clamp(16px, 4vw, 24px) clamp(32px, 4vw, 48px)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(126,217,87,0.05) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: '#6EE05A', background: 'rgba(110,224,90,0.08)', padding: '4px 14px', borderRadius: 20, border: '1px solid rgba(110,224,90,0.15)', marginBottom: 16, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {totalServices} services · 1,554 tools · 14 categories
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12 }}>
            Connected to <span style={{ color: '#7ed957' }}>Everything</span>
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
            Every integration is powered by 0nMCP — the universal AI orchestration engine. One API, every service.
          </p>
        </div>
      </section>

      {/* Categories */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 clamp(16px, 4vw, 24px) 80px' }}>
        {CATEGORIES.map(cat => (
          <div key={cat.name} style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{cat.name}</h2>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 8 }}>{cat.services.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {cat.services.map(svc => (
                <div key={svc.name} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                  transition: 'border-color 0.2s, background 0.2s',
                }}>
                  <img
                    src={`/logos/${svc.logo}.svg`}
                    alt={svc.name}
                    style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }}
                    loading="lazy"
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f4f8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {svc.name}
                      {svc.tools && <span style={{ fontSize: 9, fontWeight: 700, color: '#6EE05A', marginLeft: 6 }}>{svc.tools} tools</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{svc.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', padding: '0 clamp(16px, 4vw, 24px) 80px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: 40, borderRadius: 20, background: 'rgba(110,224,90,0.03)', border: '1px solid rgba(110,224,90,0.08)' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Need a service that&apos;s not listed?</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>0nMCP is extensible. Add any REST API as a custom connector.</p>
          <Link href="/request" style={{ display: 'inline-block', padding: '12px 28px', background: '#7ed957', color: '#020810', fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontSize: 15 }}>Request a Connection</Link>
        </div>
      </section>

      <footer style={{ padding: '16px clamp(16px, 4vw, 32px)', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>© 2026 RocketOpp LLC. Powered by 0nMCP.</span>
        <a href="https://www.youtube.com/@0ncoreAI" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>YouTube</a>
      </footer>
    </div>
  )
}
