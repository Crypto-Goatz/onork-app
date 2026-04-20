import type { Metadata } from 'next'
import Link from 'next/link'
import { CATEGORIES, ADDONS, getAddonBySlug } from '@/lib/marketplace-data'

export const metadata: Metadata = {
  title: '0nCore Marketplace — AI-Powered Business Add-ons',
  description: 'Browse 31 add-ons for your CRM. Social media automation, email builder, voice AI, analytics, and more. Install what you need, pay for what you use.',
  openGraph: {
    title: '0nCore Marketplace — AI-Powered Business Add-ons',
    description: 'Browse 31 add-ons for your CRM. Install what you need, pay for what you use.',
    url: 'https://0ncore.com/marketplace',
  },
}

const ICON_MAP: Record<string, string> = {
  database: '\u{1F5C4}',
  megaphone: '\u{1F4E2}',
  brain: '\u{1F9E0}',
  chart: '\u{1F4CA}',
  phone: '\u{1F4DE}',
  dollar: '\u{1F4B0}',
  pencil: '\u{270F}',
  settings: '\u{2699}',
}

const STEPS = [
  { num: '01', title: 'Install', desc: 'Choose an add-on from the marketplace and add it to your account.', icon: '\u{1F4E6}' },
  { num: '02', title: 'Activate', desc: 'It connects to your CRM sub-location automatically — zero configuration.', icon: '\u{26A1}' },
  { num: '03', title: 'Automate', desc: 'The add-on runs on autopilot using your K-layer AI crew.', icon: '\u{1F916}' },
]

const featured = getAddonBySlug('content-engine')!

export default function MarketplacePage() {
  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: '0nCore Marketplace Categories',
            description: 'AI-powered add-ons for CRM automation',
            url: 'https://0ncore.com/marketplace',
            numberOfItems: CATEGORIES.length,
            itemListElement: CATEGORIES.map((cat, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: cat.name,
              url: `https://0ncore.com/marketplace/${cat.slug}`,
            })),
          })
        }}
      />

      {/* Hero */}
      <section style={{
        position: 'relative', textAlign: 'center',
        padding: 'clamp(60px, 10vw, 100px) clamp(16px, 4vw, 24px) clamp(40px, 6vw, 60px)',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translate(-50%,-30%)', width: 800, height: 800, background: 'radial-gradient(circle, rgba(126,217,87,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: '#7ed957', background: 'rgba(126,217,87,0.08)', padding: '4px 14px', borderRadius: 20, border: '1px solid rgba(126,217,87,0.15)', marginBottom: 20, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {ADDONS.length} Add-ons &middot; {CATEGORIES.length} Categories &middot; Powered by 0nMCP
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 16px' }}>
            The <span style={{ color: '#7ed957' }}>0nCore</span> Marketplace
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 32px' }}>
            AI-powered add-ons that plug into your CRM. Each one unlocks a capability — install what you need, activate instantly.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#categories" style={{ padding: '12px 28px', background: '#7ed957', color: '#020810', fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontSize: 15 }}>Browse All</a>
            <Link href="/request" style={{ padding: '12px 28px', background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 600, borderRadius: 10, textDecoration: 'none', fontSize: 15, border: '1px solid rgba(255,255,255,0.08)' }}>Request Access</Link>
          </div>
        </div>
      </section>

      {/* How Add-ons Work */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 clamp(16px, 4vw, 24px) clamp(40px, 6vw, 60px)' }}>
        <h2 style={{ fontSize: 'clamp(20px, 3vw, 24px)', fontWeight: 800, textAlign: 'center', marginBottom: 32 }}>How Add-ons Work</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {STEPS.map(s => (
            <div key={s.num} style={{ padding: 28, borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#7ed957', marginBottom: 12, letterSpacing: '0.1em' }}>{s.num}</div>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Category Grid */}
      <section id="categories" style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(40px, 6vw, 60px) clamp(16px, 4vw, 24px)' }}>
        <h2 style={{ fontSize: 'clamp(20px, 3vw, 24px)', fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>Browse by Category</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 32 }}>Each category groups related capabilities for your CRM.</p>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Link href="/marketplace/all" style={{
            display: 'inline-block', fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 8,
            background: 'rgba(126,217,87,0.1)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)',
            textDecoration: 'none',
          }}>
            View All {ADDONS.length} Add-ons
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {CATEGORIES.map(cat => (
            <Link key={cat.slug} href={`/marketplace/${cat.slug}`} style={{
              padding: 24, borderRadius: 16,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              textDecoration: 'none', color: '#fff',
              display: 'flex', flexDirection: 'column', gap: 8,
              transition: 'border-color 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 28 }}>{ICON_MAP[cat.icon] || '\u{1F4E6}'}</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12, background: `${cat.color}15`, color: cat.color, border: `1px solid ${cat.color}25` }}>
                  {cat.count} add-ons
                </span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{cat.name}</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>{cat.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Add-on */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(16px, 4vw, 24px) clamp(40px, 6vw, 60px)' }}>
        <div style={{
          borderRadius: 20, border: '1px solid rgba(126,217,87,0.15)',
          background: 'linear-gradient(135deg, rgba(126,217,87,0.04) 0%, rgba(0,212,255,0.02) 100%)',
          padding: 'clamp(24px, 4vw, 40px)',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32,
          alignItems: 'center',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: 'rgba(126,217,87,0.12)', color: '#7ed957', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Featured</span>
              {featured.badge && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(0,212,255,0.1)', color: '#00d4ff' }}>{featured.badge}</span>
              )}
            </div>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 800, margin: '0 0 8px' }}>{featured.name}</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: '0 0 20px' }}>{featured.shortDesc}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
              {featured.features.slice(0, 4).map(f => (
                <li key={f} style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#7ed957', fontSize: 11 }}>&#10003;</span> {f}
                </li>
              ))}
            </ul>
            <Link href={`/marketplace/addon/${featured.slug}`} style={{
              display: 'inline-block', padding: '10px 24px', background: '#7ed957', color: '#020810',
              fontWeight: 700, borderRadius: 8, textDecoration: 'none', fontSize: 14,
            }}>View Details</Link>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: '#7ed957', marginBottom: 4 }}>{featured.priceLabel}</div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>Requires {featured.requiredPlan} plan</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {featured.integrations.map(i => (
                <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>{i}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ textAlign: 'center', padding: 'clamp(48px, 6vw, 80px) clamp(16px, 4vw, 24px)', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 'clamp(40px, 6vw, 60px)' }}>
        <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, marginBottom: 12 }}>Ready to get started?</h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>
          Install your first add-on in seconds. No contracts, cancel anytime.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/login" style={{ padding: '12px 28px', background: '#7ed957', color: '#020810', fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontSize: 15 }}>Start Free</Link>
          <a href="mailto:mike@rocketopp.com" style={{ padding: '12px 28px', background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 600, borderRadius: 10, textDecoration: 'none', fontSize: 15, border: '1px solid rgba(255,255,255,0.08)' }}>Contact Sales</a>
        </div>
      </section>
    </>
  )
}
