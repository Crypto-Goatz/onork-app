import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen, Clock, DollarSign, Sparkles } from 'lucide-react'
import { GUIDES } from '@/lib/guides/registry'
import AnimatedGrid from '@/components/animated-grid'

export const metadata: Metadata = {
  title: 'Build With 0n — Real Products. Built Live. Your Turn.',
  description: 'Each guide shows how we built a real product using 0nMCP — and how you can build the same thing. Two paths: developer (CLI) or no-code (dashboard). Same outcome.',
  openGraph: {
    title: 'Build With 0n — Build Guides',
    description: 'Real products. Built live. Documented step by step. Your turn.',
    url: 'https://www.0ncore.com/guides',
  },
}

export const dynamic = 'force-static'
export const revalidate = 3600

const STATUS_BADGE: Record<string, string> = {
  'live': 'bg-[#7ed957]/15 text-[#7ed957] border-[#7ed957]/30',
  'in-progress': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'queued': 'bg-white/[0.04] text-white/40 border-white/[0.08]',
}

const STATUS_LABEL: Record<string, string> = {
  'live': 'LIVE',
  'in-progress': 'WRITING',
  'queued': 'QUEUED',
}

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-[#020810] text-white antialiased">
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="relative mb-16 overflow-hidden">
          <AnimatedGrid />
          <div aria-hidden className="pointer-events-none absolute -top-32 left-0 h-[480px] w-[480px] rounded-full bg-[#7ed957]/[0.07] blur-[150px]" />
          <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7ed957]/10 border border-[#7ed957]/30 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-[#7ed957]" />
            <span className="text-xs font-semibold text-[#7ed957] uppercase tracking-wider">Build With 0n</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold tracking-tight mb-5 text-balance">
            Real products. Built live.<br/>
            <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">Your turn.</span>
          </h1>
          <p className="text-lg lg:text-xl text-white/60 leading-relaxed">
            Each guide shows how we built a real product using 0nMCP — and how you can build the same thing.
            Two paths: <span className="text-white font-medium">0nMCP</span> (developer / CLI) or
            <span className="text-white font-medium"> 0ncore.com</span> (dashboard / no-code).
            Same outcome.
          </p>
          </div>
        </div>

        {/* The Point */}
        <div className="mb-16 p-6 bg-white/[0.02] border border-white/[0.06] rounded-xl">
          <p className="text-white/75 leading-relaxed">
            <span className="text-white font-semibold">0ncore.com is not a separate product from 0nMCP.</span>{' '}
            0ncore.com IS what happens when you use 0nMCP to build a business platform.
            Every dashboard page, every automation — built using the same{' '}
            <span className="text-[#7ed957] font-semibold">1,558 tools across 96 services</span>{' '}
            that every 0nMCP user gets access to. The platform IS the proof.
          </p>
        </div>

        {/* Guide cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {GUIDES.map(g => {
            const isClickable = g.status === 'live'
            const cardClass = `group block bg-white/[0.02] border rounded-xl p-6 transition-all ${
              isClickable
                ? 'border-white/[0.06] hover:border-[#7ed957]/40 cursor-pointer'
                : 'border-white/[0.04] cursor-default'
            }`
            const inner = (
              <>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="text-xs font-mono font-semibold text-white/30 uppercase tracking-wider">
                    Guide {String(g.number).padStart(2, '0')}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${STATUS_BADGE[g.status]}`}>
                    {STATUS_LABEL[g.status]}
                  </span>
                </div>
                <h2 className="text-2xl font-bold mb-2 leading-tight">{g.title}</h2>
                <p className="text-sm text-white/55 mb-5 leading-relaxed italic">{g.subtitle}</p>
                {g.number > 0 && (
                  <div className="grid grid-cols-2 gap-3 mb-5 text-xs">
                    <div className="flex items-center gap-1.5 text-white/50"><Clock className="h-3 w-3" /><span>{g.buildTime}</span></div>
                    <div className="flex items-center gap-1.5 text-white/50"><DollarSign className="h-3 w-3" /><span>{g.revenue}</span></div>
                  </div>
                )}
                {g.keyProduct !== '—' && (
                  <p className="text-xs text-white/40 mb-4 line-clamp-2">
                    <span className="text-white/30 mr-1">Product:</span>{g.keyProduct}
                  </p>
                )}
                {isClickable ? (
                  <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7ed957] group-hover:gap-2.5 transition-all">
                    Read guide <ArrowRight className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-white/30">Coming soon</div>
                )}
              </>
            )
            return isClickable ? (
              <Link key={g.slug} href={`/guides/${g.slug}`} className={cardClass}>{inner}</Link>
            ) : (
              <div key={g.slug} className={cardClass}>{inner}</div>
            )
          })}
        </div>

        {/* Footer pitch */}
        <div className="mt-20 max-w-2xl">
          <h2 className="text-2xl font-bold mb-3">Each guide ships in four formats.</h2>
          <ul className="space-y-2 text-white/65">
            <li className="flex items-start gap-2"><BookOpen className="h-4 w-4 text-[#7ed957] mt-1 shrink-0" /> A public article on 0ncore.com/guides/[slug]</li>
            <li className="flex items-start gap-2"><BookOpen className="h-4 w-4 text-[#7ed957] mt-1 shrink-0" /> A .0n marketplace app you can install with one click</li>
            <li className="flex items-start gap-2"><BookOpen className="h-4 w-4 text-[#7ed957] mt-1 shrink-0" /> An AI-generated course on 0ncore.com/courses/[slug]</li>
            <li className="flex items-start gap-2"><BookOpen className="h-4 w-4 text-[#7ed957] mt-1 shrink-0" /> Source content for the SXO blog</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
