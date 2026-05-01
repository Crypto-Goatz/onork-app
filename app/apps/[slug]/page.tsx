/**
 * /apps/<slug> — public-facing spawned sub-app from the App Factory.
 *
 * Renders one tile per capability. In composer mode, tiles are independent
 * dashboards. In chain mode, they're connected with arrows showing flow.
 *
 * Reads apps_factory by slug. RLS allows public read on status='live' rows,
 * so anonymous traffic resolves cleanly.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import {
  Sparkles, Package, GraduationCap, Shield, Search, Palette, Mic, Mail,
  Activity, ScanLine, ArrowRight, Workflow, type LucideIcon,
} from 'lucide-react'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface AppRow {
  id: string
  slug: string
  name: string
  capabilities: string[]
  mode: 'composer' | 'chain'
  brief: string | null
  status: string
}

interface CapabilityMeta {
  slug: string
  name: string
  desc: string
  href: string
  icon: LucideIcon
  tone: string
}

const CAPABILITY_REGISTRY: Record<string, CapabilityMeta> = {
  notes: {
    slug: 'notes', name: 'Notes', desc: 'Drop a thought, brain decides shape.',
    href: '/dashboard/notes', icon: Sparkles, tone: 'emerald',
  },
  service_packager: {
    slug: 'service_packager', name: 'Service Packager', desc: '8 sellable outputs from one input.',
    href: '/dashboard/service-packager', icon: Package, tone: 'sky',
  },
  course_builder: {
    slug: 'course_builder', name: 'Course Builder', desc: 'Conversational AI courses.',
    href: '/dashboard/courses', icon: GraduationCap, tone: 'violet',
  },
  hipaa_scanner: {
    slug: 'hipaa_scanner', name: 'HIPAA Scanner', desc: '63 weighted compliance checks.',
    href: '/dashboard/hipaa', icon: Shield, tone: 'amber',
  },
  cro9_engine: {
    slug: 'cro9_engine', name: 'CRO9 SEO', desc: 'Adaptive SEO scoring.',
    href: '/dashboard/cro9-engine', icon: Search, tone: 'sky',
  },
  brand_builder: {
    slug: 'brand_builder', name: 'Brand Builder', desc: 'Identity + asset generator.',
    href: '/dashboard/brand', icon: Palette, tone: 'rose',
  },
  voice_ai: {
    slug: 'voice_ai', name: 'Voice AI', desc: 'Phone + web voice agents.',
    href: '/dashboard/voice', icon: Mic, tone: 'emerald',
  },
  email_paste: {
    slug: 'email_paste', name: 'Email Copy-Paste', desc: 'AI generates an email; tap to copy.',
    href: '/tools/email-paste', icon: Mail, tone: 'sky',
  },
  '0nexec': {
    slug: '0nexec', name: '0nExec', desc: 'Score-based orbits + formulas.',
    href: '/console/exec', icon: Activity, tone: 'violet',
  },
  report_builder: {
    slug: 'report_builder', name: 'Multi-Scanner Reports', desc: '13 scanners, multi-layer report.',
    href: '/dashboard/reports/builder', icon: ScanLine, tone: 'amber',
  },
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function load(slug: string): Promise<AppRow | null> {
  const { data, error } = await admin()
    .from('apps_factory')
    .select('id, slug, name, capabilities, mode, brief, status')
    .eq('slug', slug)
    .eq('status', 'live')
    .maybeSingle<AppRow>()
  if (error || !data) return null
  // bump view counter (fire-and-forget)
  admin()
    .from('apps_factory')
    .update({ view_count: 1, last_viewed_at: new Date().toISOString() })
    .eq('slug', slug)
    .then(() => {})
  return data
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const app = await load(slug)
  if (!app) return { title: 'Not found — 0nCore', robots: { index: false } }
  return {
    title: `${app.name} — 0nCore`,
    description: app.brief?.slice(0, 160) ?? `${app.name} on 0nCore — composed from ${app.capabilities.length} capabilities.`,
  }
}

export default async function SpawnedAppPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const app = await load(slug)
  if (!app) notFound()

  const tiles = app.capabilities.map(
    (s) => CAPABILITY_REGISTRY[s] ?? null,
  ).filter(Boolean) as CapabilityMeta[]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0d1117] to-slate-950 text-white">
      <main className="mx-auto max-w-5xl px-6 py-16">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-white/40 hover:text-white/70"
          >
            <Sparkles className="h-3 w-3 text-emerald-400" /> 0nCore
          </Link>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 bg-emerald-500/10 text-emerald-300 ring-emerald-500/20">
              {app.mode === 'chain' ? 'Workflow' : 'Composed app'}
            </span>
            <span className="text-[10px] text-white/30 font-mono">/apps/{app.slug}</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{app.name}</h1>
          {app.brief && (
            <p className="mt-3 max-w-2xl text-sm text-white/50 leading-relaxed">{app.brief}</p>
          )}
          <div className="mt-3 text-[11px] text-white/30">
            {tiles.length} capabilit{tiles.length === 1 ? 'y' : 'ies'}
          </div>
        </div>

        {/* Tile grid (composer) or stacked chain */}
        {app.mode === 'chain' ? (
          <ChainView tiles={tiles} />
        ) : (
          <ComposerView tiles={tiles} />
        )}

        <footer className="mt-16 border-t border-white/[0.06] pt-6 text-center text-[10px] text-white/30">
          Powered by 0nCore · spawned via the App Factory
        </footer>
      </main>
    </div>
  )
}

function ComposerView({ tiles }: { tiles: CapabilityMeta[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((t) => (
        <Tile key={t.slug} tile={t} />
      ))}
    </div>
  )
}

function ChainView({ tiles }: { tiles: CapabilityMeta[] }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {tiles.map((t, i) => (
        <div key={t.slug} className="flex w-full max-w-md flex-col items-center">
          <Tile tile={t} fullWidth />
          {i < tiles.length - 1 && (
            <div className="my-2 flex flex-col items-center text-emerald-400">
              <div className="h-6 w-px bg-emerald-500/40" />
              <ArrowRight className="h-4 w-4 rotate-90" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const TONES: Record<string, string> = {
  emerald: 'from-emerald-500/20 via-emerald-400/5 to-transparent border-emerald-500/30 text-emerald-300',
  sky:     'from-sky-500/20 via-sky-400/5 to-transparent border-sky-500/30 text-sky-300',
  violet:  'from-violet-500/20 via-violet-400/5 to-transparent border-violet-500/30 text-violet-300',
  amber:   'from-amber-500/20 via-amber-400/5 to-transparent border-amber-500/30 text-amber-300',
  rose:    'from-rose-500/20 via-rose-400/5 to-transparent border-rose-500/30 text-rose-300',
}

function Tile({ tile, fullWidth }: { tile: CapabilityMeta; fullWidth?: boolean }) {
  const Icon = tile.icon
  const tone = TONES[tile.tone] ?? TONES.emerald
  return (
    <Link
      href={tile.href}
      className={`group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition-all hover:scale-[1.02] hover:shadow-[0_24px_48px_-16px_rgba(110,224,90,0.20)] ${tone} ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]">
          <Icon className={`h-5 w-5 ${tone.includes('emerald') ? 'text-emerald-400' : tone.includes('sky') ? 'text-sky-400' : tone.includes('violet') ? 'text-violet-400' : tone.includes('amber') ? 'text-amber-400' : 'text-rose-400'}`} />
        </span>
        <ArrowRight className="h-4 w-4 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/70" />
      </div>
      <div>
        <div className="text-base font-semibold tracking-tight text-white">{tile.name}</div>
        <div className="mt-0.5 text-xs text-white/50 leading-relaxed">{tile.desc}</div>
      </div>
      <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-white/30">
        <Workflow className="h-3 w-3" />
        {tile.href}
      </div>
    </Link>
  )
}
