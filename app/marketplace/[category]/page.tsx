import type { Metadata } from 'next'
import Link from 'next/link'
import { CATEGORIES, ADDONS, getAddonsByCategory, getCategoryBySlug } from '@/lib/marketplace-data'

export function generateStaticParams() {
  return [...CATEGORIES.map(c => ({ category: c.slug })), { category: 'all' }]
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params
  if (category === 'all') {
    return {
      title: 'All Add-ons — 0nCore Marketplace',
      description: `Browse all ${ADDONS.length} AI-powered add-ons for your CRM. Social automation, voice AI, payments, analytics, and more.`,
    }
  }
  const cat = getCategoryBySlug(category)
  if (!cat) {
    return { title: '0nCore Marketplace' }
  }
  return {
    title: `${cat.name} Add-ons — 0nCore Marketplace`,
    description: `${cat.description} ${cat.count} add-ons available.`,
    openGraph: {
      title: `${cat.name} Add-ons — 0nCore Marketplace`,
      description: cat.description,
      url: `https://0ncore.com/marketplace/${cat.slug}`,
    },
  }
}

const CAT_COLORS: Record<string, string> = {}
CATEGORIES.forEach(c => { CAT_COLORS[c.slug] = c.color })

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  const isAll = category === 'all'
  const cat = isAll ? null : getCategoryBySlug(category)
  const addons = getAddonsByCategory(category)

  const title = isAll ? 'All Add-ons' : cat?.name || 'Category'
  const description = isAll
    ? `All ${ADDONS.length} AI-powered add-ons for your CRM.`
    : cat?.description || ''

  return (
    <>
      {/* JSON-LD Breadcrumb */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Marketplace', item: 'https://0ncore.com/marketplace' },
              { '@type': 'ListItem', position: 2, name: title, item: `https://0ncore.com/marketplace/${category}` },
            ],
          })
        }}
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(24px, 4vw, 40px) clamp(16px, 4vw, 24px)' }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 24 }}>
          <Link href="/marketplace" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Marketplace</Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{title}</span>
        </nav>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32 }} className="mp-category-grid">
          {/* Main content */}
          <div>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 800, margin: '0 0 8px' }}>
                {title}
              </h1>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', lineHeight: 1.6 }}>{description}</p>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>{addons.length} add-on{addons.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Add-on Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {addons.map(addon => {
                const primaryCat = CATEGORIES.find(c => c.slug === addon.categories[0])
                return (
                  <Link key={addon.slug} href={`/marketplace/addon/${addon.slug}`} style={{
                    borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.02)', padding: 24,
                    display: 'flex', flexDirection: 'column', textDecoration: 'none', color: '#fff',
                    transition: 'border-color 0.2s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: primaryCat?.color || '#7ed957',
                      }}>{primaryCat?.name || addon.categories[0]}</span>
                      {addon.badge && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(126,217,87,0.1)', color: '#7ed957' }}>{addon.badge}</span>
                      )}
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>{addon.name}</h3>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: '0 0 12px', flex: 1 }}>{addon.shortDesc}</p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
                      {addon.features.slice(0, 3).map(f => (
                        <li key={f} style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: '#7ed957', fontSize: 10 }}>&#10003;</span> {f}
                        </li>
                      ))}
                    </ul>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: 20, fontWeight: 700 }}>{addon.priceLabel}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 8, background: 'rgba(126,217,87,0.1)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)' }}>
                        View Details
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Sidebar (rendered below grid on mobile, beside on desktop via CSS) */}
          <aside className="mp-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Category Nav */}
            <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', padding: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Categories</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Link href="/marketplace/all" style={{
                  fontSize: 13, padding: '6px 10px', borderRadius: 6, textDecoration: 'none',
                  color: isAll ? '#7ed957' : 'rgba(255,255,255,0.5)',
                  background: isAll ? 'rgba(126,217,87,0.08)' : 'transparent',
                }}>All Add-ons ({ADDONS.length})</Link>
                {CATEGORIES.map(c => (
                  <Link key={c.slug} href={`/marketplace/${c.slug}`} style={{
                    fontSize: 13, padding: '6px 10px', borderRadius: 6, textDecoration: 'none',
                    color: category === c.slug ? '#7ed957' : 'rgba(255,255,255,0.5)',
                    background: category === c.slug ? 'rgba(126,217,87,0.08)' : 'transparent',
                  }}>{c.name} ({c.count})</Link>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div style={{ borderRadius: 16, border: '1px solid rgba(126,217,87,0.15)', background: 'linear-gradient(135deg, rgba(126,217,87,0.04) 0%, transparent 100%)', padding: 20, textAlign: 'center' }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px' }}>Need help choosing?</h4>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 12px', lineHeight: 1.5 }}>Tell us about your business and we will recommend the right add-ons.</p>
              <a href="mailto:mike@rocketopp.com" style={{
                display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 8,
                background: 'rgba(126,217,87,0.1)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)',
                textDecoration: 'none',
              }}>Contact Us</a>
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .mp-category-grid { grid-template-columns: 1fr 260px !important; }
          .mp-sidebar { position: sticky; top: 88px; align-self: start; }
        }
      `}</style>
    </>
  )
}
