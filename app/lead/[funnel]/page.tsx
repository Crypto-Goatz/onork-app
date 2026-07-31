import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { LandingForm } from './landing-form'

export const dynamic = 'force-dynamic'

interface FunnelConfig {
  funnel_id: string
  funnel_name: string
  offer_title: string
  offer_description: string | null
  is_active: boolean
}

async function getFunnel(funnelId: string): Promise<FunnelConfig | null> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await sb
    .from('funnel_config')
    .select('funnel_id, funnel_name, offer_title, offer_description, is_active')
    .eq('funnel_id', funnelId)
    .eq('is_active', true)
    .maybeSingle()
  return data
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ funnel: string }>
}) {
  const { funnel } = await params
  const config = await getFunnel(funnel)
  if (!config) notFound()

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020810] px-6 py-12 font-sans text-white antialiased">
      <div aria-hidden className="pointer-events-none absolute -top-32 left-[10%] h-[520px] w-[520px] rounded-full bg-[#7ed957]/[0.08] blur-[150px]" />
      <div aria-hidden className="pointer-events-none absolute bottom-[-10%] right-[8%] h-[420px] w-[420px] rounded-full bg-[#00d4ff]/[0.05] blur-[130px]" />
      <div className="relative w-full max-w-md rounded-3xl border border-white/[0.08] bg-white/[0.02] p-10 backdrop-blur">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#7ed957]/30 bg-[#7ed957]/[0.08] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#7ed957]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7ed957] opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7ed957]" />
          </span>
          Free Download
        </span>
        <h1 className="mb-3 text-balance text-3xl font-black leading-tight tracking-tight">
          <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
            {config.offer_title}
          </span>
        </h1>
        {config.offer_description && (
          <p className="mb-7 text-[15px] leading-relaxed text-white/70">{config.offer_description}</p>
        )}
        <LandingForm funnelId={config.funnel_id} />
        <p className="mt-4 text-center text-xs text-white/45">No spam. Unsubscribe any time.</p>
        <p className="mt-6 text-center text-[11px] text-white/30">
          Powered by{' '}
          <a href="https://0nmcp.com" target="_blank" rel="noopener noreferrer" className="text-white/45 transition-colors hover:text-[#7ed957]">
            0nMCP
          </a>
        </p>
      </div>
    </main>
  )
}
