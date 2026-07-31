import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { readFile } from 'fs/promises'
import path from 'path'
import { ArrowLeft, Clock, DollarSign, Wrench, BookOpen, Package } from 'lucide-react'
import { GUIDES, getGuide } from '@/lib/guides/registry'
import { renderMarkdown } from '@/lib/guides/markdown'

export const dynamic = 'force-static'
export const revalidate = 3600

export async function generateStaticParams() {
  return GUIDES.filter(g => g.status === 'live').map(g => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide) return { title: 'Guide not found' }
  return {
    title: `${guide.title} — Build With 0n`,
    description: guide.subtitle,
    openGraph: {
      title: `${guide.title} — Build With 0n`,
      description: guide.subtitle,
      url: `https://0ncore.com/guides/${guide.slug}`,
    },
  }
}

async function readGuideMarkdown(file: string): Promise<string | null> {
  try {
    const fp = path.join(process.cwd(), 'content', 'guides', file)
    return await readFile(fp, 'utf-8')
  } catch {
    return null
  }
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide || guide.status !== 'live') notFound()

  const md = await readGuideMarkdown(guide.file)
  if (!md) notFound()

  const html = renderMarkdown(md)
  const idx = GUIDES.findIndex(g => g.slug === slug)
  const prev = idx > 0 ? GUIDES.slice(0, idx).reverse().find(g => g.status === 'live') : null
  const next = idx >= 0 ? GUIDES.slice(idx + 1).find(g => g.status === 'live') : null

  return (
    <div className="min-h-screen bg-[#020810] text-white antialiased">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link href="/guides" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-8 transition">
          <ArrowLeft className="h-4 w-4" /> All guides
        </Link>

        {/* Stat strip — only for guides 1+ */}
        {guide.number > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            <Stat icon={Clock} label="Build time" value={guide.buildTime} />
            <Stat icon={DollarSign} label="Revenue" value={guide.revenue} />
            <Stat icon={Wrench} label="Product" value={guide.keyProduct} truncate />
            {guide.marketplaceSlug ? (
              <Link href={`/dashboard/marketplace/${guide.marketplaceSlug}`} className="bg-[#7ed957]/10 border border-[#7ed957]/30 rounded-lg p-3 hover:bg-[#7ed957]/15 transition group">
                <Package className="h-4 w-4 text-[#7ed957] mb-2" />
                <div className="text-xs text-[#7ed957] uppercase tracking-wider mb-0.5">Marketplace</div>
                <div className="text-sm font-semibold text-white">Install app →</div>
              </Link>
            ) : guide.course ? (
              <Stat icon={BookOpen} label="Course" value={guide.course} truncate />
            ) : (
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3" />
            )}
          </div>
        )}

        {/* Markdown body */}
        <article
          className="prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Pager */}
        <div className="mt-16 pt-8 border-t border-white/[0.06] grid grid-cols-2 gap-4">
          {prev ? (
            <Link href={`/guides/${prev.slug}`} className="group">
              <div className="text-xs text-white/40 mb-1">Previous</div>
              <div className="font-semibold group-hover:text-[#7ed957] transition">{prev.title}</div>
            </Link>
          ) : <div />}
          {next ? (
            <Link href={`/guides/${next.slug}`} className="group text-right">
              <div className="text-xs text-white/40 mb-1">Next</div>
              <div className="font-semibold group-hover:text-[#7ed957] transition">{next.title}</div>
            </Link>
          ) : <div />}
        </div>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, truncate }: { icon: typeof Clock; label: string; value: string; truncate?: boolean }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
      <Icon className="h-4 w-4 text-white/40 mb-2" />
      <div className="text-xs text-white/40 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-sm font-semibold text-white ${truncate ? 'line-clamp-2' : ''}`}>{value}</div>
    </div>
  )
}
