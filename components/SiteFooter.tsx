/**
 * Site Footer — full-bleed brand-green gradient panel with CTA, link
 * columns, and a thin legal strip. Drop on any marketing page.
 *
 * Visual language:
 *   - Top edge: animated aurora ribbon
 *   - Center: punch-through CTA on a green→teal→cyan gradient
 *   - Below: 4 link columns, brand mark, social row
 *   - Bottom: monoscript legal line
 */
import Link from 'next/link'
import { ArrowRight, Github, Youtube, Mail, Sparkles } from 'lucide-react'

const COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string; external?: boolean }> }> = [
  {
    title: 'Product',
    links: [
      { label: 'Platform', href: '/platform' },
      { label: 'Connections', href: '/connections' },
      { label: 'Marketplace', href: '/marketplace' },
      { label: 'Bulk Stack Scan', href: '/stack-scan' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    title: 'Build',
    links: [
      { label: 'Automations', href: '/dashboard/automations' },
      { label: 'Registry', href: '/dashboard/registry' },
      { label: 'Stack Scanner', href: '/dashboard/scans' },
      { label: 'Run History', href: '/dashboard/automations/runs' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Launch Party', href: '/launch-party' },
      { label: 'Request Access', href: '/request' },
      { label: 'Contact', href: 'mailto:mike@rocketopp.com', external: true },
    ],
  },
  {
    title: 'Network',
    links: [
      { label: '0nMCP', href: 'https://0nmcp.com', external: true },
      { label: 'YouTube', href: 'https://www.youtube.com/@0ncoreAI', external: true },
      { label: 'GitHub', href: 'https://github.com/0nork', external: true },
    ],
  },
]

export default function SiteFooter() {
  return (
    <footer className="relative mt-24 overflow-hidden">
      {/* Aurora ribbon — green→teal→cyan gradient line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#7ed957] to-transparent opacity-40" />

      {/* Top CTA panel — bold gradient */}
      <div className="relative overflow-hidden border-b border-white/5">
        {/* gradient layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#7ed957] via-[#14b8a6] to-[#06b6d4] opacity-90" />
        {/* dark scrim for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d1117]/30 to-[#0d1117]/70" />
        {/* aurora overlay */}
        <div className="pointer-events-none absolute -top-1/3 left-1/4 h-[40vh] w-[40vh] rounded-full bg-white opacity-15 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-1/3 right-1/4 h-[40vh] w-[40vh] rounded-full bg-[#7ed957] opacity-30 blur-[120px]" />

        <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-mono uppercase tracking-widest text-white backdrop-blur">
              <Sparkles className="h-3 w-3" />
              0nCore is live
            </span>
            <h2 className="mt-6 text-balance text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Ship the work.
              <span className="mt-1 block text-white/85">Skip the wiring.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base text-white/85 sm:text-lg">
              2,000+ capabilities across 150+ services, one orchestrator, hardware-bound vault. Free to install — pay only when you scale.
            </p>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
              <Link
                href="/request"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0d1117] px-6 py-3 text-sm font-bold text-white shadow-lg ring-1 ring-white/10 transition-all hover:scale-[1.02] hover:bg-[#161b22]"
              >
                Get your invite
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/platform"
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition-all hover:bg-white/20"
              >
                See the platform
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Link columns + brand */}
      <div className="border-b border-white/5 bg-[#0d1117]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-14 sm:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-4 lg:col-span-1">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-[#7ed957] to-[#14b8a6] font-mono text-sm font-black text-[#0d1117]">
                0n
              </div>
              <span className="font-bold text-white">0nCore</span>
            </div>
            <p className="mt-3 max-w-[200px] text-xs leading-relaxed text-white/50">
              Universal AI orchestration. Connect anything, automate everything, ship the work.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="mb-4 text-[11px] font-bold uppercase tracking-widest text-white/40">
                {col.title}
              </div>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                        rel="noopener noreferrer"
                        className="text-sm text-white/70 transition-colors hover:text-[#7ed957]"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-white/70 transition-colors hover:text-[#7ed957]"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Legal strip */}
      <div className="bg-[#0d1117]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 sm:flex-row">
          <div className="font-mono text-[11px] uppercase tracking-widest text-white/30">
            © 2026 RocketOpp LLC · Powered by 0nMCP · Patents pending US #63/990,046, #63/968,814
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/0nork"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-white/40 transition-colors hover:text-[#7ed957]"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="https://www.youtube.com/@0ncoreAI"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="text-white/40 transition-colors hover:text-[#7ed957]"
            >
              <Youtube className="h-4 w-4" />
            </a>
            <a
              href="mailto:mike@rocketopp.com"
              aria-label="Email"
              className="text-white/40 transition-colors hover:text-[#7ed957]"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
