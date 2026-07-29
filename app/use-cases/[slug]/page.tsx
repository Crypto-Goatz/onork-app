import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { data } = await admin.from('use_cases').select('title, meta_title, meta_description, description, slug').eq('slug', slug).eq('status', 'published').single()
  if (!data) return { title: 'Use Case Not Found' }
  return {
    title: data.meta_title || `${data.title} — 0nCore`,
    description: data.meta_description || data.description,
    openGraph: { title: data.meta_title || data.title, description: data.meta_description || data.description, url: `https://0ncore.com/use-cases/${data.slug}` },
    alternates: { canonical: `https://0ncore.com/use-cases/${data.slug}` },
  }
}

export default async function UseCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: uc } = await admin.from('use_cases').select('*').eq('slug', slug).eq('status', 'published').single()
  if (!uc) notFound()

  const howItWorks = (uc.how_it_works || []) as { step: number; title: string; description: string }[]
  const features = (uc.features || []) as { title: string; description: string }[]
  const metrics = (uc.metrics || []) as { value: string; label: string; detail?: string }[]
  const testimonial = uc.testimonial as { quote: string; author: string; role: string } | null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: uc.title,
    description: uc.description,
    url: `https://0ncore.com/use-cases/${uc.slug}`,
    author: { '@type': 'Organization', name: 'RocketOpp LLC', url: 'https://rocketopp.com' },
    publisher: { '@type': 'Organization', name: '0nCore', url: 'https://0ncore.com' },
    datePublished: uc.created_at,
    dateModified: uc.updated_at,
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to ${uc.title}`,
    step: howItWorks.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.description,
    })),
  }

  return (
    <div style={{ background: '#020810', color: '#fff', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(10px, 2vw, 14px) clamp(16px, 4vw, 32px)', background: 'rgba(2,8,16,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/brand/0ncore-logo-dark.png" alt="0nCore" style={{ height: 28, objectFit: 'contain' }} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/use-cases" style={{ fontSize: 13, color: '#6EE05A', textDecoration: 'none', fontWeight: 600 }}>Use Cases</Link>
          <Link href="/pricing" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Pricing</Link>
          <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: '#020810', background: '#7ed957', padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>Get Started</Link>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px clamp(16px, 4vw, 24px) 0' }}>
        <div style={{ display: 'flex', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
          <span>/</span>
          <Link href="/use-cases" style={{ color: 'inherit', textDecoration: 'none' }}>Use Cases</Link>
          <span>/</span>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{uc.title}</span>
        </div>
      </div>

      {/* Hero */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(40px, 6vw, 60px) clamp(16px, 4vw, 24px)' }}>
        <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: '#6EE05A', background: 'rgba(110,224,90,0.08)', padding: '4px 14px', borderRadius: 20, border: '1px solid rgba(110,224,90,0.15)', marginBottom: 16, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {uc.category}
        </span>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, margin: '0 0 12px' }}>
          {uc.title}
        </h1>
        {uc.subtitle && <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: '0 0 24px' }}>{uc.subtitle}</p>}

        {/* Metrics bar */}
        {metrics.length > 0 && (
          <div style={{ display: 'flex', gap: 'clamp(16px, 4vw, 32px)', flexWrap: 'wrap', padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 40 }}>
            {metrics.map((m, i) => (
              <div key={i}>
                <div style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, color: '#6EE05A' }}>{m.value}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{m.label}</div>
                {m.detail && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{m.detail}</div>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Problem / Solution */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 clamp(16px, 4vw, 24px) 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          <div style={{ padding: 24, borderRadius: 16, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>The Problem</div>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>{uc.problem}</p>
          </div>
          <div style={{ padding: 24, borderRadius: 16, background: 'rgba(110,224,90,0.04)', border: '1px solid rgba(110,224,90,0.1)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6EE05A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>The Solution</div>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>{uc.solution}</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      {howItWorks.length > 0 && (
        <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 clamp(16px, 4vw, 24px) 60px' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, marginBottom: 32 }}>How It Works</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {howItWorks.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(110,224,90,0.1)', border: '1px solid rgba(110,224,90,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#6EE05A', flexShrink: 0 }}>
                  {s.step || i + 1}
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      {features.length > 0 && (
        <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 clamp(16px, 4vw, 24px) 60px' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, marginBottom: 32 }}>What You Get</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {features.map((f, i) => (
              <div key={i} style={{ padding: 20, borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{f.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Testimonial */}
      {testimonial && (
        <section style={{ maxWidth: 700, margin: '0 auto', padding: '0 clamp(16px, 4vw, 24px) 60px', textAlign: 'center' }}>
          <div style={{ padding: 32, borderRadius: 20, background: 'rgba(110,224,90,0.03)', border: '1px solid rgba(110,224,90,0.08)' }}>
            <p style={{ fontSize: 18, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 16 }}>
              &ldquo;{testimonial.quote}&rdquo;
            </p>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{testimonial.author}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{testimonial.role}</div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 clamp(16px, 4vw, 24px) 80px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, marginBottom: 12 }}>Ready to Build?</h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>
          {uc.description.slice(0, 120)}...
        </p>
        <Link href={uc.cta_url || '/login'} style={{
          display: 'inline-block', padding: '14px 32px', background: '#7ed957', color: '#020810',
          fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontSize: 15,
          boxShadow: '0 0 30px rgba(126,217,87,0.3)',
        }}>{uc.cta_text || 'Get Started'}</Link>
      </section>

      <footer style={{ padding: 'clamp(16px, 3vw, 24px) clamp(16px, 4vw, 32px)', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>© 2026 RocketOpp LLC. Powered by 0nMCP.</span>
      </footer>
    </div>
  )
}
