import type { Metadata } from 'next'
import Link from 'next/link'
import { Check } from 'lucide-react'
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

      <main className="min-h-screen bg-[#020810] font-sans text-white antialiased">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          {/* Breadcrumb */}
          <nav className="mb-6 text-xs text-white/30">
            <Link href="/marketplace" className="text-white/40 transition-colors hover:text-[#7ed957]">Marketplace</Link>
            <span className="mx-2">/</span>
            <span className="text-white/60">{title}</span>
          </nav>

          <div className="grid grid-cols-1 gap-8 mp-category-grid">
            {/* Main content */}
            <div>
              {/* Header */}
              <div className="mb-8 space-y-3">
                <span className="inline-block rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/60">
                  Marketplace
                </span>
                <h1 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
                  <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
                    {title}
                  </span>
                </h1>
                <p className="max-w-2xl text-[15px] leading-relaxed text-white/45">{description}</p>
                <span className="block text-[13px] text-white/30">{addons.length} add-on{addons.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Add-on Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {addons.map(addon => {
                  const primaryCat = CATEGORIES.find(c => c.slug === addon.categories[0])
                  return (
                    <Link
                      key={addon.slug}
                      href={`/marketplace/addon/${addon.slug}`}
                      className="group flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-white no-underline backdrop-blur transition-colors hover:border-white/[0.18]"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                          style={{ color: primaryCat?.color || '#7ed957' }}
                        >{primaryCat?.name || addon.categories[0]}</span>
                        {addon.badge && (
                          <span className="rounded-md bg-[#7ed957]/10 px-2 py-0.5 text-[10px] font-semibold text-[#7ed957]">{addon.badge}</span>
                        )}
                      </div>
                      <h3 className="mb-1.5 text-base font-bold tracking-tight">{addon.name}</h3>
                      <p className="mb-3 flex-1 text-[13px] leading-relaxed text-white/45">{addon.shortDesc}</p>
                      <ul className="mb-4 list-none p-0">
                        {addon.features.slice(0, 3).map(f => (
                          <li key={f} className="flex items-center gap-1.5 py-0.5 text-xs text-white/50">
                            <Check className="h-3 w-3 flex-shrink-0 text-[#7ed957]" /> {f}
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                        <span className="text-xl font-bold">{addon.priceLabel}</span>
                        <span className="rounded-lg border border-[#7ed957]/20 bg-[#7ed957]/10 px-4 py-1.5 text-xs font-semibold text-[#7ed957] transition-colors group-hover:bg-[#7ed957]/15">
                          View Details
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Sidebar (rendered below grid on mobile, beside on desktop via CSS) */}
            <aside className="mp-sidebar flex flex-col gap-5">
              {/* Category Nav */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur">
                <h4 className="mb-3 font-mono text-[11px] font-bold uppercase tracking-widest text-white/50">Categories</h4>
                <div className="flex flex-col gap-1">
                  <Link
                    href="/marketplace/all"
                    className={`rounded-md px-2.5 py-1.5 text-[13px] no-underline transition-colors ${isAll ? 'bg-[#7ed957]/[0.08] text-[#7ed957]' : 'text-white/50 hover:text-white/80'}`}
                  >All Add-ons ({ADDONS.length})</Link>
                  {CATEGORIES.map(c => (
                    <Link
                      key={c.slug}
                      href={`/marketplace/${c.slug}`}
                      className={`rounded-md px-2.5 py-1.5 text-[13px] no-underline transition-colors ${category === c.slug ? 'bg-[#7ed957]/[0.08] text-[#7ed957]' : 'text-white/50 hover:text-white/80'}`}
                    >{c.name} ({c.count})</Link>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="rounded-2xl border border-[#7ed957]/[0.15] bg-gradient-to-br from-[#7ed957]/[0.05] to-transparent p-5 text-center backdrop-blur">
                <h4 className="mb-1.5 text-sm font-bold">Need help choosing?</h4>
                <p className="mb-3 text-xs leading-relaxed text-white/45">Tell us about your business and we will recommend the right add-ons.</p>
                <a
                  href="mailto:mike@rocketopp.com"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#7ed957]/20 bg-[#7ed957]/10 px-4 py-2 text-xs font-semibold text-[#7ed957] no-underline transition-colors hover:bg-[#7ed957]/15"
                >Contact Us</a>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <style>{`
        @media (min-width: 900px) {
          .mp-category-grid { grid-template-columns: 1fr 260px !important; }
          .mp-sidebar { position: sticky; top: 88px; align-self: start; }
        }
      `}</style>
    </>
  )
}
