import type { Metadata } from 'next'
import Link from 'next/link'
import { ADDONS, CATEGORIES, getAddonBySlug, getRelatedAddons } from '@/lib/marketplace-data'
import { AddToCartButton } from './add-to-cart'

export function generateStaticParams() {
  return ADDONS.map(a => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const addon = getAddonBySlug(slug)
  if (!addon) return { title: '0nCore Marketplace' }
  return {
    title: `${addon.name} — 0nCore Marketplace Add-on`,
    description: addon.shortDesc,
    openGraph: {
      title: `${addon.name} — 0nCore Marketplace`,
      description: addon.shortDesc,
      url: `https://0ncore.com/marketplace/addon/${addon.slug}`,
    },
  }
}

const PLAN_COLORS: Record<string, string> = {
  free: '#7ed957',
  starter: '#00d4ff',
  professional: '#a78bfa',
  unlimited: '#f97316',
}

export default async function AddonDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const addon = getAddonBySlug(slug)

  if (!addon) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Add-on not found</h1>
        <Link href="/marketplace" style={{ color: '#7ed957', textDecoration: 'none', fontSize: 14, marginTop: 16, display: 'inline-block' }}>Back to Marketplace</Link>
      </div>
    )
  }

  const primaryCat = CATEGORIES.find(c => c.slug === addon.categories[0])
  const related = getRelatedAddons(addon)

  const STEPS = [
    { num: '1', title: 'Install', desc: `Add ${addon.name} to your 0nCore account from the marketplace.` },
    { num: '2', title: 'Connect', desc: 'The add-on auto-connects to your CRM sub-location. No manual setup.' },
    { num: '3', title: 'Use It', desc: 'Access the capability from your dashboard, chat, or automations.' },
  ]

  return (
    <>
      {/* JSON-LD Product */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: addon.name,
            description: addon.shortDesc,
            url: `https://0ncore.com/marketplace/addon/${addon.slug}`,
            brand: { '@type': 'Organization', name: '0nCore', url: 'https://0ncore.com' },
            offers: {
              '@type': 'Offer',
              price: (addon.price / 100).toFixed(2),
              priceCurrency: 'USD',
              availability: 'https://schema.org/InStock',
              url: `https://0ncore.com/marketplace/addon/${addon.slug}`,
            },
          })
        }}
      />
      {/* JSON-LD Breadcrumb */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Marketplace', item: 'https://0ncore.com/marketplace' },
              { '@type': 'ListItem', position: 2, name: primaryCat?.name || addon.categories[0], item: `https://0ncore.com/marketplace/${addon.categories[0]}` },
              { '@type': 'ListItem', position: 3, name: addon.name, item: `https://0ncore.com/marketplace/addon/${addon.slug}` },
            ],
          })
        }}
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(24px, 4vw, 40px) clamp(16px, 4vw, 24px)' }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 24 }}>
          <Link href="/marketplace" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Marketplace</Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <Link href={`/marketplace/${addon.categories[0]}`} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>{primaryCat?.name || addon.categories[0]}</Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{addon.name}</span>
        </nav>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32 }} className="mp-detail-grid">
          {/* Main Content */}
          <div>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                {addon.categories.map(catSlug => {
                  const c = CATEGORIES.find(cat => cat.slug === catSlug)
                  return (
                    <Link key={catSlug} href={`/marketplace/${catSlug}`} style={{
                      fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 12,
                      background: `${c?.color || '#7ed957'}15`, color: c?.color || '#7ed957',
                      border: `1px solid ${c?.color || '#7ed957'}25`, textDecoration: 'none',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>{c?.name || catSlug}</Link>
                  )
                })}
                {addon.badge && (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: 'rgba(126,217,87,0.12)', color: '#7ed957' }}>{addon.badge}</span>
                )}
              </div>
              <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{addon.name}</h1>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0 }}>{addon.longDesc}</p>
            </div>

            {/* What it does */}
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>What it does</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {addon.features.map(f => (
                  <li key={f} style={{
                    fontSize: 14, color: 'rgba(255,255,255,0.6)', padding: '8px 0',
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}>
                    <span style={{ color: '#7ed957', fontSize: 14, marginTop: 1, flexShrink: 0 }}>&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
            </section>

            {/* Capabilities */}
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>Capabilities required</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {addon.capabilities.map(cap => (
                  <span key={cap} style={{
                    fontSize: 11, fontWeight: 500, padding: '5px 12px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace',
                  }}>{cap}</span>
                ))}
              </div>
            </section>

            {/* How it works */}
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>How it works</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {STEPS.map(s => (
                  <div key={s.num} style={{ padding: 20, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#7ed957', marginBottom: 8 }}>{s.num}</div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>{s.title}</h4>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Integrations */}
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>Integrations</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {addon.integrations.map(i => (
                  <span key={i} style={{
                    fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8,
                    background: 'rgba(126,217,87,0.06)', border: '1px solid rgba(126,217,87,0.12)',
                    color: 'rgba(255,255,255,0.6)',
                  }}>{i}</span>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="mp-detail-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Price Card */}
            <div style={{
              borderRadius: 16, border: '1px solid rgba(126,217,87,0.15)',
              background: 'linear-gradient(135deg, rgba(126,217,87,0.04) 0%, rgba(2,8,16,1) 100%)',
              padding: 24,
            }}>
              <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 4 }}>{addon.priceLabel}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
                  background: `${PLAN_COLORS[addon.requiredPlan]}15`,
                  color: PLAN_COLORS[addon.requiredPlan],
                  border: `1px solid ${PLAN_COLORS[addon.requiredPlan]}25`,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>Requires {addon.requiredPlan}</span>
              </div>
              <AddToCartButton slug={addon.slug} name={addon.name} price={addon.price} priceLabel={addon.priceLabel} />
              <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0' }}>
                {addon.features.slice(0, 4).map(f => (
                  <li key={f} style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#7ed957', fontSize: 10 }}>&#10003;</span> {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Category Nav */}
            <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', padding: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Categories</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {CATEGORIES.map(c => (
                  <Link key={c.slug} href={`/marketplace/${c.slug}`} style={{
                    fontSize: 13, padding: '6px 10px', borderRadius: 6, textDecoration: 'none',
                    color: addon.categories.includes(c.slug) ? '#7ed957' : 'rgba(255,255,255,0.5)',
                    background: addon.categories.includes(c.slug) ? 'rgba(126,217,87,0.08)' : 'transparent',
                  }}>{c.name} ({c.count})</Link>
                ))}
              </div>
            </div>

            {/* Related Add-ons */}
            {related.length > 0 && (
              <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', padding: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Related Add-ons</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {related.slice(0, 4).map(r => (
                    <Link key={r.slug} href={`/marketplace/addon/${r.slug}`} style={{
                      padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none', color: '#fff',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{r.priceLabel}</span>
                        <span style={{ color: '#7ed957' }}>&rarr;</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Custom CTA */}
            <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', padding: 20, textAlign: 'center' }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px' }}>Need a custom solution?</h4>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 12px', lineHeight: 1.5 }}>We build custom add-ons for enterprise teams.</p>
              <a href="mailto:mike@rocketopp.com" style={{
                display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 8,
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)',
                textDecoration: 'none',
              }}>Contact Us</a>
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .mp-detail-grid { grid-template-columns: 1fr 300px !important; }
          .mp-detail-sidebar { position: sticky; top: 88px; align-self: start; }
        }
      `}</style>
    </>
  )
}
