import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params
  const { data } = await admin.from('blog_categories').select('name, description').eq('slug', category).single()
  if (!data) return { title: 'Category Not Found' }
  return {
    title: `${data.name} — 0nCore Blog`,
    description: data.description,
    alternates: { canonical: `https://0ncore.com/blog/${category}` },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  const [{ data: cat }, { data: posts }] = await Promise.all([
    admin.from('blog_categories').select('*').eq('slug', category).single(),
    admin.from('blog_posts').select('id, slug, title, subtitle, excerpt, category_slug, published_at, reading_time, author_name').eq('category_slug', category).eq('status', 'published').order('published_at', { ascending: false }),
  ])

  if (!cat) notFound()

  return (
    <div style={{ background: '#020810', color: '#fff', minHeight: '100vh' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(10px, 2vw, 14px) clamp(16px, 4vw, 32px)', background: 'rgba(2,8,16,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Link href="/" style={{ textDecoration: 'none' }}><img src="/brand/0ncore-logo-dark.png" alt="0nCore" style={{ height: 28, objectFit: 'contain' }} /></Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/blog" style={{ fontSize: 13, color: '#6EE05A', textDecoration: 'none', fontWeight: 600 }}>Blog</Link>
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

      <section style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(30px, 5vw, 50px) clamp(16px, 4vw, 24px)' }}>
        <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: cat.color, background: `${cat.color}15`, padding: '4px 14px', borderRadius: 20, border: `1px solid ${cat.color}30`, marginBottom: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {(posts || []).length} articles
        </span>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' }}>{cat.name}</h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{cat.description}</p>
      </section>

      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 clamp(16px, 4vw, 24px) 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(posts || []).map(post => (
            <Link key={post.id} href={`/blog/${category}/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <article style={{ padding: '20px 24px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', transition: 'border-color 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{post.reading_time} min read</span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{post.title}</h2>
                {post.subtitle && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, margin: 0 }}>{post.subtitle}</p>}
              </article>
            </Link>
          ))}
          {(posts || []).length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No articles in this category yet. Check back soon.</div>
          )}
        </div>
      </section>
    </div>
  )
}
