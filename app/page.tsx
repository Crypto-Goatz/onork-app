import type { Metadata } from 'next'
import Link from 'next/link'
import { VideoBg } from '@/components/video-bg'

export const metadata: Metadata = {
  title: '0nCore — Scale Your Platform 10x with AI Connectivity',
  description: '0nCore connects your CRM to 96+ services with 1,554 AI-powered tools. Security vault, 2-second flows, codeless integrations. Request early access.',
}

const PARTNERS = [
  { name: 'GitHub', logo: '/logos/github.svg' },
  { name: 'Slack', logo: '/logos/slack.svg' },
  { name: 'Stripe', logo: '/logos/stripe.svg' },
  { name: 'Linear', logo: '/logos/linear.svg' },
  { name: 'Google', logo: '/logos/gcal.svg' },
  { name: 'Supabase', logo: '/logos/supabase.svg' },
  { name: 'Vercel', logo: '/logos/vercel.svg' },
  { name: 'Shopify', logo: '/logos/shopify.svg' },
]

const FEATURES = [
  {
    num: '01',
    title: 'Security Vault',
    desc: 'AES-256 encrypted credential storage with hardware fingerprinting. Your API keys never leave the vault.',
    gradient: 'from-emerald-500/20 via-emerald-400/5 to-transparent',
    glow: 'group-hover:shadow-emerald-500/20',
    accent: 'text-emerald-400',
    border: 'group-hover:border-emerald-500/30',
    iconPath: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  },
  {
    num: '02',
    title: '2s Flow',
    desc: 'Describe what you want in plain English. 0nMCP executes across 96 services in under 2 seconds.',
    gradient: 'from-cyan-500/20 via-cyan-400/5 to-transparent',
    glow: 'group-hover:shadow-cyan-500/20',
    accent: 'text-cyan-400',
    border: 'group-hover:border-cyan-500/30',
    iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    num: '03',
    title: 'Integrations',
    desc: '1,554 tools across 96 services. CRM, email, social, payments, analytics — all connected through one brain.',
    gradient: 'from-violet-500/20 via-violet-400/5 to-transparent',
    glow: 'group-hover:shadow-violet-500/20',
    accent: 'text-violet-400',
    border: 'group-hover:border-violet-500/30',
    iconPath: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z',
  },
  {
    num: '04',
    title: 'Codeless',
    desc: 'Build AI workflows without writing code. Drag, connect, deploy. Your entire business on autopilot.',
    gradient: 'from-amber-500/20 via-amber-400/5 to-transparent',
    glow: 'group-hover:shadow-amber-500/20',
    accent: 'text-amber-400',
    border: 'group-hover:border-amber-500/30',
    iconPath: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
]

const INTEGRATIONS = [
  { name: 'GitHub', logo: '/logos/github.svg' },
  { name: 'Google', logo: '/logos/gcal.svg' },
  { name: 'Stripe', logo: '/logos/stripe.svg' },
  { name: 'Slack', logo: '/logos/slack.svg' },
  { name: 'Supabase', logo: '/logos/supabase.svg' },
  { name: 'Vercel', logo: '/logos/vercel.svg' },
  { name: 'Shopify', logo: '/logos/shopify.svg' },
  { name: 'HubSpot', logo: '/logos/hubspot.svg' },
  { name: 'Notion', logo: '/logos/notion.svg' },
  { name: 'Airtable', logo: '/logos/airtable.svg' },
  { name: 'Discord', logo: '/logos/discord.svg' },
  { name: 'Twilio', logo: '/logos/twilio.svg' },
  { name: 'SendGrid', logo: '/logos/sendgrid.svg' },
  { name: 'Calendly', logo: '/logos/calendly.svg' },
  { name: 'Zoom', logo: '/logos/zoom.svg' },
  { name: 'Linear', logo: '/logos/linear.svg' },
  { name: 'Jira', logo: '/logos/jira.svg' },
  { name: 'OpenAI', logo: '/logos/openai.svg' },
  { name: 'GoHighLevel', logo: '/logos/gohighlevel.svg' },
  { name: 'Anthropic', logo: '/logos/anthropic.svg' },
  { name: 'MongoDB', logo: '/logos/mongodb.svg' },
  { name: 'Cloudflare', logo: '/logos/cloudflare.svg' },
  { name: 'Mailchimp', logo: '/logos/mailchimp.svg' },
  { name: 'Figma', logo: '/logos/figma.svg' },
]

const COMMUNITY = [
  { name: 'Alex Thompson', role: 'CTO, ScaleAI', text: 'We connected 14 services in our first week. The vault system means I actually sleep at night knowing our API keys are safe.' },
  { name: 'Sarah Chen', role: 'Founder, NexusOps', text: 'Replaced 6 different integration tools with one 0nCore instance. The 2-second execution time is not marketing — it is real.' },
  { name: 'Marcus Rivera', role: 'DevOps Lead', text: 'The codeless workflow builder saved our team 40+ hours per week. We went from idea to production automation in minutes.' },
]

export default function HomePage() {
  return (
    <div style={{ background: '#020810', color: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: '0nCore',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Free to start' },
            description: 'AI Business Operating System with 1,554 tools across 96 services',
            url: 'https://0ncore.com',
            author: { '@type': 'Organization', name: 'RocketOpp LLC', url: 'https://rocketopp.com' },
          })
        }}
      />

      {/* ═══ NAV ═══ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'clamp(10px, 2vw, 12px) clamp(16px, 4vw, 32px)',
        background: 'rgba(2,8,16,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/brand/0ncore-logo.png" alt="0nCore" style={{ height: 32, objectFit: 'contain' }} />
        </Link>
        <div className="oncore-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <Link href="/platform" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Platform</Link>
          <Link href="/connections" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Connections</Link>
          <Link href="/launch-party" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Launch Party</Link>
          <Link href="/pricing" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Pricing</Link>
          <Link href="/login" style={{
            fontSize: 13, fontWeight: 600, color: '#020810',
            background: '#7ed957', padding: '8px 20px', borderRadius: 8,
            textDecoration: 'none',
          }}>VIP Access</Link>
        </div>
        <Link href="/login" className="oncore-mobile-menu" style={{
          display: 'none', fontSize: 13, fontWeight: 600, color: '#020810',
          background: '#7ed957', padding: '8px 20px', borderRadius: 8,
          textDecoration: 'none',
        }}>VIP Access</Link>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{
        position: 'relative', padding: 'clamp(100px, 15vw, 140px) clamp(16px, 4vw, 24px) clamp(40px, 6vw, 80px)', overflow: 'hidden',
        minHeight: '85vh', display: 'flex', alignItems: 'center',
      }}>
        {/* Video background */}
        <VideoBg opacity={0.12} />
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translate(-50%,-30%)', width: 900, height: 900, background: 'radial-gradient(circle, rgba(126,217,87,0.08) 0%, transparent 60%)', pointerEvents: 'none', zIndex: 1 }} />
        <div style={{ position: 'absolute', top: '30%', right: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 60%)', pointerEvents: 'none', zIndex: 1 }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'clamp(24px, 4vw, 60px)', alignItems: 'center' }}>
          {/* Left: Copy */}
          <div>
            <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: '#7ed957', background: 'rgba(126,217,87,0.08)', padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(126,217,87,0.15)', marginBottom: 24, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              1,554 Tools · 96 Services · 5 Patents
            </div>
            <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, margin: '0 0 20px' }}>
              Scale Your Platform<br />
              10x with <span style={{ color: '#7ed957' }}>0nCore</span><br />
              Connectivity.
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 480, margin: '0 0 32px' }}>
              Unifying digital connectivity. Connect your CRM to every service, automate every workflow, and let AI handle the rest.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/request" style={{
                padding: '14px 32px', background: '#7ed957', color: '#020810',
                fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontSize: 15,
                boxShadow: '0 0 30px rgba(126,217,87,0.3)',
              }}>Request Access</Link>
              <Link href="/launch-party" style={{
                padding: '14px 32px', background: 'rgba(255,255,255,0.06)', color: '#fff',
                fontWeight: 600, borderRadius: 10, textDecoration: 'none', fontSize: 15,
                border: '1px solid rgba(255,255,255,0.08)',
              }}>Launch Party — May 1st</Link>
            </div>
          </div>

          {/* Right: Hero Video */}
          <div style={{
            position: 'relative', borderRadius: 20, overflow: 'hidden',
            border: '1px solid rgba(126,217,87,0.15)',
            boxShadow: '0 20px 80px rgba(0,0,0,0.5), 0 0 40px rgba(126,217,87,0.08)',
            aspectRatio: '16/9',
          }}>
            <iframe
              src="https://www.youtube.com/embed/D91C8EPRixM?rel=0&modestbranding=1&playsinline=1"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Integrate any MCP with AI — 0nCore"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        </div>
      </section>

      {/* ═══ PARTNER LOGOS ═══ */}
      <section style={{ padding: '0 clamp(16px, 4vw, 24px) 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(16px, 3vw, 36px)', flexWrap: 'wrap', maxWidth: 900, margin: '0 auto' }}>
          {PARTNERS.map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.5 }}>
              <img src={p.logo} alt={p.name} style={{ height: 22, filter: 'brightness(0) invert(1)', objectFit: 'contain' }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{p.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 4 FEATURES ═══ */}
      <section className="py-[clamp(48px,8vw,96px)] px-[clamp(16px,4vw,24px)] max-w-[1100px] mx-auto">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7ed957] mb-3">Why 0nCore</p>
          <h2 className="text-[clamp(24px,4vw,36px)] font-extrabold text-white leading-tight">
            The four pillars of<br />
            <span className="bg-gradient-to-r from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">autonomous business</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.num}
              className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-7 text-center transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${f.glow} ${f.border} cursor-default`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Gradient overlay on hover */}
              <div className={`absolute inset-0 bg-gradient-to-b ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

              {/* Shimmer effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
                <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent skew-x-12 group-hover:animate-[shimmer_2s_ease-in-out_infinite]" />
              </div>

              {/* Content */}
              <div className="relative z-10">
                {/* Number badge */}
                <div className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider mb-5 border ${f.accent} bg-white/[0.03] border-white/[0.08] group-hover:border-current/30 transition-colors`}>
                  {f.num}
                </div>

                {/* Icon */}
                <div className={`mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center bg-white/[0.04] border border-white/[0.06] group-hover:bg-white/[0.08] group-hover:border-white/[0.12] transition-all duration-300 group-hover:scale-110`}>
                  <svg className={`w-6 h-6 ${f.accent} transition-transform duration-300 group-hover:scale-110`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.iconPath} />
                  </svg>
                </div>

                {/* Title */}
                <h3 className="text-[16px] font-bold text-white mb-2 group-hover:text-white transition-colors">{f.title}</h3>

                {/* Description */}
                <p className="text-[13px] text-white/40 leading-relaxed group-hover:text-white/55 transition-colors">{f.desc}</p>
              </div>

              {/* Bottom glow line */}
              <div className={`absolute bottom-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent ${f.accent.replace('text-', 'via-')}/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            </div>
          ))}
        </div>

        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%) skewX(-12deg); }
            100% { transform: translateX(200%) skewX(-12deg); }
          }
        `}</style>
      </section>

      {/* ═══ INTEGRATION GRID ═══ */}
      <section style={{ padding: 'clamp(40px, 6vw, 80px) clamp(16px, 4vw, 24px)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, marginBottom: 8 }}>Integration Grid</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Connect to All Modern Platforms.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12 }}>
            {INTEGRATIONS.map(i => (
              <div key={i.name} style={{
                padding: '16px 12px', borderRadius: 12, textAlign: 'center',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                transition: 'border-color 0.2s, background 0.2s',
              }}>
                <img src={i.logo} alt={i.name} style={{ width: 36, height: 36, objectFit: 'contain' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{i.name}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link href="/connections" style={{ fontSize: 13, color: '#7ed957', textDecoration: 'none', fontWeight: 600 }}>View all 96 connections →</Link>
          </div>
        </div>
      </section>

      {/* ═══ DOCUMENTATION + BLOG PREVIEW ═══ */}
      <section style={{ padding: 'clamp(40px, 6vw, 80px) clamp(16px, 4vw, 24px)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
          {/* Documentation */}
          <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', padding: 28 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Developer Documentation</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20, lineHeight: 1.6 }}>Full API reference, tutorials, and guides for building on 0nCore.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Getting Started', 'API Reference', 'MCP Server Setup', 'Webhook Configuration'].map(doc => (
                <a key={doc} href="https://0nmcp.com/docs" style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  {doc}
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>→</span>
                </a>
              ))}
            </div>
          </div>

          {/* Blog Preview */}
          <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', padding: 28 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Blog</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20, lineHeight: 1.6 }}>Insights on AI orchestration, MCP servers, and the future of automation.</p>
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }}>
              <div style={{ height: 140, background: 'linear-gradient(135deg, rgba(126,217,87,0.1) 0%, rgba(0,212,255,0.05) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Featured Post</span>
              </div>
              <div style={{ padding: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Optimizing Your MCP Server with Production-Grade Extensibility</h4>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>How to build MCP servers that scale to 1,500+ tools without sacrificing performance.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ COMMUNITY ═══ */}
      <section style={{ padding: 'clamp(40px, 6vw, 80px) clamp(16px, 4vw, 24px)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>Community</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {COMMUNITY.map((c, i) => (
              <div key={i} style={{
                padding: 24, borderRadius: 16,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(126,217,87,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#7ed957' }}>
                    {c.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{c.role}</div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>&ldquo;{c.text}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LAUNCH PARTY CTA ═══ */}
      <section style={{ padding: 'clamp(40px, 6vw, 80px) clamp(16px, 4vw, 24px)', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7ed957', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>May 1st · 9 PM EST</div>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 36px)', fontWeight: 800, marginBottom: 12 }}>Launch Party</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginBottom: 28, lineHeight: 1.7 }}>
            Join us for the official 0nCore launch. Live demo, exclusive early access, and a behind-the-scenes look at the future of AI orchestration.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/launch-party" style={{
              padding: '14px 36px', background: '#7ed957', color: '#020810',
              fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontSize: 16,
              boxShadow: '0 0 30px rgba(126,217,87,0.3)',
            }}>Get Your Invite</Link>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ padding: 'clamp(16px, 3vw, 24px) clamp(16px, 4vw, 32px)', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>© 2026 RocketOpp LLC. Powered by 0nMCP.</span>
          <a href="https://www.youtube.com/@0ncoreAI" target="_blank" rel="noopener noreferrer" className="footer-yt-icon">
            <img src="/logos/youtube.svg" alt="YouTube" style={{ width: 18, height: 18, filter: 'brightness(0) invert(1)' }} />
          </a>
        </div>
        <div style={{ display: 'flex', gap: 'clamp(12px, 2vw, 20px)', flexWrap: 'wrap' }}>
          <Link href="/platform" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Platform</Link>
          <Link href="/connections" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Connections</Link>
          <Link href="/request" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Request Access</Link>
          <Link href="/launch-party" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Launch Party</Link>
          <a href="https://0nmcp.com" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>0nMCP</a>
          <a href="https://www.youtube.com/@0ncoreAI" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }} target="_blank" rel="noopener noreferrer">YouTube</a>
          <a href="mailto:mike@rocketopp.com" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Contact</a>
        </div>
      </footer>

      <style>{`
        .footer-yt-icon { display: flex; opacity: 0.3; transition: opacity 0.2s; }
        .footer-yt-icon:hover { opacity: 0.8; }
        @media (max-width: 768px) {
          .oncore-nav-links { display: none !important; }
          .oncore-mobile-menu { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
