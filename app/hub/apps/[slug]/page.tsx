import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Check, Clock, Download, ExternalLink } from 'lucide-react'

import { APPS, getApp } from '@/lib/hub/apps'

export function generateStaticParams() {
  return APPS.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const app = getApp(slug)
  return app ? { title: `${app.name} · 0n Hub`, description: app.tagline } : {}
}

const STATUS: Record<string, { label: string; cls: string }> = {
  shipped: { label: 'Shipped', cls: 'border-[#6EE05A]/30 bg-[#6EE05A]/10 text-[#6EE05A]' },
  beta: { label: 'Beta', cls: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300' },
  building: { label: 'Building', cls: 'border-amber-400/30 bg-amber-400/10 text-amber-300' },
  idea: { label: 'Idea', cls: 'border-white/15 bg-white/5 text-white/50' },
}

export default async function AppDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const app = getApp(slug)
  if (!app) notFound()

  const s = STATUS[app.status] ?? STATUS.idea

  return (
    <div className="min-h-screen bg-[#0d1117] px-4 py-12 text-[#c9d1d9] sm:px-8 lg:px-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/hub/apps" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> All apps
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-black tracking-tight text-white">{app.name}</h1>
          <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${s.cls}`}>
            {s.label}
          </span>
          {app.version && <span className="font-mono text-xs text-white/30">v{app.version}</span>}
        </div>
        <p className="mt-3 text-lg leading-relaxed text-white/70">{app.tagline}</p>
        <p className="mt-2 font-mono text-xs text-white/35">{app.surface}</p>

        {(app.download || app.open) && (
          <div className="mt-7 flex flex-wrap gap-3">
            {app.download && (
              <a
                href={app.download.href}
                className="inline-flex items-center gap-2 rounded-xl bg-[#6EE05A] px-6 py-3.5 text-sm font-bold text-[#020810] shadow-[0_0_28px_rgba(110,224,90,0.3)] transition-transform hover:scale-[1.01]"
              >
                <Download className="h-4 w-4" /> {app.download.label}
              </a>
            )}
            {app.open && (
              <a
                href={app.open.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 text-sm font-semibold text-white/80 hover:bg-white/5"
              >
                {app.open.label} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
        {app.download?.note && <p className="mt-3 text-xs leading-relaxed text-white/40">{app.download.note}</p>}

        <section className="mt-12">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-white/40">What it does today</h2>
          <div className="mt-4 space-y-3">
            {app.can.map((c) => (
              <div key={c.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#6EE05A]" />
                  <h3 className="font-semibold text-white">{c.title}</h3>
                </div>
                <p className="mt-1.5 pl-6 text-sm leading-relaxed text-white/60">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {!!app.limits?.length && (
          <section className="mt-10">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-amber-300/70">
              What it cannot do yet
            </h2>
            <ul className="mt-4 space-y-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-5">
              {app.limits.map((l) => (
                <li key={l} className="flex gap-2.5 text-sm leading-relaxed text-amber-200/80">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {l}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-10">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-white/40">Coming soon</h2>
          {/* Stated as NOT BUILT, deliberately. A roadmap that reads like a
              feature list is how a customer ends up testing something that
              does not exist. */}
          <p className="mt-2 text-xs text-white/35">Queued ideas — none of these are built yet.</p>
          <ul className="mt-4 space-y-2">
            {app.soon.map((idea) => (
              <li key={idea} className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.015] px-5 py-3.5 text-sm leading-relaxed text-white/55">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/25" /> {idea}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
