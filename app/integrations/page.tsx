import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '0nCore Integrations — 96 Connected Services',
  description: 'Connect your CRM to 96+ services. Stripe, Slack, GitHub, HubSpot, Shopify, and more.',
}

const SERVICES = [
  { name: 'Stripe', cat: 'Payments' }, { name: 'Slack', cat: 'Communication' }, { name: 'GitHub', cat: 'Development' },
  { name: 'Supabase', cat: 'Database' }, { name: 'SendGrid', cat: 'Email' }, { name: 'Twilio', cat: 'Communication' },
  { name: 'Shopify', cat: 'E-Commerce' }, { name: 'HubSpot', cat: 'CRM' }, { name: 'Notion', cat: 'Productivity' },
  { name: 'Airtable', cat: 'Database' }, { name: 'Discord', cat: 'Communication' }, { name: 'Calendly', cat: 'Scheduling' },
  { name: 'Zoom', cat: 'Communication' }, { name: 'Gmail', cat: 'Email' }, { name: 'Google Sheets', cat: 'Productivity' },
  { name: 'Linear', cat: 'Development' }, { name: 'Jira', cat: 'Development' }, { name: 'Mailchimp', cat: 'Email' },
  { name: 'Google Drive', cat: 'Storage' }, { name: 'Google Calendar', cat: 'Scheduling' },
  { name: 'MongoDB', cat: 'Database' }, { name: 'OpenAI', cat: 'AI' }, { name: 'Anthropic', cat: 'AI' },
  { name: 'Zendesk', cat: 'Support' }, { name: 'Intercom', cat: 'Support' }, { name: 'Pipedrive', cat: 'CRM' },
  { name: 'Asana', cat: 'Productivity' }, { name: 'Dropbox', cat: 'Storage' }, { name: 'WhatsApp', cat: 'Communication' },
  { name: 'Instagram', cat: 'Social' }, { name: 'Twitter/X', cat: 'Social' }, { name: 'LinkedIn', cat: 'Social' },
  { name: 'Square', cat: 'Payments' }, { name: 'QuickBooks', cat: 'Finance' }, { name: 'Cloudflare', cat: 'Infrastructure' },
  { name: 'GoDaddy', cat: 'Domains' }, { name: 'Vercel', cat: 'Infrastructure' }, { name: 'Telegram', cat: 'Communication' },
  { name: 'TikTok', cat: 'Social' }, { name: 'Reddit', cat: 'Social' }, { name: 'Figma', cat: 'Design' },
  { name: 'ElevenLabs', cat: 'AI' }, { name: 'Groq', cat: 'AI' }, { name: 'Resend', cat: 'Email' },
  { name: 'Postmark', cat: 'Email' }, { name: 'Webflow', cat: 'Website' }, { name: 'WordPress', cat: 'Website' },
  { name: 'YouTube', cat: 'Social' }, { name: 'Pinterest', cat: 'Social' },
]

const CATEGORIES = [...new Set(SERVICES.map(s => s.cat))].sort()

export default function IntegrationsPage() {
  return (
    <div style={{ background: '#020810', color: '#fff', minHeight: '100vh' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px', background: 'rgba(2,8,16,0.8)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Link href="/home" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <img src="/brand/0ncore-icon.png" alt="0nCore" style={{ height: 26 }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}><span style={{ color: '#7ed957' }}>0n</span>Core</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/pricing" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Pricing</Link>
          <Link href="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Sign In</Link>
          <Link href="/signup" style={{ fontSize: 13, fontWeight: 600, color: '#020810', background: '#7ed957', padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>Get Started Free</Link>
        </div>
      </nav>

      <section style={{ textAlign: 'center', padding: '80px 24px 40px', maxWidth: 700, margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, marginBottom: 12 }}>Connect to <span style={{ color: '#7ed957' }}>everything</span></h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>96+ services connected through the 0nMCP SDK. Each integration becomes available as MCP tools in your AI workflows.</p>
      </section>

      <section style={{ padding: '0 24px 40px', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {CATEGORIES.map(cat => (
            <span key={cat} style={{ fontSize: 11, fontWeight: 500, padding: '4px 12px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>{cat}</span>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {SERVICES.map(s => (
            <div key={s.name} style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', padding: '16px 18px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{s.name}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.cat}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ textAlign: 'center', padding: '60px 24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Don&apos;t see your service?</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>We add new integrations every week. Request one or build your own with the 0nMCP SDK.</p>
        <Link href="/signup" style={{ padding: '12px 28px', background: '#7ed957', color: '#020810', fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontSize: 14 }}>Get Started Free</Link>
      </section>

      <footer style={{ padding: '24px 32px', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>© 2026 RocketOpp LLC. Powered by 0nMCP.</span>
      </footer>
    </div>
  )
}
