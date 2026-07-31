import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import AnimatedGrid from '@/components/animated-grid'

export const metadata: Metadata = {
  title: 'Use Cases — 0nCore AI Platform',
  description: 'Discover how businesses use 0nCore to build SaaS products, automate workflows, embed AI tools, and scale operations. Real use cases, real results.',
  openGraph: { title: '0nCore Use Cases', description: 'See what you can build with 1,554 AI tools and full CRM automation.', url: 'https://0ncore.com/use-cases' },
  alternates: { canonical: 'https://0ncore.com/use-cases' },
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const CATEGORY_COLORS: Record<string, string> = {
  Platform: '#7ed957', Marketing: '#00B4FF', Healthcare: '#ef4444', Agency: '#8b5cf6',
  'E-Commerce': '#f59e0b', 'Real Estate': '#14b8a6', Legal: '#ec4899', SaaS: '#7ed957',
  Education: '#00B4FF', Finance: '#f59e0b', Automation: '#8b5cf6', AI: '#7ed957',
}

export const revalidate = 3600

export default async function UseCasesPage() {
  const { data: useCases } = await admin
    .from('use_cases')
    .select('id, slug, title, subtitle, category, description, metrics, featured, created_at')
    .eq('status', 'published')
    .order('featured', { ascending: false })
    .order('sort_order', { ascending: true })

  const cases = useCases || []
  const categories = [...new Set(cases.map(c => c.category))]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '0nCore Use Cases',
    description: 'How businesses use 0nCore to build and scale.',
    url: 'https://0ncore.com/use-cases',
    mainEntity: cases.map(c => ({
      '@type': 'Article',
      name: c.title,
      description: c.description,
      url: `https://0ncore.com/use-cases/${c.slug}`,
    })),
  }

  return (
    <div style={{ background: '#020810', color: '#fff', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(10px, 2vw, 14px) clamp(16px, 4vw, 32px)', background: 'rgba(2,8,16,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/brand/0ncore-logo-dark.png" alt="0nCore" style={{ height: 28, objectFit: 'contain' }} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/platform" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Platform</Link>
          <Link href="/use-cases" style={{ fontSize: 13, color: '#7ed957', textDecoration: 'none', fontWeight: 600 }}>Use Cases</Link>
          <Link href="/pricing" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Pricing</Link>
          <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: '#020810', background: '#7ed957', padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <AnimatedGrid />
        <div aria-hidden style={{ pointerEvents: 'none', position: 'absolute', top: -120, left: '20%', height: 480, width: 480, borderRadius: '50%', background: 'rgba(126,217,87,0.07)', filter: 'blur(150px)' }} />
        <div aria-hidden style={{ pointerEvents: 'none', position: 'absolute', top: '10%', right: '10%', height: 380, width: 380, borderRadius: '50%', background: 'rgba(0,212,255,0.05)', filter: 'blur(130px)' }} />
        <div style={{ position: 'relative', textAlign: 'center', padding: 'clamp(60px, 10vw, 100px) clamp(16px, 4vw, 24px) clamp(40px, 6vw, 60px)', maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10, fontWeight: 700, color: '#7ed957', background: 'rgba(126,217,87,0.08)', padding: '5px 16px', borderRadius: 20, border: '1px solid rgba(126,217,87,0.3)', marginBottom: 20, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            <span style={{ position: 'relative', display: 'inline-flex', height: 8, width: 8 }}>
              <span style={{ position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '50%', background: '#7ed957', opacity: 0.7, animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite' }} />
              <span style={{ position: 'relative', display: 'inline-flex', height: 8, width: 8, borderRadius: '50%', background: '#7ed957' }} />
            </span>
            {cases.length} Use Cases · Updated Daily
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 16px' }}>
            What Will You{' '}
            <span style={{ backgroundImage: 'linear-gradient(135deg, #7ed957, #00d4ff, #a78bfa)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Build</span>?
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto' }}>
            Real use cases from businesses using 0nCore to automate, scale, and launch products. New use cases generated daily with SXO optimization.
          </p>
        </div>
      </section>

      {/* Category pills */}
      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', padding: '0 clamp(16px, 4vw, 24px) 32px', maxWidth: 800, margin: '0 auto' }}>
          {categories.map(cat => (
            <span key={cat} style={{
              padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: `${CATEGORY_COLORS[cat] || '#6b7280'}15`,
              color: CATEGORY_COLORS[cat] || '#6b7280',
              border: `1px solid ${CATEGORY_COLORS[cat] || '#6b7280'}30`,
            }}>{cat}</span>
          ))}
        </div>
      )}

      {/* Use case grid */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(16px, 4vw, 24px) 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {cases.map(c => {
            const color = CATEGORY_COLORS[c.category] || '#6b7280'
            const metrics = (c.metrics as { value: string; label: string }[]) || []
            return (
              <Link key={c.id} href={`/use-cases/${c.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16, padding: 'clamp(20px, 3vw, 28px)', transition: 'border-color 0.2s, transform 0.2s',
                  cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}15`, padding: '3px 10px', borderRadius: 10, border: `1px solid ${color}30` }}>
                      {c.category}
                    </span>
                    {c.featured && <span style={{ fontSize: 9, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 8 }}>FEATURED</span>}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>{c.title}</h3>
                  {c.subtitle && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16, lineHeight: 1.5, flex: 1 }}>{c.subtitle}</p>}
                  {metrics.length > 0 && (
                    <div style={{ display: 'flex', gap: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14, marginTop: 'auto' }}>
                      {metrics.slice(0, 3).map((m, i) => (
                        <div key={i}>
                          <div style={{ fontSize: 16, fontWeight: 800, color }}>{m.value}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: 'clamp(16px, 3vw, 24px) clamp(16px, 4vw, 32px)', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>© 2026 RocketOpp LLC. Powered by 0nMCP. New use cases generated daily.</span>
      </footer>
    </div>
  )
}
