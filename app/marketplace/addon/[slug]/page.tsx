import type { Metadata } from 'next'
import Link from 'next/link'
import { Check } from 'lucide-react'
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
      <main className="min-h-screen bg-[#020810] px-6 py-32 text-center font-sans text-white antialiased">
        <h1 className="text-2xl font-extrabold">Add-on not found</h1>
        <Link href="/marketplace" className="mt-4 inline-block text-sm text-[#7ed957] no-underline transition-colors hover:text-[#7ed957]/80">Back to Marketplace</Link>
      </main>
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

      <main className="min-h-screen bg-[#020810] font-sans text-white antialiased">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          {/* Breadcrumb */}
          <nav className="mb-6 text-xs text-white/30">
            <Link href="/marketplace" className="text-white/40 transition-colors hover:text-[#7ed957]">Marketplace</Link>
            <span className="mx-2">/</span>
            <Link href={`/marketplace/${addon.categories[0]}`} className="text-white/40 transition-colors hover:text-[#7ed957]">{primaryCat?.name || addon.categories[0]}</Link>
            <span className="mx-2">/</span>
            <span className="text-white/60">{addon.name}</span>
          </nav>

          <div className="grid grid-cols-1 gap-8 mp-detail-grid">
            {/* Main Content */}
            <div>
              {/* Header */}
              <div className="mb-8">
                <div className="mb-3 flex flex-wrap items-center gap-2.5">
                  {addon.categories.map(catSlug => {
                    const c = CATEGORIES.find(cat => cat.slug === catSlug)
                    return (
                      <Link
                        key={catSlug}
                        href={`/marketplace/${catSlug}`}
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] no-underline"
                        style={{ background: `${c?.color || '#7ed957'}15`, color: c?.color || '#7ed957', border: `1px solid ${c?.color || '#7ed957'}25` }}
                      >{c?.name || catSlug}</Link>
                    )
                  })}
                  {addon.badge && (
                    <span className="rounded-md bg-[#7ed957]/[0.12] px-2.5 py-0.5 text-[10px] font-semibold text-[#7ed957]">{addon.badge}</span>
                  )}
                </div>
                <h1 className="mb-2 text-balance text-4xl font-black tracking-tight sm:text-5xl">
                  <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">{addon.name}</span>
                </h1>
                <p className="text-base leading-relaxed text-white/50">{addon.longDesc}</p>
              </div>

              {/* What it does */}
              <section className="mb-10">
                <h2 className="mb-4 text-xl font-extrabold">What it does</h2>
                <ul className="list-none p-0">
                  {addon.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 border-b border-white/[0.04] py-2 text-sm text-white/60">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#7ed957]" />
                      {f}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Capabilities */}
              <section className="mb-10">
                <h2 className="mb-4 text-xl font-extrabold">Capabilities required</h2>
                <div className="flex flex-wrap gap-2">
                  {addon.capabilities.map(cap => (
                    <span key={cap} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] font-medium text-white/50">{cap}</span>
                  ))}
                </div>
              </section>

              {/* How it works */}
              <section className="mb-10">
                <h2 className="mb-4 text-xl font-extrabold">How it works</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {STEPS.map((s, i) => {
                    const accents = ['#7ed957', '#00d4ff', '#a78bfa']
                    const color = accents[i % accents.length]
                    return (
                      <div key={s.num} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur">
                        <div className="mb-2 text-2xl font-extrabold" style={{ color }}>{s.num}</div>
                        <h4 className="mb-1 text-sm font-bold">{s.title}</h4>
                        <p className="text-xs leading-relaxed text-white/40">{s.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* Integrations */}
              <section className="mb-10">
                <h2 className="mb-4 text-xl font-extrabold">Integrations</h2>
                <div className="flex flex-wrap gap-2">
                  {addon.integrations.map(i => (
                    <span key={i} className="rounded-lg border border-[#7ed957]/[0.12] bg-[#7ed957]/[0.06] px-3.5 py-1.5 text-xs font-semibold text-white/60">{i}</span>
                  ))}
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="mp-detail-sidebar flex flex-col gap-5">
              {/* Price Card */}
              <div className="rounded-2xl border border-[#7ed957]/[0.15] bg-gradient-to-br from-[#7ed957]/[0.05] to-[#020810] p-6 backdrop-blur">
                <div className="mb-1 text-4xl font-extrabold">{addon.priceLabel}</div>
                <div className="mb-4 flex items-center gap-2">
                  <span
                    className="rounded-md px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]"
                    style={{ background: `${PLAN_COLORS[addon.requiredPlan]}15`, color: PLAN_COLORS[addon.requiredPlan], border: `1px solid ${PLAN_COLORS[addon.requiredPlan]}25` }}
                  >Requires {addon.requiredPlan}</span>
                </div>
                <AddToCartButton slug={addon.slug} name={addon.name} price={addon.price} priceLabel={addon.priceLabel} />
                <ul className="mt-4 list-none p-0">
                  {addon.features.slice(0, 4).map(f => (
                    <li key={f} className="flex items-center gap-1.5 py-0.5 text-xs text-white/40">
                      <Check className="h-3 w-3 text-[#7ed957]" /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Category Nav */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur">
                <h4 className="mb-3 font-mono text-[11px] font-bold uppercase tracking-widest text-white/50">Categories</h4>
                <div className="flex flex-col gap-1">
                  {CATEGORIES.map(c => (
                    <Link
                      key={c.slug}
                      href={`/marketplace/${c.slug}`}
                      className={`rounded-md px-2.5 py-1.5 text-[13px] no-underline transition-colors ${addon.categories.includes(c.slug) ? 'bg-[#7ed957]/[0.08] text-[#7ed957]' : 'text-white/50 hover:text-white/80'}`}
                    >{c.name} ({c.count})</Link>
                  ))}
                </div>
              </div>

              {/* Related Add-ons */}
              {related.length > 0 && (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur">
                  <h4 className="mb-3 font-mono text-[11px] font-bold uppercase tracking-widest text-white/50">Related Add-ons</h4>
                  <div className="flex flex-col gap-2">
                    {related.slice(0, 4).map(r => (
                      <Link
                        key={r.slug}
                        href={`/marketplace/addon/${r.slug}`}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-white no-underline transition-colors hover:border-white/[0.18]"
                      >
                        <div className="mb-0.5 text-[13px] font-semibold">{r.name}</div>
                        <div className="flex justify-between text-[11px] text-white/30">
                          <span>{r.priceLabel}</span>
                          <span className="text-[#7ed957]">&rarr;</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom CTA */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-center backdrop-blur">
                <h4 className="mb-1.5 text-sm font-bold">Need a custom solution?</h4>
                <p className="mb-3 text-xs leading-relaxed text-white/45">We build custom add-ons for enterprise teams.</p>
                <a
                  href="mailto:mike@rocketopp.com"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white/70 no-underline transition-colors hover:border-[#7ed957]/40 hover:text-[#7ed957]"
                >Contact Us</a>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <style>{`
        @media (min-width: 900px) {
          .mp-detail-grid { grid-template-columns: 1fr 300px !important; }
          .mp-detail-sidebar { position: sticky; top: 88px; align-self: start; }
        }
      `}</style>
    </>
  )
}
