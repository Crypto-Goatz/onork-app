/**
 * /apps/<slug> — public-facing spawned sub-app from the App Factory.
 *
 * Server-renders the row, the AppShell client component renders the
 * actual interactive tiles + Jaxx orchestration chat.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { Sparkles } from 'lucide-react'
import { AppShell } from './AppShell'

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
    description:
      app.brief?.slice(0, 160) ??
      `${app.name} on 0nCore — composed from ${app.capabilities.length} capabilities.`,
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0d1117] to-slate-950 text-white">
      <main className="mx-auto max-w-5xl px-6 py-16">
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
            {app.capabilities.length} capabilit
            {app.capabilities.length === 1 ? 'y' : 'ies'}
          </div>
        </div>

        <AppShell
          slug={app.slug}
          name={app.name}
          brief={app.brief}
          capabilities={app.capabilities}
          mode={app.mode}
        />

        <footer className="mt-16 border-t border-white/[0.06] pt-6 text-center text-[10px] text-white/30">
          Powered by 0nCore · spawned via the App Factory
        </footer>
      </main>
    </div>
  )
}
