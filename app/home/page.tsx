'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ChatWidget } from '@/components/ChatWidget'

// ─── Brand Tokens ────────────────────────────────────────────────
const C = {
  green: '#6EE05A',
  greenDim: 'rgba(110,224,90,0.15)',
  greenBorder: 'rgba(110,224,90,0.3)',
  dark: '#07080C',
  card: '#0F1117',
  border: 'rgba(255,255,255,0.06)',
  text: '#E8ECF4',
  textSec: 'rgba(255,255,255,0.5)',
  textMut: 'rgba(255,255,255,0.3)',
  font: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
}

// ─── Shared Style Helpers ────────────────────────────────────────
const sectionStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '100px 24px',
}

const sectionTitle: React.CSSProperties = {
  fontSize: 40,
  fontWeight: 700,
  color: C.text,
  textAlign: 'center',
  marginBottom: 16,
  letterSpacing: '-0.02em',
}

const sectionSub: React.CSSProperties = {
  fontSize: 18,
  color: C.textSec,
  textAlign: 'center',
  maxWidth: 640,
  margin: '0 auto 60px',
  lineHeight: 1.6,
}

// ─── Data ────────────────────────────────────────────────────────
const productCols = [
  {
    heading: 'Platform',
    items: [
      { icon: '/icons/glass-chat.svg', title: 'AI Chat', desc: 'Claude-powered assistant with business context' },
      { icon: '/icons/glass-contacts.svg', title: 'Contacts', desc: 'Manage 9,500+ contacts in real time' },
      { icon: '/icons/glass-pipeline.svg', title: 'Pipeline', desc: 'Visual deal tracking and forecasting' },
      { icon: '/icons/glass-automation.svg', title: 'Automations', desc: 'Plain-English workflow builder' },
    ],
  },
  {
    heading: 'Intelligence',
    items: [
      { icon: '/icons/glass-brain.svg', title: 'K-Layer Brain', desc: 'Seven layers of business knowledge' },
      { icon: '/icons/glass-analytics.svg', title: 'Analytics', desc: 'Revenue, engagement, and funnel metrics' },
      { icon: '/icons/glass-brand.svg', title: 'Brand Generator', desc: 'On-brand content in seconds' },
      { icon: '/icons/glass-voice.svg', title: 'Voice AI', desc: 'Conversational AI for calls and IVR' },
    ],
  },
  {
    heading: 'Security',
    items: [
      { icon: '/icons/glass-vault.svg', title: 'Vault Protocol', desc: 'Patent-pending encrypted credential store' },
      { icon: '/icons/glass-api.svg', title: 'API Access', desc: 'Full REST + MCP server endpoints' },
      { icon: '/icons/glass-whitelabel.svg', title: 'White Label', desc: 'Your brand, your domain, your AI' },
    ],
  },
]

const solutionsCols = [
  {
    items: [
      { icon: '🏢', title: 'For Agencies', desc: 'Manage dozens of client accounts from one brain' },
      { icon: '🚀', title: 'For SaaS Founders', desc: 'Ship faster with AI-powered ops' },
      { icon: '🏪', title: 'For Local Business', desc: 'CRM + marketing on autopilot' },
      { icon: '🎓', title: 'For Coaches', desc: 'Client portals, scheduling, and content' },
    ],
  },
]

const resourcesCols = [
  {
    items: [
      { icon: '📝', title: 'Blog', desc: 'Guides, updates, and deep dives' },
      { icon: '📚', title: 'Command Library', desc: '1,554 tools documented' },
      { icon: '🎓', title: 'Learn', desc: 'Interactive courses and tutorials' },
      { icon: '📖', title: 'Documentation', desc: 'Full API and SDK reference' },
    ],
  },
  {
    items: [
      { icon: '💬', title: 'Community', desc: 'Forum, discussions, and support' },
      { icon: '🐙', title: 'GitHub', desc: 'Open-source repos and contributions' },
      { icon: '📋', title: 'Changelog', desc: 'Every release, every feature' },
    ],
  },
]

const pricingTiers = [
  { name: 'Lobby', price: 'Free', features: 'Dashboard, AI Chat (Groq), View Contacts' },
  { name: 'Front Office', price: '$29/mo', features: 'Manage Contacts, Calendar, Full AI (Claude)' },
  { name: 'Operations Wing', price: '$79/mo', features: 'Automations, Campaigns, Pipeline' },
  { name: 'Intelligence Suite', price: '$149/mo', features: 'Analytics, Brand Generator, 0nExec' },
  { name: 'The Vault', price: '$299/mo', features: 'Vault Protocol, API Access, Marketplace' },
]

const pricingSimple = [
  { name: 'Lobby', price: 'Free' },
  { name: 'Front Office', price: '$29' },
  { name: 'Operations', price: '$79' },
  { name: 'Intelligence', price: '$149' },
  { name: 'The Vault', price: '$299' },
]

const features = [
  {
    icon: '🧠',
    title: 'AI Chat with K-Layer Brain',
    desc: 'Your AI knows your business name, audience, products, and tone. Every response is personalized.',
  },
  {
    icon: '👥',
    title: 'CRM Contacts',
    desc: '9,550+ contacts managed. Add, tag, search, and sync with your CRM in real time.',
  },
  {
    icon: '📊',
    title: 'Pipeline & Deals',
    desc: 'Visual deal tracking. AI-prioritized actions. Never miss a follow-up.',
  },
  {
    icon: '⚡',
    title: 'Automations Builder',
    desc: 'Build workflows in plain English. The AI writes the automation for you.',
  },
  {
    icon: '✍️',
    title: 'Content Engine',
    desc: 'LinkedIn posts, email sequences, blog drafts, newsletters \u2014 all in your brand voice.',
  },
  {
    icon: '🔐',
    title: 'Vault Protocol',
    desc: 'Patent-pending encrypted credential management. AES-256-GCM. Your keys never leave your machine.',
  },
]

const kLayers = [
  { id: 'K1', label: 'Brand Voice' },
  { id: 'K2', label: 'Audience' },
  { id: 'K3', label: 'Products' },
  { id: 'K4', label: 'Intelligence' },
  { id: 'K5', label: 'Playbooks' },
  { id: 'K6', label: 'Integrations' },
  { id: 'K7', label: 'Memory' },
]

const steps = [
  {
    num: '01',
    title: 'Connect',
    desc: 'Connect your CRM, Stripe, email, calendar. 0nCore syncs everything.',
  },
  {
    num: '02',
    title: 'Train',
    desc: 'Fill in your K-Layers. Your AI learns your brand, audience, products, playbooks.',
  },
  {
    num: '03',
    title: 'Execute',
    desc: 'Ask your AI to write emails, manage contacts, run campaigns, generate reports. It does it.',
  },
]

const trustItems = [
  '5 patents pending',
  'MIT licensed core',
  'SOC 2 architecture',
  'GDPR compliant',
]

// ─── Component ───────────────────────────────────────────────────
export default function HomePage() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [prevMenu, setPrevMenu] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [menuVisible, setMenuVisible] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Animate menu transitions
  useEffect(() => {
    if (activeMenu) {
      setPrevMenu(activeMenu)
      setMenuVisible(true)
    } else {
      const t = setTimeout(() => setMenuVisible(false), 250)
      return () => clearTimeout(t)
    }
  }, [activeMenu])

  // ── Dropdown item renderer ──
  const DropItem = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => {
    const isImage = icon.startsWith('/')
    return (
      <a
        href="#"
        style={{
          display: 'flex',
          gap: 12,
          padding: '12px 14px',
          borderRadius: 10,
          textDecoration: 'none',
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          border: '1px solid transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(110,224,90,0.04)'
          e.currentTarget.style.borderColor = 'rgba(110,224,90,0.1)'
          e.currentTarget.style.transform = 'translateX(4px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.borderColor = 'transparent'
          e.currentTarget.style.transform = 'translateX(0)'
        }}
      >
        {isImage ? (
          <img
            src={icon}
            alt={title}
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              transition: 'transform 200ms ease',
            }}
          />
        ) : (
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: C.greenDim,
              border: `1px solid ${C.greenBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              flexShrink: 0,
              transition: 'transform 200ms ease',
            }}
          >
            {icon}
          </span>
        )}
        <div>
          <div style={{ color: C.text, fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{title}</div>
          <div style={{ color: C.textMut, fontSize: 13, lineHeight: 1.4 }}>{desc}</div>
        </div>
      </a>
    )
  }

  const navItems = ['Product', 'Solutions', 'Pricing', 'Resources']

  // ── Nav link with active indicator ──
  const NavLink = ({ label }: { label: string }) => {
    const isActive = activeMenu === label
    return (
      <button
        onMouseEnter={() => setActiveMenu(label)}
        style={{
          position: 'relative',
          background: isActive ? 'rgba(255,255,255,0.06)' : 'none',
          border: 'none',
          color: isActive ? C.text : C.textSec,
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          padding: '8px 16px',
          borderRadius: 8,
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          fontFamily: C.font,
        }}
      >
        {label}
        <span
          style={{
            display: 'inline-block',
            marginLeft: 4,
            fontSize: 10,
            transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
            transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▾
        </span>
        {/* Active indicator line */}
        <span style={{
          position: 'absolute',
          bottom: -1,
          left: '20%',
          right: '20%',
          height: 2,
          borderRadius: 1,
          background: C.green,
          transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
          transition: 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: isActive ? `0 0 8px ${C.green}` : 'none',
        }} />
      </button>
    )
  }

  // ── Dropdown container with height animation ──
  const Dropdown = ({
    name,
    children,
  }: {
    name: string
    children: React.ReactNode
  }) => {
    const isOpen = activeMenu === name
    const shouldRender = isOpen || (menuVisible && prevMenu === name)
    if (!shouldRender && !isOpen) return null

    return (
      <div
        style={{
          position: 'absolute',
          top: 64,
          left: 0,
          right: 0,
          overflow: 'hidden',
          zIndex: 99,
        }}
      >
        {/* Backdrop blur overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(7,8,12,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${C.border}`,
        }} />

        {/* Content */}
        <div
          style={{
            position: 'relative',
            padding: '28px 0 32px',
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? 'translateY(0)' : 'translateY(-12px)',
            transition: 'opacity 250ms cubic-bezier(0.16, 1, 0.3, 1), transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>{children}</div>
        </div>
      </div>
    )
  }

  // ── Overlay that dims the page when menu is open ──
  const MenuOverlay = () => (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        top: 64,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(2px)',
        zIndex: 50,
        opacity: activeMenu ? 1 : 0,
        pointerEvents: activeMenu ? 'auto' : 'none',
        transition: 'opacity 300ms ease',
      }}
      onMouseEnter={() => setActiveMenu(null)}
    />
  )

  return (
    <>
      {/* ── Font Import ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          background: ${C.dark};
          color: ${C.text};
          font-family: ${C.font};
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }
        ::selection { background: ${C.greenDim}; color: ${C.text}; }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════
          1. MEGA MENU NAVIGATION
      ═══════════════════════════════════════════════════════════ */}
      <nav
        onMouseLeave={() => setActiveMenu(null)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: scrolled ? 'rgba(7,8,12,0.85)' : 'rgba(7,8,12,0.6)',
          borderBottom: `1px solid ${scrolled ? C.border : 'transparent'}`,
          transition: 'background 300ms, border-color 300ms',
        }}
      >
        {/* Left: Logo */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Image src="/brand/on-white.png" alt="0nCore" width={36} height={36} style={{ height: 36, width: 'auto' }} />
          <span style={{ color: C.text, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>0nCore</span>
        </a>

        {/* Center: Nav Items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <NavLink label="Product" />
          <NavLink label="Solutions" />
          <NavLink label="Pricing" />
          <NavLink label="Resources" />
        </div>

        {/* Right: Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a
            href="/login"
            style={{
              color: C.textSec,
              fontSize: 14,
              fontWeight: 500,
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              transition: 'color 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.textSec)}
          >
            Login
          </a>
          <a
            href="/signup"
            style={{
              background: C.green,
              color: '#000',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              padding: '8px 20px',
              borderRadius: 8,
              transition: 'opacity 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Get Started
          </a>
        </div>

        {/* ── Product Dropdown ── */}
        <Dropdown name="Product">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 40 }}>
            {productCols.map((col) => (
              <div key={col.heading}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: C.textMut,
                    marginBottom: 12,
                    paddingLeft: 12,
                  }}
                >
                  {col.heading}
                </div>
                {col.items.map((item) => (
                  <DropItem key={item.title} {...item} />
                ))}
              </div>
            ))}
          </div>
        </Dropdown>

        {/* ── Solutions Dropdown ── */}
        <Dropdown name="Solutions">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
            <div>
              {solutionsCols[0].items.map((item) => (
                <DropItem key={item.title} {...item} />
              ))}
            </div>
            <div
              style={{
                border: `1px solid ${C.greenBorder}`,
                borderRadius: 12,
                padding: 24,
                background: 'rgba(110,224,90,0.04)',
              }}
            >
              <div style={{ fontSize: 12, color: C.green, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Featured
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                See how RocketOpp runs on 0nCore
              </div>
              <div style={{ fontSize: 14, color: C.textSec, lineHeight: 1.6 }}>
                From 9,500 contacts to automated campaigns \u2014 one dashboard, one AI, zero tab-switching.
              </div>
              <a
                href="#"
                style={{
                  display: 'inline-block',
                  marginTop: 16,
                  color: C.green,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Read case study →
              </a>
            </div>
          </div>
        </Dropdown>

        {/* ── Pricing Dropdown ── */}
        <Dropdown name="Pricing">
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            {pricingSimple.map((t) => (
              <div
                key={t.name}
                style={{
                  textAlign: 'center',
                  padding: '16px 28px',
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  background: 'rgba(255,255,255,0.02)',
                  minWidth: 140,
                }}
              >
                <div style={{ fontSize: 13, color: C.textMut, marginBottom: 6 }}>{t.name}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.text, fontFamily: C.mono }}>{t.price}</div>
              </div>
            ))}
          </div>
        </Dropdown>

        {/* ── Resources Dropdown ── */}
        <Dropdown name="Resources">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
            {resourcesCols.map((col, i) => (
              <div key={i}>
                {col.items.map((item) => (
                  <DropItem key={item.title} {...item} />
                ))}
              </div>
            ))}
          </div>
        </Dropdown>
      </nav>

      {/* Menu overlay dims page when dropdown is open */}
      <MenuOverlay />

      {/* ═══════════════════════════════════════════════════════════
          2. HERO SECTION
      ═══════════════════════════════════════════════════════════ */}
      <section
        style={{
          minHeight: '100vh',
          paddingTop: 64,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 800,
            height: 800,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(110,224,90,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, padding: '0 24px' }}>
          {/* Pill badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 20px',
              borderRadius: 999,
              border: `1px solid ${C.greenBorder}`,
              background: C.greenDim,
              fontSize: 13,
              fontWeight: 500,
              color: C.green,
              marginBottom: 40,
              fontFamily: C.mono,
            }}
          >
            1,554 tools &middot; 96 services &middot; 5 patents pending
          </div>

          {/* H1 */}
          <h1
            style={{
              fontSize: 'clamp(48px, 7vw, 80px)',
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              color: C.text,
              marginBottom: 28,
            }}
          >
            One Brain.
            <br />
            Every Service.
            <br />
            Zero Limits.
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 19,
              lineHeight: 1.7,
              color: C.textSec,
              maxWidth: 680,
              margin: '0 auto 40px',
            }}
          >
            0nCore is the AI-powered CRM that runs your business. Contacts, pipeline, automations,
            content, billing &mdash; all from one dashboard, powered by one AI that knows your
            business.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 20 }}>
            <a
              href="/signup"
              style={{
                background: C.green,
                color: '#000',
                fontSize: 17,
                fontWeight: 700,
                padding: '14px 36px',
                borderRadius: 10,
                textDecoration: 'none',
                transition: 'transform 150ms, box-shadow 150ms',
                boxShadow: `0 0 30px ${C.greenDim}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = `0 4px 40px rgba(110,224,90,0.3)`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = `0 0 30px ${C.greenDim}`
              }}
            >
              Start Free
            </a>
            <a
              href="#"
              style={{
                border: `1px solid rgba(255,255,255,0.15)`,
                color: C.text,
                fontSize: 17,
                fontWeight: 600,
                padding: '14px 36px',
                borderRadius: 10,
                textDecoration: 'none',
                transition: 'border-color 150ms, background 150ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              Watch Demo
            </a>
          </div>

          <p style={{ fontSize: 13, color: C.textMut }}>
            No credit card required &middot; Free tier includes AI chat + contacts
          </p>
        </div>

        {/* Stats row */}
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 60,
          }}
        >
          {[
            { num: '1,554', label: 'Tools' },
            { num: '96', label: 'Services' },
            { num: '50', label: 'Commands' },
            { num: '5', label: 'Patents' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: C.text, fontFamily: C.mono }}>{s.num}</div>
              <div style={{ fontSize: 13, color: C.textMut, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          3. HOW IT WORKS
      ═══════════════════════════════════════════════════════════ */}
      <section style={{ background: C.dark }}>
        <div style={sectionStyle}>
          <h2 style={sectionTitle}>Three steps to AI that runs your business</h2>
          <p style={sectionSub}>From zero to full AI-powered operations in under an hour.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {steps.map((step) => (
              <div
                key={step.num}
                style={{
                  background: C.card,
                  borderRadius: 16,
                  padding: 36,
                  borderTop: `3px solid ${C.green}`,
                  border: `1px solid ${C.border}`,
                  borderTopColor: C.green,
                }}
              >
                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 800,
                    fontFamily: C.mono,
                    color: C.green,
                    marginBottom: 20,
                    lineHeight: 1,
                  }}
                >
                  {step.num}
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 15, color: C.textSec, lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          4. FEATURES GRID
      ═══════════════════════════════════════════════════════════ */}
      <section style={{ background: C.dark }}>
        <div style={sectionStyle}>
          <h2 style={sectionTitle}>Everything your business needs. One dashboard.</h2>
          <p style={sectionSub}>
            Six pillars of intelligent business management, unified under a single AI.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {features.map((f) => (
              <div
                key={f.title}
                style={{
                  background: C.card,
                  borderRadius: 16,
                  padding: 32,
                  border: `1px solid ${C.border}`,
                  transition: 'border-color 200ms, transform 200ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.greenBorder
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.border
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    background: C.greenDim,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    marginBottom: 20,
                  }}
                >
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 10 }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 14, color: C.textSec, lineHeight: 1.6, marginBottom: 16 }}>
                  {f.desc}
                </p>
                <a
                  href="#"
                  style={{
                    color: C.green,
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Learn more →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          5. K-LAYER SECTION
      ═══════════════════════════════════════════════════════════ */}
      <section style={{ background: C.dark }}>
        <div style={sectionStyle}>
          <div
            style={{
              background: C.card,
              borderRadius: 20,
              padding: '60px 48px',
              border: `1px solid ${C.greenBorder}`,
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Subtle glow */}
            <div
              style={{
                position: 'absolute',
                top: -100,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 600,
                height: 400,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(110,224,90,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: C.green,
                  marginBottom: 16,
                }}
              >
                Unique to 0nCore
              </div>
              <h2
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: C.text,
                  marginBottom: 16,
                  letterSpacing: '-0.02em',
                }}
              >
                The K-Layer Knowledge System
              </h2>
              <p
                style={{
                  fontSize: 17,
                  color: C.textSec,
                  maxWidth: 560,
                  margin: '0 auto 48px',
                  lineHeight: 1.6,
                }}
              >
                Seven layers of business intelligence that make your AI smarter every day.
              </p>

              {/* K-Layer pills */}
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  marginBottom: 40,
                }}
              >
                {kLayers.map((k) => (
                  <div
                    key={k.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 22px',
                      borderRadius: 10,
                      border: `1px solid ${C.border}`,
                      background: 'rgba(255,255,255,0.02)',
                      transition: 'border-color 200ms, background 200ms',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = C.greenBorder
                      e.currentTarget.style.background = C.greenDim
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = C.border
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                    }}
                  >
                    <span
                      style={{
                        fontFamily: C.mono,
                        fontSize: 12,
                        fontWeight: 700,
                        color: C.green,
                      }}
                    >
                      {k.id}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{k.label}</span>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 15, color: C.textMut, maxWidth: 500, margin: '0 auto' }}>
                The more you teach your AI, the more it can do. Every interaction makes it sharper.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          6. PRICING PREVIEW
      ═══════════════════════════════════════════════════════════ */}
      <section style={{ background: C.dark }}>
        <div style={sectionStyle}>
          <h2 style={sectionTitle}>Transparent pricing. Start free.</h2>
          <p style={sectionSub}>No surprises. Upgrade when you need more power.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            {pricingTiers.map((tier, i) => {
              const isPopular = i === 2
              return (
                <div
                  key={tier.name}
                  style={{
                    background: C.card,
                    borderRadius: 16,
                    padding: '32px 20px',
                    border: `1px solid ${isPopular ? C.greenBorder : C.border}`,
                    textAlign: 'center',
                    position: 'relative',
                    transition: 'border-color 200ms, transform 200ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.greenBorder
                    e.currentTarget.style.transform = 'translateY(-4px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isPopular ? C.greenBorder : C.border
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  {isPopular && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: C.green,
                        color: '#000',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 14px',
                        borderRadius: 999,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Popular
                    </div>
                  )}
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 12 }}>
                    {tier.name}
                  </div>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 800,
                      color: C.text,
                      fontFamily: C.mono,
                      marginBottom: 16,
                    }}
                  >
                    {tier.price}
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: C.textMut,
                      lineHeight: 1.6,
                    }}
                  >
                    {tier.features}
                  </p>
                </div>
              )
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <a
              href="/signup"
              style={{
                display: 'inline-block',
                background: C.green,
                color: '#000',
                fontSize: 16,
                fontWeight: 700,
                padding: '14px 40px',
                borderRadius: 10,
                textDecoration: 'none',
                transition: 'opacity 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Start Free
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          7. TRUST / SOCIAL PROOF
      ═══════════════════════════════════════════════════════════ */}
      <section style={{ background: C.dark }}>
        <div style={{ ...sectionStyle, paddingTop: 60, paddingBottom: 60 }}>
          <p
            style={{
              fontSize: 14,
              color: C.textMut,
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
              marginBottom: 32,
            }}
          >
            Built by RocketOpp LLC
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 40,
              flexWrap: 'wrap',
              marginBottom: 32,
            }}
          >
            {trustItems.map((item) => (
              <div
                key={item}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 24px',
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <span style={{ color: C.green, fontSize: 16 }}>&#10003;</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{item}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 16, color: C.textSec, textAlign: 'center', fontStyle: 'italic' }}>
            Trusted by builders who ship.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          8. FINAL CTA
      ═══════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: C.dark,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 700,
            height: 700,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(110,224,90,0.05) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            ...sectionStyle,
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
            paddingTop: 80,
            paddingBottom: 80,
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(32px, 5vw, 52px)',
              fontWeight: 800,
              color: C.text,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              marginBottom: 20,
            }}
          >
            Stop switching tabs.
            <br />
            Start describing outcomes.
          </h2>
          <p
            style={{
              fontSize: 19,
              color: C.textSec,
              maxWidth: 500,
              margin: '0 auto 40px',
              lineHeight: 1.6,
            }}
          >
            Your AI is waiting. It already knows your business.
          </p>
          <a
            href="/signup"
            style={{
              display: 'inline-block',
              background: C.green,
              color: '#000',
              fontSize: 18,
              fontWeight: 700,
              padding: '16px 48px',
              borderRadius: 12,
              textDecoration: 'none',
              transition: 'transform 150ms, box-shadow 150ms',
              boxShadow: `0 0 40px ${C.greenDim}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = `0 8px 60px rgba(110,224,90,0.3)`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = `0 0 40px ${C.greenDim}`
            }}
          >
            Get Started Free →
          </a>
          <p style={{ fontSize: 14, color: C.textMut, marginTop: 24 }}>
            Questions?{' '}
            <a href="mailto:mike@rocketopp.com" style={{ color: C.textSec, textDecoration: 'underline' }}>
              mike@rocketopp.com
            </a>
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          9. FOOTER
      ═══════════════════════════════════════════════════════════ */}
      <footer
        style={{
          borderTop: `1px solid ${C.border}`,
          background: C.card,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '64px 24px 40px',
          }}
        >
          {/* 4-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 40, marginBottom: 48 }}>
            {[
              {
                title: 'Product',
                links: ['Dashboard', 'AI Chat', 'Contacts', 'Pipeline', 'Automations'],
              },
              {
                title: 'Resources',
                links: ['Blog', 'Commands', 'Learn', 'Docs', 'Community'],
              },
              {
                title: 'Company',
                links: ['About', 'Careers', 'Partners', 'Contact', 'Press'],
              },
              {
                title: 'Legal',
                links: ['Privacy', 'Terms', 'Security', 'Status'],
              },
            ].map((col) => (
              <div key={col.title}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: C.textMut,
                    marginBottom: 20,
                  }}
                >
                  {col.title}
                </div>
                {col.links.map((link) => (
                  <a
                    key={link}
                    href="#"
                    style={{
                      display: 'block',
                      color: C.textSec,
                      fontSize: 14,
                      textDecoration: 'none',
                      padding: '6px 0',
                      transition: 'color 150ms',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = C.textSec)}
                  >
                    {link}
                  </a>
                ))}
              </div>
            ))}
          </div>

          {/* Bottom row */}
          <div
            style={{
              borderTop: `1px solid ${C.border}`,
              paddingTop: 24,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <span style={{ fontSize: 13, color: C.textMut }}>
              &copy; 2026 RocketOpp LLC &middot; All rights reserved
            </span>
            <span style={{ fontSize: 13, color: C.textMut, fontStyle: 'italic' }}>
              &ldquo;Rankings are vanity. Revenue is sanity.&rdquo;
            </span>
          </div>
        </div>
      </footer>

      {/* 0nAI Chatbot */}
      <ChatWidget />
    </>
  )
}
