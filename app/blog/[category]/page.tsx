import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCategories, getCategory, getPostsByCategory } from '@/lib/blog/data'

export const revalidate = 3600

// Pre-render the categories that actually have published posts, so a crawler
// arriving from the sitemap gets HTML rather than a cold render.
export async function generateStaticParams() {
  const cats = await getCategories()
  return cats.map(c => ({ category: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params
  const cat = await getCategory(category)
  if (!cat) return { title: 'Category Not Found' }
  return {
    title: `${cat.name} — 0nCore Blog`,
    description: cat.description,
    openGraph: { title: `${cat.name} — 0nCore Blog`, description: cat.description, url: `https://www.0ncore.com/blog/${category}` },
    alternates: { canonical: `https://www.0ncore.com/blog/${category}` },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  const [cat, posts] = await Promise.all([getCategory(category), getPostsByCategory(category)])

  if (!cat) notFound()

  return (
    <div style={{ background: '#020810', color: '#fff', minHeight: '100vh' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(10px, 2vw, 14px) clamp(16px, 4vw, 32px)', background: 'rgba(2,8,16,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Link href="/" style={{ textDecoration: 'none' }}><img src="/brand/0ncore-logo-dark.png" alt="0nCore" style={{ height: 28, objectFit: 'contain' }} /></Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/blog" style={{ fontSize: 13, color: '#7ed957', textDecoration: 'none', fontWeight: 600 }}>Blog</Link>
          <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: '#020810', background: '#7ed957', padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>Get Started</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px clamp(16px, 4vw, 24px) 0' }}>
        <div style={{ display: 'flex', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link><span>/</span>
          <Link href="/blog" style={{ color: 'inherit', textDecoration: 'none' }}>Blog</Link><span>/</span>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{cat.name}</span>
        </div>
      </div>

      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', top: -140, left: '6%', width: 520, height: 520, borderRadius: '50%', background: 'rgba(126,217,87,0.06)', filter: 'blur(150px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto', padding: 'clamp(30px, 5vw, 50px) clamp(16px, 4vw, 24px)' }}>
          <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: cat.color, background: `${cat.color}15`, padding: '4px 14px', borderRadius: 20, border: `1px solid ${cat.color}30`, marginBottom: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {posts.length} articles
          </span>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
            <span style={{ background: 'linear-gradient(135deg, #7ed957, #00d4ff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{cat.name}</span>
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{cat.description}</p>
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 clamp(16px, 4vw, 24px) 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {posts.map(post => (
            <Link key={post.id} href={`/blog/${category}/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <article style={{ padding: '20px 24px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', transition: 'border-color 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{post.readingTime} min read</span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{post.title}</h2>
                {post.excerpt && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, margin: 0 }}>{post.excerpt}</p>}
              </article>
            </Link>
          ))}
          {posts.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No articles in this category yet. Check back soon.</div>
          )}
        </div>
      </section>
    </div>
  )
}
