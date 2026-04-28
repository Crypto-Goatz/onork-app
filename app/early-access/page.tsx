import type { Metadata } from 'next'
import { EarlyAccessForm } from './client'

export const metadata: Metadata = {
  title: 'Early Access — 0nCore Public Launch May 1, 2026',
  description: 'Get first access to 0nCore v4.10.0 — UCP, .0n App Marketplace, AI Course Builder, Lead Magnet Loop, App Builder, Website Builder, SaaS Factory, and the Agentic Automation Generator. Public availability May 1, 2026.',
  openGraph: {
    title: '0nCore — Public Launch May 1, 2026',
    description: 'Register for early access. UCP, Marketplace, Course Builder, Agentic Automation Generator + more.',
    url: 'https://0ncore.com/early-access',
  },
}

const FEATURES = [
  { tag: 'COMMERCE', name: 'UCP — Universal Commerce Protocol', desc: 'One protocol, every store. Discover, list, and check out any product or app from a unified catalog.' },
  { tag: 'MARKETPLACE', name: '.0n App Marketplace', desc: 'Browse + install + execute apps and first-party products. Plan-aware install, Stripe checkout, instant activation.' },
  { tag: 'AI BUILDER', name: 'AI Course Builder', desc: 'Describe what you want to teach. Get a full course back — lessons, quizzes, sales page — published into your CRM.' },
  { tag: 'GROWTH', name: 'Lead Magnet Loop', desc: 'Landing → opt-in → ebook delivery → recommendations modal → builtwith.0nmcp.com. Every funnel grows your list AND the platform.' },
  { tag: 'AI BUILDER', name: 'Automation Builder', desc: 'Generate, test, schedule, and run workflows from natural language. Visual canvas + .0n SWITCH file format.' },
  { tag: 'AI BUILDER', name: 'SaaS Factory', desc: 'One-shot provisioning of a complete SaaS instance: brand, auth, billing, custom domain, CRM mirror.' },
  { tag: 'AI BUILDER', name: 'App Builder', desc: 'Generate a packaged .0n app from a description. Installs via the marketplace, runs against the universal capability surface.' },
  { tag: 'AI BUILDER', name: 'Website Builder', desc: 'Landing pages and multi-page sites from a description. 5 curated themes, brand-aware copy, one-shot Vercel deploy.' },
  { tag: 'AGENTIC', name: 'Agentic Automation Generator', desc: 'Tell it the outcome. The agent decomposes, picks tools, configures inputs, runs the plan, reports outcomes.' },
]

export default function EarlyAccessPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Public availability: May 1, 2026
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            0nCore goes public.<br />
            <span className="text-emerald-400">Get in early.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/65">
            v4.10.0 ships nine new capability families on top of 1,640+ tools across 109 services. Early-access registrants get day-one onboarding, priority support, and a permanent founder rate.
          </p>
        </div>

        <EarlyAccessForm />

        <div className="mt-14">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/50">What ships May 1</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.name}
                className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 transition-colors hover:border-emerald-500/30"
              >
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">{f.tag}</div>
                <div className="font-semibold">{f.name}</div>
                <p className="mt-1 text-sm leading-relaxed text-white/60">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 border-t border-white/[0.08] pt-8 text-sm text-white/50">
          Built on <a href="https://www.npmjs.com/package/0nmcp" className="text-emerald-400 hover:underline" target="_blank" rel="noreferrer">0nMCP</a> · 1,640+ tools · 109 services · 5 patents pending · Free and open source from <a href="https://0nork.com" className="text-emerald-400 hover:underline" target="_blank" rel="noreferrer">0nORK</a>
        </div>
      </div>
    </div>
  )
}
