import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '0nCore Platform — One Place. Everywhere. | AI Business Operating System',
  description: 'Add it one place. Have it everywhere. 0nCore syncs your tasks, contacts, emails, calendar, and AI across every tool you use — in real time. 1,554 capabilities.',
}

const SYNC_POINTS = [
  'Your CRM', 'Slack', 'Google Calendar', 'Gmail', 'Your Phone',
  'Any Task App', 'Your Website', 'Social Media', 'Voice AI', 'Spreadsheets',
]

const CAPABILITIES = [
  { title: 'Create a task', desc: 'From a chat message, a voice command, an email, or a thought. It appears everywhere instantly.' },
  { title: 'Send an email', desc: 'AI writes it in your voice. Pulls the contact from your CRM. Schedules it for the optimal time. Logs it automatically.' },
  { title: 'Book a meeting', desc: 'Checks your calendar, your contact\'s timezone, finds the gap, sends the invite, adds the agenda — one sentence.' },
  { title: 'Publish to social', desc: 'AI generates platform-optimized content. Posts to Facebook, Instagram, LinkedIn, X, TikTok, Google Business — simultaneously.' },
  { title: 'Build a course', desc: 'Describe the topic. AI generates the curriculum, lessons, quizzes, and certificates. Imports directly into your portal.' },
  { title: 'Answer your phone', desc: 'AI picks up when you can\'t. Knows your business, your products, your calendar. Books appointments. Takes messages. Sounds human.' },
  { title: 'Follow up with a lead', desc: 'Knows when they last visited your site. What they looked at. What they asked. Drafts the perfect follow-up.' },
  { title: 'Generate a report', desc: 'Pulls analytics from every connected service. Scores your performance. Recommends what to fix. Delivers it as a PDF.' },
  { title: 'Train your AI', desc: 'Upload your documents, paste your website, describe your business. The AI learns everything and represents you accurately.' },
  { title: 'Manage your pipeline', desc: 'Drag deals between stages. AI alerts you to stale opportunities. Auto-assigns follow-up tasks based on stage.' },
  { title: 'Process a payment', desc: 'Send an invoice. Accept a payment. Set up a subscription. Issue a refund. All from the same dashboard.' },
  { title: 'Audit a website', desc: 'Enter any URL. Get a technical health score across performance, security, SEO, accessibility, and stack quality in 30 seconds.' },
  { title: 'Build a workflow', desc: 'Describe what should happen. The AI builds the automation — triggers, conditions, actions — across any connected service.' },
  { title: 'Search everything', desc: 'One search bar. Finds contacts, tasks, emails, documents, calendar events, transactions — across every connected platform.' },
  { title: 'Protect your credentials', desc: 'AES-256 encrypted vault. Hardware-bound. Your API keys, passwords, and secrets never leave your machine.' },
]

export default function PlatformPage() {
  return (
    <div style={{ background: '#020810', color: '#fff', minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'clamp(10px, 2vw, 14px) clamp(16px, 4vw, 32px)',
        background: 'rgba(2,8,16,0.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <img src="/brand/0ncore-logo.png" alt="0nCore" style={{ height: 28, objectFit: 'contain' }} />
        </Link>
        <div className="platform-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/connections" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Connections</Link>
          <Link href="/pricing" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Pricing</Link>
          <Link href="/request" style={{ fontSize: 13, fontWeight: 600, color: '#020810', background: '#7ed957', padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>Request Access</Link>
        </div>
        <Link href="/request" className="platform-mobile-cta" style={{ display: 'none', fontSize: 13, fontWeight: 600, color: '#020810', background: '#7ed957', padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>Request Access</Link>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{ textAlign: 'center', padding: 'clamp(60px, 10vw, 100px) clamp(16px, 4vw, 24px) clamp(40px, 6vw, 60px)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 800, background: 'radial-gradient(circle, rgba(126,217,87,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: '#7ed957', background: 'rgba(126,217,87,0.08)', padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(126,217,87,0.15)', marginBottom: 24, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            The AI Business Operating System
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, margin: '0 0 20px' }}>
            Add it one place.<br />
            <span style={{ color: '#7ed957' }}>Have it everywhere.</span>
          </h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, maxWidth: 580, margin: '0 auto' }}>
            Create a task in 0nCore. It appears in Slack, your calendar, your CRM, and your phone — instantly. Update it anywhere. Every connected tool stays in sync, in real time, with zero effort.
          </p>
        </div>
      </section>

      {/* ═══ REAL-TIME SYNC ═══ */}
      <section style={{ padding: 'clamp(24px, 4vw, 40px) clamp(16px, 4vw, 24px) clamp(40px, 6vw, 80px)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 24 }}>Syncs with everything you already use</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {SYNC_POINTS.map(s => (
              <span key={s} style={{
                padding: '8px 18px', borderRadius: 10,
                background: 'rgba(126,217,87,0.06)', border: '1px solid rgba(126,217,87,0.12)',
                color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500,
              }}>
                {s}
              </span>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', marginTop: 16 }}>
            Powered by 0nMCP — 1,554 tools across 96 services, connected through one AI brain.
          </p>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section style={{ padding: 'clamp(40px, 6vw, 80px) clamp(16px, 4vw, 24px)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, textAlign: 'center', marginBottom: 12 }}>How it actually works</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: 560, margin: '0 auto 48px', lineHeight: 1.7 }}>
            Every piece of information in 0nCore lives in one place. When you connect a tool — Slack, your calendar, your email — that tool becomes a window into the same data. Not a copy. Not a sync that runs every 15 minutes. The same data, viewed from wherever you are.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {[
              {
                title: 'You add a contact in your CRM.',
                detail: 'They immediately appear in your task manager, your email system, your phone dialer, and your pipeline. Their profile is enriched with public data. An AI-generated follow-up sequence is suggested based on how they found you.',
              },
              {
                title: 'You create a task from a Slack message.',
                detail: 'It shows up in your task board with the original context attached. Due date auto-set based on urgency detection. Assigned to you. A calendar block is suggested. When you complete it — Slack gets notified, the task board updates, and the calendar block is removed.',
              },
              {
                title: 'You receive an email from a lead.',
                detail: 'Their CRM profile updates with the interaction. The pipeline stage advances. A task is created to follow up. The AI drafts a response in your voice. Your calendar shows available slots in case they want to book. All of this happens before you open the email.',
              },
              {
                title: 'You tell your AI to plan your day.',
                detail: 'It looks at your tasks by priority, your calendar for conflicts, your pipeline for urgent deals, your inbox for time-sensitive messages, and your social accounts for engagement opportunities. Then it gives you a plan — and you can execute every item from one screen.',
              },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '24px 28px', borderRadius: 16,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(126,217,87,0.1)', border: '1px solid rgba(126,217,87,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800, color: '#7ed957',
                  }}>
                    {i + 1}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#f0f4f8' }}>{item.title}</h3>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: 0 }}>{item.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CAPABILITIES ═══ */}
      <section style={{ padding: 'clamp(40px, 6vw, 80px) clamp(16px, 4vw, 24px)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, marginBottom: 8 }}>What you can do</h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
              Not features. Not apps. Capabilities. Things you can actually do, right now, from one place.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {CAPABILITIES.map((c, i) => (
              <div key={i} style={{
                padding: '20px 22px', borderRadius: 14,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: '#f0f4f8' }}>{c.title}</h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THE AI ═══ */}
      <section style={{ padding: 'clamp(40px, 6vw, 80px) clamp(16px, 4vw, 24px)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, marginBottom: 12 }}>Your AI learns you</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.8, maxWidth: 580, margin: '0 auto 40px' }}>
            Every 0nCore account includes a personal AI that adapts to how you work. It learns your communication style, your priorities, your schedule patterns, and your preferences. The more you use it, the less you have to tell it.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
            {[
              { title: 'Brand Intelligence', desc: 'Knows your colors, fonts, voice, and messaging. Every AI-generated output matches your brand automatically.' },
              { title: 'Company Knowledge', desc: 'Trained on your products, services, pricing, and FAQs. Answers customer questions accurately without scripting.' },
              { title: 'Personal Adaptation', desc: 'Learns your writing style, workflow habits, and preferences. Suggestions get smarter every day.' },
            ].map((item, i) => (
              <div key={i} style={{
                padding: 24, borderRadius: 16,
                background: 'rgba(126,217,87,0.03)', border: '1px solid rgba(126,217,87,0.08)',
                textAlign: 'left',
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: '#7ed957' }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ NOT AN APP — AN OS ═══ */}
      <section style={{ padding: 'clamp(40px, 6vw, 80px) clamp(16px, 4vw, 24px)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, marginBottom: 12 }}>This is not another app</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.8, maxWidth: 580, margin: '0 auto 32px' }}>
            You do not need another dashboard to check. Another login to remember. Another place to update. 0nCore is the operating system underneath all of your tools. It connects them, syncs them, and makes them smarter — without replacing any of them.
          </p>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.8, maxWidth: 580, margin: '0 auto 32px' }}>
            Keep using Slack. Keep using Google Calendar. Keep using your CRM. 0nCore connects to all of them and adds an AI layer that none of them have on their own.
          </p>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#f0f4f8', lineHeight: 1.6 }}>
            Add it one place. Have it everywhere.<br />
            <span style={{ color: '#7ed957' }}>That is the promise. That is the product.</span>
          </p>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ padding: 'clamp(40px, 6vw, 80px) clamp(16px, 4vw, 24px)', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 32px)', fontWeight: 800, marginBottom: 12 }}>Ready?</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginBottom: 28, lineHeight: 1.7 }}>
            Early access is open. No credit card. No commitment. Just connect your tools and watch everything sync.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/request" style={{ padding: '14px 36px', background: '#7ed957', color: '#020810', fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontSize: 16, boxShadow: '0 0 30px rgba(126,217,87,0.3)' }}>
              Request Access
            </Link>
            <Link href="/launch-party" style={{ padding: '14px 36px', background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 600, borderRadius: 10, textDecoration: 'none', fontSize: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
              Launch Party — May 1st
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: 'clamp(16px, 3vw, 24px) clamp(16px, 4vw, 32px)', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>© 2026 RocketOpp LLC. Powered by 0nMCP — 1,554 tools, 96 services, 5 patents pending.</span>
        <div style={{ display: 'flex', gap: 'clamp(12px, 2vw, 20px)', flexWrap: 'wrap' }}>
          <Link href="/connections" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Connections</Link>
          <Link href="/request" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Request Access</Link>
          <a href="https://0nmcp.com" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>0nMCP</a>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .platform-nav-links { display: none !important; }
          .platform-mobile-cta { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
