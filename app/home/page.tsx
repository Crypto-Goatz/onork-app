import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '0nCore — AI That Runs Your Business | 335 Tools, 96 Services',
  description: '0nCore is an AI-powered business automation platform. 335 tools across 96 services. Course builder, Voice AI, Social Planner, Agent Studio, and 27 more add-ons. Starts at $9/mo.',
}

const INTEGRATIONS = ['Stripe', 'Slack', 'GitHub', 'Supabase', 'SendGrid', 'Twilio', 'Shopify', 'HubSpot', 'Notion', 'Airtable', 'Discord', 'Calendly', 'Zoom', 'Gmail', 'Google Sheets', 'Linear', 'Jira', 'Zapier']

const FEATURES = [
  { title: 'AI Course Builder', desc: 'Generate full courses and import into your CRM.', price: '$49/mo', color: '#7ed957' },
  { title: 'Voice AI Agent', desc: 'Deploy phone agents with knowledge bases.', price: '$99/mo', color: '#00d4ff' },
  { title: 'Agent Studio Pro', desc: 'Build AI agents with 335+ MCP tool access.', price: '$99/mo', color: '#a78bfa' },
  { title: 'Social Planner', desc: 'Connect accounts and publish AI content.', price: '$29/mo', color: '#f97316' },
  { title: 'Email Builder', desc: 'AI email campaigns with IP warm-up.', price: '$19/mo', color: '#ec4899' },
  { title: 'Snapshot Manager', desc: 'Clone and deploy CRM configurations.', price: '$99/mo', color: '#14b8a6' },
]

export default function HomePage() {
  return (
    <div style={{ background: '#020810', color: '#fff', minHeight: '100vh' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px', background: 'rgba(2,8,16,0.8)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <img src="/brand/0ncore-icon.png" alt="0nCore" style={{ height: 26 }} onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png' }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}><span style={{ color: '#7ed957' }}>0n</span>Core</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/pricing" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Pricing</Link>
          <Link href="/integrations" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Integrations</Link>
          <a href="https://0nmcp.com/docs" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Docs</a>
          <Link href="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Sign In</Link>
          <Link href="/signup" style={{ fontSize: 13, fontWeight: 600, color: '#020810', background: '#7ed957', padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>Get Started Free</Link>
        </div>
      </nav>

      <section style={{ textAlign: 'center', padding: '100px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 800, background: 'radial-gradient(circle, rgba(126,217,87,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: '#7ed957', background: 'rgba(126,217,87,0.08)', padding: '5px 16px', borderRadius: 20, border: '1px solid rgba(126,217,87,0.15)', marginBottom: 24, letterSpacing: '0.08em', textTransform: 'uppercase' }}>335 Tools · 96 Services · 5 Patents Pending</div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 60px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, margin: '0 0 20px' }}>AI that <span style={{ color: '#7ed957' }}>runs</span> your business.</h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 36px' }}>Connect your CRM. Install add-ons. Build AI workflows that execute across every channel — dashboard, Slack, API, voice, and MCP.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ padding: '14px 32px', background: '#7ed957', color: '#020810', fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontSize: 15 }}>Start Free</Link>
            <Link href="/pricing" style={{ padding: '14px 32px', background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 600, borderRadius: 10, textDecoration: 'none', fontSize: 15, border: '1px solid rgba(255,255,255,0.08)' }}>View Pricing</Link>
          </div>
        </div>
      </section>

      <section style={{ padding: '0 24px 60px', overflow: 'hidden' }}>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>Connected to 96+ services</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 800, margin: '0 auto' }}>
          {INTEGRATIONS.map(n => <span key={n} style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>{n}</span>)}
        </div>
      </section>

      <section style={{ padding: '60px 24px', maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>Three steps to automation</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            { n: '01', t: 'Connect', d: 'Install the marketplace app on your CRM. OAuth handles auth.' },
            { n: '02', t: 'Choose', d: 'Pick the add-ons you need. Pay only for what you use.' },
            { n: '03', t: 'Automate', d: 'Build switches, run AI workflows, and scale.' },
          ].map(s => (
            <div key={s.n} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#7ed957', marginBottom: 12, opacity: 0.3 }}>{s.n}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{s.t}</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '60px 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Add-ons that do the work</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>31 modules. Install what you need. <Link href="/pricing" style={{ color: '#7ed957', textDecoration: 'none' }}>See all →</Link></p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', padding: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: f.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{f.price}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link href="/pricing" style={{ padding: '12px 28px', background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 600, borderRadius: 10, textDecoration: 'none', fontSize: 14, border: '1px solid rgba(255,255,255,0.08)' }}>View all 31 add-ons →</Link>
        </div>
      </section>

      <section style={{ textAlign: 'center', padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Ready to automate?</h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginBottom: 28 }}>Free account. No credit card. Start in 30 seconds.</p>
        <Link href="/signup" style={{ padding: '14px 36px', background: '#7ed957', color: '#020810', fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontSize: 16 }}>Create Free Account</Link>
      </section>

      <footer style={{ padding: '24px 32px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>© 2026 RocketOpp LLC. Powered by 0nMCP.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/pricing" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Pricing</Link>
          <a href="https://0nmcp.com/docs" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Docs</a>
          <a href="https://0nmcp.com" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>0nMCP</a>
          <a href="mailto:mike@rocketopp.com" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Contact</a>
        </div>
      </footer>
    </div>
  )
}
