import Link from 'next/link'
import { ArrowRight, Check, type LucideIcon } from 'lucide-react'
import SiteFooter from '@/components/SiteFooter'

/**
 * The shell every 0nCORE product page shares.
 *
 * ONE SHELL, not five hand-built pages. These pages exist to rank for distinct
 * search intents ("AI client management CRM", "AI task lists", "agency website
 * management") and the SXO requirements are identical across all of them: one
 * intent-matched H1, BLUF in the first paragraph, a scannable H2 ladder, FAQ
 * schema, an internal-link cluster. Five copies of that structure would drift,
 * and the drift shows up as a page quietly missing its schema.
 *
 * ROADMAP IS A FIRST-CLASS PROP. Some of these pages describe things that are
 * partly built — the honest-scope rule says say so, visibly, not in a footnote.
 * `status` puts it in the badge and in the schema, so the page cannot claim
 * availability the product does not have.
 */

export interface Section {
  h2: string
  body: string
  icon?: LucideIcon
  /** Marks this specific capability as not shipped yet. */
  roadmap?: boolean
}

export interface Faq { q: string; a: string }

export interface ProductPageProps {
  h1: string
  /** BLUF — the two sentences an AI answer can lift whole. */
  intro: string
  eyebrow?: string
  status?: 'live' | 'partial' | 'roadmap'
  sections: Section[]
  bullets?: string[]
  faq?: Faq[]
  cta: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
  /** The internal-link cluster. Three to five, contextual. */
  related: { label: string; href: string }[]
  canonical: string
}

const STATUS_COPY: Record<string, { label: string; tone: string }> = {
  live: { label: 'Available now', tone: 'border-[color:var(--brand)]/40 bg-[color:var(--brand)]/10 text-emerald-700' },
  partial: { label: 'Partly available', tone: 'border-amber-300 bg-amber-50 text-amber-700' },
  roadmap: { label: 'On the roadmap', tone: 'border-neutral-300 bg-neutral-50 text-neutral-600' },
}

export default function ProductPage(p: ProductPageProps) {
  const status = p.status ? STATUS_COPY[p.status] : null

  return (
    <main className="grid-bg min-h-screen bg-white">
      {/* Living-DOM marker — the mutation engine and rank tracker key off this. */}
      <meta name="cro9:living" content="1" />

      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 lg:py-20">
        <span aria-hidden="true" className="orb orb-1" />

        <header className="relative z-10">
          {p.eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 shadow-cascade-sm">
              {p.eyebrow}
            </span>
          )}
          <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.08] tracking-tight text-neutral-900 md:text-5xl">
            {p.h1}
          </h1>
          {status && p.status !== 'live' && (
            <span className={`mt-4 inline-block rounded-full border px-3 py-1 text-xs font-semibold ${status.tone}`}>
              {status.label}
            </span>
          )}
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-600">{p.intro}</p>

          {p.bullets && p.bullets.length > 0 && (
            <ul className="mt-7 space-y-2.5">
              {p.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-[15px] text-neutral-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--brand)]" aria-hidden="true" />
                  {b}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href={p.cta.href}
              data-cro9-event="cta_primary"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-7 py-3.5 text-sm font-semibold text-neutral-950 shadow-glow-sm transition hover:opacity-90"
            >
              {p.cta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {p.secondaryCta && (
              <Link
                href={p.secondaryCta.href}
                data-cro9-event="cta_secondary"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-7 py-3.5 text-sm font-semibold text-neutral-800 shadow-cascade-sm transition hover:border-[color:var(--brand)]"
              >
                {p.secondaryCta.label}
              </Link>
            )}
          </div>
        </header>

        <div className="relative z-10 mt-16 grid gap-5 sm:grid-cols-2">
          {p.sections.map((s) => {
            const Icon = s.icon
            return (
              <section key={s.h2} className="rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-cascade-sm card-hover">
                {Icon && (
                  <span className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[color:var(--brand)]/12">
                    <Icon className="h-5 w-5 text-[color:var(--brand-deep)]" aria-hidden="true" />
                  </span>
                )}
                <h2 className="text-lg font-bold text-neutral-900">
                  {s.h2}
                  {s.roadmap && (
                    <span className="ml-2 align-middle text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                      coming
                    </span>
                  )}
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">{s.body}</p>
              </section>
            )
          })}
        </div>

        {p.faq && p.faq.length > 0 && (
          <section className="relative z-10 mt-16">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Questions</h2>
            <div className="mt-5 space-y-3">
              {p.faq.map((f) => (
                <details key={f.q} className="group rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-cascade-sm">
                  <summary className="cursor-pointer list-none text-[15px] font-semibold text-neutral-900 marker:hidden">
                    {f.q}
                  </summary>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-neutral-600">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <nav className="relative z-10 mt-16 border-t border-neutral-200 pt-8" aria-label="Related">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">Keep reading</h2>
          <ul className="mt-3 flex flex-wrap gap-2.5">
            {p.related.map((r) => (
              <li key={r.href}>
                <Link
                  href={r.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 shadow-cascade-sm transition hover:border-[color:var(--brand)]"
                >
                  {r.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <SiteFooter />

      {/* FAQPage + SoftwareApplication. Roadmap pages ship no availability
          claim at all rather than an optimistic one. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebPage',
                '@id': p.canonical,
                name: p.h1,
                description: p.intro,
                isPartOf: { '@type': 'WebSite', name: '0nCORE', url: 'https://www.0ncore.com' },
              },
              ...(p.status !== 'roadmap'
                ? [{
                    '@type': 'SoftwareApplication',
                    name: '0nCORE',
                    applicationCategory: 'BusinessApplication',
                    operatingSystem: 'Web',
                    url: p.canonical,
                    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Free to install, pay per use' },
                  }]
                : []),
              ...(p.faq?.length
                ? [{
                    '@type': 'FAQPage',
                    mainEntity: p.faq.map((f) => ({
                      '@type': 'Question',
                      name: f.q,
                      acceptedAnswer: { '@type': 'Answer', text: f.a },
                    })),
                  }]
                : []),
            ],
          }),
        }}
      />
    </main>
  )
}
