import Link from 'next/link'
import { ArrowRight, Download } from 'lucide-react'

import { APPS } from '@/lib/hub/apps'

export const metadata = {
  title: 'Apps · 0n Hub',
  description: 'Every 0n app, what it does today, and what is coming.',
}

const STATUS: Record<string, { label: string; cls: string }> = {
  shipped: { label: 'Shipped', cls: 'border-[#6EE05A]/30 bg-[#6EE05A]/10 text-[#6EE05A]' },
  beta: { label: 'Beta', cls: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300' },
  building: { label: 'Building', cls: 'border-amber-400/30 bg-amber-400/10 text-amber-300' },
  idea: { label: 'Idea', cls: 'border-white/15 bg-white/5 text-white/50' },
}

export default function HubAppsPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] px-4 py-12 text-[#c9d1d9] sm:px-8 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Apps</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/60">
          Everything 0n builds, in one place — what each app does today, what it cannot do yet, and
          the ideas queued against it. Anything marked <span className="text-white">coming soon</span> is
          not built.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {APPS.map((app) => {
            const s = STATUS[app.status] ?? STATUS.idea
            return (
              <Link
                key={app.slug}
                href={`/hub/apps/${app.slug}`}
                className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-[#6EE05A]/30 hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-white">{app.name}</h2>
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${s.cls}`}>
                    {s.label}
                  </span>
                  {app.version && <span className="font-mono text-[11px] text-white/30">v{app.version}</span>}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{app.tagline}</p>
                <div className="mt-4 flex items-center gap-4 text-xs text-white/40">
                  <span>{app.can.length} capabilities</span>
                  <span>{app.soon.length} queued</span>
                  {app.download && (
                    <span className="inline-flex items-center gap-1 text-[#6EE05A]">
                      <Download className="h-3 w-3" /> download
                    </span>
                  )}
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-white/50 group-hover:text-[#6EE05A]">
                  Details <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
