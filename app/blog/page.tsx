import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const metadata: Metadata = {
  title: 'Blog — 0nCore AI Platform',
  description: 'Insights on AI automation, CRM strategy, SEO, HIPAA compliance, SaaS building, and the MCP ecosystem. New articles daily.',
  openGraph: { title: '0nCore Blog', description: 'AI automation insights, CRM strategy, and SaaS building guides.', url: 'https://0ncore.com/blog' },
  alternates: { canonical: 'https://0ncore.com/blog' },
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
export const revalidate = 3600

export default async function BlogPage() {
  const [{ data: categories }, { data: recentPosts }] = await Promise.all([
    admin.from('blog_categories').select('*').order('sort_order'),
    admin.from('blog_posts').select('id, slug, title, subtitle, category_slug, excerpt, published_at, reading_time, author_name').eq('status', 'published').order('published_at', { ascending: false }).limit(6),
  ])

  const cats = categories || []
  const recent = recentPosts || []

  // Count posts per category
  const { data: counts } = await admin.from('blog_posts').select('category_slug').eq('status', 'published')
  const countMap: Record<string, number> = {}
  for (const c of counts || []) { countMap[c.category_slug] = (countMap[c.category_slug] || 0) + 1 }

  return (
    <div style={{ background: '#020810', color: '#fff', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Blog', name: '0nCore Blog', url: 'https://0ncore.com/blog',
        publisher: { '@type': 'Organization', name: '0nCore', url: 'https://0ncore.com' },
      }) }} />

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(10px, 2vw, 14px) clamp(16px, 4vw, 32px)', background: 'rgba(2,8,16,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Link href="/" style={{ textDecoration: 'none' }}><img src="/brand/0ncore-logo.png" alt="0nCore" style={{ height: 28, objectFit: 'contain' }} /></Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/use-cases" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Use Cases</Link>
          <Link href="/blog" style={{ fontSize: 13, color: '#6EE05A', textDecoration: 'none', fontWeight: 600 }}>Blog</Link>
          <Link href="/pricing" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Pricing</Link>
          <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: '#020810', background: '#7ed957', padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: 'clamp(50px, 8vw, 80px) clamp(16px, 4vw, 24px) clamp(30px, 4vw, 50px)', maxWidth: 700, margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 12px' }}>
          The 0nCore <span style={{ color: '#6EE05A' }}>Blog</span>
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
          AI automation, CRM strategy, compliance, and building on the 0nMCP ecosystem. New content daily.
        </p>
      </section>

      {/* Categories Grid */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(16px, 4vw, 24px) 50px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>Categories</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {cats.map(cat => (
            <Link key={cat.slug} href={`/blog/${cat.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                padding: '20px 24px', borderRadius: 14,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                transition: 'border-color 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700 }}>{cat.name}</h3>
                  <span style={{ fontSize: 11, fontWeight: 700, color: cat.color, background: `${cat.color}15`, padding: '2px 8px', borderRadius: 8 }}>
                    {countMap[cat.slug] || 0}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>{cat.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Posts */}
      {recent.length > 0 && (
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(16px, 4vw, 24px) 80px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>Latest Articles</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {recent.map(post => (
              <Link key={post.id} href={`/blog/${post.category_slug}/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <article style={{
                  padding: 24, borderRadius: 14, height: '100%',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#6EE05A', textTransform: 'uppercase' }}>{post.category_slug.replace(/-/g, ' ')}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{post.reading_time} min read</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3, marginBottom: 8 }}>{post.title}</h3>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, flex: 1 }}>{post.excerpt?.slice(0, 140)}...</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{post.author_name}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer style={{ padding: '16px clamp(16px, 4vw, 32px)', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>© 2026 RocketOpp LLC. New articles generated daily.</span>
      </footer>
    </div>
  )
}
