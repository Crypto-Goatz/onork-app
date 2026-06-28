import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ category: string; slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { data } = await admin.from('blog_posts').select('title, meta_title, meta_description, category_slug, slug').eq('slug', slug).eq('status', 'published').single()
  if (!data) return { title: 'Post Not Found' }
  return {
    title: data.meta_title || `${data.title} — 0nCore Blog`,
    description: data.meta_description,
    openGraph: {
      title: data.meta_title || data.title, description: data.meta_description || '',
      url: `https://0ncore.com/blog/${data.category_slug}/${data.slug}`, type: 'article',
      images: [{ url: `https://0ncore.com/api/og/blog/${data.slug}`, width: 1200, height: 310, alt: data.title }],
    },
    alternates: { canonical: `https://0ncore.com/blog/${data.category_slug}/${data.slug}` },
  }
}

// Simple markdown-ish renderer (handles ## headers, | tables, **bold**, *italic*, `code`, [links], ---, lists)
function renderContent(md: string): string {
  return md
    .split('\n\n')
    .map(block => {
      block = block.trim()
      if (!block) return ''

      // Headers
      if (block.startsWith('## ')) return `<h2 style="font-size:24px;font-weight:800;margin:32px 0 12px;letter-spacing:-0.02em;">${block.slice(3)}</h2>`
      if (block.startsWith('### ')) return `<h3 style="font-size:18px;font-weight:700;margin:24px 0 8px;">${block.slice(4)}</h3>`

      // HR
      if (block === '---') return '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:32px 0;" />'

      // Table
      if (block.includes('|') && block.includes('---')) {
        const rows = block.split('\n').filter(r => r.trim() && !r.includes('---'))
        const header = rows[0]?.split('|').map(c => c.trim()).filter(Boolean)
        const body = rows.slice(1).map(r => r.split('|').map(c => c.trim()).filter(Boolean))
        return `<div style="overflow-x:auto;margin:16px 0;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr>${(header || []).map(h => `<th style="text-align:left;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">${h}</th>`).join('')}</tr></thead><tbody>${body.map(row => `<tr>${row.map(cell => `<td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.04);color:rgba(255,255,255,0.7);">${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
      }

      // Ordered list
      if (/^\d+\.\s/.test(block)) {
        const items = block.split('\n').map(l => l.replace(/^\d+\.\s*/, ''))
        return `<ol style="padding-left:20px;margin:12px 0;display:flex;flex-direction:column;gap:8px;">${items.map(i => `<li style="font-size:15px;color:rgba(255,255,255,0.65);line-height:1.7;">${inline(i)}</li>`).join('')}</ol>`
      }

      // Unordered list
      if (block.startsWith('- ')) {
        const items = block.split('\n').map(l => l.replace(/^-\s*/, ''))
        return `<ul style="padding-left:20px;margin:12px 0;display:flex;flex-direction:column;gap:6px;">${items.map(i => `<li style="font-size:15px;color:rgba(255,255,255,0.65);line-height:1.7;">${inline(i)}</li>`).join('')}</ul>`
      }

      // Paragraph
      return `<p style="font-size:15px;color:rgba(255,255,255,0.65);line-height:1.8;margin:12px 0;">${inline(block)}</p>`
    })
    .join('')
}

function inline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f0f4f8;font-weight:600;">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(126,217,87,0.08);padding:1px 5px;border-radius:4px;font-size:13px;color:#7ed957;">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#7ed957;text-decoration:underline;">$1</a>')
}

export default async function BlogPostPage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params
  const { data: post } = await admin.from('blog_posts').select('*').eq('slug', slug).eq('status', 'published').single()
  if (!post) notFound()

  const { data: cat } = await admin.from('blog_categories').select('name, color').eq('slug', category).single()

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: post.title, description: post.meta_description || post.excerpt,
    url: `https://0ncore.com/blog/${category}/${slug}`,
    datePublished: post.published_at, dateModified: post.updated_at,
    author: { '@type': 'Person', name: post.author_name },
    publisher: { '@type': 'Organization', name: '0nCore', url: 'https://0ncore.com', logo: { '@type': 'ImageObject', url: 'https://0ncore.com/brand/0ncore-logo.png' } },
    image: `https://0ncore.com/api/og/blog/${slug}`,
    wordCount: post.content?.split(/\s+/).length || 0,
    timeRequired: `PT${post.reading_time}M`,
  }

  return (
    <div style={{ background: '#020810', color: '#fff', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(10px, 2vw, 14px) clamp(16px, 4vw, 32px)', background: 'rgba(2,8,16,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Link href="/" style={{ textDecoration: 'none' }}><img src="/brand/0ncore-logo.png" alt="0nCore" style={{ height: 28, objectFit: 'contain' }} /></Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/blog" style={{ fontSize: 13, color: '#7ed957', textDecoration: 'none', fontWeight: 600 }}>Blog</Link>
          <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: '#020810', background: '#7ed957', padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero Image */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(16px, 3vw, 24px) clamp(16px, 4vw, 24px) 0' }}>
        <img
          src={`/api/og/blog/${slug}`}
          alt={post.title}
          style={{ width: '100%', height: 'auto', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}
        />
      </div>

      <article style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(24px, 4vw, 40px) clamp(16px, 4vw, 24px) 80px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 24 }}>
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link><span>/</span>
          <Link href="/blog" style={{ color: 'inherit', textDecoration: 'none' }}>Blog</Link><span>/</span>
          <Link href={`/blog/${category}`} style={{ color: 'inherit', textDecoration: 'none' }}>{cat?.name || category}</Link><span>/</span>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>{post.title.slice(0, 40)}...</span>
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: cat?.color || '#7ed957', background: `${cat?.color || '#7ed957'}15`, padding: '3px 10px', borderRadius: 10, border: `1px solid ${cat?.color || '#7ed957'}30`, textTransform: 'uppercase' }}>
            {cat?.name || category}
          </span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{post.reading_time} min read</span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, margin: '0 0 12px' }}>
          {post.title}
        </h1>
        {post.subtitle && <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: '0 0 32px' }}>{post.subtitle}</p>}

        {/* Author */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(126,217,87,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#7ed957' }}>
            {post.author_name?.charAt(0) || '0'}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{post.author_name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>0nCore</div>
          </div>
        </div>

        {/* Content */}
        <div dangerouslySetInnerHTML={{ __html: renderContent(post.content || '') }} />

        {/* CTA */}
        <div style={{ marginTop: 48, padding: 32, borderRadius: 20, background: 'linear-gradient(135deg, rgba(126,217,87,0.06), rgba(0,212,255,0.03), rgba(167,139,250,0.06))', border: '1px solid rgba(126,217,87,0.25)', backdropFilter: 'blur(12px)', textAlign: 'center' }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Ready to try 0nCore?</h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>1,554 tools. 96 services. One AI brain. Start free.</p>
          <Link href="/login" style={{ display: 'inline-block', padding: '12px 28px', background: '#7ed957', color: '#020810', fontWeight: 800, borderRadius: 12, textDecoration: 'none', fontSize: 15, boxShadow: '0 0 32px rgba(126,217,87,0.4)' }}>
            Get Started Free
          </Link>
        </div>
      </article>

      <footer style={{ padding: '16px clamp(16px, 4vw, 32px)', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>© 2026 RocketOpp LLC. Powered by 0nMCP.</span>
      </footer>
    </div>
  )
}
